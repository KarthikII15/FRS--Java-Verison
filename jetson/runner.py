"""
runner.py — Jetson Orin capture + inference runner for Prama India (Hikvision) cameras.

Prama India is Prama Hikvision India Pvt Ltd. Their IP cameras use the
standard Hikvision RTSP format:
  Main stream:  rtsp://user:pass@IP:554/Streaming/Channels/101
  Sub-stream:   rtsp://user:pass@IP:554/Streaming/Channels/102
  Channel N:    101 = ch1 main, 102 = ch1 sub, 201 = ch2 main, 202 = ch2 sub

Architecture (Audit Fix 3 — zero JPEG overhead):
  CaptureThread —raw numpy frame—► queue.Queue(32) —► InferenceThread
  InferenceThread —embedding JSON—► POST /api/face/recognize (Node.js backend)

GStreamer pipeline on Jetson:
  rtspsrc → rtph264depay → h264parse → nvv4l2decoder (HW) → nvvidconv → BGR → appsink
"""

import threading
import queue
import time
import json
import os
import logging
import cv2
import numpy as np
import httpx
from datetime import datetime, timezone
from app.pipeline import FacePipeline

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Prama / Hikvision RTSP URL helpers
# ─────────────────────────────────────────────────────────────────────────────

def build_prama_rtsp_url(ip: str, username: str, password: str,
                          channel: int = 1, stream: str = "main",
                          port: int = 554) -> str:
    """
    Build the Hikvision-format RTSP URL used by Prama India cameras.

    Stream ID format:  (channel * 100) + stream_type
      stream_type: 1 = main stream (high res, use for enrollment)
                   2 = sub-stream  (low res, use for live attendance at 5 FPS)
                   3 = third stream

    Examples:
      ch1 main:  rtsp://admin:pass@192.168.1.101:554/Streaming/Channels/101
      ch1 sub:   rtsp://admin:pass@192.168.1.101:554/Streaming/Channels/102
      ch2 main:  rtsp://admin:pass@192.168.1.101:554/Streaming/Channels/201
    """
    stream_type = 1 if stream == "main" else 2
    channel_id  = channel * 100 + stream_type
    return f"rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/{channel_id}"


def build_prama_snapshot_url(ip: str, username: str, password: str,
                              channel: int = 1, http_port: int = 80) -> str:
    """
    ISAPI snapshot URL — fetch a single JPEG frame without opening RTSP stream.
    Useful for enrollment-quality photo capture.

    http://admin:pass@192.168.1.101:80/ISAPI/Streaming/channels/101/picture
    """
    channel_id = channel * 100 + 1  # always main stream for snapshots
    return f"http://{username}:{password}@{ip}:{http_port}/ISAPI/Streaming/channels/{channel_id}/picture"


def build_prama_onvif_url(ip: str, http_port: int = 80) -> str:
    """ONVIF device service endpoint for capability discovery."""
    return f"http://{ip}:{http_port}/onvif/device_service"


# ─────────────────────────────────────────────────────────────────────────────
# GStreamer pipelines for Prama / Hikvision H.264 streams on Jetson
# ─────────────────────────────────────────────────────────────────────────────

def gst_pipeline_hw(rtsp_url: str, width: int = 1280, height: int = 720) -> str:
    """
    Hardware-accelerated GStreamer pipeline using Jetson NVDEC (nvv4l2decoder).
    Decodes H.264 directly on the GPU — zero CPU load for decoding.
    Recommended for Prama/Hikvision H.264 streams.

    Notes:
    - latency=200: slight buffer helps with Hikvision stream jitter
    - protocols=tcp: Prama cameras work better over TCP than UDP RTSP
    - nvv4l2decoder: Jetson hardware H.264 decoder
    - nvvidconv: converts NV12 → BGRx in GPU memory
    """
    return (
        f"rtspsrc location={rtsp_url} latency=200 protocols=tcp ! "
        "rtph264depay ! h264parse ! nvv4l2decoder ! "
        f"nvvidconv ! video/x-raw,format=BGRx,width={width},height={height} ! "
        "videoconvert ! video/x-raw,format=BGR ! "
        "appsink drop=true max-buffers=2 sync=false"
    )


def gst_pipeline_sw(rtsp_url: str) -> str:
    """
    Software fallback pipeline — used if nvv4l2decoder is not available.
    Higher CPU load but works on any Linux machine for testing.
    """
    return (
        f"rtspsrc location={rtsp_url} latency=200 protocols=tcp ! "
        "rtph264depay ! h264parse ! avdec_h264 ! "
        "videoconvert ! video/x-raw,format=BGR ! "
        "appsink drop=true max-buffers=2 sync=false"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Main runner class
# ─────────────────────────────────────────────────────────────────────────────

class PramaJetsonRunner:
    """
    Unified runner for Prama India (Hikvision) cameras on Jetson Orin.

    One capture thread per camera, one shared inference thread.
    All inference is in-process — no HTTP/JPEG round-trips between threads.
    """

    def __init__(self, model_cfg_path: str, backend_url: str, token_path: str):
        with open(model_cfg_path) as f:
            cfg = json.load(f)

        det = cfg["models"]["face_detection"]
        emb = cfg["models"]["face_embedding"]

        self.pipeline = FacePipeline(
            det_path=os.path.join(det["path"], det["filename"]),
            emb_path=os.path.join(emb["path"], emb["filename"]),
            conf=det.get("confThreshold", 0.5),
            nms=det.get("nmsThreshold", 0.4),
        )

        self.backend_url = backend_url.rstrip("/")
        self.token_path  = token_path
        self.frame_queue: queue.Queue = queue.Queue(maxsize=32)
        self.running     = False

        # Per-camera cooldown: avoid marking same face twice in < 10 seconds
        self._last_sent: dict[str, float] = {}
        self._cooldown_sec = 10.0

        logger.info("[PramaRunner] Pipeline loaded — ready to stream.")

    # ── URL construction ─────────────────────────────────────────────────────

    def _make_rtsp_url(self, cam: dict) -> str:
        """
        Build RTSP URL from camera config.
        Accepts either a pre-built rtspUrl or builds from ip/username/password/channel.
        """
        if cam.get("rtspUrl"):
            return cam["rtspUrl"]

        return build_prama_rtsp_url(
            ip=cam["ipAddress"],
            username=cam.get("username", "admin"),
            password=cam.get("password", ""),
            channel=cam.get("channel", 1),
            stream=cam.get("streamType", "sub"),  # sub-stream = lower res = faster
            port=cam.get("rtspPort", 554),
        )

    # ── GStreamer capture loop ───────────────────────────────────────────────

    def _open_cap(self, rtsp_url: str, cam_id: str) -> cv2.VideoCapture:
        """
        Open VideoCapture with Jetson HW decoder, fall back to SW decoder.
        Prama/Hikvision cameras sometimes need a TCP retry on first connect.
        """
        # Try hardware pipeline first (Jetson)
        hw_pipe = gst_pipeline_hw(rtsp_url)
        cap = cv2.VideoCapture(hw_pipe, cv2.CAP_GSTREAMER)
        if cap.isOpened():
            logger.info(f"[{cam_id}] Opened with HW decoder (nvv4l2decoder)")
            return cap

        logger.warning(f"[{cam_id}] HW decoder failed, trying SW decoder")
        sw_pipe = gst_pipeline_sw(rtsp_url)
        cap = cv2.VideoCapture(sw_pipe, cv2.CAP_GSTREAMER)
        if cap.isOpened():
            logger.info(f"[{cam_id}] Opened with SW decoder (avdec_h264)")
            return cap

        # Last resort: plain OpenCV RTSP (no GStreamer)
        logger.warning(f"[{cam_id}] GStreamer failed, using plain RTSP")
        cap = cv2.VideoCapture(rtsp_url)
        return cap

    def _capture_loop(self, cam: dict):
        cam_id    = cam["id"]
        rtsp_url  = self._make_rtsp_url(cam)
        fps_target = cam.get("fpsTarget", 5)
        interval   = 1.0 / fps_target

        logger.info(f"[{cam_id}] Connecting: {rtsp_url.replace(cam.get('password',''), '****')}")

        cap = self._open_cap(rtsp_url, cam_id)
        last_frame_time = 0.0

        while self.running:
            if not cap.isOpened():
                logger.warning(f"[{cam_id}] Stream lost — reconnecting in 5s")
                time.sleep(5)
                cap.release()
                cap = self._open_cap(rtsp_url, cam_id)
                continue

            now = time.time()
            if now - last_frame_time < interval:
                time.sleep(0.005)
                continue

            ret, frame = cap.read()
            if not ret or frame is None:
                logger.warning(f"[{cam_id}] Empty frame — reconnecting in 2s")
                time.sleep(2)
                cap.release()
                cap = self._open_cap(rtsp_url, cam_id)
                continue

            last_frame_time = now

            try:
                self.frame_queue.put_nowait({"cam_id": cam_id, "frame": frame})
            except queue.Full:
                pass  # drop under load — acceptable for attendance

        cap.release()
        logger.info(f"[{cam_id}] Capture thread stopped.")

    # ── Inference loop ───────────────────────────────────────────────────────

    def _inference_loop(self):
        while self.running:
            try:
                item = self.frame_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            cam_id = item["cam_id"]
            frame  = item["frame"]

            try:
                result = self.pipeline.process_frame(frame)
            except Exception as e:
                logger.error(f"[{cam_id}] Inference error: {e}")
                continue

            if not result.get("faceCount") or not result.get("embedding"):
                continue

            # Per-camera cooldown — prevents duplicate attendance entries
            now = time.time()
            last = self._last_sent.get(cam_id, 0)
            if now - last < self._cooldown_sec:
                continue
            self._last_sent[cam_id] = now

            # Fire-and-forget HTTP POST to Node.js backend
            threading.Thread(
                target=self._send_to_backend,
                args=(cam_id, result),
                daemon=True,
            ).start()

    # ── Backend communication ────────────────────────────────────────────────

    def _send_to_backend(self, cam_id: str, result: dict):
        """
        POST embedding + metadata to Node.js /api/face/recognize.
        Backend expects one face per request with top-level embedding.
        """
        token = self._read_token()

        # Pick highest-confidence face only.
        # Backend processes one face per request — fire separate requests if multiple faces.
        faces = result.get("detections") or []
        if not faces and result.get("embedding"):
            faces = [{"embedding": result["embedding"], "confidence": result["confidence"]}]

        for face in faces[:1]:  # top face only for attendance
            payload = {
                "embedding":  face.get("embedding") or result["embedding"],
                "confidence": face.get("confidence") or result["confidence"],
                "deviceId":   cam_id,
                "timestamp":  datetime.now(timezone.utc).isoformat(),
            }
            try:
                with httpx.Client(timeout=8) as c:
                    resp = c.post(
                        f"{self.backend_url}/api/face/recognize",
                        json=payload,
                        headers={"Authorization": f"Bearer {token}"},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        emp = data.get("result", {})
                        print(f"[{cam_id}] ✅ {emp.get('fullName','?')} | sim={emp.get('similarity',0):.3f}")
                    elif resp.status_code == 404:
                        print(f"[{cam_id}] ⚠️  Face not enrolled")
                    else:
                        print(f"[{cam_id}] ❌ Backend {resp.status_code}: {resp.text[:100]}")
            except Exception as e:
                print(f"[{cam_id}] ❌ POST failed: {e}")

    def _read_token(self) -> str:
        """Read the device JWT written by token_manager.sh (refreshed every 25 min)."""
        try:
            with open(self.token_path) as f:
                return f.read().strip()
        except Exception:
            return ""

    # ── Snapshot helper (for enrollment) ─────────────────────────────────────

    def capture_snapshot(self, cam: dict) -> bytes | None:
        """
        Capture a single high-quality JPEG from a Prama camera using ISAPI.
        Use this for face enrollment — main stream, full resolution.

        Returns JPEG bytes or None on failure.
        """
        snap_url = cam.get("snapshotUrl") or build_prama_snapshot_url(
            ip=cam["ipAddress"],
            username=cam.get("username", "admin"),
            password=cam.get("password", ""),
            channel=cam.get("channel", 1),
            http_port=cam.get("httpPort", 80),
        )
        try:
            with httpx.Client(timeout=10) as client:
                resp = client.get(snap_url)
                resp.raise_for_status()
                return resp.content
        except Exception as e:
            logger.error(f"Snapshot fetch failed for {cam.get('id','?')}: {e}")
            return None

    # ── Lifecycle ────────────────────────────────────────────────────────────

    def start(self, cameras: list):
        self.running = True

        for cam in cameras:
            if not cam.get("enabled", True):
                logger.info(f"[{cam['id']}] Skipped (disabled)")
                continue
            t = threading.Thread(
                target=self._capture_loop, args=(cam,), daemon=True
            )
            t.start()
            logger.info(f"[{cam['id']}] Capture thread started")

        inf_thread = threading.Thread(target=self._inference_loop, daemon=True)
        inf_thread.start()
        logger.info("[PramaRunner] Inference thread started")

    def stop(self):
        self.running = False
        logger.info("[PramaRunner] Stopping...")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-8s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    model_cfg  = os.getenv("MODEL_CONFIG_PATH", "/opt/frs-models/config/model_config.json")
    cam_cfg    = os.getenv("CAMERAS_CONFIG",    "/opt/frs-models/config/cameras.json")
    backend    = os.getenv("BACKEND_URL",       "http://YOUR_LOCAL_MACHINE_IP:8080")
    token_path = os.getenv("TOKEN_PATH",        "/opt/frs/device_token.txt")

    with open(cam_cfg) as f:
        cam_config = json.load(f)

    cameras = cam_config.get("cameras", [])
    if not cameras:
        logger.error("No cameras defined in cameras.json — exiting.")
        return

    logger.info(f"[main] Starting PramaRunner with {len(cameras)} camera(s)")
    runner = PramaJetsonRunner(model_cfg, backend, token_path)
    runner.start(cameras)

    # Also expose FastAPI HTTP endpoint for backend-triggered recognition
    import uvicorn
    threading.Thread(
        target=lambda: uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=int(os.getenv("SIDECAR_PORT", "5000")),
            log_level="warning",
        ),
        daemon=True,
    ).start()

    logger.info("[main] All services running. Ctrl+C to stop.")
    try:
        while True:
            time.sleep(60)
            # Log queue depth every minute for diagnostics
            qsize = runner.frame_queue.qsize()
            if qsize > 20:
                logger.warning(f"[main] Frame queue depth: {qsize}/32 — inference may be falling behind")
    except KeyboardInterrupt:
        runner.stop()
        logger.info("[main] Shutdown complete.")


if __name__ == "__main__":
    main()

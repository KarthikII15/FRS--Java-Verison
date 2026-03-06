"""
Webcam Capture Script — Edge Device Simulator
==============================================

This script captures frames from the laptop webcam and sends them to the
backend API via HTTP POST requests. It simulates how real edge devices
(CCTV cameras, LPU devices, NVIDIA NUCs) will send data to the backend.

The backend receives frames at:
    POST http://localhost:8080/api/frames/rtsp/{camera_id}

Usage:
    python webcam_capture.py
    python webcam_capture.py --camera-id webcam-01 --fps 5 --backend-url http://localhost:8080
    python webcam_capture.py --camera-index 0 --resolution 640x480

Requirements:
    pip install -r requirements.txt
"""

import cv2
import base64
import requests
import time
import argparse
import sys
import signal
import json
from datetime import datetime


class WebcamCaptureAgent:
    """Captures webcam frames and sends them to the backend API."""

    def __init__(self, camera_id, backend_url, camera_index=0, fps=5,
                 resolution=(640, 480), jpeg_quality=80):
        self.camera_id = camera_id
        self.backend_url = backend_url.rstrip('/')
        self.camera_index = camera_index
        self.fps = fps
        self.resolution = resolution
        self.jpeg_quality = jpeg_quality

        self.capture = None
        self.running = False
        self.frame_count = 0
        self.error_count = 0
        self.start_time = None

        # API endpoint
        self.frame_endpoint = f"{self.backend_url}/api/frames/rtsp/{self.camera_id}"

    def start(self):
        """Open webcam and start capturing frames."""
        print(f"[WebcamCapture] Starting capture agent...")
        print(f"  Camera ID:    {self.camera_id}")
        print(f"  Camera Index: {self.camera_index}")
        print(f"  Backend URL:  {self.backend_url}")
        print(f"  FPS:          {self.fps}")
        print(f"  Resolution:   {self.resolution[0]}x{self.resolution[1]}")
        print(f"  JPEG Quality: {self.jpeg_quality}")
        print(f"  Endpoint:     {self.frame_endpoint}")
        print()

        # Open webcam
        self.capture = cv2.VideoCapture(self.camera_index)
        if not self.capture.isOpened():
            print(f"[ERROR] Cannot open camera at index {self.camera_index}")
            sys.exit(1)

        # Set resolution
        self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, self.resolution[0])
        self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resolution[1])

        # Verify actual resolution
        actual_w = int(self.capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_h = int(self.capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"[WebcamCapture] Camera opened successfully. Actual resolution: {actual_w}x{actual_h}")

        # Check backend connectivity
        self._check_backend()

        self.running = True
        self.start_time = time.time()
        self.frame_count = 0
        self.error_count = 0

        frame_interval = 1.0 / self.fps
        print(f"[WebcamCapture] Capturing at {self.fps} FPS (interval: {frame_interval:.3f}s)")
        print(f"[WebcamCapture] Press Ctrl+C to stop\n")

        try:
            while self.running:
                loop_start = time.time()

                ret, frame = self.capture.read()
                if not ret:
                    print("[WARNING] Failed to read frame from webcam")
                    self.error_count += 1
                    time.sleep(0.1)
                    continue

                # Encode frame as JPEG
                encode_params = [cv2.IMWRITE_JPEG_QUALITY, self.jpeg_quality]
                _, buffer = cv2.imencode('.jpg', frame, encode_params)
                frame_base64 = base64.b64encode(buffer).decode('utf-8')

                # Send to backend
                self._send_frame(frame_base64, frame)

                # Maintain target FPS
                elapsed = time.time() - loop_start
                sleep_time = max(0, frame_interval - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)

        except KeyboardInterrupt:
            print("\n[WebcamCapture] Interrupted by user.")
        finally:
            self.stop()

    def _send_frame(self, frame_base64, raw_frame):
        """Send a single frame to the backend API."""
        timestamp = datetime.utcnow().isoformat() + 'Z'

        payload = {
            'frame': frame_base64,
            'metadata': {
                'cameraId': self.camera_id,
                'deviceType': 'webcam',
                'cameraIndex': self.camera_index,
                'frameNumber': self.frame_count + 1,
                'resolution': f"{raw_frame.shape[1]}x{raw_frame.shape[0]}",
                'encoding': 'jpeg',
                'quality': self.jpeg_quality,
            },
            'timestamp': timestamp,
        }

        try:
            response = requests.post(
                self.frame_endpoint,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=5
            )

            self.frame_count += 1

            if response.status_code in (200, 202):
                if self.frame_count % 10 == 0:  # Log every 10 frames
                    elapsed = time.time() - self.start_time
                    actual_fps = self.frame_count / elapsed if elapsed > 0 else 0
                    print(f"[WebcamCapture] Sent frame #{self.frame_count} "
                          f"(actual FPS: {actual_fps:.1f}, errors: {self.error_count})")
            elif response.status_code == 429:
                print(f"[WARNING] Rate limited (429). Queue full. Backing off...")
                time.sleep(1)
            else:
                print(f"[WARNING] Unexpected response: {response.status_code} - {response.text[:200]}")
                self.error_count += 1

        except requests.exceptions.ConnectionError:
            self.error_count += 1
            if self.error_count % 10 == 0:
                print(f"[ERROR] Cannot connect to backend at {self.backend_url} "
                      f"(errors: {self.error_count})")
            time.sleep(1)  # Back off on connection errors

        except requests.exceptions.Timeout:
            self.error_count += 1
            print(f"[WARNING] Request timeout (frame #{self.frame_count})")

        except Exception as e:
            self.error_count += 1
            print(f"[ERROR] Failed to send frame: {e}")

    def _check_backend(self):
        """Check if backend is reachable."""
        try:
            health_url = f"{self.backend_url}/api/health"
            response = requests.get(health_url, timeout=5)
            if response.status_code == 200:
                print(f"[WebcamCapture] Backend is healthy: {response.json().get('status', 'unknown')}")
            else:
                print(f"[WARNING] Backend health check returned: {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"[WARNING] Cannot reach backend at {self.backend_url}. "
                  f"Make sure the backend server is running.")
            print(f"[WARNING] Will retry on frame send...\n")

    def stop(self):
        """Stop capture and release resources."""
        self.running = False

        if self.capture and self.capture.isOpened():
            self.capture.release()

        elapsed = time.time() - self.start_time if self.start_time else 0
        actual_fps = self.frame_count / elapsed if elapsed > 0 else 0

        print(f"\n[WebcamCapture] Capture stopped.")
        print(f"  Total frames sent:  {self.frame_count}")
        print(f"  Total errors:       {self.error_count}")
        print(f"  Duration:           {elapsed:.1f}s")
        print(f"  Average FPS:        {actual_fps:.1f}")


def parse_resolution(res_str):
    """Parse resolution string like '640x480' into tuple."""
    try:
        w, h = res_str.lower().split('x')
        return (int(w), int(h))
    except (ValueError, AttributeError):
        print(f"[ERROR] Invalid resolution format: '{res_str}'. Use format: 640x480")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Webcam Capture Agent — Simulates edge device sending frames to backend',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python webcam_capture.py
  python webcam_capture.py --camera-id cam-lobby-01 --fps 10
  python webcam_capture.py --camera-index 1 --resolution 1280x720
  python webcam_capture.py --backend-url http://192.168.1.100:8080
        """
    )

    parser.add_argument('--camera-id', default='webcam-01',
                        help='Unique device ID for this camera (default: webcam-01)')
    parser.add_argument('--backend-url', default='http://localhost:8080',
                        help='Backend API base URL (default: http://localhost:8080)')
    parser.add_argument('--camera-index', type=int, default=0,
                        help='OS camera device index (default: 0)')
    parser.add_argument('--fps', type=int, default=5,
                        help='Target frames per second (default: 5)')
    parser.add_argument('--resolution', default='640x480',
                        help='Capture resolution WxH (default: 640x480)')
    parser.add_argument('--jpeg-quality', type=int, default=80,
                        help='JPEG compression quality 1-100 (default: 80)')

    args = parser.parse_args()
    resolution = parse_resolution(args.resolution)

    # Handle graceful shutdown
    agent = WebcamCaptureAgent(
        camera_id=args.camera_id,
        backend_url=args.backend_url,
        camera_index=args.camera_index,
        fps=args.fps,
        resolution=resolution,
        jpeg_quality=args.jpeg_quality,
    )

    def signal_handler(sig, frame):
        print(f"\n[WebcamCapture] Received signal {sig}, stopping...")
        agent.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    agent.start()


if __name__ == '__main__':
    main()

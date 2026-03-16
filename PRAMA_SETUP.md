# Prama India Camera Setup

## Key Fact
Prama India = **Prama Hikvision India Pvt Ltd** — uses Hikvision RTSP/ISAPI protocols.

## RTSP URL Format
```
Main stream: rtsp://admin:PASSWORD@IP:554/Streaming/Channels/101
Sub-stream:  rtsp://admin:PASSWORD@IP:554/Streaming/Channels/102
Channel 2:   rtsp://admin:PASSWORD@IP:554/Streaming/Channels/201
```
Channel ID = `channel × 100 + streamType` (1=main, 2=sub)

## ISAPI Snapshot (for enrollment)
```
http://admin:PASSWORD@IP:80/ISAPI/Streaming/channels/101/picture
```

## Step 1 — Discover camera IP (on local PC)
```bash
pip install httpx
python3 jetson/prama_discover.py --subnet 192.168.1.0/24 --user admin --pass YOUR_PASS
# or single camera:
python3 jetson/prama_discover.py --ip 192.168.1.101 --user admin --pass YOUR_PASS --snapshot
```
This outputs a ready-to-use `cameras.json`.

## Step 2 — Edit cameras.json
Replace `YOUR_PASSWORD` and verify the IP address.

## Step 3 — Copy to Jetson
```bash
scp jetson/cameras.json ubuntu@JETSON_IP:/opt/frs-models/config/cameras.json
scp jetson/runner.py ubuntu@JETSON_IP:/opt/frs-inference/app/runner.py
```

## Step 4 — Test stream on Jetson
```bash
# Verify GStreamer HW pipeline opens the stream
gst-launch-1.0 -v \
  rtspsrc location="rtsp://admin:PASS@192.168.1.101:554/Streaming/Channels/102" \
  latency=200 protocols=tcp ! \
  rtph264depay ! h264parse ! nvv4l2decoder ! nvvidconv ! \
  video/x-raw,format=BGRx ! videoconvert ! autovideosink

# Or with VLC on your PC:
vlc "rtsp://admin:PASS@192.168.1.101:554/Streaming/Channels/102"
```

## Step 5 — Start inference runner
```bash
sudo systemctl start frs-edge
sudo journalctl -u frs-edge -f
# Look for: [prama-entrance-01] Opened with HW decoder (nvv4l2decoder)
# Look for: [prama-entrance-01] ✅ Recognised: John Doe (42) sim=0.847
```

## API Endpoints (new)
| Method | URL | Purpose |
|--------|-----|---------|
| POST | /api/cameras/discover | Probe Prama camera by IP |
| GET | /api/cameras/:id/snapshot | Fetch JPEG via ISAPI |
| GET | /api/cameras/:id/status | Heartbeat age + event counts |
| POST | /api/cameras/:id/test | RTSP connectivity test |

## Frontend: Add Camera Modal
- Step 3 now has IP + Probe button (calls /api/cameras/discover)
- Probe auto-fills model name, firmware, MAC from camera
- RTSP sub-stream URL shown as preview as you type
- Password stored server-side only, never returned to browser

## Troubleshooting
| Problem | Fix |
|---------|-----|
| `nvv4l2decoder` not found | JetPack not installed — `sudo apt install nvidia-l4t-gstreamer` |
| RTSP auth failure | Prama requires DIGEST auth — latency=200 in gst pipeline helps |
| Sub-stream returns 404 | Enable sub-stream in camera web UI → Video → Stream |
| ISAPI probe returns 401 | Wrong password — check camera label or reset via SADP |
| Stream opens then freezes | Increase latency: change `latency=200` to `latency=500` |
| No heartbeat in backend | Check device is registered: `POST /api/devices` with correct `device_code` |

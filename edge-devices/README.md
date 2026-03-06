# Edge Devices

This folder contains scripts and agents that simulate or interface with edge hardware devices (cameras, NUCs, LPUs) that feed data into the backend pipeline.

## Structure

```
edge-devices/
├── webcam/                     # Laptop webcam capture agent
│   ├── webcam_capture.py       # Main capture script
│   └── requirements.txt        # Python dependencies
├── cctv/                       # (Future) CCTV/RTSP camera agents
└── nuc/                        # (Future) NVIDIA NUC edge compute agents
```

## Webcam Capture (Current Testing Setup)

### Quick Start

```bash
cd edge-devices/webcam
pip install -r requirements.txt
python webcam_capture.py
```

### Options

| Flag | Default | Description |
|---|---|---|
| `--camera-id` | `webcam-01` | Unique device ID |
| `--backend-url` | `http://localhost:8080` | Backend API URL |
| `--camera-index` | `0` | OS camera index |
| `--fps` | `5` | Target frames per second |
| `--resolution` | `640x480` | Capture resolution |
| `--jpeg-quality` | `80` | JPEG quality (1-100) |

### How It Works

1. Opens the laptop webcam using OpenCV
2. Captures frames at the specified FPS
3. Encodes each frame as base64 JPEG
4. POSTs the frame to `POST /api/frames/rtsp/{camera-id}` on the backend
5. The backend routes the frame through: ValidationService → InferenceProcessor → Rules Engine → Kafka → DB → WebSocket

This exactly mirrors how real CCTV cameras or NUC devices will send data in production.

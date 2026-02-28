# Device Integration API

## Overview

This API allows cameras and LPU (Local Processing Unit) devices to send attendance and detection events to the Attendance Intelligence Platform.

**Base URL:** `https://api.yourdomain.com/api/devices`

## Authentication

Devices authenticate using JWT tokens from Keycloak.

**Header:** `Authorization: Bearer <device_jwt_token>`

The token must include:
- `sub`: Device UUID
- `device_id`: Device client ID
- `azp`: Must be `attendance-device-client`

### Obtaining a Device Token

Devices use the Keycloak client credentials flow:

```bash
curl -X POST https://keycloak.yourdomain.com/realms/attendance/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=attendance-device-client" \
  -d "client_secret=<device_secret>"
```

## Endpoints

### POST /{deviceId}/events

Submit a single event from the device.

**Request:**
```json
{
  "eventType": "FACE_DETECTED",
  "timestamp": "2024-01-15T09:00:00Z",
  "faceData": {
    "embedding": [0.12, 0.34, ...], // 512 floats
    "confidence": 0.95,
    "boundingBox": {"x": 100, "y": 200, "width": 150, "height": 200}
  },
  "frameData": {
    "frameId": "frame-001",
    "timestamp": "2024-01-15T09:00:00Z",
    "imageUrl": "https://storage.../frame.jpg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "receivedAt": "2024-01-15T09:00:01Z",
  "status": "pending"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | MISSING_AUTH_HEADER | No authorization header |
| 401 | TOKEN_EXPIRED | JWT token expired |
| 401 | INVALID_TOKEN | Invalid JWT signature |
| 401 | DEVICE_NOT_FOUND | Device not registered in system |
| 403 | DEVICE_MISMATCH | Device ID in URL doesn't match token |
| 403 | DEVICE_MAINTENANCE | Device is in maintenance mode |
| 403 | MISSING_CAPABILITY | Device lacks required capability |
| 422 | VALIDATION_ERROR | Invalid event data |

### POST /{deviceId}/events/batch

Submit multiple events in a single request (up to 100 events).

**Request:**
```json
{
  "events": [
    {
      "eventType": "FACE_DETECTED",
      "timestamp": "2024-01-15T09:00:00Z",
      "faceData": { ... },
      "frameData": { ... }
    },
    {
      "eventType": "FACE_DETECTED",
      "timestamp": "2024-01-15T09:00:05Z",
      "faceData": { ... },
      "frameData": { ... }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "results": [
    { "index": 0, "eventId": "...", "status": "success" },
    { "index": 1, "eventId": "...", "status": "success" }
  ]
}
```

### POST /{deviceId}/heartbeat

Device heartbeat for health monitoring and configuration updates.

**Request:**
```json
{
  "eventType": "DEVICE_HEARTBEAT",
  "timestamp": "2024-01-15T09:00:00Z",
  "deviceMetadata": {
    "firmwareVersion": "1.2.3",
    "temperature": 45.5,
    "cpuUsage": 35.0,
    "memoryUsage": 60.0,
    "uptime": 86400
  }
}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T09:00:01Z",
  "config": {
    "detectionThreshold": 0.8,
    "frameRate": 5
  },
  "actions": []
}
```

### GET /{deviceId}/config

Get device configuration and employee face database for local matching.

**Response:**
```json
{
  "device": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "CAM-001",
    "type": "camera",
    "capabilities": ["face_detection", "face_recognition"]
  },
  "config": {
    "detectionThreshold": 0.8,
    "frameRate": 5,
    "embeddingModel": "arcface-v1.0"
  },
  "employeeSync": {
    "lastUpdated": "2024-01-15T08:00:00Z",
    "employeeCount": 150,
    "employees": [
      {
        "id": "emp-001",
        "name": "John Doe",
        "faceEmbeddings": [[0.12, 0.34, ...], [0.15, 0.38, ...]]
      }
    ]
  }
}
```

## Event Types

### FACE_DETECTED

A face was detected in the camera frame but not yet matched to an employee.

**Use case:** Initial detection before recognition processing.

```json
{
  "eventType": "FACE_DETECTED",
  "timestamp": "2024-01-15T09:00:00Z",
  "faceData": {
    "embedding": [0.12, 0.34, ...],
    "confidence": 0.95,
    "boundingBox": {"x": 100, "y": 200, "width": 150, "height": 200},
    "qualityScore": 0.88
  },
  "frameData": {
    "frameId": "frame-001",
    "timestamp": "2024-01-15T09:00:00Z",
    "imageUrl": "https://storage.../frame.jpg"
  }
}
```

### EMPLOYEE_ENTRY

An employee entered the premises (face recognized).

**Use case:** Main attendance tracking event.

```json
{
  "eventType": "EMPLOYEE_ENTRY",
  "timestamp": "2024-01-15T09:00:00Z",
  "faceData": {
    "embedding": [0.12, 0.34, ...],
    "confidence": 0.95,
    "matchedEmployeeId": "emp-001",
    "matchConfidence": 0.92
  },
  "frameData": {
    "frameId": "frame-001",
    "timestamp": "2024-01-15T09:00:00Z",
    "imageUrl": "https://storage.../frame.jpg"
  },
  "entryData": {
    "direction": "in",
    "zone": "main-entrance",
    "method": "face_recognition"
  }
}
```

### EMPLOYEE_EXIT

An employee exited the premises.

```json
{
  "eventType": "EMPLOYEE_EXIT",
  "timestamp": "2024-01-15T18:00:00Z",
  "faceData": {
    "embedding": [0.12, 0.34, ...],
    "confidence": 0.94,
    "matchedEmployeeId": "emp-001",
    "matchConfidence": 0.91
  },
  "frameData": {
    "frameId": "frame-002",
    "timestamp": "2024-01-15T18:00:00Z",
    "imageUrl": "https://storage.../frame.jpg"
  },
  "entryData": {
    "direction": "out",
    "zone": "main-entrance",
    "method": "face_recognition"
  }
}
```

### DEVICE_HEARTBEAT

Periodic health check from device.

```json
{
  "eventType": "DEVICE_HEARTBEAT",
  "timestamp": "2024-01-15T09:00:00Z",
  "deviceMetadata": {
    "firmwareVersion": "1.2.3",
    "temperature": 45.5,
    "cpuUsage": 35.0,
    "memoryUsage": 60.0,
    "uptime": 86400,
    "cameraStatus": {
      "connected": true,
      "resolution": "1920x1080",
      "fps": 30
    }
  }
}
```

### MOTION_DETECTED

Motion detected but no face found.

```json
{
  "eventType": "MOTION_DETECTED",
  "timestamp": "2024-01-15T09:00:00Z",
  "motionData": {
    "region": "zone-a",
    "confidence": 0.75
  }
}
```

### DEVICE_ERROR

Device error or malfunction.

```json
{
  "eventType": "DEVICE_ERROR",
  "timestamp": "2024-01-15T09:00:00Z",
  "errorData": {
    "errorCode": "CAM_DISCONNECTED",
    "errorMessage": "Camera connection lost",
    "severity": "high",
    "component": "camera"
  }
}
```

## Face Embedding Format

Face embeddings are 512-dimensional float vectors from ArcFace or FaceNet models.

**Example:**
```json
{
  "embedding": [
    0.023456, -0.123456, 0.234567, -0.345678, ...
    // ... 512 total values
  ]
}
```

**Normalization:** Vectors should be L2-normalized (magnitude = 1.0).

## Best Practices

1. **Batch events** when possible to reduce network overhead
2. **Include face embeddings** for all FACE_DETECTED and EMPLOYEE_ENTRY/EXIT events
3. **Send heartbeats** every 30 seconds to maintain device health status
4. **Use image URLs** instead of base64 data for large frames
5. **Handle 401/403 errors** by refreshing the device token
6. **Retry with backoff** on 5xx errors

## Rate Limits

- Single events: 100 requests/second per device
- Batch events: 10 requests/second per device
- Heartbeats: 1 request/second per device

## Support

For integration support, contact: dev-team@yourcompany.com

# Real-Time & Kafka Readiness Assessment

## Current Status: ⚠️ NOT Ready for Production Real-Time/Video Streaming

---

## What's Currently Implemented

### ✅ Live Data API (HTTP Polling)
**Location:** `backend/src/routes/liveRoutes.js`

Available endpoints:
- `GET /api/live/employees` - List employees
- `GET /api/live/attendance` - Attendance records
- `GET /api/live/devices` - Device status
- `GET /api/live/alerts` - System alerts
- `GET /api/live/metrics` - Dashboard metrics
- `GET /api/live/shifts` - Shift data

**How it works:**
- Regular HTTP REST API
- Database queries on each request
- Supports scope filtering (tenant/customer/site/unit)
- **NOT real-time streaming** - clients must poll

### ✅ Frontend RealTime Engine (Mock/Demo)
**Location:** `src/app/engine/RealTimeEngine.ts`

**Current implementation:**
- In-memory event simulation
- Mock device heartbeats
- Simulated employee entry/exit events
- **NOT connected to backend**
- **NOT using WebSockets or Kafka**

---

## What's MISSING for Real Video/Photo Streaming

### ❌ 1. WebSocket Server
**Required for:** Real-time bidirectional communication

**Missing components:**
- WebSocket server (Socket.io or native WS)
- Connection authentication (JWT validation on WS upgrade)
- Room/channel management (per tenant/site)
- Reconnection handling

**Implementation needed:**
```javascript
// Example: WebSocket with Keycloak auth
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const payload = await verifyKeycloakToken(token);
  socket.user = payload;
  next();
});
```

### ❌ 2. Kafka Infrastructure
**Required for:** Event streaming, device data ingestion, scalability

**Missing components:**
- Kafka broker setup
- Kafka Connect for database integration
- Producer/Consumer clients
- Topic management
- Schema Registry (Avro schemas)

**Topics needed:**
```
device.heartbeat          → Device status updates
device.frame.upload         → Photo/video frame metadata
attendance.detected         → Face recognition events
alert.triggered             → System alerts
user.action                 → Audit events
```

### ❌ 3. File Upload Handling
**Required for:** Photo and video frame storage

**Missing components:**
- Multipart form data handling
- File size limits (10MB+ for video)
- Storage backend (S3/MinIO/Azure Blob)
- Image processing (thumbnail generation)
- Virus scanning
- CDN integration for fast delivery

**Implementation needed:**
```javascript
// Example: Frame upload endpoint
router.post('/frames/upload', 
  requireAuth,
  requirePermission('devices.write'),
  multer({ limits: { fileSize: 50 * 1024 * 1024 } }).single('frame'),
  asyncHandler(async (req, res) => {
    // Upload to S3
    // Store metadata in DB
    // Emit Kafka event
  })
);
```

### ❌ 4. Real-Time Event Architecture

**Current flow (HTTP Polling):**
```
Device → HTTP POST → Backend → Database → Frontend polls every 5s
```

**Required flow (Event Streaming):**
```
Device → Kafka Producer → Kafka Topic → Consumer → WebSocket → Frontend
                                    ↓
                              Database (async)
```

### ❌ 5. Device Integration SDK
**Required for:** IoT device connectivity

**Missing:**
- Device authentication (X.509 certificates or device tokens)
- MQTT broker (for IoT devices)
- Device management API
- Firmware update mechanism
- Offline buffering on devices

---

## Implementation Roadmap

### Phase 1: WebSocket Foundation (2 weeks)
1. Add Socket.io to backend
2. Implement JWT authentication on WebSocket
3. Create room-based channels (tenant-site-device)
4. Frontend WebSocket client integration
5. Replace polling with WebSocket events

### Phase 2: Kafka Integration (2 weeks)
1. Deploy Kafka (Docker or managed service)
2. Create Kafka topics
3. Implement producers (backend services)
4. Implement consumers (WebSocket emitters)
5. Add Kafka Connect for DB persistence

### Phase 3: File Upload System (1 week)
1. Add multipart upload endpoints
2. Integrate S3/MinIO storage
3. Image processing pipeline
4. Upload progress tracking via WebSocket

### Phase 4: Device SDK (2 weeks)
1. MQTT broker setup
2. Device authentication system
3. Device registration API
4. Firmware update mechanism

---

## Quick Start Option (MVP)

If you need **immediate** real-time capabilities without full Kafka setup:

### Option 1: WebSocket Only (No Kafka)
```
Device → HTTP POST → Backend → WebSocket → Frontend
                          ↓
                      Database
```

**Pros:** Simple, fast to implement  
**Cons:** No persistence, no replay, no scalability

### Option 2: Redis Pub/Sub (Lightweight)
```
Device → HTTP POST → Backend → Redis Pub/Sub → WebSocket → Frontend
                          ↓
                      Database
```

**Pros:** Simple, scalable, persistent connections  
**Cons:** Not true streaming, message loss possible

---

## Kafka Deployment Options

### Option A: Docker Compose (Development)
```yaml
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
```

### Option B: Managed Kafka (Production)
- **AWS:** Amazon MSK
- **GCP:** Google Cloud Pub/Sub + Kafka Connect
- **Azure:** Azure Event Hubs (Kafka protocol)
- **Confluent:** Confluent Cloud

---

## Current Recommendation

### For Development/Testing:
✅ **Use existing HTTP polling** - it's functional for demo purposes

### For Production Video/Photo Streaming:
⚠️ **Requires Phase 1-4 implementation** (6-7 weeks estimated)

### Immediate Next Steps:
1. **Decide on architecture:** WebSocket-only vs Kafka
2. **Define video requirements:** Frame rate, resolution, storage duration
3. **Choose storage:** S3 vs on-premise vs CDN
4. **Device protocol:** HTTP vs MQTT vs WebSocket direct

---

## Files to Review

**Current implementation:**
- `backend/src/routes/liveRoutes.js` - HTTP endpoints
- `src/app/engine/RealTimeEngine.ts` - Frontend mock engine
- `src/app/hooks/useLiveData.ts` - Data fetching hook

**Need to create:**
- `backend/src/websocket/server.js` - WebSocket server
- `backend/src/kafka/producer.js` - Kafka producers
- `backend/src/kafka/consumer.js` - Kafka consumers
- `backend/src/routes/uploadRoutes.js` - File upload endpoints
- `docker-compose.kafka.yml` - Kafka stack

---

## Summary

| Feature | Status | Ready for Production |
|---------|--------|---------------------|
| HTTP Live API | ✅ Implemented | ✅ Yes (for polling) |
| WebSocket Real-Time | ❌ Missing | ❌ No |
| Kafka Streaming | ❌ Missing | ❌ No |
| File Upload (Photos) | ❌ Missing | ❌ No |
| Video Frame Streaming | ❌ Missing | ❌ No |
| Device MQTT Integration | ❌ Missing | ❌ No |

**Would you like me to implement the WebSocket foundation or Kafka integration?**

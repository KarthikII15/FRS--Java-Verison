import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authRoutes } from "./routes/authRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { liveRoutes } from "./routes/liveRoutes.js";
import { meRoutes } from "./routes/meRoutes.js";
import { deviceRoutes } from "./routes/deviceRoutes.js";
import { attendanceRoutes } from "./routes/attendanceRoutes.js";
import { employeeRoutes } from "./routes/employeeRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { searchRoutes } from "./routes/searchRoutes.js";
import { faceRoutes } from "./routes/faceRoutes.js";
import { reportRoutes } from "./routes/reportRoutes.js";
import { cameraRoutes } from "./routes/cameraRoutes.js";
import { pool } from "./db/pool.js";
import { globalRateLimiter } from "./middleware/rateLimit.js";
import { extractScope, validateScopeAccess } from "./middleware/scopeExtractor.js";

// Import core services
import shutdownManager from "./core/managers/ShutdownManager.js";
import modelManager from "./core/managers/ModelManager.js";
import validationService from "./core/services/ValidationService.js";
import inferenceProcessor from "./core/services/InferenceProcessorCore.js";
import { configLoaders } from "./config/loaders.js";
import wsManager from "./websocket/index.js";
import attendanceService from "./services/business/AttendanceService.js";
import uploadSnapshotPushService from "./core/services/UploadSnapshotPushService.js";
import livePresenceService from "./services/business/LivePresenceService.js";
import kafkaEventService from "./core/kafka/KafkaEventService.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" })); // Increased limit for video frames
app.use(express.raw({ type: 'image/*', limit: '50mb' })); // For raw image data

// 1. General IP Throttling for all API endpoints
app.use("/api", globalRateLimiter);

// Health check endpoint (like Spring's /actuator/health)
app.get("/api/health", (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      validation: validationService.getAllStats() ? 'UP' : 'DOWN',
      inference: inferenceProcessor.getStats() ? 'UP' : 'DOWN',
      database: pool ? 'UP' : 'DOWN'
    }
  });
});

// System metrics endpoint (like SystemMetricsController)
app.get("/api/metrics", async (req, res) => {
  const metrics = {
    system: {
      memory: modelManager.getMemoryInfo(),
      uptime: process.uptime(),
      shutdownStatus: shutdownManager.isShuttingDown
    },
    cameras: validationService.getAllStats(),
    inference: inferenceProcessor.getStats(),
    queues: {
      pendingEvents: shutdownManager.pendingEvents.length,
      cameraQueues: Object.fromEntries(
        Array.from(shutdownManager.cameraQueues.entries()).map(([id, queue]) => [
          id,
          { size: queue.frames.length, maxSize: queue.maxSize }
        ])
      )
    }
  };
  
  res.json(metrics);
});

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/face", faceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/cameras", cameraRoutes);
// Apply extractScope before auth to parse headers, then validate after auth
app.use("/api/live", extractScope, liveRoutes);

// RTSP frame endpoint (like /controller/rtspframe)
app.post("/api/frames/rtsp/:cameraId", async (req, res) => {
  try {
    const { cameraId } = req.params;
    const frameData = req.body.frame || req.body; // Support both formats
    const metadata = {
      ...req.body.metadata,
      timestamp: req.body.timestamp || new Date().toISOString(),
      source: 'rtsp',
      contentType: req.headers['content-type']
    };

    const result = await validationService.validateAndQueueFrame(cameraId, frameData, metadata);
    
    if (result.queued) {
      res.status(202).json(result); // 202 Accepted
    } else {
      res.status(429).json(result); // 429 Too Many Requests
    }
  } catch (error) {
    console.error('Frame processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Smart search frame endpoint (like /controller/smartframe)
app.post("/api/frames/smart/:cameraId", async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { frame, profileId, searchParams } = req.body;
    
    // Similar to RTSP but with smart search profile
    const result = await validationService.validateAndQueueFrame(cameraId, frame, {
      ...req.body.metadata,
      timestamp: new Date().toISOString(),
      source: 'smart_search',
      profileId,
      searchParams
    });
    
    res.status(202).json(result);
  } catch (error) {
    console.error('Smart frame processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: "internal server error",
    error: env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Load configurations
    await configLoaders.syncAllConfigs();
    console.log('✅ Configurations loaded');
    
    // Initialize model manager
    await modelManager.initialize();
    console.log('✅ Model manager initialized');
    
    // Initialize inference processor
    await inferenceProcessor.initialize();
    console.log('✅ Inference processor initialized');
    
    // Validation service auto-initializes in constructor
    
    // Set up event handlers
    inferenceProcessor.on('eventsGenerated', (data) => {
      // Queue events for pushing (like EventPushService)
      data.events.forEach(event => {
        shutdownManager.queueEvent({
          ...event,
          cameraId: data.cameraId,
          timestamp: new Date().toISOString()
        });
      });
    });

    inferenceProcessor.on('memoryPressure', (memoryInfo) => {
      console.warn('⚠️ Memory pressure detected:', memoryInfo);
      // Could implement circuit breaker here
    });

    // Initialize snapshot uploader
    try {
      await uploadSnapshotPushService.initialize();
      console.log('✅ Snapshot uploader initialized');
    } catch (e) {
      console.warn('Snapshot uploader init failed:', e.message);
    }

    // Start server
    const server = app.listen(env.port, () => {
      console.log(`🚀 Backend API listening on http://localhost:${env.port}`);
      console.log(`📹 Video analytics service ready`);
    });
    try {
      await wsManager.initialize(server);
      console.log("✅ WebSocket initialized");
      attendanceService.setBroadcaster((event, payload) => {
        if (event === "attendance.marked" || event === "attendance.batchMarked") {
          wsManager.emitAttendanceUpdate(payload);
        }
      });
      livePresenceService.setBroadcaster((event, payload) => {
        if (event === "presence.change") {
          wsManager.emitPresenceUpdate(payload);
        }
      });
    } catch (e) {
      console.warn("WebSocket disabled:", e.message);
    }

    // Subscribe to enterprise Kafka topics
    try {
      await kafkaEventService.subscribeToDeviceEvents(async (evt) => {
        wsManager.emitPresenceUpdate({ type: 'device_event', evt });
      });
      await kafkaEventService.subscribeToAIDetections(async (evt) => {
        wsManager.emitAttendanceUpdate({ type: 'ai_detection', evt });
      });
      console.log('✅ Subscribed to enterprise Kafka topics');
    } catch (e) {
      console.warn('Kafka enterprise subscriptions failed:', e.message);
    }

    // Graceful shutdown handler
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
      
      // Stop accepting new requests
      server.close(async () => {
        // Run shutdown manager
        await shutdownManager.shutdown(signal);
        
        // Close database pool
        await pool.end();
        
        console.log('👋 Shutdown complete');
        process.exit(0);
      });
      
      // Force shutdown after timeout
      setTimeout(() => {
        console.error('Force shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on("SIGINT", () => shutdown('SIGINT'));
    process.on("SIGTERM", () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

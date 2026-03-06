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
import livePresenceService from "./services/business/LivePresenceService.js";
import deviceBridgeService from "./core/devices/DeviceBridgeService.js";

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
// Apply extractScope before auth to parse headers, then validate after auth
app.use("/api/live", extractScope, liveRoutes);

// ──────────────────────────────────────────
// Device Management API Routes
// ──────────────────────────────────────────

// Register a new device
app.post("/api/devices/register", async (req, res) => {
  try {
    const { deviceType, config } = req.body;
    const info = await deviceBridgeService.registerDevice(deviceType, config);
    res.status(201).json({ success: true, device: info });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Start a registered device
app.post("/api/devices/:deviceId/start", async (req, res) => {
  try {
    const info = await deviceBridgeService.startDevice(req.params.deviceId);
    res.json({ success: true, device: info });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stop a registered device
app.post("/api/devices/:deviceId/stop", async (req, res) => {
  try {
    const info = await deviceBridgeService.stopDevice(req.params.deviceId);
    res.json({ success: true, device: info });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List all registered devices
app.get("/api/devices/bridge/list", (req, res) => {
  res.json(deviceBridgeService.getStats());
});

// Get device info
app.get("/api/devices/bridge/:deviceId", (req, res) => {
  try {
    const info = deviceBridgeService.getDeviceInfo(req.params.deviceId);
    res.json(info);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Remove a device
app.delete("/api/devices/bridge/:deviceId", async (req, res) => {
  try {
    await deviceBridgeService.removeDevice(req.params.deviceId);
    res.json({ success: true, message: `Device ${req.params.deviceId} removed` });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Receive NUC/LPU edge detection results (bypasses inference)
app.post("/api/devices/:deviceId/detections", async (req, res) => {
  try {
    await deviceBridgeService.routeDetections(req.params.deviceId, req.body);
    res.status(202).json({ success: true, message: 'Detections received' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────
// Frame Ingestion (routes through DeviceBridge)
// ──────────────────────────────────────────

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

    // Route through DeviceBridgeService (supports both registered and ad-hoc devices)
    await deviceBridgeService.routeFrame(cameraId, frameData, metadata);
    res.status(202).json({ queued: true, cameraId, timestamp: metadata.timestamp });
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

    // Initialize device bridge service
    await deviceBridgeService.initialize();

    // Auto-register webcam device if enabled
    if (env.analytics.webcamEnabled) {
      try {
        await deviceBridgeService.registerDevice('webcam', {
          deviceId: env.analytics.webcamDeviceId,
          fps: env.analytics.webcamFps,
          cameraIndex: env.analytics.webcamCameraIndex,
          name: `Webcam-${env.analytics.webcamCameraIndex}`,
        });
        await deviceBridgeService.startDevice(env.analytics.webcamDeviceId);
        console.log(`✅ Webcam device registered: ${env.analytics.webcamDeviceId}`);
        console.log(`   Run: python edge-devices/webcam/webcam_capture.py --camera-id ${env.analytics.webcamDeviceId}`);
      } catch (err) {
        console.warn('⚠️ Webcam auto-registration failed:', err.message);
      }
    }
    console.log('✅ Device bridge service initialized');

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

    // Start server
    const server = app.listen(env.port, () => {
      console.log(`🚀 Backend API listening on http://localhost:${env.port}`);
      console.log(`📹 Video analytics service ready`);
    });
    try {
      wsManager.initialize(server);
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

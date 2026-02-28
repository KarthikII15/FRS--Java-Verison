import shutdownManager from '../managers/ShutdownManager.js';
import { configLoaders } from '../../config/loaders.js';
import { env } from '../../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import EventEmitter from 'events';

class ValidationService extends EventEmitter {
  constructor() {
    super();
    this.cameraConfigs = new Map();
    this.activeCameras = new Set();
    this.frameCounters = new Map(); // for motion skipping
    this.processingStats = new Map();
    
    // Initialize from config
    this.initialize();
  }

  async initialize() {
    try {
      // Load camera configurations from rule_config.json
      const ruleConfig = await configLoaders.loadRuleConfig();
      
      // Create queues for each camera that has rules enabled
      for (const [cameraId, rules] of Object.entries(ruleConfig)) {
        if (rules && rules.length > 0) {
          this.registerCamera(cameraId, rules);
        }
      }
      
      console.log(`[ValidationService] Initialized with ${this.activeCameras.size} cameras`);
    } catch (error) {
      console.error('[ValidationService] Initialization error:', error);
    }
  }

  // Register a camera with its rules (like Spring's per-camera config)
  registerCamera(cameraId, rules, config = {}) {
    if (this.activeCameras.has(cameraId)) {
      console.warn(`[ValidationService] Camera ${cameraId} already registered, updating config`);
    }

    // Create queue in shutdown manager
    const queue = shutdownManager.createCameraQueue(
      cameraId, 
      env.analytics.frameQueueSize
    );

    // Store camera config
    this.cameraConfigs.set(cameraId, {
      rules: rules || [],
      queue,
      enabled: true,
      motionSkipFrames: config.motionSkipFrames || env.analytics.motionSkipFrames,
      frameRate: config.frameRate || 30,
      registeredAt: new Date().toISOString(),
      lastFrameTime: null
    });

    this.activeCameras.add(cameraId);
    this.frameCounters.set(cameraId, 0);
    this.processingStats.set(cameraId, {
      framesReceived: 0,
      framesValidated: 0,
      framesQueued: 0,
      framesDropped: 0,
      lastFrameTimestamp: null
    });

    console.log(`[ValidationService] Registered camera: ${cameraId} with ${rules.length} rules`);
    
    this.emit('cameraRegistered', {
      cameraId,
      rules: rules.length,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Validate and queue RTSP frame (like Spring's ValidationService)
  async validateAndQueueFrame(cameraId, frameData, metadata = {}) {
    // Check if system is shutting down
    if (shutdownManager.isShuttingDown) {
      throw new Error('System is shutting down');
    }

    // Check if camera is registered and enabled
    const cameraConfig = this.cameraConfigs.get(cameraId);
    if (!cameraConfig || !cameraConfig.enabled) {
      throw new Error(`Camera ${cameraId} not registered or disabled`);
    }

    // Update stats
    const stats = this.processingStats.get(cameraId);
    stats.framesReceived++;
    stats.lastFrameTimestamp = new Date().toISOString();

    // Step 1: Basic frame validation (like Spring's validation)
    const validationResult = this.validateFrame(frameData, metadata);
    if (!validationResult.valid) {
      this.emit('frameInvalid', {
        cameraId,
        reason: validationResult.reason,
        timestamp: new Date().toISOString()
      });
      return { queued: false, reason: validationResult.reason };
    }

    stats.framesValidated++;

    // Step 2: Motion-based frame skipping (like RuleEngineUtils.motionSkip)
    if (this.shouldSkipFrame(cameraId, metadata)) {
      return { 
        queued: false, 
        reason: 'motion_skip',
        skipCount: this.frameCounters.get(cameraId)
      };
    }

    // Step 3: Create enriched frame object
    const enrichedFrame = {
      id: uuidv4(),
      cameraId,
      data: frameData,
      metadata: {
        ...metadata,
        timestamp: metadata.timestamp || new Date().toISOString(),
        frameNumber: stats.framesReceived
      },
      rules: cameraConfig.rules,
      validationTime: new Date().toISOString(),
      retryConfig: {
        maxRetries: 3,
        currentRetry: 0
      }
    };

    // Step 4: Queue the frame (with backpressure handling)
    try {
      const queueSize = shutdownManager.addToCameraQueue(cameraId, enrichedFrame);
      stats.framesQueued++;
      
      this.emit('frameQueued', {
        cameraId,
        frameId: enrichedFrame.id,
        queueSize,
        timestamp: new Date().toISOString()
      });

      return {
        queued: true,
        frameId: enrichedFrame.id,
        queueSize,
        timestamp: enrichedFrame.metadata.timestamp
      };
    } catch (error) {
      stats.framesDropped++;
      
      this.emit('frameQueueFailed', {
        cameraId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        queued: false,
        reason: 'queue_failed',
        error: error.message
      };
    }
  }

  // Validate frame integrity and format
  validateFrame(frameData, metadata) {
    // Basic validation rules
    if (!frameData) {
      return { valid: false, reason: 'no_frame_data' };
    }

    // Check if frame is base64 encoded image
    if (typeof frameData === 'string') {
      if (!frameData.startsWith('data:image') && !this.isBase64(frameData)) {
        return { valid: false, reason: 'invalid_frame_format' };
      }
    } else if (Buffer.isBuffer(frameData)) {
      // Check minimum size for a valid image
      if (frameData.length < 100) {
        return { valid: false, reason: 'frame_too_small' };
      }
    } else {
      return { valid: false, reason: 'unsupported_frame_type' };
    }

    // Validate required metadata
    if (!metadata || !metadata.timestamp) {
      return { valid: false, reason: 'missing_timestamp' };
    }

    // Check frame rate (optional)
    if (metadata.expectedFps) {
      const cameraConfig = this.cameraConfigs.get(metadata.cameraId);
      if (cameraConfig && metadata.expectedFps > cameraConfig.frameRate * 1.5) {
        return { valid: false, reason: 'fps_too_high' };
      }
    }

    return { valid: true };
  }

  // Check if frame should be skipped based on motion detection
  shouldSkipFrame(cameraId, metadata) {
    const cameraConfig = this.cameraConfigs.get(cameraId);
    if (!cameraConfig || cameraConfig.motionSkipFrames <= 0) {
      return false;
    }

    // Get current skip counter
    let counter = this.frameCounters.get(cameraId) || 0;
    
    // Check if we should process this frame
    if (counter === 0) {
      // Process this frame, reset counter
      this.frameCounters.set(cameraId, cameraConfig.motionSkipFrames);
      return false;
    } else {
      // Skip this frame, decrement counter
      this.frameCounters.set(cameraId, counter - 1);
      return true;
    }
  }

  // Helper: Check if string is base64
  isBase64(str) {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  // Enable/disable camera processing
  setCameraEnabled(cameraId, enabled) {
    const config = this.cameraConfigs.get(cameraId);
    if (config) {
      config.enabled = enabled;
      console.log(`[ValidationService] Camera ${cameraId} ${enabled ? 'enabled' : 'disabled'}`);
      
      this.emit('cameraStatusChanged', {
        cameraId,
        enabled,
        timestamp: new Date().toISOString()
      });
      
      return true;
    }
    return false;
  }

  // Get camera statistics
  getCameraStats(cameraId) {
    const stats = this.processingStats.get(cameraId);
    const config = this.cameraConfigs.get(cameraId);
    
    if (!stats || !config) {
      return null;
    }

    return {
      ...stats,
      queueSize: config.queue.frames.length,
      maxQueueSize: config.queue.maxSize,
      enabled: config.enabled,
      rules: config.rules.length
    };
  }

  // Get all camera stats
  getAllStats() {
    const stats = {};
    for (const [cameraId, _] of this.cameraConfigs) {
      stats[cameraId] = this.getCameraStats(cameraId);
    }
    return stats;
  }
}

// Singleton instance
const validationService = new ValidationService();
export default validationService;
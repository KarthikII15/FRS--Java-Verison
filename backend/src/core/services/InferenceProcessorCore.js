import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import EventEmitter from 'events';
import shutdownManager from '../managers/ShutdownManager.js';
import modelManager from '../managers/ModelManager.js';
import { env } from '../../config/env.js';
import { configLoaders } from '../../config/loaders.js';
import { getRuleClassByType } from '../rules/index.js';
import kafkaEventService from '../kafka/KafkaEventService.js';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class InferenceProcessorCore extends EventEmitter {
  constructor() {
    super();
    this.workers = new Map(); // cameraId -> worker
    this.rules = new Map(); // ruleId -> rule configuration
    this.ruleInstances = new Map(); // cameraId -> Map<ruleId, instance>
    this.ruleMetrics = new Map(); // ruleType -> metrics
    this.processingStats = new Map();
    this.activeInferences = new Set();
    this.workerPool = [];
    this.nextWorkerIndex = 0;
    
    // Initialize worker pool
    this.initializeWorkerPool();
  }

  initializeWorkerPool() {
    const poolSize = env.analytics.inferenceThreads || 4;
    
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(path.join(__dirname, '../workers/InferenceWorker.js'));
      
      worker.on('message', (message) => {
        this.handleWorkerMessage(message);
      });
      
      worker.on('error', (error) => {
        console.error(`[InferenceProcessor] Worker ${i} error:`, error);
        this.restartWorker(i);
      });
      
      worker.on('exit', (code) => {
        if (code !== 0) {
          console.warn(`[InferenceProcessor] Worker ${i} exited with code ${code}`);
          this.restartWorker(i);
        }
      });
      
      this.workerPool.push({
        id: i,
        worker,
        busy: false,
        currentTask: null
      });
    }
    
    console.log(`[InferenceProcessor] Initialized ${poolSize} inference workers`);
  }

  async initialize() {
    try {
      // Load rules from configuration
      await this.loadRules();
      
      // Initialize model manager
      await modelManager.initialize();
      
      // Start processing loop
      this.startProcessing();
      
      console.log('[InferenceProcessor] Core initialized successfully');
    } catch (error) {
      console.error('[InferenceProcessor] Initialization failed:', error);
      throw error;
    }
  }

  async loadRules() {
    const ruleConfig = await configLoaders.loadRuleConfig();
    
    // Flatten rule configurations
    for (const [cameraId, cameraRules] of Object.entries(ruleConfig)) {
      for (const rule of cameraRules) {
        const ruleId = `${cameraId}_${rule.type}_${Date.now()}`;
        this.rules.set(ruleId, {
          id: ruleId,
          cameraId,
          type: rule.type,
          parameters: rule.parameters || {},
          enabled: rule.enabled !== false,
          priority: rule.priority || 'normal',
          createdAt: new Date().toISOString()
        });
      }
    }
    
    console.log(`[InferenceProcessor] Loaded ${this.rules.size} rules`);
  }

  startProcessing() {
    // Check for frames in queues every 100ms
    this.processingInterval = setInterval(() => {
      this.processQueuedFrames();
    }, 100);
    
    // Register shutdown handler
    shutdownManager.registerShutdownHandler('inferenceProcessor', async () => {
      await this.shutdown();
    });
  }

  processQueuedFrames() {
    if (shutdownManager.isShuttingDown) {
      return;
    }

    // Check memory threshold
    if (modelManager.isMemoryThresholdExceeded()) {
      console.warn('[InferenceProcessor] Memory threshold exceeded, throttling processing');
      this.emit('memoryPressure', modelManager.getMemoryInfo());
      return;
    }

    // Process frames from each camera queue
    for (const [cameraId, queue] of shutdownManager.cameraQueues) {
      // Skip if camera is paused or no frames
      if (queue.frames.length === 0) {
        continue;
      }

      // Get available worker
      const worker = this.getAvailableWorker();
      if (!worker) {
        // No workers available, skip for now
        continue;
      }

      // Get next frame
      const frame = shutdownManager.getNextFrame(cameraId);
      if (!frame) {
        continue;
      }

      // Submit to worker
      this.submitToWorker(worker, frame, cameraId);
    }
  }

  getAvailableWorker() {
    // Round-robin worker selection
    for (let i = 0; i < this.workerPool.length; i++) {
      const index = (this.nextWorkerIndex + i) % this.workerPool.length;
      const worker = this.workerPool[index];
      if (!worker.busy) {
        this.nextWorkerIndex = (index + 1) % this.workerPool.length;
        return worker;
      }
    }
    return null;
  }

  submitToWorker(worker, frame, cameraId) {
    const taskId = uuidv4();
    
    worker.busy = true;
    worker.currentTask = {
      id: taskId,
      frameId: frame.id,
      cameraId,
      submittedAt: Date.now()
    };

    this.activeInferences.add(taskId);

    // Update stats
    if (!this.processingStats.has(cameraId)) {
      this.processingStats.set(cameraId, {
        processed: 0,
        failed: 0,
        avgProcessingTime: 0,
        lastProcessedAt: null
      });
    }

    // Send to worker
    worker.worker.postMessage({
      type: 'inference',
      taskId,
      frame,
      cameraId,
      rules: this.getRulesForCamera(cameraId),
      models: this.getRequiredModelsForRules(frame.rules)
    });

    this.emit('inferenceStarted', {
      taskId,
      cameraId,
      frameId: frame.id,
      timestamp: new Date().toISOString()
    });
  }

  handleWorkerMessage(message) {
    const { type, taskId, result, error, workerId } = message;

    // Find worker
    const worker = this.workerPool.find(w => w.id === workerId);
    if (!worker) {
      console.error(`[InferenceProcessor] Unknown worker: ${workerId}`);
      return;
    }

    // Mark worker as available
    worker.busy = false;
    
    if (taskId) {
      this.activeInferences.delete(taskId);
    }

    switch (type) {
      case 'inferenceResult':
        this.handleInferenceResult(taskId, result);
        break;
      case 'inferenceError':
        this.handleInferenceError(taskId, error);
        break;
      case 'workerReady':
        console.log(`[InferenceProcessor] Worker ${workerId} ready`);
        break;
      default:
        console.warn(`[InferenceProcessor] Unknown message type: ${type}`);
    }
  }

  handleInferenceResult(taskId, result) {
    const { cameraId, detections, processingTime, frameId } = result;

    // Update stats
    const stats = this.processingStats.get(cameraId);
    if (stats) {
      stats.processed++;
      stats.avgProcessingTime = (stats.avgProcessingTime * (stats.processed - 1) + processingTime) / stats.processed;
      stats.lastProcessedAt = new Date().toISOString();
    }

    // Publish detections to Kafka
    kafkaEventService
      .publishDetection({
        cameraId,
        frameId,
        detections,
        metadata: result.metadata,
      })
      .catch((err) => {
        console.error('[InferenceProcessor] Failed to publish detections to Kafka:', err);
      });

    // Apply rules to detections
    const events = this.applyRules(cameraId, detections, result.metadata || {});

    // Publish rule-triggered events to Kafka
    if (events.length > 0) {
      kafkaEventService
        .publishDetection({
          cameraId,
          frameId,
          ruleEventCount: events.length,
        })
        .catch(() => {});
    }

    // Emit events for processing
    if (events.length > 0) {
      this.emit('eventsGenerated', {
        cameraId,
        events,
        frameId,
        timestamp: new Date().toISOString()
      });
    }

    this.emit('inferenceCompleted', {
      taskId,
      cameraId,
      detectionCount: detections.length,
      eventCount: events.length,
      processingTime,
      timestamp: new Date().toISOString()
    });
  }

  handleInferenceError(taskId, error) {
    console.error(`[InferenceProcessor] Inference failed for task ${taskId}:`, error);
    
    this.emit('inferenceFailed', {
      taskId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  getRulesForCamera(cameraId) {
    const cameraRules = [];
    for (const [_, rule] of this.rules) {
      if (rule.cameraId === cameraId && rule.enabled) {
        cameraRules.push(rule);
      }
    }
    return cameraRules;
  }

  getRequiredModelsForRules(rules) {
    const modelTypes = new Set();
    
    // Map rule types to required models (based on your Spring reference)
    const ruleToModel = {
      'ZoneIntrusion': ['person', 'vehicle'],
      'Loitering': ['person'],
      'FireSmoke': ['fireSmoke'],
      'ALPR': ['vehicle', 'license_plate'],
      'FaceRecognition': ['face', 'face_reid'],
      'VehicleCounting': ['vehicle'],
      'PersonCounting': ['person']
    };

    for (const rule of rules) {
      const models = ruleToModel[rule.type] || [];
      models.forEach(m => modelTypes.add(m));
    }

    return Array.from(modelTypes);
  }

  applyRules(cameraId, detections, metadata) {
    const events = [];
    const cameraRules = this.getRulesForCamera(cameraId);

    for (const rule of cameraRules) {
      try {
        const RuleClass = this.loadRuleClass(rule.type);
        if (!RuleClass) {
          continue;
        }

        // Cache rule instances per (cameraId, ruleId)
        if (!this.ruleInstances.has(cameraId)) {
          this.ruleInstances.set(cameraId, new Map());
        }
        const cameraRuleMap = this.ruleInstances.get(cameraId);

        let instance = cameraRuleMap.get(rule.id);
        if (!instance) {
          instance = new RuleClass({
            ruleId: rule.id,
            cameraId,
            type: rule.type,
            parameters: rule.parameters,
          });
          cameraRuleMap.set(rule.id, instance);
        }

        const ruleEvents = instance.process(detections, metadata) || [];
        events.push(...ruleEvents);

        // Update rule metrics
        if (!this.ruleMetrics.has(rule.type)) {
          this.ruleMetrics.set(rule.type, { triggered: 0, errors: 0 });
        }
        const metrics = this.ruleMetrics.get(rule.type);
        metrics.triggered += ruleEvents.length;
      } catch (error) {
        console.error(`[InferenceProcessor] Error applying rule ${rule.type}:`, error);
        if (!this.ruleMetrics.has(rule.type)) {
          this.ruleMetrics.set(rule.type, { triggered: 0, errors: 0 });
        }
        const metrics = this.ruleMetrics.get(rule.type);
        metrics.errors += 1;
      }
    }

    return events;
  }

  loadRuleClass(ruleType) {
    return getRuleClassByType(ruleType);
  }

  restartWorker(index) {
    console.log(`[InferenceProcessor] Restarting worker ${index}`);
    
    const oldWorker = this.workerPool[index];
    if (oldWorker) {
      oldWorker.worker.terminate();
    }

    const newWorker = new Worker(path.join(__dirname, '../workers/InferenceWorker.js'));
    
    newWorker.on('message', (message) => {
      this.handleWorkerMessage({ ...message, workerId: index });
    });
    
    newWorker.on('error', (error) => {
      console.error(`[InferenceProcessor] Restarted worker ${index} error:`, error);
    });
    
    this.workerPool[index] = {
      id: index,
      worker: newWorker,
      busy: false,
      currentTask: null
    };
  }

  async shutdown() {
    console.log('[InferenceProcessor] Shutting down...');
    
    // Clear processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Wait for active inferences to complete (with timeout)
    const timeout = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (this.activeInferences.size > 0) {
      if (Date.now() - startTime > timeout) {
        console.warn('[InferenceProcessor] Timeout waiting for inferences');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Terminate all workers
    for (const worker of this.workerPool) {
      await worker.worker.terminate();
    }

    console.log('[InferenceProcessor] Shutdown complete');
  }

  getStats() {
    return {
      activeInferences: this.activeInferences.size,
      workerStatus: this.workerPool.map(w => ({
        id: w.id,
        busy: w.busy,
        currentTask: w.currentTask
      })),
      cameraStats: Object.fromEntries(this.processingStats),
      memoryInfo: modelManager.getMemoryInfo()
    };
  }
}

// Singleton instance
const inferenceProcessor = new InferenceProcessorCore();
export default inferenceProcessor;
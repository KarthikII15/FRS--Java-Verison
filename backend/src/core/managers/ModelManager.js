import fs from 'fs/promises';
import path from 'path';
import { env } from '../../config/env.js';
import { configLoaders } from '../../config/loaders.js';
import EventEmitter from 'events';

// Note: You'll need to install openvino-node or similar
// For now, we'll create interfaces that you can later implement with actual OpenVINO bindings

class ModelManager extends EventEmitter {
  constructor() {
    super();
    this.models = new Map();
    this.modelConfigs = new Map();
    this.loadingPromises = new Map();
    this.device = 'CPU'; // or 'GPU' based on config
    this.initialized = false;
  }

  async initialize() {
    try {
      // Load model configuration
      const modelConfig = await configLoaders.loadModelConfig();
      
      // Initialize model paths
      for (const [modelId, config] of Object.entries(modelConfig)) {
        this.modelConfigs.set(modelId, {
          ...config,
          path: path.join(env.analytics.modelPath, config.path || ''),
          loaded: false
        });
      }

      console.log(`[ModelManager] Initialized with ${this.modelConfigs.size} model configurations`);
      this.initialized = true;
      
      // Start loading essential models
      await this.loadEssentialModels();
      
    } catch (error) {
      console.error('[ModelManager] Initialization error:', error);
      throw error;
    }
  }

  async loadEssentialModels() {
    const essentialModels = ['person', 'vehicle', 'face']; // Adjust based on your needs
    
    const loadPromises = essentialModels.map(async (modelType) => {
      try {
        await this.loadModel(modelType);
      } catch (error) {
        console.warn(`[ModelManager] Failed to load essential model ${modelType}:`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  async loadModel(modelId) {
    // Check if already loading
    if (this.loadingPromises.has(modelId)) {
      return this.loadingPromises.get(modelId);
    }

    const config = this.modelConfigs.get(modelId);
    if (!config) {
      throw new Error(`Model configuration not found: ${modelId}`);
    }

    // Create loading promise
    const loadPromise = this._loadModelInternal(modelId, config);
    this.loadingPromises.set(modelId, loadPromise);

    try {
      const model = await loadPromise;
      this.models.set(modelId, model);
      console.log(`[ModelManager] Loaded model: ${modelId}`);
      
      this.emit('modelLoaded', {
        modelId,
        config: config,
        timestamp: new Date().toISOString()
      });
      
      return model;
    } catch (error) {
      console.error(`[ModelManager] Failed to load model ${modelId}:`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(modelId);
    }
  }

  async _loadModelInternal(modelId, config) {
    // Delegate to the EdgeAI Python sidecar running on Jetson (or localhost for dev).
    // The sidecar owns model loading — ModelManager just needs to verify it is alive
    // and hand back a wrapper whose .infer() method proxies through the sidecar HTTP API.
    const edgeAIClient = (await import('../clients/EdgeAIClient.js')).default;

    try {
      const response = await edgeAIClient.http.get('/health');
      if (response.data?.status !== 'ok') {
        throw new Error(`EdgeAI sidecar returned unhealthy status: ${JSON.stringify(response.data)}`);
      }
      console.log(`[ModelManager] EdgeAI sidecar healthy — model "${modelId}" delegated.`);
    } catch (e) {
      // Non-fatal during local dev — Jetson may not be connected yet.
      // Operations that send embeddings directly (Path A) will still work.
      console.warn(`[ModelManager] EdgeAI sidecar unreachable for model "${modelId}": ${e.message}`);
      console.warn(`[ModelManager] Image-upload inference (Path B/C) will fail until sidecar is running.`);
    }

    return {
      id:          modelId,
      device:      'TENSORRT',
      loaded:      true,
      config:      config,
      async infer(inputBuffer) {
        // Re-import to always use the live instance (handles hot-reload scenarios)
        const { default: client } = await import('../clients/EdgeAIClient.js');
        if (Buffer.isBuffer(inputBuffer) || inputBuffer instanceof Uint8Array) {
          return client.recognizeImageBuffer(Buffer.from(inputBuffer), { modelId });
        }
        // embedding array passed directly — nothing to infer, just return it
        return { embedding: inputBuffer, detections: [], inferenceTime: 0 };
      },
      async warmup() {
        return true; // warmup is handled by the sidecar on its own startup
      },
    };
  }

  // Get loaded model
  getModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not loaded: ${modelId}`);
    }
    return model;
  }

  // Check if model is loaded
  isModelLoaded(modelId) {
    return this.models.has(modelId);
  }

  // Unload model to free memory
  async unloadModel(modelId) {
    const model = this.models.get(modelId);
    if (model) {
      // Cleanup logic here
      this.models.delete(modelId);
      console.log(`[ModelManager] Unloaded model: ${modelId}`);
      
      this.emit('modelUnloaded', {
        modelId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get model metadata
  getModelMetadata(modelId) {
    const config = this.modelConfigs.get(modelId);
    const model = this.models.get(modelId);
    
    return {
      config,
      loaded: !!model,
      device: this.device
    };
  }

  // Set inference device
  setDevice(device) {
    const validDevices = ['CPU', 'GPU', 'MYRIAD', 'FPGA', 'CUDA', 'TENSORRT'];
    if (!validDevices.includes(device)) {
      throw new Error(`Invalid device: ${device}`);
    }
    
    this.device = device;
    console.log(`[ModelManager] Device set to: ${device}`);
    
    // Reload models with new device
    this.reloadAllModels();
  }

  async reloadAllModels() {
    const modelIds = Array.from(this.models.keys());
    
    // Unload all models
    await Promise.all(Array.from(this.models.keys()).map(id => this.unloadModel(id)));
    
    // Reload essential models
    await this.loadEssentialModels();
    
    // Reload previously loaded models
    for (const modelId of modelIds) {
      if (!this.models.has(modelId)) {
        await this.loadModel(modelId).catch(err => 
          console.warn(`[ModelManager] Failed to reload ${modelId}:`, err)
        );
      }
    }
  }

  // Get system memory usage (like MemoryManager)
  getMemoryInfo() {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      heapUsedPercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      timestamp: new Date().toISOString()
    };
  }

  // Check if memory threshold exceeded
  isMemoryThresholdExceeded() {
    const memoryInfo = this.getMemoryInfo();
    return memoryInfo.heapUsedPercent > env.analytics.maxHeapMemoryPercent;
  }
}

// Singleton instance
const modelManager = new ModelManager();
export default modelManager;
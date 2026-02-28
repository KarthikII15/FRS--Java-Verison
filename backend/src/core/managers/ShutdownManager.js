import EventEmitter from 'events';

class ShutdownManager extends EventEmitter {
  constructor() {
    super();
    this.isShuttingDown = false;
    this.cameraQueues = new Map();
    this.executorPools = new Map();
    this.activeWorkers = new Set();
    this.pendingEvents = [];
    this.shutdownHandlers = [];
    
    this.shutdown = this.shutdown.bind(this);
    this.registerShutdownHandler = this.registerShutdownHandler.bind(this);
  }

  registerShutdownHandler(name, handler) {
    this.shutdownHandlers.push({ name, handler });
  }

  createCameraQueue(cameraId, maxSize = 100) {
    if (!this.cameraQueues.has(cameraId)) {
      const queue = {
        frames: [],
        maxSize,
        processing: false,
        createdAt: new Date().toISOString()
      };
      this.cameraQueues.set(cameraId, queue);
    }
    return this.cameraQueues.get(cameraId);
  }

  addToCameraQueue(cameraId, frame, maxRetries = 3) {
    if (this.isShuttingDown) {
      throw new Error('System is shutting down, cannot accept new frames');
    }

    const queue = this.cameraQueues.get(cameraId);
    if (!queue) {
      throw new Error(`No queue found for camera: ${cameraId}`);
    }

    if (queue.frames.length >= queue.maxSize) {
      const droppedFrame = queue.frames.shift();
      this.emit('frameDropped', {
        cameraId,
        timestamp: new Date().toISOString(),
        queueSize: queue.frames.length
      });
    }

    queue.frames.push({
      ...frame,
      queueTimestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries
    });

    return queue.frames.length;
  }

  getNextFrame(cameraId) {
    const queue = this.cameraQueues.get(cameraId);
    if (!queue || queue.frames.length === 0) {
      return null;
    }
    return queue.frames.shift();
  }

  registerWorker(workerId, cameraId) {
    this.activeWorkers.add({
      id: workerId,
      cameraId,
      startTime: new Date().toISOString()
    });
  }

  unregisterWorker(workerId) {
    for (const worker of this.activeWorkers) {
      if (worker.id === workerId) {
        this.activeWorkers.delete(worker);
        break;
      }
    }
  }

  queueEvent(event) {
    if (this.isShuttingDown) {
      if (event.priority === 'high') {
        this.pendingEvents.push(event);
      }
      return false;
    }
    this.pendingEvents.push(event);
    return true;
  }

  getPendingEvents(limit = 100) {
    return this.pendingEvents.splice(0, limit);
  }

  async shutdown(signal) {
    if (this.isShuttingDown) {
      return;
    }

    console.log(`[ShutdownManager] Received ${signal}, starting graceful shutdown...`);
    this.isShuttingDown = true;
    this.emit('shutdown', { signal, timestamp: new Date().toISOString() });

    const workerTimeout = 30000;
    const workerWaitStart = Date.now();

    while (this.activeWorkers.size > 0) {
      if (Date.now() - workerWaitStart > workerTimeout) {
        console.warn('[ShutdownManager] Worker timeout reached, forcing shutdown');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const queueTimeout = 15000;
    const queueWaitStart = Date.now();

    let totalFrames = 0;
    for (const [, queue] of this.cameraQueues) {
      totalFrames += queue.frames.length;
    }

    if (totalFrames > 0) {
      while (totalFrames > 0) {
        if (Date.now() - queueWaitStart > queueTimeout) {
          console.warn('[ShutdownManager] Queue processing timeout reached');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        totalFrames = 0;
        for (const [, queue] of this.cameraQueues) {
          totalFrames += queue.frames.length;
        }
      }
    }

    for (const handler of this.shutdownHandlers) {
      try {
        await handler.handler();
      } catch (error) {
        console.error(`[ShutdownManager] Error in handler ${handler.name}:`, error);
      }
    }

    this.cameraQueues.clear();
    this.executorPools.clear();
    this.activeWorkers.clear();

    console.log('[ShutdownManager] Graceful shutdown complete');
    this.emit('shutdownComplete');
  }

  getStatus() {
    const status = {
      isShuttingDown: this.isShuttingDown,
      activeWorkers: this.activeWorkers.size,
      pendingEvents: this.pendingEvents.length,
      cameras: {},
      timestamp: new Date().toISOString()
    };

    for (const [cameraId, queue] of this.cameraQueues) {
      status.cameras[cameraId] = {
        queueSize: queue.frames.length,
        maxSize: queue.maxSize,
        createdAt: queue.createdAt,
        processing: queue.processing
      };
    }

    return status;
  }
}

const shutdownManager = new ShutdownManager();
export default shutdownManager;
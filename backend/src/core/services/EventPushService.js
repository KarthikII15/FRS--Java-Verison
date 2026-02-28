import axios from 'axios';
import FormData from 'form-data';
import EventEmitter from 'events';
import shutdownManager from '../managers/ShutdownManager.js';
import { env } from '../../config/env.js';
import { v4 as uuidv4 } from 'uuid';

class EventPushService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.pushInterval = null;
    this.failedEvents = new Map(); // Store failed events for retry
    this.stats = {
      pushed: 0,
      failed: 0,
      retried: 0,
      lastPushTime: null
    };
    
    // Configuration from env (matching Spring's application.properties)
    this.monitoringUrl = env.analytics.monitoringUrl;
    this.uploadUrl = env.analytics.uploadUrl;
    this.batchSize = 10; // Number of events to push in one batch
    this.retryDelay = 5000; // 5 seconds
    this.maxRetries = 3;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.pushInterval = setInterval(() => {
      this.processEventQueue();
    }, 1000); // Check queue every second
    
    // Register shutdown handler
    shutdownManager.registerShutdownHandler('eventPushService', async () => {
      await this.shutdown();
    });
    
    console.log('[EventPushService] Started');
  }

  async processEventQueue() {
    if (shutdownManager.isShuttingDown) {
      return;
    }

    // Get pending events from shutdown manager
    const events = shutdownManager.getPendingEvents(this.batchSize);
    
    if (events.length === 0) {
      return;
    }

    try {
      await this.pushEvents(events);
      this.stats.pushed += events.length;
      this.stats.lastPushTime = new Date().toISOString();
      
      this.emit('eventsPushed', {
        count: events.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[EventPushService] Failed to push events:', error.message);
      
      // Handle failed events
      for (const event of events) {
        await this.handleFailedEvent(event);
      }
    }
  }

  async pushEvents(events) {
    // Format events like Spring's Event payload
    const payload = {
      events: events.map(event => ({
        id: event.id || uuidv4(),
        type: event.type,
        cameraId: event.cameraId,
        timestamp: event.timestamp,
        data: event.data || {},
        metadata: {
          source: event.source || 'analytics',
          confidence: event.confidence,
          ...event.metadata
        }
      })),
      batchId: uuidv4(),
      timestamp: new Date().toISOString()
    };

    // Push to monitoring URL (like Spring's montorning.url)
    if (this.monitoringUrl) {
      try {
        await axios.post(this.monitoringUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Batch-ID': payload.batchId
          },
          timeout: 5000
        });
        console.log(`[EventPushService] Pushed ${events.length} events to monitoring`);
      } catch (error) {
        throw new Error(`Monitoring push failed: ${error.message}`);
      }
    }

    // If events have snapshots, upload them separately (like UploadSnapshotPushService)
    const eventsWithSnapshots = events.filter(e => e.snapshot);
    if (eventsWithSnapshots.length > 0 && this.uploadUrl) {
      await this.uploadSnapshots(eventsWithSnapshots);
    }
  }

  async uploadSnapshots(events) {
    for (const event of events) {
      try {
        const formData = new FormData();
        
        // Add event metadata
        formData.append('eventId', event.id);
        formData.append('cameraId', event.cameraId);
        formData.append('timestamp', event.timestamp);
        
        // Add snapshot (like Spring's UploadSnapshot)
        if (event.snapshot.data) {
          formData.append('snapshot', event.snapshot.data, {
            filename: `snapshot_${event.id}.jpg`,
            contentType: 'image/jpeg'
          });
        }
        
        // Add additional metadata
        if (event.snapshot.metadata) {
          formData.append('metadata', JSON.stringify(event.snapshot.metadata));
        }

        await axios.post(this.uploadUrl, formData, {
          headers: {
            ...formData.getHeaders(),
            'X-Event-ID': event.id
          },
          timeout: 10000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        console.log(`[EventPushService] Uploaded snapshot for event ${event.id}`);
        
        this.emit('snapshotUploaded', {
          eventId: event.id,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error(`[EventPushService] Failed to upload snapshot for event ${event.id}:`, error.message);
        throw error;
      }
    }
  }

  async handleFailedEvent(event, retryCount = 0) {
    const eventId = event.id || uuidv4();
    
    if (!this.failedEvents.has(eventId)) {
      this.failedEvents.set(eventId, {
        event,
        retryCount: 0,
        firstFailure: new Date().toISOString()
      });
    }

    const failedEvent = this.failedEvents.get(eventId);
    
    if (failedEvent.retryCount < this.maxRetries) {
      // Schedule retry
      setTimeout(() => {
        this.retryEvent(eventId);
      }, this.retryDelay * Math.pow(2, failedEvent.retryCount)); // Exponential backoff
      
      failedEvent.retryCount++;
      this.stats.retried++;
      
      console.log(`[EventPushService] Scheduled retry ${failedEvent.retryCount} for event ${eventId}`);
    } else {
      // Max retries exceeded, log and discard
      console.error(`[EventPushService] Event ${eventId} failed after ${this.maxRetries} retries`);
      this.failedEvents.delete(eventId);
      this.stats.failed++;
      
      this.emit('eventDiscarded', {
        eventId,
        reason: 'max_retries_exceeded',
        timestamp: new Date().toISOString()
      });
    }
  }

  async retryEvent(eventId) {
    const failedEvent = this.failedEvents.get(eventId);
    if (!failedEvent) return;

    try {
      await this.pushEvents([failedEvent.event]);
      this.failedEvents.delete(eventId);
      this.stats.pushed++;
      console.log(`[EventPushService] Successfully retried event ${eventId}`);
    } catch (error) {
      console.error(`[EventPushService] Retry failed for event ${eventId}:`, error.message);
      
      if (failedEvent.retryCount < this.maxRetries) {
        // Schedule another retry
        setTimeout(() => {
          this.retryEvent(eventId);
        }, this.retryDelay * Math.pow(2, failedEvent.retryCount));
        failedEvent.retryCount++;
      } else {
        // Give up
        this.failedEvents.delete(eventId);
        this.stats.failed++;
        console.error(`[EventPushService] Giving up on event ${eventId}`);
      }
    }
  }

  // Method to queue an event directly (used by other services)
  queueEvent(event) {
    return shutdownManager.queueEvent(event);
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      pendingEvents: shutdownManager.pendingEvents.length,
      failedEvents: this.failedEvents.size,
      stats: this.stats,
      monitoringUrl: this.monitoringUrl,
      uploadUrl: this.uploadUrl
    };
  }

  async shutdown() {
    console.log('[EventPushService] Shutting down...');
    
    // Stop processing new events
    if (this.pushInterval) {
      clearInterval(this.pushInterval);
    }
    
    // Try to push remaining events
    const remainingEvents = shutdownManager.getPendingEvents(100);
    if (remainingEvents.length > 0) {
      console.log(`[EventPushService] Pushing ${remainingEvents.length} remaining events...`);
      try {
        await this.pushEvents(remainingEvents);
      } catch (error) {
        console.error('[EventPushService] Failed to push remaining events:', error);
      }
    }
    
    // Log failed events
    if (this.failedEvents.size > 0) {
      console.warn(`[EventPushService] ${this.failedEvents.size} events failed to push`);
    }
    
    this.isRunning = false;
    console.log('[EventPushService] Shutdown complete');
  }
}

// Singleton instance
const eventPushService = new EventPushService();
export default eventPushService;
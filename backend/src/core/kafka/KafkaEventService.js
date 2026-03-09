import EventEmitter from 'events';
import kafkaProducer from './KafkaProducer.js';
import KafkaConsumer from './KafkaConsumer.js';
import kafkaConfig from './KafkaConfig.js';
import shutdownManager from '../managers/ShutdownManager.js';

/**
 * KafkaEventService - high level event API mirroring Spring's event package.
 */
class KafkaEventService extends EventEmitter {
  constructor() {
    super();
    this.topicPrefix = kafkaConfig.topicPrefix;
    this.topics = {
      events: `${this.topicPrefix}events`,
      detections: `${this.topicPrefix}detections`,
      deviceEvents: `${this.topicPrefix}device-events`,
      aiDetections: `${this.topicPrefix}ai-detections`,
      alerts: `${this.topicPrefix}alerts`,
      smartSearch: `${this.topicPrefix}smart-search`,
      smartSearchResults: `${this.topicPrefix}smart-search-results`,
      systemMetrics: `${this.topicPrefix}system-metrics`,
    };

    this.eventConsumer = null;
    this.smartSearchConsumer = null;
    this.deviceEventsConsumer = null;
    this.aiDetectionsConsumer = null;

    shutdownManager.registerShutdownHandler('kafkaEventService', async () => {
      await this.shutdown();
    });
  }

  /**
   * Publish analytics event.
   * @param {any} event
   */
  async publishEvent(event) {
    await kafkaProducer.sendEvent(this.topics.events, event, event.id || undefined);
  }

  /**
   * Publish detection batch.
   * @param {any} detection
   */
  async publishDetection(detection) {
    await kafkaProducer.sendEvent(this.topics.detections, detection);
  }

  /**
   * Publish high-priority alert.
   * @param {any} alert
   */
  async publishAlert(alert) {
    await kafkaProducer.sendEvent(this.topics.alerts, alert, alert.id || undefined);
  }

  /**
   * Publish smart-search result.
   * @param {any} payload
   */
  async publishSmartSearchResult(payload) {
    await kafkaProducer.sendEvent(this.topics.smartSearchResults, payload, payload.id || undefined);
  }

  /**
   * Subscribe to events topic.
   * @param {(event:any)=>Promise<void>} handler
   */
  async subscribeToEvents(handler) {
    if (this.eventConsumer) return;
    this.eventConsumer = new KafkaConsumer(`${kafkaConfig.groupId}-events`);
    await this.eventConsumer.subscribe([this.topics.events]);
    await this.eventConsumer.run(async ({ topic, message }) => {
      try {
        const value = message.value?.toString() || '{}';
        const event = JSON.parse(value);
        await handler(event);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[KafkaEventService] subscribeToEvents handler error:', err);
      }
    });
  }

  /**
   * Subscribe to smart-search queries.
   * @param {(query:any)=>Promise<void>} handler
   */
  async subscribeToSmartSearch(handler) {
    if (this.smartSearchConsumer) return;
    this.smartSearchConsumer = new KafkaConsumer(`${kafkaConfig.groupId}-smart-search`);
    await this.smartSearchConsumer.subscribe([this.topics.smartSearch]);
    await this.smartSearchConsumer.run(async ({ message }) => {
      try {
        const value = message.value?.toString() || '{}';
        const query = JSON.parse(value);
        await handler(query);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[KafkaEventService] subscribeToSmartSearch handler error:', err);
      }
    });
  }

  async subscribeToDeviceEvents(handler) {
    if (this.deviceEventsConsumer) return;
    this.deviceEventsConsumer = new KafkaConsumer(`${kafkaConfig.groupId}-device-events`);
    await this.deviceEventsConsumer.subscribe([this.topics.deviceEvents]);
    await this.deviceEventsConsumer.run(async ({ message }) => {
      try {
        const value = message.value?.toString() || '{}';
        const evt = JSON.parse(value);
        await handler(evt);
      } catch (err) {
        console.error('[KafkaEventService] deviceEvents handler error:', err);
      }
    });
  }

  async subscribeToAIDetections(handler) {
    if (this.aiDetectionsConsumer) return;
    this.aiDetectionsConsumer = new KafkaConsumer(`${kafkaConfig.groupId}-ai-detections`);
    await this.aiDetectionsConsumer.subscribe([this.topics.aiDetections]);
    await this.aiDetectionsConsumer.run(async ({ message }) => {
      try {
        const value = message.value?.toString() || '{}';
        const evt = JSON.parse(value);
        await handler(evt);
      } catch (err) {
        console.error('[KafkaEventService] aiDetections handler error:', err);
      }
    });
  }

  async publishSystemMetrics(metrics) {
    await kafkaProducer.sendEvent(this.topics.systemMetrics, metrics);
  }

  async shutdown() {
    const closers = [];
    if (this.eventConsumer) closers.push(this.eventConsumer.close());
    if (this.smartSearchConsumer) closers.push(this.smartSearchConsumer.close());
    if (this.deviceEventsConsumer) closers.push(this.deviceEventsConsumer.close());
    if (this.aiDetectionsConsumer) closers.push(this.aiDetectionsConsumer.close());
    await Promise.allSettled(closers);
  }
}

const kafkaEventService = new KafkaEventService();
export default kafkaEventService;


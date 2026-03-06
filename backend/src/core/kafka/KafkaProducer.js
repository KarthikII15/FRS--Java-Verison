import EventEmitter from 'events';
import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import kafkaConfig from './KafkaConfig.js';
import shutdownManager from '../managers/ShutdownManager.js';

/**
 * KafkaProducer - singleton producer with basic retry + DLQ support.
 */
class KafkaProducer extends EventEmitter {
  constructor() {
    super();
    this.kafka = new Kafka({
      brokers: kafkaConfig.brokers,
      clientId: kafkaConfig.clientId,
      ssl: kafkaConfig.ssl || undefined,
      sasl: kafkaConfig.sasl,
    });
    this.producer = this.kafka.producer();
    this.connected = false;

    this.topicPrefix = kafkaConfig.topicPrefix;
    this.topics = {
      rawFrames: `${this.topicPrefix}raw-frames`,
      detections: `${this.topicPrefix}detections`,
      events: `${this.topicPrefix}events`,
      alerts: `${this.topicPrefix}alerts`,
      smartSearch: `${this.topicPrefix}smart-search`,
      smartSearchResults: `${this.topicPrefix}smart-search-results`,
      deadLetter: `${this.topicPrefix}dead-letter`,
      systemMetrics: `${this.topicPrefix}system-metrics`,
    };

    shutdownManager.registerShutdownHandler('kafkaProducer', async () => {
      await this.close();
    });
  }

  /**
   * Connect producer (idempotent).
   */
  async connect() {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
    this.emit('connected');
  }

  /**
   * Send a single event to a topic.
   *
   * @param {string} topic
   * @param {any} event
   * @param {string} [key]
   */
  async sendEvent(topic, event, key = uuidv4()) {
    await this.connect();
    const payload = {
      key,
      value: JSON.stringify(event),
      headers: {
        'x-event-type': String(event.type || ''),
      },
    };

    try {
      await this.producer.send({
        topic,
        messages: [payload],
      });
      this.emit('sent', { topic, key });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[KafkaProducer] sendEvent error, routing to DLQ:', err);
      await this.routeToDeadLetter(topic, payload, err);
    }
  }

  /**
   * Send a batch of events.
   *
   * @param {Array<{topic:string,event:any,key?:string}>} events
   */
  async sendBatch(events) {
    if (!events || events.length === 0) return;
    await this.connect();

    const batchesByTopic = new Map();
    for (const e of events) {
      const topic = e.topic;
      if (!batchesByTopic.has(topic)) {
        batchesByTopic.set(topic, []);
      }
      batchesByTopic.get(topic).push({
        key: e.key || uuidv4(),
        value: JSON.stringify(e.event),
        headers: {
          'x-event-type': String(e.event.type || ''),
        },
      });
    }

    for (const [topic, messages] of batchesByTopic.entries()) {
      try {
        await this.producer.send({ topic, messages });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[KafkaProducer] sendBatch error, routing to DLQ:', err);
        for (const msg of messages) {
          await this.routeToDeadLetter(topic, msg, err);
        }
      }
    }
  }

  async routeToDeadLetter(sourceTopic, message, error) {
    try {
      await this.producer.send({
        topic: this.topics.deadLetter,
        messages: [
          {
            key: message.key,
            value: JSON.stringify({
              sourceTopic,
              original: message.value?.toString(),
              error: error?.message,
            }),
          },
        ],
      });
    } catch (err) {
      // Last resort: log only
      // eslint-disable-next-line no-console
      console.error('[KafkaProducer] Failed to route to DLQ:', err);
    }
  }

  async close() {
    if (!this.connected) return;
    try {
      await this.producer.disconnect();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[KafkaProducer] Disconnect error:', err);
    } finally {
      this.connected = false;
    }
  }
}

const kafkaProducer = new KafkaProducer();
export default kafkaProducer;


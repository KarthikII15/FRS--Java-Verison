import EventEmitter from 'events';
import { Kafka } from 'kafkajs';
import kafkaConfig from './KafkaConfig.js';
import shutdownManager from '../managers/ShutdownManager.js';

/**
 * Base Kafka consumer with manual control and error handling.
 */
export default class KafkaConsumer extends EventEmitter {
  /**
   * @param {string} groupId
   */
  constructor(groupId = kafkaConfig.groupId) {
    super();
    this.kafka = new Kafka({
      brokers: kafkaConfig.brokers,
      clientId: kafkaConfig.clientId,
      ssl: kafkaConfig.ssl || undefined,
      sasl: kafkaConfig.sasl,
    });
    this.consumer = this.kafka.consumer({ groupId });
    this.connected = false;

    shutdownManager.registerShutdownHandler(`kafkaConsumer:${groupId}`, async () => {
      await this.close();
    });
  }

  async connect() {
    if (this.connected) return;
    await this.consumer.connect();
    this.connected = true;
    this.emit('connected');
  }

  /**
   * Subscribe to one or more topics.
   *
   * @param {string[]} topics
   */
  async subscribe(topics) {
    await this.connect();
    for (const topic of topics) {
      // eslint-disable-next-line no-await-in-loop
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }
  }

  /**
   * Start consuming with the given handler.
   *
   * @param {(payload:{topic:string,partition:number,message:import('kafkajs').KafkaMessage})=>Promise<void>} handler
   */
  async run(handler) {
    await this.connect();
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          await handler({ topic, partition, message });
        } catch (err) {
          this.emit('handlerError', { topic, partition, message, error: err });
        }
      },
    });

    this.consumer.on(this.consumer.events.CRASH, (event) => {
      this.emit('crash', event);
    });
    this.consumer.on(this.consumer.events.REBALANCING, (event) => {
      this.emit('rebalancing', event);
    });
    this.consumer.on(this.consumer.events.REBALANCED, (event) => {
      this.emit('rebalanced', event);
    });
  }

  async pause(topics) {
    this.consumer.pause(
      topics.map((topic) => ({
        topic,
      })),
    );
  }

  async resume(topics) {
    this.consumer.resume(
      topics.map((topic) => ({
        topic,
      })),
    );
  }

  async close() {
    if (!this.connected) return;
    try {
      await this.consumer.disconnect();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[KafkaConsumer] Disconnect error:', err);
    } finally {
      this.connected = false;
    }
  }
}


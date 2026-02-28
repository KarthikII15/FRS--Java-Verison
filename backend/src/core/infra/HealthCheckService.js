import EventEmitter from 'events';
import { Kafka } from 'kafkajs';
import kafkaConfig from '../kafka/KafkaConfig.js';

/**
 * HealthCheckService - basic Kafka connectivity + topic status checks.
 */
class HealthCheckService extends EventEmitter {
  constructor() {
    super();
    this.kafka = new Kafka({
      brokers: kafkaConfig.brokers,
      clientId: `${kafkaConfig.clientId}-health`,
      ssl: kafkaConfig.ssl || undefined,
      sasl: kafkaConfig.sasl,
    });
  }

  /**
   * Check Kafka connectivity by requesting metadata.
   */
  async checkKafka() {
    const admin = this.kafka.admin();
    try {
      await admin.connect();
      const metadata = await admin.fetchTopicMetadata();
      return {
        status: 'UP',
        topics: metadata.topics.map((t) => t.name),
      };
    } catch (err) {
      return {
        status: 'DOWN',
        error: err.message,
      };
    } finally {
      await admin.disconnect();
    }
  }
}

const healthCheckService = new HealthCheckService();
export default healthCheckService;


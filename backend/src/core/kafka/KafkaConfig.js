import { env } from '../../config/env.js';

class KafkaConfig {
  constructor() {
    this.brokers = env.kafka.brokers;
    this.clientId = env.kafka.clientId;
    this.groupId = env.kafka.groupId;
    this.sslEnabled = env.kafka.sslEnabled;
    this.sasl = null;
    
    if (env.kafka.saslMechanism && env.kafka.saslUsername && env.kafka.saslPassword) {
      this.sasl = {
        mechanism: env.kafka.saslMechanism,
        username: env.kafka.saslUsername,
        password: env.kafka.saslPassword
      };
    }

    this.topics = env.kafka.topics;
    this.numPartitions = env.kafka.numPartitions;
    this.replicationFactor = env.kafka.replicationFactor;
  }

  getKafkaConfig() {
    const config = {
      clientId: this.clientId,
      brokers: this.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    };

    if (this.sslEnabled) {
      config.ssl = true;
    }

    if (this.sasl) {
      config.sasl = this.sasl;
    }

    return config;
  }

  getConsumerConfig() {
    return {
      groupId: this.groupId,
      sessionTimeout: env.kafka.sessionTimeout,
      rebalanceTimeout: env.kafka.rebalanceTimeout,
      maxBytesPerPartition: 1048576,
      minBytes: 1,
      maxBytes: 10485760,
      maxWaitTimeInMs: 5000,
      retry: {
        retries: 5
      }
    };
  }

  getProducerConfig() {
    return {
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
      maxInFlightRequests: 5,
      idempotent: true
    };
  }

  getTopicName(key) {
    return this.topics[key] || `${env.kafka.topicPrefix}${key}`;
  }
}

export default new KafkaConfig();


import { Kafka } from 'kafkajs';
import kafkaConfig from '../src/core/kafka/KafkaConfig.js';

async function run() {
  const kafka = new Kafka({
    clientId: `${kafkaConfig.clientId}-admin`,
    brokers: kafkaConfig.brokers,
    retry: { retries: 5 },
  });

  const admin = kafka.admin();
  await admin.connect();

  const topics = [
    `${kafkaConfig.topicPrefix}events`,
    `${kafkaConfig.topicPrefix}detections`,
    `${kafkaConfig.topicPrefix}device-events`,
    `${kafkaConfig.topicPrefix}ai-detections`,
    `${kafkaConfig.topicPrefix}alerts`,
    `${kafkaConfig.topicPrefix}smart-search`,
    `${kafkaConfig.topicPrefix}smart-search-results`,
    `${kafkaConfig.topicPrefix}system-metrics`,
    `${kafkaConfig.topicPrefix}snapshots`,
    `${kafkaConfig.topicPrefix}dead-letter`,
  ];

  const existing = new Set((await admin.listTopics()) || []);
  const toCreate = topics
    .filter((t) => !existing.has(t))
    .map((t) => ({
      topic: t,
      numPartitions: kafkaConfig.numPartitions || 3,
      replicationFactor: kafkaConfig.replicationFactor || 1,
    }));

  if (toCreate.length > 0) {
    await admin.createTopics({ topics: toCreate, waitForLeaders: true });
    console.log(`[create-topics] Created topics: ${toCreate.map((t) => t.topic).join(', ')}`);
  } else {
    console.log('[create-topics] All topics already exist');
  }

  await admin.disconnect();
}

run().catch((err) => {
  console.error('[create-topics] Failed:', err);
  process.exit(1);
});

import KafkaConsumer from '../kafka/KafkaConsumer.js';
import kafkaConfig from '../kafka/KafkaConfig.js';
import shutdownManager from '../managers/ShutdownManager.js';
import kafkaEventService from '../kafka/KafkaEventService.js';
import edgeAIClient from '../clients/EdgeAIClient.js';

/**
 * SnapshotProcessor - consumes snapshot upload requests from Kafka.
 * In a full implementation this would retrieve images from object storage
 * or raw-frame topics and delegate to UploadSnapshotPushService.
 */
class SnapshotProcessor {
  constructor() {
    this.consumer = new KafkaConsumer(`${kafkaConfig.groupId}-snapshots`);
    this.topic = `${kafkaConfig.topicPrefix}snapshots`;

    shutdownManager.registerShutdownHandler('snapshotProcessor', async () => {
      await this.shutdown();
    });
  }

  async start() {
    await this.consumer.subscribe([this.topic]);
    await this.consumer.run(async ({ message }) => {
      const value = message.value?.toString() || '{}';
      let payload;
      try {
        payload = JSON.parse(value);
      } catch {
        return;
      }

      const url = payload?.snapshotUrl || payload?.data?.snapshotUrl;
      if (url) {
        try {
          const aiRes = await edgeAIClient.recognizeByUrl(url, { source: 'snapshot' });
          await kafkaEventService.publishDetection({
            snapshotUrl: url,
            detections: aiRes?.detections || [],
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          await kafkaEventService.publishEvent({
            type: 'SNAPSHOT_PROCESSING_FAILED',
            timestamp: new Date().toISOString(),
            error: e.message,
          });
        }
      }
    });
  }

  async shutdown() {
    await this.consumer.close();
  }
}

const snapshotProcessor = new SnapshotProcessor();
export default snapshotProcessor;


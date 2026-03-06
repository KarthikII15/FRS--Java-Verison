import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import EventEmitter from 'events';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';
import shutdownManager from '../managers/ShutdownManager.js';
import kafkaEventService from '../kafka/KafkaEventService.js';

/**
 * UploadSnapshotPushService
 *
 * Dedicated service for large snapshot uploads with:
 * - Temporary disk storage
 * - Optional compression with sharp
 * - Retry with backoff
 * - Size-based pruning of temp directory
 * - Parallel uploads with concurrency control
 */
class UploadSnapshotPushService extends EventEmitter {
  constructor() {
    super();
    this.tempDir =
      process.env.SNAPSHOT_TEMP_DIR ||
      path.join(os.tmpdir(), 'attendance-snapshots');
    this.concurrency = Number(process.env.SNAPSHOT_UPLOAD_CONCURRENCY || 4);
    this.retryDelayMs = Number(process.env.SNAPSHOT_RETRY_DELAY_MS || 2000);
    this.maxRetries = Number(process.env.SNAPSHOT_MAX_RETRIES || 3);
    this.maxTempSizeMb = Number(process.env.SNAPSHOT_MAX_TEMP_MB || 512);

    this.queue = [];
    this.active = 0;
    this.running = false;
  }

  async initialize() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[UploadSnapshot] Failed to create temp dir:', err);
    }

    shutdownManager.registerShutdownHandler('uploadSnapshotPushService', async () => {
      await this.shutdown();
    });

    this.running = true;
    this.processLoop().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[UploadSnapshot] processLoop error:', err);
    });
  }

  /**
   * Enqueue a snapshot upload task.
   *
   * @param {Object} task
   * @param {Buffer|string} task.data
   * @param {Object} task.metadata
   */
  enqueue(task) {
    const job = {
      id: uuidv4(),
      retries: 0,
      ...task,
    };
    this.queue.push(job);
    this.emit('enqueued', { id: job.id });
    return job.id;
  }

  async processLoop() {
    while (this.running && !shutdownManager.isShuttingDown) {
      while (this.active < this.concurrency && this.queue.length > 0) {
        const job = this.queue.shift();
        this.active += 1;
        this.upload(job)
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error('[UploadSnapshot] upload error:', err);
          })
          .finally(() => {
            this.active -= 1;
          });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async upload(job) {
    const { id, data, metadata } = job;

    let tempPath;
    try {
      await this.ensureTempSpace();
      tempPath = path.join(this.tempDir, `snapshot_${id}.jpg`);
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'binary');

      // Compress image with sharp
      const compressed = await sharp(buf).jpeg({ quality: 80 }).toBuffer();
      await fs.writeFile(tempPath, compressed);

      const snapshotUrl = `file://${tempPath}`;

      // Publish snapshot URL as an event to Kafka
      await kafkaEventService.publishEvent({
        id,
        type: 'SNAPSHOT_UPLOADED',
        timestamp: new Date().toISOString(),
        data: {
          snapshotUrl,
          ...metadata,
        },
      });

      this.emit('uploaded', { id, snapshotUrl });
    } catch (err) {
      if (job.retries < this.maxRetries && !shutdownManager.isShuttingDown) {
        job.retries += 1;
        setTimeout(() => {
          this.queue.push(job);
        }, this.retryDelayMs * job.retries);
        this.emit('retry', { id, retries: job.retries });
      } else {
        this.emit('failed', { id, error: err.message });
      }
    }
  }

  async ensureTempSpace() {
    try {
      const entries = await fs.readdir(this.tempDir, { withFileTypes: true });
      let total = 0;
      const files = [];
      for (const e of entries) {
        if (!e.isFile()) continue;
        const full = path.join(this.tempDir, e.name);
        const stat = await fs.stat(full);
        total += stat.size;
        files.push({ path: full, mtime: stat.mtimeMs, size: stat.size });
      }
      const maxBytes = this.maxTempSizeMb * 1024 * 1024;
      if (total <= maxBytes) return;

      files.sort((a, b) => a.mtime - b.mtime);
      let toDelete = total - maxBytes;
      for (const f of files) {
        if (toDelete <= 0) break;
        await fs.unlink(f.path);
        toDelete -= f.size;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[UploadSnapshot] ensureTempSpace error:', err);
    }
  }

  async shutdown() {
    this.running = false;
    const start = Date.now();
    const timeout = 10000;
    while (this.active > 0 && Date.now() - start < timeout) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

const uploadSnapshotPushService = new UploadSnapshotPushService();
export default uploadSnapshotPushService;


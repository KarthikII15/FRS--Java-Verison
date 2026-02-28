import EventEmitter from 'events';
import shutdownManager from '../managers/ShutdownManager.js';
import systemInfo from '../util/SystemInfo.js';
import kafkaEventService from '../kafka/KafkaEventService.js';

/**
 * InfraSopCoordinator
 *
 * Coordinates infrastructure SOPs:
 * - Monitors system metrics
 * - Emits alerts on threshold breach
 * - Can be extended to enforce auto-throttling
 */
class InfraSopCoordinator extends EventEmitter {
  constructor() {
    super();
    this.interval = null;
    this.cpuThreshold = Number(process.env.INFRA_CPU_THRESHOLD || 80);
    this.memThreshold = Number(process.env.INFRA_MEM_THRESHOLD_MB || 90);
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.checkHealth(), 30000);

    shutdownManager.registerShutdownHandler('infraSopCoordinator', async () => {
      this.stop();
    });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  checkHealth() {
    const metrics = systemInfo.getMetrics();
    const usedMemMb = (metrics.totalMem - metrics.freeMem) / (1024 * 1024);

    const payload = {
      ...metrics,
      usedMemMb,
      timestamp: new Date().toISOString(),
    };

    kafkaEventService.publishSystemMetrics(payload).catch(() => {});

    if (metrics.cpuPercent >= this.cpuThreshold) {
      const alert = {
        type: 'CPU_HIGH',
        cpuPercent: metrics.cpuPercent,
        timestamp: payload.timestamp,
      };
      this.emit('cpuHigh', alert);
      kafkaEventService.publishAlert(alert).catch(() => {});
    }
    if (usedMemMb >= this.memThreshold) {
      const alert = {
        type: 'MEMORY_HIGH',
        usedMemMb,
        timestamp: payload.timestamp,
      };
      this.emit('memoryHigh', alert);
      kafkaEventService.publishAlert(alert).catch(() => {});
    }
  }
}

const infraSopCoordinator = new InfraSopCoordinator();
export default infraSopCoordinator;


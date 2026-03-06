import os from 'os';

/**
 * SystemInfo - system metrics collection.
 */
class SystemInfo {
  /**
   * @returns {{loadAvg:number[],totalMem:number,freeMem:number,uptime:number,cpuPercent:number}}
   */
  getMetrics() {
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const uptime = os.uptime();

    const cpuPercent = this.estimateCpuPercent();

    return {
      loadAvg,
      totalMem,
      freeMem,
      uptime,
      cpuPercent,
    };
  }

  estimateCpuPercent() {
    const cpus = os.cpus();
    if (!cpus || cpus.length === 0) return 0;
    const idle = cpus.reduce((sum, c) => sum + c.times.idle, 0);
    const total = cpus.reduce(
      (sum, c) => sum + c.times.user + c.times.nice + c.times.sys + c.times.irq + c.times.idle,
      0,
    );
    if (total === 0) return 0;
    const idleRatio = idle / total;
    return Math.round((1 - idleRatio) * 100);
  }
}

const systemInfo = new SystemInfo();
export default systemInfo;


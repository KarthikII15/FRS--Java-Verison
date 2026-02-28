import { env } from '../../config/env.js';

/**
 * DateTimeUtil - timezone-aware date handling helpers.
 */
class DateTimeUtil {
  constructor() {
    this.timeZone = process.env.APP_TIMEZONE || 'UTC';
  }

  /**
   * @returns {string}
   */
  nowIso() {
    return new Date().toISOString();
  }

  /**
   * @param {string|number|Date} date
   * @returns {string}
   */
  toIso(date) {
    return new Date(date).toISOString();
  }

  /**
   * Convert to epoch millis.
   * @param {string|number|Date} date
   * @returns {number}
   */
  toEpochMillis(date) {
    return new Date(date).getTime();
  }

  /**
   * Ensure timestamp is within optional analytics retention window.
   * @param {string} timestamp
   * @returns {boolean}
   */
  isWithinRetention(timestamp) {
    const days = Number(process.env.RETENTION_DAYS || 30);
    const now = Date.now();
    const ts = Date.parse(timestamp);
    return now - ts <= days * 24 * 60 * 60 * 1000;
  }
}

const dateTimeUtil = new DateTimeUtil(env);
export default dateTimeUtil;


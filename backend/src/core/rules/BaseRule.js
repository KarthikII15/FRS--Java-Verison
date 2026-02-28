import { v4 as uuidv4 } from 'uuid';
import kafkaEventService from '../kafka/KafkaEventService.js';

/**
 * @typedef {Object} Detection
 * @property {string} class - Detected class label (e.g. "person", "car").
 * @property {number} confidence - Detection confidence between 0 and 1.
 * @property {number[]} bbox - Bounding box [x1, y1, x2, y2] in pixels.
 * @property {Object} [attributes] - Optional attributes (color, type, direction, etc.).
 */

/**
 * @typedef {Object} RuleEvent
 * @property {string} id
 * @property {string} type
 * @property {string} cameraId
 * @property {string} timestamp
 * @property {number} confidence
 * @property {Object} data
 * @property {Object} [metadata]
 */

/**
 * Base class for all video analytics rules.
 *
 * Matches Spring's abstract rule contract:
 * - Configuration from rule_config.json
 * - Coordinate helpers
 * - Confidence calculation
 * - Throttling via shouldTrigger()
 * - Standardized event payloads compatible with EventPushService + Kafka
 */
export default class BaseRule {
  /**
   * @param {Object} options
   * @param {string} options.ruleId
   * @param {string} options.cameraId
   * @param {string} options.type
   * @param {Object} options.parameters
   */
  constructor({ ruleId, cameraId, type, parameters = {} }) {
    this.ruleId = ruleId;
    this.cameraId = cameraId;
    this.type = type;
    this.parameters = parameters;

    this.minConfidence =
      typeof parameters.minConfidence === 'number' ? parameters.minConfidence : 0.5;

    this.lastEventTimestamp = 0;
    this.minIntervalMs = Number(parameters.cooldownMs || 0);

    this.validateParameters();
  }

  /**
   * Validate required parameters for a rule.
   * Subclasses should extend this, but keep it non-throwing for optional configs.
   */
  // eslint-disable-next-line class-methods-use-this
  validateParameters() {
    // Default implementation does nothing; subclasses can override.
  }

  /**
   * Main entry point for rule evaluation.
   *
   * @param {Detection[]} detections
   * @param {Object} frameMetadata
   * @returns {RuleEvent[]}
   */
  process(detections, frameMetadata = {}) {
    if (!Array.isArray(detections) || detections.length === 0) {
      return [];
    }

    try {
      // Default implementation delegates to evaluate() to preserve backward compat.
      return this.evaluate(detections, frameMetadata) || [];
    } catch (err) {
      // Intentionally swallow rule errors to avoid breaking pipeline
      // eslint-disable-next-line no-console
      console.error(`[${this.type}] Rule processing error:`, err);
      return [];
    }
  }

  /**
   * Implemented by subclasses to perform rule-specific logic.
   *
   * @protected
   * @param {Detection[]} detections
   * @param {Object} frameMetadata
   * @returns {RuleEvent[]}
   */
  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  evaluate(detections, frameMetadata) {
    throw new Error('evaluate() must be implemented by subclasses');
  }

  /**
   * Build a standardized event payload and publish to Kafka.
   *
   * @protected
   * @param {string} eventType
   * @param {Object} data
   * @param {number} confidence
   * @param {Object} [snapshot]
   * @param {Object} [frameMetadata]
   * @returns {RuleEvent|null}
   */
  buildEvent(eventType, data, confidence, snapshot, frameMetadata = {}) {
    const timestamp = frameMetadata.timestamp || new Date().toISOString();

    /** @type {RuleEvent} */
    const event = {
      id: uuidv4(),
      type: eventType,
      cameraId: this.cameraId,
      timestamp,
      confidence,
      data: {
        ...data,
        snapshot,
      },
      metadata: {
        ruleId: this.ruleId,
        ruleType: this.type,
        ...frameMetadata,
      },
    };

    if (!this.shouldTrigger(event)) {
      return null;
    }

    // Fire-and-forget Kafka publish; errors are logged inside KafkaEventService.
    kafkaEventService.publishEvent(event).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[BaseRule] Failed to publish event to Kafka:', err.message);
    });

    return event;
  }

  /**
   * Coordinate transformation between different frame sizes.
   *
   * @protected
   * @param {number[]} bbox - [x1,y1,x2,y2] in source frame pixels
   * @param {{width:number,height:number}} fromFrame
   * @param {{width:number,height:number}} toFrame
   * @returns {number[]} transformed bbox
   */
  // eslint-disable-next-line class-methods-use-this
  transformCoordinates(bbox, fromFrame, toFrame) {
    const [x1, y1, x2, y2] = bbox;
    if (!fromFrame || !toFrame || !fromFrame.width || !fromFrame.height) {
      return bbox;
    }
    const sx = toFrame.width / fromFrame.width;
    const sy = toFrame.height / fromFrame.height;
    return [x1 * sx, y1 * sy, x2 * sx, y2 * sy];
  }

  /**
   * Base confidence calculation for a collection of detections.
   *
   * @protected
   * @param {Detection[]} detections
   * @returns {number}
   */
  // eslint-disable-next-line class-methods-use-this
  calculateConfidence(detections) {
    if (!Array.isArray(detections) || detections.length === 0) return 0;
    const max = detections.reduce(
      (acc, d) => Math.max(acc, Number.isFinite(d.confidence) ? d.confidence : 0),
      0,
    );
    return Math.max(0, Math.min(1, max));
  }

  /**
   * Throttling hook to avoid flooding downstream with duplicate events.
   *
   * @protected
   * @param {RuleEvent} event
   * @returns {boolean} true if event should be emitted
   */
  shouldTrigger(event) {
    const now = Date.now();
    if (!this.minIntervalMs) {
      this.lastEventTimestamp = now;
      return true;
    }
    if (now - this.lastEventTimestamp >= this.minIntervalMs) {
      this.lastEventTimestamp = now;
      return true;
    }
    return false;
  }

  /**
   * Normalize bounding box coordinates relative to frame size.
   *
   * @protected
   * @param {number[]} bbox - [x1, y1, x2, y2] in pixels
   * @param {Object} frameMetadata
   * @returns {{x1:number,y1:number,x2:number,y2:number}}
   */
  // eslint-disable-next-line class-methods-use-this
  normalizeBBox(bbox, frameMetadata = {}) {
    const [x1, y1, x2, y2] = bbox;
    const { width = 1920, height = 1080 } = frameMetadata;

    return {
      x1: x1 / width,
      y1: y1 / height,
      x2: x2 / width,
      y2: y2 / height,
    };
  }

  /**
   * Check intersection between bbox and a polygonal/rectangular zone.
   *
   * @protected
   * @param {{x1:number,y1:number,x2:number,y2:number}} bboxNorm
   * @param {Object} zone
   * @returns {boolean}
   */
  // eslint-disable-next-line class-methods-use-this
  isInZone(bboxNorm, zone) {
    if (!zone) return false;

    if (zone.type === 'rect') {
      const { x1, y1, x2, y2 } = bboxNorm;
      const {
        left = 0,
        top = 0,
        right = 1,
        bottom = 1,
      } = zone;
      return x1 < right && x2 > left && y1 < bottom && y2 > top;
    }

    // Fallback for polygon zones – simple bbox centroid check
    const cx = (bboxNorm.x1 + bboxNorm.x2) / 2;
    const cy = (bboxNorm.y1 + bboxNorm.y2) / 2;
    if (Array.isArray(zone.points)) {
      // TODO: Implement proper point-in-polygon if needed.
      return cx >= 0 && cy >= 0 && cx <= 1 && cy <= 1;
    }

    return false;
  }
}


import EventEmitter from 'events';
import faceDB from './FaceDB.js';
import kafkaEventService from '../kafka/KafkaEventService.js';

/**
 * VisitorDB - tracks known vs unknown visitors based on FaceDB hits.
 */
class VisitorDB extends EventEmitter {
  constructor() {
    super();
    this.knownVisitors = new Map(); // faceId -> metadata
  }

  /**
   * Process a face embedding and update visitor stats.
   *
   * @param {Object} payload
   * @param {number[]} payload.embedding
   * @param {Object} [payload.metadata]
   */
  async processFace({ embedding, metadata = {} }) {
    const match = await faceDB.findMatch(embedding);
    if (match) {
      const now = new Date().toISOString();
      this.knownVisitors.set(match.faceId, {
        lastSeen: now,
        metadata,
      });
      const event = {
        type: 'VISITOR_KNOWN',
        faceId: match.faceId,
        similarity: match.similarity,
        metadata,
        timestamp: now,
      };
      this.emitVisitorEvent(event, true);
      return { isKnown: true, match };
    }

    const now = new Date().toISOString();
    const event = {
      type: 'VISITOR_NEW',
      metadata,
      timestamp: now,
    };
    this.emitVisitorEvent(event, false);
    return { isKnown: false };
  }

  /**
   * Emit visitor event locally and via Kafka.
   *
   * @param {any} event
   * @param {boolean} isKnown
   */
  emitVisitorEvent(event, isKnown) {
    this.emit(isKnown ? 'knownVisit' : 'unknownVisit', event);
    kafkaEventService.publishEvent(event).catch(() => {});
  }

  /**
   * Get known visitors above visit threshold.
   * Currently a simple wrapper over in-memory state.
   *
   * @param {number} [minVisits=1]
   */
  // eslint-disable-next-line no-unused-vars
  async getKnownVisitors(minVisits = 1) {
    return Array.from(this.knownVisitors.entries()).map(([faceId, meta]) => ({
      faceId,
      ...meta,
    }));
  }
}

const visitorDB = new VisitorDB();
export default visitorDB;


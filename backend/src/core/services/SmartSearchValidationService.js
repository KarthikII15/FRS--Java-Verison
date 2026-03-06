import EventEmitter from 'events';
import { configLoaders } from '../../config/loaders.js';
import faceDB from '../db/FaceDB.js';
import visitorDB from '../db/VisitorDB.js';
import kafkaEventService from '../kafka/KafkaEventService.js';

/**
 * SmartSearchValidationService
 *
 * Mirrors Spring's smart-search service:
 * - Loads profiles from smart_search_profiles_config.json
 * - Performs face / appearance / vehicle searches
 * - Supports time range queries and similarity scores
 */
class SmartSearchValidationService extends EventEmitter {
  constructor() {
    super();
    this.profiles = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    this.profiles = await configLoaders.loadSmartSearchProfiles();
    await faceDB.initialize();
    this.initialized = true;
    // eslint-disable-next-line no-console
    console.log('[SmartSearch] Initialized profiles:', Object.keys(this.profiles).length);
  }

  /**
   * Face recognition search against FaceDB.
   *
   * @param {Object} query
   * @param {number[]} query.embedding
   * @param {string} [query.profile]
   * @param {string} [query.cameraId]
   * @returns {Promise<Array<{personId:string,similarity:number,metadata:Object}>>}
   */
  async searchFace({ embedding, profile, cameraId }) {
    await this.initialize();
    const matches = await faceDB.findMatches(embedding, 10);
    // Filter by camera or profile if needed in future
    return matches;
  }

  /**
   * Appearance-based search (clothing, color, etc.).
   * This is currently a stub that filters against profile config,
   * ready to be wired to a ReID index.
   *
   * @param {Object} query
   * @param {Object} query.attributes
   * @param {string} [query.profile]
   * @returns {Promise<Array<{trackId:string,similarity:number,attributes:Object}>>}
   */
  // eslint-disable-next-line no-unused-vars
  async searchAppearance({ attributes, profile }) {
    await this.initialize();
    // Placeholder: hook up to appearance index / ReID store.
    return [];
  }

  /**
   * Vehicle search (color, type, license plate) placeholder.
   *
   * @param {Object} query
   * @param {Object} query.attributes
   * @returns {Promise<Array<{trackId:string,similarity:number,attributes:Object}>>}
   */
  // eslint-disable-next-line no-unused-vars
  async searchVehicle({ attributes }) {
    await this.initialize();
    return [];
  }

  /**
   * Time-range wrapper for search queries.
   *
   * @param {Object} query
   * @param {string} query.type - 'face' | 'appearance' | 'vehicle'
   * @param {string} [query.from]
   * @param {string} [query.to]
   * @param {Object} [query.payload]
   */
  async searchWithTimeRange({ type, from, to, payload }) {
    await this.initialize();
    const timeRange = { from, to };
    switch (type) {
      case 'face':
        return this.searchFace({ ...payload, timeRange });
      case 'appearance':
        return this.searchAppearance({ ...payload, timeRange });
      case 'vehicle':
        return this.searchVehicle({ ...payload, timeRange });
      default:
        throw new Error(`Unsupported smart search type: ${type}`);
    }
  }

  /**
   * Start Kafka listener for smart-search queries.
   */
  async startKafkaListener() {
    await kafkaEventService.subscribeToSmartSearch(async (query) => {
      const { type, from, to, payload } = query;
      const results = await this.searchWithTimeRange({ type, from, to, payload });
      await kafkaEventService.publishSmartSearchResult({
        id: query.id,
        type,
        results,
        correlationId: query.correlationId,
      });
    });
  }
}

const smartSearchValidationService = new SmartSearchValidationService();
export default smartSearchValidationService;


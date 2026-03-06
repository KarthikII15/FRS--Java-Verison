import smartSearchService from "../../core/services/SmartSearchValidationService.js";
import { query } from "../../db/pool.js";

/**
 * SearchService
 * Wraps smart search and event retrieval; stores simple search history.
 */
class SearchService {
  /** @type {Map<string, any[]>} */
  histories = new Map();
  /** @type {Map<string, any[]>} */
  results = new Map();

  /**
   * Basic event search.
   * @param {{deviceId?:string, eventType?:string, startDate?:string, endDate?:string, limit?:number}} params
   */
  async searchEvents({ deviceId, eventType, startDate, endDate, limit = 100 }) {
    let sql = `select * from device_events where 1=1`;
    const params = [];
    let idx = 1;
    if (deviceId) { sql += ` and fk_device_id = $${idx++}`; params.push(deviceId); }
    if (eventType) { sql += ` and event_type = $${idx++}`; params.push(eventType); }
    if (startDate) { sql += ` and occurred_at >= $${idx++}`; params.push(startDate); }
    if (endDate) { sql += ` and occurred_at <= $${idx++}`; params.push(endDate); }
    sql += ` order by occurred_at desc limit ${limit}`;
    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Advanced event search placeholder.
   * @param {{filters:any, limit?:number}} params
   */
  async advancedEventSearch({ filters, limit = 100 }) {
    return this.searchEvents({ ...filters, limit });
  }

  /**
   * Get event by ID.
   * @param {{eventId:string}} params
   */
  async getEventById({ eventId }) {
    const rows = await query(`select * from device_events where pk_event_id = $1`, [eventId]);
    return rows.rows[0] || null;
  }

  /**
   * Save search history for a user key.
   * @param {{userId:string, query:any}} params
   */
  async saveSearchHistory({ userId, query }) {
    const arr = this.histories.get(userId) || [];
    arr.unshift({ id: String(Date.now()), query, ts: new Date().toISOString() });
    this.histories.set(userId, arr.slice(0, 50));
    return arr[0];
  }

  /**
   * Get search history for a user key.
   * @param {{userId:string}} params
   */
  async getSearchHistory({ userId }) {
    return this.histories.get(userId) || [];
  }

  /**
   * Persist a search result set for later retrieval.
   * @param {{userId:string, result:any}} params
   */
  async saveSearchResult({ userId, result }) {
    const arr = this.results.get(userId) || [];
    arr.unshift({ id: String(Date.now()), result, ts: new Date().toISOString() });
    this.results.set(userId, arr.slice(0, 50));
    return arr[0];
  }

  /**
   * Get saved search results.
   * @param {{userId:string}} params
   */
  async getSearchResults({ userId }) {
    return this.results.get(userId) || [];
  }

  /**
   * Delete search history item.
   * @param {{userId:string, id:string}} params
   */
  async deleteSearchHistory({ userId, id }) {
    const arr = this.histories.get(userId) || [];
    this.histories.set(userId, arr.filter(x => x.id !== id));
    return { success: true };
  }

  /**
   * Face search using SmartSearch.
   * @param {{embedding:number[], profile?:string, cameraId?:string}} params
   */
  async searchByFace({ embedding, profile, cameraId }) {
    return smartSearchService.searchFace({ embedding, profile, cameraId });
  }

  /**
   * Batch face search.
   * @param {{embeddings:number[][]}} params
   */
  async batchFaceSearch({ embeddings }) {
    const out = [];
    for (const e of embeddings || []) {
      // eslint-disable-next-line no-await-in-loop
      const r = await this.searchByFace({ embedding: e });
      out.push(r);
    }
    return out;
  }

  /**
   * Appearance search.
   * @param {{attributes:any, profile?:string}} params
   */
  async searchByAppearance({ attributes, profile }) {
    return smartSearchService.searchAppearance({ attributes, profile });
  }

  /**
   * Attribute-based search alias.
   * @param {{attributes:any}} params
   */
  async searchByAttributes({ attributes }) {
    return this.searchByAppearance({ attributes });
  }

  /**
   * Vehicle search.
   * @param {{attributes:any}} params
   */
  async searchByVehicle({ attributes }) {
    return smartSearchService.searchVehicle({ attributes });
  }

  /**
   * License plate search placeholder.
   * @param {{plate:string}} params
   */
  async searchByLicensePlate({ plate }) {
    return [];
  }
}

const searchService = new SearchService();
export default searchService;


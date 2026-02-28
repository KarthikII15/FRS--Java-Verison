import EventEmitter from "events";
import { query } from "../../db/pool.js";

/**
 * LivePresenceService
 * In-memory presence tracking with subscription hooks.
 */
class LivePresenceService {
  /** @type {Map<string, Set<string>>} */
  presentByArea = new Map();
  /** @type {EventEmitter} */
  bus = new EventEmitter();
  /** @type {(event:string,payload:any)=>void|null} */
  broadcaster = null;

  setBroadcaster(fn) {
    this.broadcaster = typeof fn === "function" ? fn : null;
  }

  /**
   * Update presence for an employee in an area.
   * @param {{employeeId:string, areaId:string, present:boolean}} payload
   */
  async updatePresence({ employeeId, areaId, present }) {
    if (!this.presentByArea.has(areaId)) this.presentByArea.set(areaId, new Set());
    const set = this.presentByArea.get(areaId);
    if (present) set.add(String(employeeId));
    else set.delete(String(employeeId));
    const evt = { areaId, employeeId: String(employeeId), present, ts: new Date().toISOString() };
    this.bus.emit("presenceChange", evt);
    if (this.broadcaster) this.broadcaster("presence.change", evt);
    return evt;
  }

  /**
   * Current presence by area.
   */
  async getCurrentPresence() {
    const out = {};
    for (const [areaId, set] of this.presentByArea.entries()) out[areaId] = Array.from(set);
    return out;
  }

  /**
   * Subscribe to presence changes.
   * @param {(evt:any)=>void} handler
   */
  subscribeToPresence(handler) {
    this.bus.on("presenceChange", handler);
    return () => this.unsubscribeFromPresence(handler);
  }

  /**
   * Unsubscribe.
   * @param {(evt:any)=>void} handler
   */
  unsubscribeFromPresence(handler) {
    this.bus.off("presenceChange", handler);
  }

  /**
   * Presence history placeholder.
   * @param {{scope:any, fromDate:string, toDate:string}} params
   */
  async getPresenceHistory({ scope, fromDate, toDate }) {
    return [];
  }

  /**
   * Floor presence aggregation placeholder.
   * @param {{floorId:string}} params
   */
  async getFloorPresence({ floorId }) {
    return { floorId, present: 0 };
  }

  /**
   * Area presence listing.
   * @param {{areaId:string}} params
   */
  async getAreaPresence({ areaId }) {
    const set = this.presentByArea.get(areaId) || new Set();
    return Array.from(set);
  }

  /**
   * Employee presence view.
   * @param {{employeeId:string}} params
   */
  async getEmployeePresence({ employeeId }) {
    const areas = [];
    for (const [areaId, set] of this.presentByArea.entries()) {
      if (set.has(String(employeeId))) areas.push(areaId);
    }
    return { employeeId: String(employeeId), areas };
  }

  /**
   * Broadcast helper.
   * @param {{areaId:string, employeeId:string, present:boolean}} evt
   */
  broadcastPresenceChange(evt) {
    this.bus.emit("presenceChange", evt);
    if (this.broadcaster) this.broadcaster("presence.change", evt);
  }
}

const livePresenceService = new LivePresenceService();
export default livePresenceService;


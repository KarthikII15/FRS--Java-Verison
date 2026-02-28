/**
 * TrackInfo - helper for object tracking across frames.
 */
export default class TrackInfo {
  /**
   * @param {Object} params
   * @param {string} params.trackId
   * @param {string} params.className
   * @param {number[]} params.bbox
   * @param {string} params.cameraId
   * @param {string} params.timestamp
   * @param {Object} [params.attributes]
   */
  constructor({ trackId, className, bbox, cameraId, timestamp, attributes = {} }) {
    this.trackId = trackId;
    this.className = className;
    this.bbox = bbox;
    this.cameraId = cameraId;
    this.timestamp = timestamp;
    this.attributes = attributes;
  }
}


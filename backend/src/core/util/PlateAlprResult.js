/**
 * PlateAlprResult - normalized ALPR result structure.
 */
export default class PlateAlprResult {
  /**
   * @param {Object} params
   * @param {string} params.plate
   * @param {number} params.confidence
   * @param {number[]} params.bbox
   * @param {string} [params.country]
   * @param {string} [params.region]
   */
  constructor({ plate, confidence, bbox, country, region }) {
    this.plate = plate;
    this.confidence = confidence;
    this.bbox = bbox;
    this.country = country;
    this.region = region;
  }
}


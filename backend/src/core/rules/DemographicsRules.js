import BaseRule from './BaseRule.js';

/**
 * AgeGenderClassifyRule - Classifies age and gender of persons detected.
 */
export class AgeGenderClassifyRule extends BaseRule {
  constructor(opts) {
    super(opts);
    this.state = new Map(); // trackId/deviceId -> lastAlertTime
    this.cooldownMs = this.parameters.alertDuration || 5000;
  }

  evaluate(detections, frameMetadata) {
    const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
    const events = [];
    const validPredictions = [];

    for (const det of detections) {
      if (!['person', 'face'].includes(det.class.toLowerCase())) continue;
      
      const label = det.attributes?.gender || 'Unknown';
      const score = det.confidence;
      
      // Separate thresholding based on Java logic
      if (label.toLowerCase() === 'male' && score <= (this.parameters.minRatio || 0.5)) continue;
      if (label.toLowerCase() === 'female' && score <= (this.parameters.distanceThreshold || 0.5)) continue;
      
      // Apply ROI logic if enabled
      if (this.parameters.roi?.enabled) {
        const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);
        let inRoi = false;
        for (const zone of this.parameters.zones || []) {
          if (this.isInZone(bboxNorm, zone)) {
            inRoi = true;
            break;
          }
        }
        if (!inRoi) continue;
      }

      validPredictions.push({
        label,
        age: det.attributes?.age || 0,
        score,
        bbox: det.bbox,
        trackId: det.attributes?.trackId
      });
    }

    if (validPredictions.length > 0) {
      const key = `${frameMetadata.deviceId}_AgeGenderClassify_${frameMetadata.cameraId}`;
      const lastAlertTime = this.state.get(key) || 0;

      if (now - lastAlertTime > this.cooldownMs) {
        this.state.set(key, now);
        
        events.push(this.createEvent({
          eventType: 'AGE_GENDER_CLASSIFY',
          confidence: validPredictions[0].score, // Max confidence
          data: {
            predictions: validPredictions,
            count: validPredictions.length
          }
        }, frameMetadata));
      }
    }

    return events;
  }
}

/**
 * GenderDemographicsRule - Counts male/female/unknown ratios.
 */
export class GenderDemographicsRule extends BaseRule {
  constructor(opts) {
    super(opts);
    this.state = new Map();
    this.cooldownMs = this.parameters.alertDuration || 5000;
  }

  evaluate(detections, frameMetadata) {
    const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
    
    let maleCount = 0;
    let femaleCount = 0;
    let unknownCount = 0;

    for (const det of detections) {
      if (!['person', 'face'].includes(det.class.toLowerCase())) continue;
      if (det.confidence < this.minConfidence) continue;

      const label = (det.attributes?.gender || '').toLowerCase();
      if (label === 'male') {
        maleCount++;
      } else if (label === 'female') {
        femaleCount++;
      } else {
        unknownCount++;
      }
    }

    const total = maleCount + femaleCount + unknownCount;
    if (total === 0) return [];

    const key = `${frameMetadata.deviceId}_GenderDemographics_${frameMetadata.cameraId}`;
    const lastAlertTime = this.state.get(key) || 0;

    if (now - lastAlertTime > this.cooldownMs) {
      this.state.set(key, now);
      
      return [this.createEvent({
        eventType: 'GENDER_DEMOGRAPHICS',
        confidence: 0.99, // Aggeragated metric
        data: {
          male: maleCount,
          female: femaleCount,
          unknown: unknownCount,
          total
        }
      }, frameMetadata)];
    }

    return [];
  }
}

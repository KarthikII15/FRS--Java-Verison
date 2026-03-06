import BaseRule from './BaseRule.js';

/**
 * FallDownRule - Detects when a person has fallen down.
 */
export class FallDownRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 10000; // Default 10s cooldown
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const validDetections = [];

        for (const det of detections) {
            if (det.class.toLowerCase() !== 'falldown') continue;
            if (det.confidence < this.minConfidence) continue;

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

            validDetections.push(det);
        }

        if (validDetections.length === 0) return [];

        const key = `${frameMetadata.deviceId}_FallDown_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);

            return [this.createEvent({
                eventType: 'PERSON_FALL_DOWN',
                confidence: validDetections[0].confidence,
                data: {
                    count: validDetections.length,
                    detections: validDetections.map(d => ({ bbox: d.bbox, confidence: d.confidence }))
                }
            }, frameMetadata)];
        }

        return [];
    }
}

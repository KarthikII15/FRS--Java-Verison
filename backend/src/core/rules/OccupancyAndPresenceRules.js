import BaseRule from './BaseRule.js';

/**
 * OverCrowdingRule - Triggers when the number of people in an ROI exceeds a threshold.
 */
export class OverCrowdingRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const validDetections = [];
        const minCrowdSize = this.parameters.transactionWindow || 3; // Using transactionWindow as min count like Java

        for (const det of detections) {
            if (det.class.toLowerCase() !== 'person') continue;
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

        if (validDetections.length < minCrowdSize) return [];

        const key = `${frameMetadata.deviceId}_OverCrowding_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);

            return [this.createEvent({
                eventType: 'OVERCROWDING_DETECTED',
                confidence: validDetections[0].confidence,
                data: {
                    count: validDetections.length,
                    threshold: minCrowdSize,
                    detections: validDetections.map(d => ({ bbox: d.bbox }))
                }
            }, frameMetadata)];
        }

        return [];
    }
}

/**
 * SmartOccupancyRule - Tracks people entering and exiting via two lines to maintain a count.
 */
export class SmartOccupancyRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.inCount = new Map(); // cameraKey -> total IN count
        this.outCount = new Map(); // cameraKey -> total OUT count

        // Track states per trackId to know their direction
        this.lastLine = new Map(); // trackId -> 'A' or 'B'
    }

    evaluate(detections, frameMetadata) {
        const events = [];
        const camKey = `${frameMetadata.deviceId}_${frameMetadata.cameraId}`;

        const lines = this.parameters.lineDetection || {};
        const lineA = lines.coordinatesLineA;
        const lineB = lines.coordinatesLineB;

        if (!lineA || !lineB) return events;

        // Initialize counts for this camera if not present
        if (!this.inCount.has(camKey)) this.inCount.set(camKey, 0);
        if (!this.outCount.has(camKey)) this.outCount.set(camKey, 0);

        for (const det of detections) {
            if (det.class.toLowerCase() !== 'person') continue;

            const trackId = det.attributes?.trackId;
            if (!trackId) continue;

            const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);
            const center = { cx: (bboxNorm.x1 + bboxNorm.x2) / 2, cy: (bboxNorm.y1 + bboxNorm.y2) / 2 };

            const hitA = this._intersectsSimplified(center, lineA);
            const hitB = this._intersectsSimplified(center, lineB);

            const prevLine = this.lastLine.get(trackId);

            // Simple state machine: A then B = IN. B then A = OUT.
            if (hitA) {
                if (prevLine === 'B') {
                    // B -> A = OUT
                    const out = this.outCount.get(camKey) + 1;
                    this.outCount.set(camKey, out);
                    this.lastLine.delete(trackId);

                    events.push(this.createEvent({
                        eventType: 'OCCUPANCY_OUT',
                        confidence: det.confidence,
                        data: { trackId, inCount: this.inCount.get(camKey), outCount: out }
                    }, frameMetadata));

                } else {
                    this.lastLine.set(trackId, 'A');
                }
            } else if (hitB) {
                if (prevLine === 'A') {
                    // A -> B = IN
                    const inC = this.inCount.get(camKey) + 1;
                    this.inCount.set(camKey, inC);
                    this.lastLine.delete(trackId);

                    events.push(this.createEvent({
                        eventType: 'OCCUPANCY_IN',
                        confidence: det.confidence,
                        data: { trackId, inCount: inC, outCount: this.outCount.get(camKey) }
                    }, frameMetadata));

                } else {
                    this.lastLine.set(trackId, 'B');
                }
            }
        }

        return events;
    }

    _intersectsSimplified(center, lineObj) {
        return false; // Stub for Node.js port without actual raycasting logic
    }
}

import BaseRule from './BaseRule.js';

/**
 * ATMSafeOrHoodOpenRule - Detects access to ATM safes or opened hoods.
 */
export class ATMSafeOrHoodOpenRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 5000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const validDetections = [];

        for (const det of detections) {
            // In ML model, this might be trained as a specific class or detected via zones
            if (!['atm_hood_open', 'atm_safe_open'].includes(det.class.toLowerCase())) continue;
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

        const key = `${frameMetadata.deviceId}_ATMSafeOrHoodOpen_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);

            return [this.createEvent({
                eventType: 'ATM_SECURITY_ALERT',
                confidence: validDetections[0].confidence,
                data: {
                    count: validDetections.length,
                    type: validDetections[0].class,
                    detections: validDetections.map(d => ({ bbox: d.bbox, class: d.class }))
                }
            }, frameMetadata)];
        }

        return [];
    }
}

/**
 * VaultPersonDwellTimeRule - Tracks dwell time of persons inside a vault ROI.
 */
export class VaultPersonDwellTimeRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.trackTimestamps = new Map(); // trackId -> first seen
        this.state = new Map(); // cameraKey -> last alert
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const maxDwellMs = this.parameters.maxDwellSeconds ? this.parameters.maxDwellSeconds * 1000 : 60000;
        const events = [];

        const activeTracks = new Set();
        const persons = detections.filter(d => d.class.toLowerCase() === 'person' && d.confidence >= this.minConfidence);

        let maxDwellRecorded = 0;
        let maxDet = null;

        for (const det of persons) {
            const trackId = det.attributes?.trackId;
            if (!trackId) continue;

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

            activeTracks.add(trackId);

            let firstSeen = this.trackTimestamps.get(trackId);
            if (!firstSeen) {
                firstSeen = now;
                this.trackTimestamps.set(trackId, firstSeen);
            }

            const dwellTime = now - firstSeen;
            if (dwellTime > maxDwellRecorded) {
                maxDwellRecorded = dwellTime;
                maxDet = det;
            }
        }

        // Cleanup vanished
        for (const key of this.trackTimestamps.keys()) {
            if (!activeTracks.has(key)) {
                this.trackTimestamps.delete(key);
            }
        }

        const camKey = `${frameMetadata.deviceId}_VaultDwell_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(camKey) || 0;

        if (maxDwellRecorded >= maxDwellMs && (now - lastAlertTime > this.cooldownMs)) {
            this.state.set(camKey, now);

            events.push(this.createEvent({
                eventType: 'VAULT_DWELL_TIME_EXCEEDED',
                confidence: maxDet.confidence,
                data: {
                    trackId: maxDet.attributes.trackId,
                    dwellTimeSeconds: Math.floor(maxDwellRecorded / 1000),
                    bbox: maxDet.bbox
                }
            }, frameMetadata));
        }

        return events;
    }
}

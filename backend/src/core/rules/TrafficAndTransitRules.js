import BaseRule from './BaseRule.js';

/**
 * TrainArrivalDepartureRule - Tracks a train arriving and departing using activity windows.
 */
export class TrainArrivalDepartureRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map(); // cameraKey -> session state
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const events = [];
        const camKey = `${frameMetadata.deviceId}_${frameMetadata.cameraId}`;

        // Train criteria based on labels/confidence
        const trains = detections.filter(d =>
            ['train', 'train_engine'].includes(d.class.toLowerCase()) &&
            d.confidence >= this.minConfidence
        );

        let session = this.state.get(camKey);
        const windowTimeout = this.parameters.transactionWindow || 60000; // Default 1m

        if (!session) {
            if (trains.length > 0) {
                // Start new arrival
                session = {
                    eventStartTime: now,
                    lastDetectionTime: now,
                    transactionId: `${camKey}_${now}`
                };
                this.state.set(camKey, session);

                events.push(this.createEvent({
                    eventType: 'TRAIN_ARRIVAL',
                    confidence: trains[0].confidence,
                    data: { transactionId: session.transactionId, count: trains.length }
                }, frameMetadata));
            }
        } else {
            if (trains.length > 0) {
                // Update last seen
                session.lastDetectionTime = now;
            } else if (now - session.lastDetectionTime > windowTimeout) {
                // Train has departed
                const durationSec = Math.floor((now - session.eventStartTime) / 1000);

                events.push(this.createEvent({
                    eventType: 'TRAIN_DEPARTURE',
                    confidence: 0.9,
                    data: {
                        transactionId: session.transactionId,
                        dwellTimeSeconds: durationSec
                    }
                }, frameMetadata));

                // Auto-close session
                this.state.delete(camKey);
            }
        }

        return events;
    }
}

/**
 * PmsRule - Parking/Visitor Management tracking faces/vehicles and sending alerts.
 * Stripped down from Face matching logic since Node.js leverages external python workers for actual face embeddings.
 * This alerts when generic tracking detects new entities. 
 */
export class PmsRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        // In actual implementation, PMS depends heavily on Face recognition (RE-ID).
        // The backend receives these matches from the python AI workers in the detection payload.
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const events = [];

        const relevantDetections = detections.filter(d =>
            ['face', 'person', 'vehicle', 'car'].includes(d.class.toLowerCase()) &&
            d.confidence >= this.minConfidence
        );

        if (relevantDetections.length === 0) return events;

        const key = `${frameMetadata.deviceId}_PMS_${frameMetadata.cameraId}`;
        const lastAlert = this.state.get(key) || 0;

        if (now - lastAlert > this.cooldownMs) {
            this.state.set(key, now);
            events.push(this.createEvent({
                eventType: 'PMS_DETECTION',
                confidence: relevantDetections[0].confidence,
                data: {
                    objects: relevantDetections.map(d => ({ class: d.class, trackId: d.attributes?.trackId || 'unknown' }))
                }
            }, frameMetadata));
        }

        return events;
    }
}

/**
 * TrainIntrusionRule - Specific rule for tracking trains entering specific restricted zones on the tracks.
 */
export class TrainIntrusionRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const validDetections = [];
        const customLabels = (this.parameters.labels || []).map(l => l.toLowerCase());

        for (const det of detections) {
            if (customLabels.length > 0 && !customLabels.includes(det.class.toLowerCase())) continue;
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

        const key = `${frameMetadata.deviceId}_TrainIntrusion_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);
            return [this.createEvent({
                eventType: 'TRAIN_INTRUSION_DETECTED',
                confidence: validDetections[0].confidence,
                data: { count: validDetections.length, detections: validDetections.map(d => ({ bbox: d.bbox, class: d.class })) }
            }, frameMetadata)];
        }
        return [];
    }
}

/**
 * VehicleZoneIntrusionRule - Specific rule for monitoring vehicles intruding into restricted zones.
 */
export class VehicleZoneIntrusionRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 5000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const validDetections = [];
        const vehicleLabels = this.parameters.labels ? this.parameters.labels.map(l => l.toLowerCase()) : ['car', 'truck', 'bus', 'motorcycle'];

        for (const det of detections) {
            if (!vehicleLabels.includes(det.class.toLowerCase())) continue;
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

        const key = `${frameMetadata.deviceId}_VehicleIntrusion_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);
            return [this.createEvent({
                eventType: 'VEHICLE_ZONE_INTRUSION',
                confidence: validDetections[0].confidence,
                data: { count: validDetections.length, detections: validDetections.map(d => ({ bbox: d.bbox, class: d.class })) }
            }, frameMetadata)];
        }
        return [];
    }
}

/**
 * PmsRuleEnableOnPi - Specialized lightweight version of PMS.
 */
export class PmsRuleEnableOnPi extends BaseRule {
    constructor(opts) {
        super(opts);
        this.lastAlertGeneratedTime = 0;
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const validDetections = [];

        for (const det of detections) {
            if (det.confidence < this.minConfidence) continue;

            const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);

            if (this.parameters.maskIn?.enabled) {
                let insideAnyMaskIn = false;
                for (const zone of this.parameters.maskIn.zones || []) {
                    if (this.isInZone(bboxNorm, zone)) {
                        insideAnyMaskIn = true;
                        break;
                    }
                }
                if (!insideAnyMaskIn) continue;
            }

            if (this.parameters.maskOut?.enabled) {
                let insideAnyMaskOut = false;
                for (const zone of this.parameters.maskOut.zones || []) {
                    if (this.isInZone(bboxNorm, zone)) {
                        insideAnyMaskOut = true;
                        break;
                    }
                }
                if (insideAnyMaskOut) continue;
            }

            validDetections.push(det);
        }

        if (validDetections.length === 0) return [];

        if (now - this.lastAlertGeneratedTime > this.cooldownMs) {
            this.lastAlertGeneratedTime = now;
            return [this.createEvent({
                eventType: 'PMS_PI_ALERT',
                confidence: validDetections[0].confidence,
                data: { count: validDetections.length }
            }, frameMetadata)];
        }
        return [];
    }
}


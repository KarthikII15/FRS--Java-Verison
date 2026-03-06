import BaseRule from './BaseRule.js';

/**
 * CameraAngleChange - Detects if the camera angle has changed significantly.
 * Note: Node.js backend receives this signal from the Python video pipeline metrics.
 */
export class CameraAngleChange extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());

        // This rule relies on frame-level metrics rather than bounding box detections
        const isAngleChanged = frameMetadata.metrics?.angleChanged === true;

        if (!isAngleChanged) return [];

        const key = `${frameMetadata.deviceId}_CameraAngleChange_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);

            return [this.createEvent({
                eventType: 'CAMERA_ANGLE_CHANGE',
                confidence: 0.95,
                data: { description: 'Significant camera angle change detected' }
            }, frameMetadata)];
        }

        return [];
    }
}

/**
 * CameraTemperOrCovered - Detects if the camera lens is covered or tampered with.
 * Note: Signal origins from the Python pipeline edge device.
 */
export class CameraTemperOrCovered extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());

        // Tampering usually comes as a system metric/flag on the frame
        const isTampered = frameMetadata.metrics?.isTampered === true ||
            frameMetadata.metrics?.isCovered === true;

        if (!isTampered) return [];

        const key = `${frameMetadata.deviceId}_CameraTemperOrCovered_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);

            return [this.createEvent({
                eventType: 'CAMERA_TAMPERING',
                confidence: 0.95,
                data: { description: 'Camera is covered or tampered' }
            }, frameMetadata)];
        }

        return [];
    }
}

/**
 * CameraTemper - Evaluates bounds of camera view for tampering indications.
 */
export class CameraTemper extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 5000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        let tamperingDetected = false;

        for (const det of detections) {
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

            const bboxWidth = (det.bbox[2] - det.bbox[0]) * (frameMetadata.width || 1920);
            const bboxHeight = (det.bbox[3] - det.bbox[1]) * (frameMetadata.height || 1080);

            if (this.parameters.bbox?.checkFilter) {
                if (bboxHeight < (this.parameters.bbox.height || 0) || bboxWidth < (this.parameters.bbox.width || 0)) {
                    continue;
                }
            }

            tamperingDetected = true;
            break;
        }

        if (!tamperingDetected) return [];

        const key = `${frameMetadata.deviceId}_CameraTemper_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);
            return [this.createEvent({
                eventType: 'CAMERA_TAMPER_DETECTED',
                confidence: 1.0,
                data: { msg: "Camera tampering detected in view." }
            }, frameMetadata)];
        }

        return [];
    }
}


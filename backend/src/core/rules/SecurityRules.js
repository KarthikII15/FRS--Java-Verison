import BaseRule from './BaseRule.js';

/**
 * AlprDetectionRule - Detects license plates and filters by confidence/cooldowns.
 */
export class AlprDetectionRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map(); // trackId/deviceId -> lastAlertTime
        this.cooldownMs = this.parameters.alertDuration || 5000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const validPlates = [];
        const threshold = this.parameters.distanceThreshold || 0.6; // Used as min confidence

        for (const det of detections) {
            if (det.class.toLowerCase() !== 'license_plate') continue;

            const plateText = det.attributes?.plateText;
            if (!plateText || det.confidence < threshold) continue;

            const normalizedPlate = plateText.trim().toUpperCase();
            const plateKey = `${frameMetadata.deviceId}_${frameMetadata.cameraId}_${normalizedPlate}`;
            const cameraKey = `${frameMetadata.deviceId}_${frameMetadata.cameraId}`;

            const lastPlateTime = this.state.get(plateKey) || 0;
            const lastPlateForCamera = this.state.get(cameraKey) || "";

            const timeSincePlateAlert = now - lastPlateTime;
            const plateInCooldown = timeSincePlateAlert < this.cooldownMs;
            const samePlateAsLast = normalizedPlate === lastPlateForCamera;

            const inCooldown = plateInCooldown && samePlateAsLast;

            if (!inCooldown) {
                validPlates.push({
                    plate: normalizedPlate,
                    bbox: det.bbox,
                    confidence: det.confidence
                });

                // Update state
                this.state.set(plateKey, now);
                this.state.set(cameraKey, normalizedPlate);
            }
        }

        if (validPlates.length > 0) {
            return validPlates.map(vp => this.createEvent({
                eventType: 'ALPR_DETECTION',
                confidence: vp.confidence,
                data: {
                    plateNumber: vp.plate,
                    bbox: vp.bbox
                }
            }, frameMetadata));
        }

        return [];
    }
}

/**
 * HelmetWeaponRule - Detects missing helmets or visible weapons.
 */
export class HelmetWeaponRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 5000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());

        const weapons = [];
        const helmets = [];

        for (const det of detections) {
            if (det.confidence < this.minConfidence) continue;

            if (['weapon', 'gun', 'knife'].includes(det.class.toLowerCase())) {
                weapons.push(det);
            } else if (det.class.toLowerCase() === 'helmet') {
                helmets.push(det);
            }
        }

        if (weapons.length === 0 && helmets.length === 0) return [];

        const key = `${frameMetadata.deviceId}_HelmetWeapon_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);

            let tag = "HelmetWeapon";
            if (weapons.length > 0 && helmets.length === 0) tag = "Weapon";
            else if (helmets.length > 0 && weapons.length === 0) tag = "Helmet";

            return [this.createEvent({
                eventType: 'HELMET_WEAPON_DETECTED',
                confidence: Math.max(...[...weapons, ...helmets].map(d => d.confidence)),
                data: {
                    tag,
                    weaponCount: weapons.length,
                    helmetCount: helmets.length,
                    detections: [...weapons, ...helmets].map(d => ({ class: d.class, bbox: d.bbox }))
                }
            }, frameMetadata)];
        }

        return [];
    }
}

/**
 * BackdoorEntryViolationRule - Detects when a track crosses two sequential lines indicating an entry.
 */
export class BackdoorEntryViolationRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.trackState = new Map(); // trackId -> State (OUTSIDE, TOUCHED_A, ALERTED)
        this.lastTouchTs = new Map();
        this.entryCount = new Map(); // cameraKey -> count
        this.debounceMs = 1200;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const events = [];
        const activeTrackIds = new Set();
        const camKey = `${frameMetadata.deviceId}_${frameMetadata.cameraId}`;

        const lines = this.parameters.lineDetection || {};
        const lineA = lines.coordinatesLineA;
        const lineB = lines.coordinatesLineB;

        if (!lineA || !lineB) return events; // Setup incomplete

        for (const det of detections) {
            const trackId = det.attributes?.trackId;
            if (!trackId || det.class !== 'person') continue;

            activeTrackIds.add(trackId);

            let state = this.trackState.get(trackId) || 'OUTSIDE';
            if (state === 'ALERTED') continue;

            const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);
            const center = { cx: (bboxNorm.x1 + bboxNorm.x2) / 2, cy: (bboxNorm.y1 + bboxNorm.y2) / 2 };

            // Simplify geometry intersection to just checking if center passed line bounds for prototype
            // Real impl would require raycasting or true line intersection
            const hitA = this._intersectsSimplified(center, lineA);
            const hitB = this._intersectsSimplified(center, lineB);

            const lastTouch = this.lastTouchTs.get(trackId) || 0;
            if ((hitA || hitB) && (now - lastTouch < this.debounceMs)) continue;

            if (state === 'OUTSIDE' && hitA) {
                this.trackState.set(trackId, 'TOUCHED_A');
                this.lastTouchTs.set(trackId, now);
            } else if (state === 'TOUCHED_A' && hitB) {
                // Confirmation!
                const count = (this.entryCount.get(camKey) || 0) + 1;
                this.entryCount.set(camKey, count);
                this.trackState.set(trackId, 'ALERTED');

                events.push(this.createEvent({
                    eventType: 'BACKDOOR_ENTRY_VIOLATION',
                    confidence: det.confidence,
                    data: {
                        trackId,
                        totalCount: count,
                        bbox: det.bbox
                    }
                }, frameMetadata));
            }
        }

        // Cleanup vanished tracks
        for (const key of this.trackState.keys()) {
            if (!activeTrackIds.has(key)) {
                this.trackState.delete(key);
                this.lastTouchTs.delete(key);
            }
        }

        return events;
    }

    // Simplified intersection for node port demonstration
    _intersectsSimplified(center, lineObj) {
        // Math to determine if center logic hits line
        // In production, port full line collision from Java rectIntersectsLine
        // Just a placeholder to prevent build crash
        return false;
    }
}

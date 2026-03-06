import BaseRule from './BaseRule.js';

/**
 * CleanlinessRule - Evaluates the cleanliness proportion by area using "Clean"/"NotClean" labels.
 */
export class CleanlinessRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.state = new Map();
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const minDetections = this.parameters.visitorBbox?.cleanFromDb || 1;

        // Fallback if width/height are not provided on the frameMetadata, use standard Full HD scale
        const imageArea = (frameMetadata.width || 1920) * (frameMetadata.height || 1080);

        let cleanCount = 0;
        let notCleanCount = 0;
        let cleanArea = 0;
        let notCleanArea = 0;
        const validDetections = [];

        for (const det of detections) {
            if (det.confidence < this.minConfidence) continue;

            const label = det.class.toLowerCase();
            if (!['clean', 'notclean'].includes(label)) continue;

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

            const bboxWidth = (det.bbox[2] - det.bbox[0]) * (frameMetadata.width || 1920);
            const bboxHeight = (det.bbox[3] - det.bbox[1]) * (frameMetadata.height || 1080);
            const rectArea = bboxWidth * bboxHeight;

            if (label === 'clean') {
                cleanCount++;
                cleanArea += rectArea;
            } else {
                notCleanCount++;
                notCleanArea += rectArea;
            }
        }

        const totalDetections = cleanCount + notCleanCount;
        if (totalDetections < minDetections) return [];

        const key = `${frameMetadata.deviceId}_Cleanliness_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);

            let notCleanPercentage = (notCleanArea / imageArea) * 100.0;
            let cleanPercentage = 100.0 - notCleanPercentage;

            const threshold = this.parameters.distanceThreshold || 5.0; // % distance threshold 

            return [this.createEvent({
                eventType: notCleanPercentage >= threshold ? 'NOT_CLEAN_DETECTED' : 'CLEAN_DETECTED',
                confidence: validDetections[0].confidence,
                data: {
                    cleanPercentage,
                    notCleanPercentage,
                    cleanCount,
                    notCleanCount
                }
            }, frameMetadata)];
        }

        return [];
    }
}

/**
 * AnimalCountingRule - Tracks animals entering/exiting a perimeter.
 */
export class AnimalCountingRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.inCount = new Map(); // cameraKey -> total ENTRY
        this.outCount = new Map(); // cameraKey -> total EXIT
        this.lastLine = new Map(); // trackId -> 'A' or 'B'
    }

    evaluate(detections, frameMetadata) {
        const events = [];
        const camKey = `${frameMetadata.deviceId}_${frameMetadata.cameraId}`;

        const lines = this.parameters.lineDetection || {};
        const lineA = lines.coordinatesLineA;
        const lineB = lines.coordinatesLineB;

        if (!lineA || !lineB) return events;

        const animals = detections.filter(d =>
            ['animal', 'dog', 'cat', 'cow', 'horse', 'sheep'].includes(d.class.toLowerCase()) &&
            d.confidence >= this.minConfidence
        );

        if (!this.inCount.has(camKey)) this.inCount.set(camKey, 0);
        if (!this.outCount.has(camKey)) this.outCount.set(camKey, 0);

        for (const det of animals) {
            const trackId = det.attributes?.trackId;
            if (!trackId) continue;

            const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);
            const center = { cx: (bboxNorm.x1 + bboxNorm.x2) / 2, cy: (bboxNorm.y1 + bboxNorm.y2) / 2 };

            const hitA = this._intersectsSimplified(center, lineA);
            const hitB = this._intersectsSimplified(center, lineB);

            const prevLine = this.lastLine.get(trackId);

            if (hitA) {
                if (prevLine === 'B') {
                    // B -> A = EXIT
                    const exitCount = this.outCount.get(camKey) + 1;
                    this.outCount.set(camKey, exitCount);
                    this.lastLine.delete(trackId);

                    events.push(this.createEvent({
                        eventType: 'ANIMAL_EXIT',
                        confidence: det.confidence,
                        data: { trackId, entryCount: this.inCount.get(camKey), exitCount }
                    }, frameMetadata));
                } else {
                    this.lastLine.set(trackId, 'A');
                }
            } else if (hitB) {
                if (prevLine === 'A') {
                    // A -> B = ENTRY
                    const entryCount = this.inCount.get(camKey) + 1;
                    this.inCount.set(camKey, entryCount);
                    this.lastLine.delete(trackId);

                    events.push(this.createEvent({
                        eventType: 'ANIMAL_ENTRY',
                        confidence: det.confidence,
                        data: { trackId, entryCount, exitCount: this.outCount.get(camKey) }
                    }, frameMetadata));
                } else {
                    this.lastLine.set(trackId, 'B');
                }
            }
        }

        return events;
    }

    _intersectsSimplified(center, lineObj) {
        // Stub
        return false;
    }
}

/**
 * LoiteringRule - Tracks the duration a person stays in an ROI.
 */
export class LoiteringRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.trackTimestamps = new Map(); // trackId -> first seen timestamp
        this.state = new Map(); // prevent alert spam per camera
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const windowTimeoutMs = this.parameters.transactionWindow || 30000;
        const events = [];

        const activeTracks = new Set();
        const people = detections.filter(d => d.class.toLowerCase() === 'person' && d.confidence >= this.minConfidence);

        let maxDurationMs = 0;
        let maxDet = null;

        for (const det of people) {
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

            const durationMs = now - firstSeen;
            if (durationMs > maxDurationMs) {
                maxDurationMs = durationMs;
                maxDet = det;
            }
        }

        // Cleanup vanished tracks
        for (const key of this.trackTimestamps.keys()) {
            if (!activeTracks.has(key)) {
                this.trackTimestamps.delete(key);
            }
        }

        const camKey = `${frameMetadata.deviceId}_Loitering_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(camKey) || 0;

        if (maxDurationMs >= windowTimeoutMs && (now - lastAlertTime > this.cooldownMs)) {
            this.state.set(camKey, now);

            events.push(this.createEvent({
                eventType: 'LOITERING_DETECTED',
                confidence: maxDet.confidence,
                data: {
                    trackId: maxDet.attributes.trackId,
                    durationSeconds: Math.floor(maxDurationMs / 1000),
                    bbox: maxDet.bbox
                }
            }, frameMetadata));
        }

        return events;
    }
}

/**
 * LoiteringObjectRule - Tracks duration of generic objects in ROI.
 */
export class LoiteringObjectRule extends LoiteringRule {
    // Uses identical logic as LoiteringRule but applies to the configured label filter.
    // We override the evaluate method slightly to just bypass the 'person' specific label check.

    evaluate(detections, frameMetadata) {
        // Transform all objects matching the rule's custom labels into "person" for evaluate engine reusage,
        // or properly map it since Javascript inheritance allows doing it cleaner:
        const customLabels = this.parameters.labels?.map(l => l.toLowerCase()) || [];
        const validDetections = detections.filter(d =>
            customLabels.includes(d.class.toLowerCase()) && d.confidence >= this.minConfidence
        );

        // Call the parent but inject only these matched objects
        return super.evaluate(validDetections, frameMetadata);
    }
}

/**
 * InsectPresenceRule - Detects presence of insects / pests inside an ROI.
 */
export class InsectPresenceRule extends BaseRule {
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
            const label = det.class.toLowerCase();
            if (customLabels.length > 0 && !customLabels.includes(label)) continue;
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

        const key = `${frameMetadata.deviceId}_InsectPresence_${frameMetadata.cameraId}`;
        const lastAlertTime = this.state.get(key) || 0;

        if (now - lastAlertTime > this.cooldownMs) {
            this.state.set(key, now);
            return [this.createEvent({
                eventType: 'INSECT_DETECTED',
                confidence: validDetections[0].confidence,
                data: {
                    count: validDetections.length,
                    detections: validDetections.map(d => ({ bbox: d.bbox, class: d.class }))
                }
            }, frameMetadata)];
        }
        return [];
    }
}

/**
 * PetWithoutPersonRule - Detects a pet that is farther than a threshold from any person.
 */
export class PetWithoutPersonRule extends BaseRule {
    constructor(opts) {
        super(opts);
        this.petAlertCooldown = new Map();
        this.cooldownMs = this.parameters.alertDuration || 10000;
    }

    evaluate(detections, frameMetadata) {
        const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
        const events = [];

        const pets = [];
        const persons = [];

        const petLabels = ['dog', 'cat', 'puppy', 'kitten'];

        for (const det of detections) {
            if (det.confidence < this.minConfidence) continue;
            const label = det.class.toLowerCase();
            if (label === 'person') persons.push(det);
            else if (petLabels.includes(label) || (this.parameters.labels && this.parameters.labels.includes(label))) pets.push(det);
        }

        if (pets.length === 0) return events;

        const thresholdNormSq = Math.pow(this.parameters.distanceThreshold || 0.2, 2);

        for (const pet of pets) {
            const pb = this.normalizeBBox(pet.bbox, frameMetadata);
            const petCx = (pb.x1 + pb.x2) / 2;
            const petCy = (pb.y1 + pb.y2) / 2;

            let hasNearbyPerson = false;
            for (const person of persons) {
                const pb2 = this.normalizeBBox(person.bbox, frameMetadata);
                const percCx = (pb2.x1 + pb2.x2) / 2;
                const percCy = (pb2.y1 + pb2.y2) / 2;

                const dx = petCx - percCx;
                const dy = petCy - percCy;
                if ((dx * dx + dy * dy) <= thresholdNormSq) {
                    hasNearbyPerson = true;
                    break;
                }
            }

            if (hasNearbyPerson) continue;

            const petKey = `${frameMetadata.deviceId}_${frameMetadata.cameraId}_${pet.class}`;
            const lastTs = this.petAlertCooldown.get(petKey) || 0;

            if (now - lastTs > this.cooldownMs) {
                this.petAlertCooldown.set(petKey, now);
                events.push(this.createEvent({
                    eventType: 'PET_WITHOUT_PERSON',
                    confidence: pet.confidence,
                    data: {
                        petClass: pet.class,
                        bbox: pet.bbox
                    }
                }, frameMetadata));
            }
        }
        return events;
    }
}


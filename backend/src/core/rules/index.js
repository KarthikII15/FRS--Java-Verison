import BaseRule from './BaseRule.js';

/**
 * ZoneIntrusionRule - detects when objects enter restricted zones.
 */
export class ZoneIntrusionRule extends BaseRule {
  evaluate(detections, frameMetadata) {
    const zones = this.parameters.zones || [];
    const classes = this.parameters.classes || ['person', 'car', 'truck'];

    const events = [];
    for (const det of detections) {
      if (!classes.includes(det.class) || det.confidence < this.minConfidence) continue;

      const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);
      for (const zone of zones) {
        if (zone.enabled === false) continue;
        if (this.isInZone(bboxNorm, zone)) {
          const confidence = this.computeConfidence(det.confidence, zone.weight || 1);
          events.push(
            this.createEvent(
              {
                eventType: 'ZONE_INTRUSION',
                confidence,
                data: {
                  objectClass: det.class,
                  bbox: det.bbox,
                  zoneId: zone.id,
                  zoneLabel: zone.label,
                },
              },
              frameMetadata,
            ),
          );
        }
      }
    }
    return events;
  }
}

/**
 * LoiteringRule - detects when persons stay in area beyond time threshold.
 */
export class LoiteringRule extends BaseRule {
  constructor(opts) {
    super(opts);
    this.state = new Map(); // trackId -> { firstSeen, lastSeen, zoneId }
    this.thresholdMs = (this.parameters.thresholdSeconds || 30) * 1000;
  }

  evaluate(detections, frameMetadata) {
    const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
    const zones = this.parameters.zones || [];
    const events = [];

    for (const det of detections) {
      if (det.class !== 'person' || det.confidence < this.minConfidence) continue;
      const trackId = det.attributes?.trackId;
      if (!trackId) continue;

      const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);
      const zone = zones.find((z) => this.isInZone(bboxNorm, z));
      if (!zone) continue;

      const key = `${trackId}_${zone.id}`;
      const state = this.state.get(key) || {
        firstSeen: now,
        lastSeen: now,
        triggered: false,
      };
      state.lastSeen = now;

      if (!state.triggered && now - state.firstSeen >= this.thresholdMs) {
        state.triggered = true;
        const confidence = this.computeConfidence(det.confidence, zone.weight || 1);
        events.push(
          this.createEvent(
            {
              eventType: 'LOITERING',
              confidence,
              data: {
                trackId,
                durationMs: now - state.firstSeen,
                bbox: det.bbox,
                zoneId: zone.id,
              },
            },
            frameMetadata,
          ),
        );
      }

      this.state.set(key, state);
    }

    return events;
  }
}

/**
 * FireSmokeRule - detects fire/smoke in frame.
 */
export class FireSmokeRule extends BaseRule {
  evaluate(detections, frameMetadata) {
    const classes = this.parameters.classes || ['fire', 'smoke'];
    const events = [];
    for (const det of detections) {
      if (!classes.includes(det.class) || det.confidence < this.minConfidence) continue;
      const confidence = this.computeConfidence(det.confidence, this.parameters.weight || 1);
      events.push(
        this.createEvent(
          {
            eventType: 'FIRE_SMOKE',
            confidence,
            data: {
              type: det.class,
              bbox: det.bbox,
            },
          },
          frameMetadata,
        ),
      );
    }
    return events;
  }
}

/**
 * UnauthorizedParkingRule - detects vehicles parked in restricted areas.
 */
export class UnauthorizedParkingRule extends BaseRule {
  constructor(opts) {
    super(opts);
    this.state = new Map(); // trackId -> { firstSeen, lastSeen, zoneId }
    this.thresholdMs = (this.parameters.thresholdSeconds || 60) * 1000;
  }

  evaluate(detections, frameMetadata) {
    const now = Date.parse(frameMetadata.timestamp || new Date().toISOString());
    const zones = this.parameters.zones || [];
    const allowedPlates = new Set(this.parameters.allowedPlates || []);
    const events = [];

    for (const det of detections) {
      if (!['car', 'truck', 'bus', 'motorbike'].includes(det.class) || det.confidence < this.minConfidence) {
        continue;
      }
      const trackId = det.attributes?.trackId;
      if (!trackId) continue;

      const licencePlate = det.attributes?.plateNumber;
      if (licencePlate && allowedPlates.has(licencePlate)) {
        continue;
      }

      const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);
      const zone = zones.find((z) => this.isInZone(bboxNorm, z));
      if (!zone) continue;

      const key = `${trackId}_${zone.id}`;
      const state = this.state.get(key) || {
        firstSeen: now,
        lastSeen: now,
        triggered: false,
      };
      state.lastSeen = now;

      if (!state.triggered && now - state.firstSeen >= this.thresholdMs) {
        state.triggered = true;
        const confidence = this.computeConfidence(det.confidence, zone.weight || 1);
        events.push(
          this.createEvent(
            {
              eventType: 'UNAUTHORIZED_PARKING',
              confidence,
              data: {
                trackId,
                durationMs: now - state.firstSeen,
                bbox: det.bbox,
                zoneId: zone.id,
                plateNumber: licencePlate,
              },
            },
            frameMetadata,
          ),
        );
      }

      this.state.set(key, state);
    }

    return events;
  }
}

/**
 * TripwireRule - detects when objects cross virtual lines.
 */
export class TripwireRule extends BaseRule {
  constructor(opts) {
    super(opts);
    this.lines = this.parameters.lines || [];
    this.state = new Map(); // trackId -> lastPosition
  }

  evaluate(detections, frameMetadata) {
    const events = [];
    for (const det of detections) {
      if (det.confidence < this.minConfidence) continue;
      const trackId = det.attributes?.trackId;
      if (!trackId) continue;

      const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);
      const cx = (bboxNorm.x1 + bboxNorm.x2) / 2;
      const cy = (bboxNorm.y1 + bboxNorm.y2) / 2;

      const prev = this.state.get(trackId);
      this.state.set(trackId, { cx, cy });

      if (!prev) continue;

      for (const line of this.lines) {
        if (!line.enabled) continue;
        const crossed = this.hasCrossedLine(prev, { cx, cy }, line);
        if (!crossed) continue;

        const confidence = this.computeConfidence(det.confidence, line.weight || 1);
        events.push(
          this.createEvent(
            {
              eventType: 'TRIPWIRE',
              confidence,
              data: {
                trackId,
                lineId: line.id,
                from: prev,
                to: { cx, cy },
              },
            },
            frameMetadata,
          ),
        );
      }
    }
    return events;
  }

  hasCrossedLine(prev, curr, line) {
    const { x1, y1, x2, y2 } = line;
    const d1 = (curr.cx - x1) * (y2 - y1) - (curr.cy - y1) * (x2 - x1);
    const d0 = (prev.cx - x1) * (y2 - y1) - (prev.cy - y1) * (x2 - x1);
    return d0 * d1 < 0;
  }
}

/**
 * VaultTransactionRule - detects transactions in vault areas.
 */
export class VaultTransactionRule extends BaseRule {
  evaluate(detections, frameMetadata) {
    const zones = this.parameters.zones || [];
    const minObjects = this.parameters.minObjects || 2;
    const events = [];

    const people = detections.filter((d) => d.class === 'person' && d.confidence >= this.minConfidence);
    if (people.length === 0) return events;

    for (const zone of zones) {
      const inZone = people.filter((d) => this.isInZone(this.normalizeBBox(d.bbox, frameMetadata), zone));
      if (inZone.length >= minObjects) {
        const confidence = this.computeConfidence(
          inZone.reduce((max, d) => Math.max(max, d.confidence), 0),
          zone.weight || 1,
        );
        events.push(
          this.createEvent(
            {
              eventType: 'VAULT_TRANSACTION',
              confidence,
              data: {
                zoneId: zone.id,
                personCount: inZone.length,
              },
            },
            frameMetadata,
          ),
        );
      }
    }

    return events;
  }
}

/**
 * SpeedingVehicleRule - calculates vehicle speed across frames.
 */
export class SpeedingVehicleRule extends BaseRule {
  constructor(opts) {
    super(opts);
    this.state = new Map(); // trackId -> { lastPos, lastTs }
    this.speedLimitKmh = this.parameters.speedLimitKmh || 60;
    this.pixelsPerMeter = this.parameters.pixelsPerMeter || 50;
  }

  evaluate(detections, frameMetadata) {
    const ts = Date.parse(frameMetadata.timestamp || new Date().toISOString());
    const events = [];

    for (const det of detections) {
      if (!['car', 'truck', 'bus', 'motorbike'].includes(det.class) || det.confidence < this.minConfidence) {
        continue;
      }
      const trackId = det.attributes?.trackId;
      if (!trackId) continue;

      const bbox = det.bbox;
      const cx = (bbox[0] + bbox[2]) / 2;
      const cy = (bbox[1] + bbox[3]) / 2;

      const prev = this.state.get(trackId);
      this.state.set(trackId, { cx, cy, ts });
      if (!prev) continue;

      const dtSec = (ts - prev.ts) / 1000;
      if (dtSec <= 0) continue;

      const dx = (cx - prev.cx) / this.pixelsPerMeter;
      const dy = (cy - prev.cy) / this.pixelsPerMeter;
      const distanceMeters = Math.sqrt(dx * dx + dy * dy);
      const speedKmh = (distanceMeters / dtSec) * 3.6;

      if (speedKmh > this.speedLimitKmh) {
        const confidence = this.computeConfidence(det.confidence, this.parameters.weight || 1);
        events.push(
          this.createEvent(
            {
              eventType: 'SPEEDING_VEHICLE',
              confidence,
              data: {
                trackId,
                speedKmh,
                speedLimitKmh: this.speedLimitKmh,
                bbox,
              },
            },
            frameMetadata,
          ),
        );
      }
    }

    return events;
  }
}

/**
 * VehicleDirectionalCountingRule - counts vehicles by direction.
 */
export class VehicleDirectionalCountingRule extends BaseRule {
  constructor(opts) {
    super(opts);
    this.state = new Map(); // trackId -> { lastPos }
  }

  evaluate(detections, frameMetadata) {
    const events = [];
    const directionAxis = this.parameters.directionAxis || 'y'; // 'x' or 'y'

    for (const det of detections) {
      if (!['car', 'truck', 'bus', 'motorbike'].includes(det.class) || det.confidence < this.minConfidence) {
        continue;
      }
      const trackId = det.attributes?.trackId;
      if (!trackId) continue;

      const bboxNorm = this.normalizeBBox(det.bbox, frameMetadata);
      const pos = directionAxis === 'x'
        ? (bboxNorm.x1 + bboxNorm.x2) / 2
        : (bboxNorm.y1 + bboxNorm.y2) / 2;

      const prev = this.state.get(trackId);
      if (prev == null) {
        this.state.set(trackId, pos);
        continue;
      }

      const direction = pos > prev ? 'positive' : 'negative';
      this.state.set(trackId, pos);

      const confidence = this.computeConfidence(det.confidence, this.parameters.weight || 1);
      events.push(
        this.createEvent(
          {
            eventType: 'VEHICLE_DIRECTIONAL_COUNT',
            confidence,
            data: {
              trackId,
              direction,
              axis: directionAxis,
            },
          },
          frameMetadata,
        ),
      );
    }

    return events;
  }
}

/**
 * AnimalCountingRule - detects and counts animals.
 */
export class AnimalCountingRule extends BaseRule {
  evaluate(detections, frameMetadata) {
    const classes = this.parameters.classes || ['dog', 'cat', 'cow', 'horse', 'sheep', 'goat'];
    const animals = detections.filter(
      (d) => classes.includes(d.class) && d.confidence >= this.minConfidence,
    );
    if (animals.length === 0) return [];

    const confidence = this.computeConfidence(
      animals.reduce((max, d) => Math.max(max, d.confidence), 0),
      this.parameters.weight || 1,
    );

    return [
      this.createEvent(
        {
          eventType: 'ANIMAL_COUNT',
          confidence,
          data: {
            count: animals.length,
            classes: Array.from(new Set(animals.map((a) => a.class))),
          },
        },
        frameMetadata,
      ),
    ];
  }
}

/**
 * CleanlinessRule - detects trash/unclean areas.
 */
export class CleanlinessRule extends BaseRule {
  evaluate(detections, frameMetadata) {
    const classes = this.parameters.classes || ['trash', 'garbage', 'litter'];
    const dirty = detections.filter(
      (d) => classes.includes(d.class) && d.confidence >= this.minConfidence,
    );
    if (dirty.length === 0) return [];

    const confidence = this.computeConfidence(
      dirty.reduce((max, d) => Math.max(max, d.confidence), 0),
      this.parameters.weight || 1,
    );

    return [
      this.createEvent(
        {
          eventType: 'UNCLEAN_AREA',
          confidence,
          data: {
            count: dirty.length,
          },
        },
        frameMetadata,
      ),
    ];
  }
}

/**
 * VideoLossRule - detects when video feed is lost.
 */
export class VideoLossRule extends BaseRule {
  evaluate(detections, frameMetadata) {
    // If metadata indicates video loss, raise event.
    if (frameMetadata.videoLost) {
      const confidence = this.parameters.confidence || 0.99;
      return [
        this.createEvent(
          {
            eventType: 'VIDEO_LOSS',
            confidence,
            data: {
              reason: frameMetadata.lossReason || 'signal_lost',
            },
          },
          frameMetadata,
        ),
      ];
    }

    // If there are repeated empty detections, treat as potential video loss.
    if (!Array.isArray(detections) || detections.length === 0) {
      const confidence = (this.parameters.baseConfidence || 0.5);
      return [
        this.createEvent(
          {
            eventType: 'VIDEO_LOSS_SUSPECTED',
            confidence,
            data: {},
          },
          frameMetadata,
        ),
      ];
    }

    return [];
  }
}

/**
 * Helper to map rule type strings from rule_config.json to rule classes.
 *
 * @param {string} ruleType
 * @returns {typeof BaseRule | null}
 */
export function getRuleClassByType(ruleType) {
  switch (ruleType) {
    case 'ZoneIntrusion':
    case 'ZoneIntrusionRule':
      return ZoneIntrusionRule;
    case 'Loitering':
    case 'LoiteringRule':
      return LoiteringRule;
    case 'FireSmoke':
    case 'FireSmokeRule':
      return FireSmokeRule;
    case 'UnauthorizedParking':
    case 'UnauthorizedParkingRule':
      return UnauthorizedParkingRule;
    case 'Tripwire':
    case 'TripwireRule':
      return TripwireRule;
    case 'VaultTransaction':
    case 'VaultTransactionRule':
      return VaultTransactionRule;
    case 'SpeedingVehicle':
    case 'SpeedingVehicleRule':
      return SpeedingVehicleRule;
    case 'VehicleDirectionalCounting':
    case 'VehicleDirectionalCountingRule':
      return VehicleDirectionalCountingRule;
    case 'AnimalCounting':
    case 'AnimalCountingRule':
      return AnimalCountingRule;
    case 'Cleanliness':
    case 'CleanlinessRule':
      return CleanlinessRule;
    case 'VideoLoss':
    case 'VideoLossRule':
      return VideoLossRule;
    default:
      return null;
  }
}


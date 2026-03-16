import express from 'express';
import { authenticateDevice, requireCapability } from '../middleware/deviceAuth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../validators/schemas.js';
import { baseEventSchema, heartbeatSchema, batchEventsSchema } from '../validators/deviceEventSchemas.js';
import { createDeviceEvent } from '../repositories/eventRepository.js';
import { findDeviceById, updateDeviceHeartbeat } from '../repositories/deviceRepository.js';
import kafkaEventService from '../core/kafka/KafkaEventService.js';
import { pool } from '../db/pool.js';

const router = express.Router();

// All device routes require authentication
router.use(authenticateDevice);

/**
 * POST /api/devices/:deviceId/events
 * Submit single event from device
 */
router.post(
  '/:deviceId/events',
  requireCapability('face_detection'),
  validateBody(baseEventSchema),
  asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const eventData = req.validatedBody;
    
    // Verify device matches token
    if (deviceId !== req.device.id) {
      return res.status(403).json({
        message: 'Device ID mismatch',
        code: 'DEVICE_MISMATCH'
      });
    }
    
    // Store event in database
    const dbEvent = await createDeviceEvent({
      deviceId,
      eventType: eventData.eventType,
      occurredAt: eventData.timestamp,
      payloadJson: {
        ...eventData.payload,
        faceData: eventData.faceData,
        frameData: eventData.frameData,
        deviceMetadata: eventData.deviceMetadata
      },
      detectedFaceEmbedding: eventData.faceData?.embedding,
      confidenceScore: eventData.faceData?.confidence,
      frameUrl: eventData.frameData?.imageUrl
    });
    
    // Publish device event to Kafka for async processing pipeline
    try {
      await kafkaEventService.publishEvent({
        type:       'DEVICE_EVENT',
        eventId:    dbEvent.pk_event_id,
        deviceId,
        siteId:     req.device.siteId,
        eventType:  eventData.eventType,
        timestamp:  eventData.timestamp,
        embedding:  eventData.faceData?.embedding,
        confidence: eventData.faceData?.confidence,
        frameUrl:   eventData.frameData?.imageUrl,
      });
    } catch (kafkaErr) {
      // Non-fatal: event is already stored in DB
      console.error('[DeviceRoutes] Kafka publish failed:', kafkaErr.message);
    }
    
    res.status(201).json({
      success: true,
      eventId: dbEvent.pk_event_id,
      receivedAt: dbEvent.received_at,
      status: 'pending'
    });
  })
);

/**
 * POST /api/devices/:deviceId/events/batch
 * Submit multiple events (for high-frequency scenarios)
 */
router.post(
  '/:deviceId/events/batch',
  validateBody(batchEventsSchema),
  asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { events } = req.validatedBody;
    
    if (deviceId !== req.device.id) {
      return res.status(403).json({
        message: 'Device ID mismatch',
        code: 'DEVICE_MISMATCH'
      });
    }
    
    const results = [];
    const errors = [];
    
    // Process events in parallel with error handling
    await Promise.all(events.map(async (eventData, index) => {
      try {
        const dbEvent = await createDeviceEvent({
          deviceId,
          eventType: eventData.eventType,
          occurredAt: eventData.timestamp,
          payloadJson: eventData,
          detectedFaceEmbedding: eventData.faceData?.embedding,
          confidenceScore: eventData.faceData?.confidence,
          frameUrl: eventData.frameData?.imageUrl
        });
        
        results.push({
          index,
          eventId: dbEvent.pk_event_id,
          status: 'success'
        });
        
        // TODO: Async Kafka publish (Week 2)
        
      } catch (err) {
        errors.push({
          index,
          error: err.message,
          code: 'PROCESSING_ERROR'
        });
      }
    }));
    
    res.status(201).json({
      success: errors.length === 0,
      processed: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  })
);

/**
 * POST /api/devices/:deviceId/heartbeat
 * Device heartbeat (keep-alive)
 */
router.post(
  '/:deviceId/heartbeat',
  validateBody(heartbeatSchema),
  asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { deviceMetadata } = req.validatedBody;
    
    if (deviceId !== req.device.id) {
      return res.status(403).json({
        message: 'Device ID mismatch',
        code: 'DEVICE_MISMATCH'
      });
    }
    
    await updateDeviceHeartbeat(deviceId, deviceMetadata);
    
    // Return device configuration updates if any
    const device = await findDeviceById(deviceId);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      config: device.config_json || {},
      actions: [] // Future: remote commands for device
    });
  })
);

/**
 * GET /api/devices/:deviceId/config
 * Get device configuration
 */
router.get(
  '/:deviceId/config',
  asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    
    if (deviceId !== req.device.id) {
      return res.status(403).json({
        message: 'Device ID mismatch',
        code: 'DEVICE_MISMATCH'
      });
    }
    
    const device = await findDeviceById(deviceId);
    
    // TODO: Get active employees for this site (Week 2)
    // const siteEmployees = await getSiteEmployeesForDeviceSync(device.fk_site_id);
    
    // Fetch active employees with face embeddings.
    // Site filtering is best-effort because device/site IDs can come from
    // different schemas (UUID in devices vs bigint in hr_employee.site_id).
    let employees = [];
    try {
      const siteId = device.fk_site_id ?? req.device?.siteId ?? null;
      const sql = `
        SELECT
          e.pk_employee_id    AS employee_id,
          e.full_name,
          e.employee_code,
          efe.embedding::text AS embedding_str
        FROM employee_face_embeddings efe
        JOIN hr_employee e ON e.pk_employee_id = efe.employee_id
        WHERE e.status = 'active'
          ${siteId ? 'AND CAST(e.site_id AS text) = $1' : ''}
        ORDER BY efe.enrolled_at DESC
      `;
      const params = siteId ? [String(siteId)] : [];
      const { rows } = await pool.query(sql, params);
      employees = rows.map(r => ({
        employeeId:   String(r.employee_id),
        fullName:     r.full_name,
        employeeCode: r.employee_code,
        embedding:    r.embedding_str
          ? r.embedding_str.slice(1, -1).split(',').map(Number)
          : [],
      }));
    } catch (e) {
      console.error('[DeviceRoutes] Employee sync query failed:', e.message);
    }

    res.json({
      device: {
        id: device.pk_device_id,
        code: device.device_code,
        type: device.device_type,
        capabilities: device.capabilities
      },
      config: device.config_json,
      employeeSync: {
        lastUpdated:   new Date().toISOString(),
        employeeCount: employees.length,
        employees,
      }
    });
  })
);

export { router as deviceRoutes };

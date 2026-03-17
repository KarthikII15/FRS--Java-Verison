import express from 'express';
import { z } from 'zod';
import { authenticateDevice, requireCapability } from '../middleware/deviceAuth.js';
import { requireAuth } from '../middleware/authz.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../validators/schemas.js';
import { baseEventSchema, heartbeatSchema, batchEventsSchema } from '../validators/deviceEventSchemas.js';
import { createDeviceEvent } from '../repositories/eventRepository.js';
import { createDevice, findDeviceByCode, findDeviceById, updateDeviceHeartbeat } from '../repositories/deviceRepository.js';
import kafkaEventService from '../core/kafka/KafkaEventService.js';
import { pool } from '../db/pool.js';
import wsManager from '../websocket/index.js';

const router = express.Router();
const publicRouter = express.Router();
const adminRouter = express.Router();

const publicHeartbeatSchema = z.object({
  deviceCode: z.string().min(1),
  cpuUsage: z.number().optional(),
  memoryUsage: z.number().optional(),
  temperature: z.number().optional(),
  fpsActual: z.number().optional(),
  queueDepth: z.number().optional(),
  cameraCount: z.number().optional()
});

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
        type: 'DEVICE_EVENT',
        eventId: dbEvent.pk_event_id,
        deviceId,
        siteId: req.device.siteId,
        eventType: eventData.eventType,
        timestamp: eventData.timestamp,
        embedding: eventData.faceData?.embedding,
        confidence: eventData.faceData?.confidence,
        frameUrl: eventData.frameData?.imageUrl,
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
        employeeId: String(r.employee_id),
        fullName: r.full_name,
        employeeCode: r.employee_code,
        embedding: r.embedding_str
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
        lastUpdated: new Date().toISOString(),
        employeeCount: employees.length,
        employees,
      }
    });
  })
);

export { router as deviceRoutes };

/**
 * GET /api/devices/live-stats
 * Aggregated real-time device stats for dashboard
 */
adminRouter.get(
  '/live-stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = req.auth.scope.tenantId;

    // Single query with CTEs for performance
    const sql = `
      WITH today_events AS (
        SELECT fk_device_id, event_type, payload_json, confidence_score
        FROM device_events
        WHERE occurred_at::date = CURRENT_DATE
      ),
      device_agg AS (
        SELECT 
          d.pk_device_id,
          d.device_code,
          d.device_name,
          d.status,
          d.last_heartbeat_at,
          d.config_json,
          COUNT(te.fk_device_id) FILTER (WHERE te.event_type = 'EMPLOYEE_ENTRY') as recognitions_today
        FROM devices d
        LEFT JOIN today_events te ON te.fk_device_id = d.pk_device_id
        WHERE d.fk_site_id IN (SELECT pk_site_id FROM hr_site WHERE fk_tenant_id = $1)
           OR d.fk_site_id IS NULL -- Catch unassigned devices too
        GROUP BY d.pk_device_id
      ),
      summary AS (
        SELECT
          COUNT(*) as total_devices,
          COUNT(*) FILTER (WHERE status = 'online') as online_devices,
          COUNT(*) FILTER (WHERE status = 'offline') as offline_devices
        FROM devices
        WHERE fk_site_id IN (SELECT pk_site_id FROM hr_site WHERE fk_tenant_id = $1)
           OR fk_site_id IS NULL
      ),
      event_summary AS (
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'EMPLOYEE_ENTRY') as recognitions_total,
          COUNT(*) FILTER (WHERE event_type = 'FACE_DETECTED' AND (payload_json->>'reason' = 'no_match')) as unknown_total,
          AVG(confidence_score) FILTER (WHERE event_type = 'EMPLOYEE_ENTRY') as avg_conf
        FROM today_events te
        JOIN devices d ON d.pk_device_id = te.fk_device_id
        WHERE d.fk_site_id IN (SELECT pk_site_id FROM hr_site WHERE fk_tenant_id = $1)
           OR d.fk_site_id IS NULL
      )
      SELECT 
        s.total_devices as "totalDevices",
        s.online_devices as "onlineDevices",
        s.offline_devices as "offlineDevices",
        COALESCE(es.recognitions_total, 0)::int as "recognitionsToday",
        COALESCE(es.unknown_total, 0)::int as "unknownFacesToday",
        COALESCE(es.avg_conf, 0)::float as "avgConfidence",
        (
          SELECT json_agg(json_build_object(
            'id', da.pk_device_id,
            'code', da.device_code,
            'name', da.device_name,
            'status', da.status,
            'lastHeartbeatAt', da.last_heartbeat_at,
            'heartbeatAgeSeconds', EXTRACT(EPOCH FROM (NOW() - da.last_heartbeat_at)),
            'recognitionsToday', da.recognitions_today,
            'cpuUsage', da.config_json->'cpuUsage',
            'memoryUsage', da.config_json->'memoryUsage',
            'temperature', da.config_json->'temperature',
            'fpsActual', da.config_json->'fpsActual'
          )) FROM device_agg da
        ) as "deviceList"
      FROM summary s, event_summary es
    `;

    const { rows } = await pool.query(sql, [tenantId]);
    res.json(rows[0] || {
      totalDevices: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      recognitionsToday: 0,
      unknownFacesToday: 0,
      avgConfidence: 0,
      deviceList: []
    });
  })
);

/**
 * GET /api/devices/events/recent
 * Recent recognition events feed
 */
adminRouter.get(
  '/events/recent',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const deviceCode = req.query.deviceCode;
    const tenantId = req.auth.scope.tenantId;

    const sql = `
      SELECT 
        de.pk_event_id as id,
        de.event_type as "eventType",
        de.occurred_at as "occurredAt",
        de.fk_device_id as "deviceId",
        d.device_code as "deviceCode",
        d.device_name as "deviceName",
        emp.pk_employee_id as "employeeId",
        emp.full_name as "employeeName",
        emp.employee_code as "employeeCode",
        emp.department,
        de.confidence_score as confidence,
        (de.payload_json->>'similarity')::float as similarity,
        de.processing_status as "processingStatus"
      FROM device_events de
      JOIN devices d ON d.pk_device_id = de.fk_device_id
      LEFT JOIN hr_employee emp ON emp.pk_employee_id = (de.payload_json->>'employeeId')::bigint
      JOIN hr_site s ON s.pk_site_id = d.fk_site_id
      WHERE s.fk_tenant_id = $1
        ${deviceCode ? 'AND d.device_code = $3' : ''}
      ORDER BY de.occurred_at DESC
      LIMIT $2
    `;

    const params = [tenantId, limit];
    if (deviceCode) params.push(deviceCode);

    const { rows } = await pool.query(sql, params);
    res.json({ events: rows });
  })
);

export { adminRouter as deviceAdminRoutes };

publicRouter.post(
  '/heartbeat',
  validateBody(publicHeartbeatSchema),
  asyncHandler(async (req, res) => {
    const {
      deviceCode,
      cpuUsage,
      memoryUsage,
      temperature,
      fpsActual,
      queueDepth,
      cameraCount
    } = req.validatedBody;

    let device = await findDeviceByCode(deviceCode);
    let registeredNow = false;
    if (!device) {
      device = await createDevice({
        deviceCode,
        deviceName: deviceCode,
        deviceType: 'camera',
        siteId: null,
        locationDescription: null,
        ipAddress: null,
        keycloakClientId: null,
        capabilities: ['face_detection'],
        firmwareVersion: null,
        status: 'online'
      });
      registeredNow = true;
    }

    const metrics = {
      cpuUsage,
      memoryUsage,
      temperature,
      fpsActual,
      queueDepth,
      cameraCount
    };

    await updateDeviceHeartbeat(device.pk_device_id, metrics);

    await createDeviceEvent({
      deviceId: device.pk_device_id,
      eventType: 'DEVICE_HEARTBEAT',
      occurredAt: new Date().toISOString(),
      payloadJson: {
        deviceCode,
        metrics
      },
      detectedFaceEmbedding: null,
      confidenceScore: null,
      frameUrl: null,
      processingStatus: 'completed'
    });

    try {
      await kafkaEventService.publishEvent({
        type: 'DEVICE_HEARTBEAT',
        deviceId: device.pk_device_id,
        deviceCode,
        timestamp: new Date().toISOString(),
        ...metrics
      });
    } catch (kafkaErr) {
      console.error('[DeviceRoutes] Heartbeat Kafka publish failed:', kafkaErr.message);
    }

    const tenantId = device.config_json?.tenantId || 'all';
    wsManager.emitDeviceHeartbeat({
      tenantId: String(tenantId),
      deviceId: device.pk_device_id,
      deviceCode,
      ...metrics
    });

    res.json({ ok: true, deviceId: device.pk_device_id, registeredNow });
  })
);

export { publicRouter as devicePublicRoutes };

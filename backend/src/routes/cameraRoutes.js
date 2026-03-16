/**
 * cameraRoutes.js
 *
 * REST API for managing camera / RTSP configuration.
 * Cameras are stored in the `devices` table (device_type = 'camera')
 * with RTSP URL and stream config kept in config_json.
 *
 * Supports Prama India (Prama Hikvision India Pvt Ltd.) cameras natively.
 * Prama cameras use the Hikvision RTSP/ISAPI protocol stack.
 *
 * Endpoints:
 *   GET    /api/cameras              — list all cameras (filtered by scope)
 *   POST   /api/cameras              — register new camera
 *   GET    /api/cameras/:id          — get single camera
 *   PUT    /api/cameras/:id          — update camera config
 *   DELETE /api/cameras/:id          — remove camera
 *   POST   /api/cameras/:id/test     — verify RTSP URL is reachable
 *   GET    /api/cameras/:id/status   — live health (heartbeat age, event count)
 *   GET    /api/cameras/:id/snapshot — fetch JPEG snapshot via Hikvision ISAPI
 *   POST   /api/cameras/discover     — probe Prama/Hikvision camera by IP
 */

import express from 'express';
import { requireAuth, requirePermission } from '../middleware/authz.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { pool } from '../db/pool.js';

const router = express.Router();
router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cameras
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  requirePermission('devices.read'),
  asyncHandler(async (req, res) => {
    const siteId = req.query.siteId || req.auth?.scope?.siteId || null;
    const params = [];
    const conditions = ["device_type = 'camera'"];

    if (siteId) {
      params.push(siteId);
      conditions.push(`fk_site_id = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT
         pk_device_id   AS id,
         device_code    AS code,
         device_name    AS name,
         device_type    AS type,
         fk_site_id     AS "siteId",
         location_description AS location,
         ip_address     AS "ipAddress",
         mac_address    AS "macAddress",
         firmware_version AS "firmwareVersion",
         status,
         config_json    AS config,
         capabilities,
         last_heartbeat_at AS "lastHeartbeatAt",
         last_seen_at      AS "lastSeenAt",
         created_at     AS "createdAt"
       FROM devices
       WHERE ${conditions.join(' AND ')}
       ORDER BY device_name`,
      params
    );

    // Flatten RTSP URL to top level for convenience
    const cameras = rows.map(flattenCameraConfig);
    return res.json({ data: cameras, count: cameras.length });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cameras
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  requirePermission('devices.write'),
  asyncHandler(async (req, res) => {
    const {
      code,
      name,
      siteId,
      location,
      ipAddress,
      macAddress,
      firmwareVersion,
      rtspUrl,
      rtspMainUrl,
      snapshotUrl,
      rtspUsername,
      rtspPassword,
      channel,
      rtspPort,
      httpPort,
      brand,
      fpsTarget = 5,
      resolution = '1280x720',
      role = 'entry',       // entry | exit | both | zone
      recognitionMode = 'face',
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'code and name are required' });
    }

    const config = {
      rtspUrl:       rtspUrl       || null,
      rtspMainUrl:   rtspMainUrl   || null,
      snapshotUrl:   snapshotUrl   || null,
      rtspUsername:  rtspUsername  || null,
      rtspPassword:  rtspPassword  || null,   // stored server-side only — never returned to client
      channel:       channel       || null,
      rtspPort:      rtspPort      || null,
      httpPort:      httpPort      || null,
      brand:         brand         || 'prama_hikvision',
      fpsTarget,
      resolution,
      role,
      recognitionMode,
    };

    const { rows } = await pool.query(
      `INSERT INTO devices (
         device_code, device_name, device_type, fk_site_id,
         location_description, ip_address, mac_address,
         firmware_version, capabilities, config_json, status
       ) VALUES ($1,$2,'camera',$3,$4,$5,$6,$7,$8,$9::jsonb,'offline')
       RETURNING *`,
      [
        code, name, siteId || null, location || null,
        ipAddress || null, macAddress || null,
        firmwareVersion || null,
        JSON.stringify(['face_detection', 'rtsp_stream']),
        JSON.stringify(config),
      ]
    );

    return res.status(201).json(flattenCameraConfig(normalizeRow(rows[0])));
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cameras/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  requirePermission('devices.read'),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM devices WHERE pk_device_id = $1 AND device_type = 'camera'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Camera not found' });
    return res.json(flattenCameraConfig(normalizeRow(rows[0])));
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/cameras/:id
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  requirePermission('devices.write'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name, location, ipAddress, macAddress, firmwareVersion,
      rtspUrl, rtspMainUrl, snapshotUrl, rtspUsername, rtspPassword,
      channel, rtspPort, httpPort, brand,
      fpsTarget, resolution, role, recognitionMode,
    } = req.body;

    // Patch config_json — merge with existing so we don't overwrite fields we didn't touch
    const configPatch = {};
    if (rtspUrl       !== undefined) configPatch.rtspUrl       = rtspUrl;
    if (rtspMainUrl   !== undefined) configPatch.rtspMainUrl   = rtspMainUrl;
    if (snapshotUrl   !== undefined) configPatch.snapshotUrl   = snapshotUrl;
    if (rtspUsername  !== undefined) configPatch.rtspUsername  = rtspUsername;
    if (rtspPassword  !== undefined) configPatch.rtspPassword  = rtspPassword;
    if (channel       !== undefined) configPatch.channel       = channel;
    if (rtspPort      !== undefined) configPatch.rtspPort      = rtspPort;
    if (httpPort      !== undefined) configPatch.httpPort      = httpPort;
    if (brand         !== undefined) configPatch.brand         = brand;
    if (fpsTarget     !== undefined) configPatch.fpsTarget     = fpsTarget;
    if (resolution    !== undefined) configPatch.resolution    = resolution;
    if (role          !== undefined) configPatch.role          = role;
    if (recognitionMode !== undefined) configPatch.recognitionMode = recognitionMode;

    const { rows } = await pool.query(
      `UPDATE devices SET
         device_name          = COALESCE($2, device_name),
         location_description = COALESCE($3, location_description),
         ip_address           = COALESCE($4::inet, ip_address),
         mac_address          = COALESCE($5, mac_address),
         firmware_version     = COALESCE($6, firmware_version),
         config_json          = config_json || $7::jsonb,
         updated_at           = NOW()
       WHERE pk_device_id = $1 AND device_type = 'camera'
       RETURNING *`,
      [id, name, location, ipAddress, macAddress, firmwareVersion, JSON.stringify(configPatch)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Camera not found' });
    return res.json(flattenCameraConfig(normalizeRow(rows[0])));
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/cameras/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  requirePermission('devices.write'),
  asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query(
      `DELETE FROM devices WHERE pk_device_id = $1 AND device_type = 'camera'`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Camera not found' });
    return res.json({ success: true, message: 'Camera removed' });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cameras/:id/test
// Verify the RTSP URL is reachable without starting a full stream.
// Uses curl to probe the RTSP OPTIONS method — safe, < 3 s.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:id/test',
  requirePermission('devices.read'),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT config_json FROM devices WHERE pk_device_id = $1 AND device_type = 'camera'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Camera not found' });

    const config = rows[0].config_json || {};
    const rtspUrl = config.rtspUrl;
    if (!rtspUrl) {
      return res.status(422).json({ reachable: false, message: 'No RTSP URL configured for this camera' });
    }

    // Build URL with credentials if stored
    let probeUrl = rtspUrl;
    if (config.rtspUsername) {
      try {
        const u = new URL(rtspUrl);
        u.username = config.rtspUsername;
        u.password = config.rtspPassword || '';
        probeUrl = u.toString();
      } catch { /* invalid URL — use as-is */ }
    }

    // Lightweight OPTIONS probe — does not pull video data
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync('curl', [
        '--silent', '--max-time', '4',
        '--request', 'OPTIONS', probeUrl
      ]);
      return res.json({ reachable: true, rtspUrl, message: 'Camera is reachable' });
    } catch (e) {
      return res.json({
        reachable: false,
        rtspUrl,
        message: 'Camera did not respond: ' + (e.stderr || e.message || 'timeout'),
      });
    }
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cameras/:id/status
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:id/status',
  requirePermission('devices.read'),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT
         d.status,
         d.last_heartbeat_at,
         d.last_seen_at,
         COUNT(e.pk_event_id)::int                               AS event_count_24h,
         COUNT(e.pk_event_id) FILTER (
           WHERE e.event_type IN ('FACE_DETECTED','EMPLOYEE_ENTRY','EMPLOYEE_EXIT')
         )::int                                                   AS recognition_count_24h
       FROM devices d
       LEFT JOIN device_events e
         ON e.fk_device_id = d.pk_device_id
         AND e.occurred_at > NOW() - INTERVAL '24 hours'
       WHERE d.pk_device_id = $1 AND d.device_type = 'camera'
       GROUP BY d.pk_device_id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Camera not found' });

    const row = rows[0];
    const heartbeatAgeSeconds = row.last_heartbeat_at
      ? Math.floor((Date.now() - new Date(row.last_heartbeat_at).getTime()) / 1000)
      : null;

    return res.json({
      status:               row.status,
      lastHeartbeatAt:      row.last_heartbeat_at,
      lastSeenAt:           row.last_seen_at,
      heartbeatAgeSeconds,
      online:               heartbeatAgeSeconds !== null && heartbeatAgeSeconds < 120,
      eventCount24h:        row.event_count_24h,
      recognitionCount24h:  row.recognition_count_24h,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cameras/:id/snapshot
// Fetch a live JPEG from the camera via Hikvision ISAPI.
// No RTSP stream opened — single HTTP request, ~1 second.
// Useful for enrollment and testing camera angle.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:id/snapshot',
  requirePermission('devices.read'),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT ip_address, config_json FROM devices WHERE pk_device_id = $1 AND device_type = 'camera'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Camera not found' });

    const ipAddress = rows[0].ip_address ? String(rows[0].ip_address) : null;
    const cfg       = rows[0].config_json || {};

    if (!ipAddress && !cfg.snapshotUrl) {
      return res.status(422).json({ message: 'No IP address configured for this camera' });
    }

    const snapUrl = cfg.snapshotUrl || buildPramaSnapshotUrl({
      ipAddress,
      rtspUsername: cfg.rtspUsername || 'admin',
      rtspPassword: cfg.rtspPassword || '',
      channel:      cfg.channel      || 1,
      httpPort:     cfg.httpPort     || 80,
    });

    try {
      // Node.js native fetch (Node 18+)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(snapUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!resp.ok) {
        return res.status(502).json({
          message: `Camera returned HTTP ${resp.status}. Check credentials and that HTTP port 80 is open.`,
        });
      }

      const buffer = Buffer.from(await resp.arrayBuffer());
      res.set('Content-Type', 'image/jpeg');
      res.set('Content-Length', String(buffer.length));
      res.set('Cache-Control', 'no-cache');
      return res.send(buffer);
    } catch (e) {
      return res.status(502).json({
        message: 'Snapshot fetch failed: ' + e.message,
        hint:    'Ensure camera HTTP port 80 is accessible from the backend server',
      });
    }
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cameras/discover
// Probe a single Prama/Hikvision camera by IP and return
// its device info + auto-generated RTSP URLs.
// Body: { ipAddress, username, password, httpPort?, rtspPort?, channel? }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/discover',
  requirePermission('devices.write'),
  asyncHandler(async (req, res) => {
    const {
      ipAddress, username = 'admin', password = '',
      httpPort = 80, rtspPort = 554, channel = 1,
    } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ message: 'ipAddress is required' });
    }

    const infoUrl = buildPramaDeviceInfoUrl({ ipAddress, httpPort });

    let deviceInfo = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      // Basic auth for Hikvision ISAPI
      const creds = Buffer.from(`${username}:${password}`).toString('base64');
      const resp  = await fetch(infoUrl, {
        signal:  controller.signal,
        headers: { Authorization: `Basic ${creds}` },
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const xml = await resp.text();
        // Extract key fields from XML
        const extract = (tag) => {
          const m = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
          return m ? m[1].trim() : null;
        };
        deviceInfo = {
          deviceName:      extract('deviceName'),
          model:           extract('model'),
          serialNumber:    extract('serialNumber'),
          firmwareVersion: extract('firmwareVersion'),
          macAddress:      extract('macAddress'),
          encoderVersion:  extract('encoderVersion'),
          isPrama:         xml.includes('PRAMA') || xml.includes('Hikvision'),
        };
      }
    } catch (e) {
      // ISAPI unreachable — still return URL suggestions
    }

    // Build all URL variants
    const urls = {
      mainStream:  buildPramaRtspUrl({ ipAddress, rtspUsername: username, rtspPassword: password, channel, streamType: 1, rtspPort }),
      subStream:   buildPramaRtspUrl({ ipAddress, rtspUsername: username, rtspPassword: password, channel, streamType: 2, rtspPort }),
      snapshot:    buildPramaSnapshotUrl({ ipAddress, rtspUsername: username, rtspPassword: password, channel, httpPort }),
      deviceInfo:  infoUrl,
    };

    return res.json({
      ipAddress,
      reachable:  !!deviceInfo,
      deviceInfo: deviceInfo || { message: 'ISAPI not reachable — check credentials and HTTP port' },
      urls: {
        ...urls,
        // Safe versions for display (password masked)
        mainStreamSafe: urls.mainStream.replace(password, '****'),
        subStreamSafe:  urls.subStream.replace(password, '****'),
      },
      suggestedConfig: {
        name:        deviceInfo?.deviceName || `Prama Camera ${ipAddress}`,
        code:        `CAM-${ipAddress.replace(/\./g, '-')}`,
        ipAddress,
        rtspUrl:     urls.subStream,   // sub-stream recommended for attendance
        rtspMainUrl: urls.mainStream,
        snapshotUrl: urls.snapshot,
        username,
        channel,
        fpsTarget:   5,
        resolution:  '1280x720',
        streamType:  'sub',
        brand:       'prama_hikvision',
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build Hikvision/Prama RTSP URL.
 *
 * RTSP channel ID format: (channel × 100) + streamType
 *   streamType 1 = main stream (high res — use for enrollment)
 *   streamType 2 = sub-stream  (low res  — use for live attendance at 5 FPS)
 *
 * Examples:
 *   ch1 main: rtsp://admin:pass@192.168.1.101:554/Streaming/Channels/101
 *   ch1 sub:  rtsp://admin:pass@192.168.1.101:554/Streaming/Channels/102
 *   ch2 main: rtsp://admin:pass@192.168.1.101:554/Streaming/Channels/201
 */
function buildPramaRtspUrl({ ipAddress, rtspUsername = 'admin', rtspPassword = '',
                              channel = 1, streamType = 2, rtspPort = 554 }) {
  const channelId = channel * 100 + streamType;
  const creds = rtspPassword ? `${rtspUsername}:${rtspPassword}@` : '';
  return `rtsp://${creds}${ipAddress}:${rtspPort}/Streaming/Channels/${channelId}`;
}

/**
 * Build Hikvision/Prama ISAPI snapshot URL.
 * Returns a single JPEG — no stream opened, ideal for enrollment photos.
 *
 * http://admin:pass@192.168.1.101:80/ISAPI/Streaming/channels/101/picture
 */
function buildPramaSnapshotUrl({ ipAddress, rtspUsername = 'admin', rtspPassword = '',
                                 channel = 1, httpPort = 80 }) {
  const channelId = channel * 100 + 1; // always main stream for snapshots
  return `http://${rtspUsername}:${rtspPassword}@${ipAddress}:${httpPort}/ISAPI/Streaming/channels/${channelId}/picture`;
}

/**
 * Build Hikvision/Prama ISAPI device info URL.
 * http://192.168.1.101:80/ISAPI/System/deviceInfo
 */
function buildPramaDeviceInfoUrl({ ipAddress, httpPort = 80 }) {
  return `http://${ipAddress}:${httpPort}/ISAPI/System/deviceInfo`;
}

function normalizeRow(row) {
  return {
    id:               row.pk_device_id,
    code:             row.device_code,
    name:             row.device_name,
    type:             row.device_type,
    siteId:           row.fk_site_id,
    location:         row.location_description,
    ipAddress:        row.ip_address ? String(row.ip_address) : null,
    macAddress:       row.mac_address,
    firmwareVersion:  row.firmware_version,
    status:           row.status,
    config:           row.config_json || {},
    capabilities:     row.capabilities,
    lastHeartbeatAt:  row.last_heartbeat_at,
    lastSeenAt:       row.last_seen_at,
    createdAt:        row.created_at,
  };
}

function flattenCameraConfig(cam) {
  const cfg = cam.config || {};
  // Auto-build sub-stream RTSP URL from IP if not explicitly stored
  const autoRtsp = cam.ipAddress && !cfg.rtspUrl
    ? buildPramaRtspUrl({
        ipAddress:    cam.ipAddress,
        rtspUsername: cfg.rtspUsername || 'admin',
        rtspPassword: cfg.rtspPassword || '',
        channel:      cfg.channel      || 1,
        streamType:   2,                  // sub-stream for live attendance
        rtspPort:     cfg.rtspPort     || 554,
      })
    : null;

  return {
    ...cam,
    brand:          cfg.brand          || 'prama_hikvision',
    rtspUrl:        cfg.rtspUrl        || autoRtsp,
    // Main stream URL — stored separately, used for enrollment snapshot
    rtspMainUrl:    cfg.rtspMainUrl    || (cam.ipAddress ? buildPramaRtspUrl({
        ipAddress:    cam.ipAddress,
        rtspUsername: cfg.rtspUsername || 'admin',
        rtspPassword: cfg.rtspPassword || '',
        channel:      cfg.channel      || 1,
        streamType:   1,
        rtspPort:     cfg.rtspPort     || 554,
      }) : null),
    snapshotUrl:    cfg.snapshotUrl    || null,
    channel:        cfg.channel        ?? 1,
    fpsTarget:      cfg.fpsTarget      ?? 5,
    resolution:     cfg.resolution     || '1280x720',
    role:           cfg.role           || 'entry',
    recognitionMode: cfg.recognitionMode || 'face',
    rtspPort:       cfg.rtspPort       || 554,
    httpPort:       cfg.httpPort       || 80,
    // Never expose rtspPassword to API consumers
  };
}

export { router as cameraRoutes };

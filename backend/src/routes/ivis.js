/**
 * ivis.js - IVIS Cloud API Proxy Routes
 *
 * Exposes all IVIS endpoints through your Express backend so that:
 *  - IVIS credentials never reach the browser
 *  - CORS restrictions on the IVIS API are bypassed
 *  - All requests pass through your existing requireAuth middleware
 *  - Responses are cached in PostgreSQL via ivisFetcher -> ivisCache
 *
 * Mounted at: /api/ivis (see server.js)
 */

import express from 'express';
import axios from 'axios';
import https from 'https';
import { fetchIvis } from '../services/ivisFetcher.js';
import { getIvisToken } from '../services/ivisAuth.js';
import {
  runFullSync,
  syncSites,
  syncEmployees,
  syncVisitorStats,
  syncAttendance,
} from '../services/ivisSync.js';
import { requireAuth } from '../middleware/authz.js';
import { query } from '../db/pool.js';
import { env } from '../config/env.js';

const router = express.Router();

// TEMP DEBUG ROUTE — remove before production
router.get('/debug-status', async (_req, res) => {
  try {
    const tokenResult = await query(
      `SELECT expires_at, obtained_at
       FROM ivis_service_token WHERE id = 1`
    );
    const cacheResult = await query(
      `SELECT COUNT(*) AS total FROM ivis_cache`
    );
    const token = tokenResult.rows[0];
    const expiresIn = token
      ? Math.round((new Date(token.expires_at) - Date.now()) / 60000)
      : null;
    res.json({
      authMode: 'auto-detected',
      tokenPresent: !!token,
      tokenValid: expiresIn > 0,
      tokenExpiresInMin: expiresIn,
      tokenObtainedAt: token?.obtained_at ?? null,
      cacheTotal: parseInt(cacheResult.rows[0].total, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All IVIS routes require your existing session auth
if (!env.ivis.bypassAuth) {
  router.use(requireAuth);
} else {
  console.warn('[IVIS] Auth bypass enabled for /api/ivis/* (local testing only).');
}

// Manual trigger — runs full sync immediately
router.post('/sync', async (_req, res) => {
  try {
    runFullSync().catch((err) =>
      console.error('[SYNC] Manual sync error:', err.message)
    );
    res.json({ message: 'Sync started', triggeredAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual trigger — single sync type
router.post('/sync/:type', async (req, res) => {
  const syncMap = {
    sites: syncSites,
    employees: syncEmployees,
    visitorStats: syncVisitorStats,
    attendance: syncAttendance,
  };
  const fn = syncMap[req.params.type];
  if (!fn) return res.status(400).json({ error: 'Unknown sync type' });

  try {
    const result = await fn();
    res.json({ type: req.params.type, result, syncedAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sync history
router.get('/sync/logs', async (_req, res) => {
  try {
    const result = await query(
      `SELECT sync_type, started_at, completed_at, status,
              rows_fetched, rows_upserted, rows_skipped, error_message
       FROM ivis_sync_log
       ORDER BY started_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ivis/status - IVIS system health check (token + cache)
router.get('/status', async (req, res) => {
  try {
    const tokenResult = await query(
      `SELECT expires_at, obtained_at
       FROM ivis_service_token
       WHERE id = 1`
    );

    const cacheResult = await query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (
                WHERE fetched_at > NOW() - INTERVAL '5 minutes'
              ) AS fresh
       FROM ivis_cache`
    );

    const token = tokenResult.rows[0];
    const cache = cacheResult.rows[0];

    const now = Date.now();
    const expiresAt = token ? new Date(token.expires_at) : null;
    const expiresIn = expiresAt
      ? Math.round((expiresAt - now) / 60000)
      : null;

    res.json({
      tokenPresent: !!token,
      tokenObtainedAt: token?.obtained_at ?? null,
      tokenExpiresAt: token?.expires_at ?? null,
      tokenExpiresInMin: expiresIn,
      tokenValid: expiresIn !== null && expiresIn > 0,
      cacheTotal: parseInt(cache.total, 10),
      cacheFresh: parseInt(cache.fresh, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Presence Management endpoints
router.get('/presence-mgmnt/:endpoint', async (req, res) => {
  try {
    const data = await fetchIvis(
      `presence-mgmnt/${req.params.endpoint}`,
      req.query
    );
    res.json(data);
  } catch (err) {
    handleError(err, res, `presence-mgmnt/${req.params.endpoint}`);
  }
});

// profile count (root API, not client-portal)
// GET /api/ivis/profilecount
router.get('/profilecount', async (_req, res) => {
  try {
    const token = await getIvisToken();
    const httpsAgent = new https.Agent({
      rejectUnauthorized: env.ivis.tlsRejectUnauthorized,
    });

    const response = await axios.get(
      'https://iportal-poc.iviscloud.net/api/userprofile/profilecount',
      {
        httpsAgent,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          Authorization: `Bearer ${token}`,
          'Customer-Id': env.ivis.customerId,
          'Customer-Name': env.ivis.customerName,
          'Login-Id': env.ivis.loginId,
          'Tenant-Id': env.ivis.tenantId,
          'Site-Id': 'null',
          'Sitegroup-Id': 'null',
          'Content-Type': 'application/json',
          Origin: 'https://cportal-poc.iviscloud.net',
          Referer: 'https://cportal-poc.iviscloud.net/',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    handleError(err, res, 'userprofile/profilecount');
  }
});

// Employee list — special route (not under /api/client-portal)
// GET /api/ivis/employees
router.get('/employees', async (_req, res) => {
  try {
    const token = await getIvisToken();
    const httpsAgent = new https.Agent({
      rejectUnauthorized: env.ivis.tlsRejectUnauthorized,
    });

    const response = await axios.get(
      'https://iportal-poc.iviscloud.net/api/userprofile/syncVerifiedUsers',
      {
        params: {
          unitId: env.ivis.deviceId ?? 'IVISPMS1001',
          lastSyncTime: '2020-01-01 00:00:00',
        },
        httpsAgent,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          Authorization: `Bearer ${token}`,
          'Customer-Id': env.ivis.customerId,
          'Customer-Name': env.ivis.customerName,
          'Login-Id': env.ivis.loginId,
          'Tenant-Id': env.ivis.tenantId,
          'Site-Id': 'null',
          'Sitegroup-Id': 'null',
          'Content-Type': 'application/json',
          Origin: 'https://cportal-poc.iviscloud.net',
          Referer: 'https://cportal-poc.iviscloud.net/',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      }
    );

    const employees = (response.data?.results ?? response.data ?? []).map((emp) => ({
      pkUserId: emp.pkUserId,
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
      userName: emp.userName,
      imageUrl: emp.imageUrl ?? null,
      status: emp.status,
      profileStatus: emp.profileStatus,
      state: emp.state,
      siteId: emp.siteId,
      tenantId: emp.tenantId,
      customerId: emp.customerId,
    }));

    res.json({ results: employees, errorCode: '200' });
  } catch (err) {
    console.error('[IVIS] Employee list failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch employee list' });
  }
});

// Top-level endpoints (site-details-dropdown, zone-dropdown)
router.get('/:endpoint', async (req, res) => {
  try {
    const data = await fetchIvis(req.params.endpoint, req.query);
    res.json(data);
  } catch (err) {
    handleError(err, res, req.params.endpoint);
  }
});

function handleError(err, res, endpoint) {
  const status = err.response?.status;
  const details = err.response?.data || err.message;
  const detailsText = typeof details === 'object' ? JSON.stringify(details) : details;

  console.error(`[IVIS Proxy] ${endpoint} ->`, detailsText);

  if (status === 401) {
    return res.status(401).json({
      error: 'IVIS token expired or rejected',
      details: detailsText || 'Token has been invalidated - the next request will re-authenticate automatically.',
    });
  }

  if (status === 429) {
    return res.status(429).json({
      error: 'IVIS rate limit reached',
      details: 'Try again in a few seconds.',
    });
  }

  if (status === 404) {
    return res.status(404).json({
      error: 'IVIS endpoint not found',
      details: `Endpoint "${endpoint}" returned 404 from IVIS.`,
    });
  }

  return res.status(status || 500).json({
    error: 'IVIS proxy error',
    details,
  });
}

export default router;

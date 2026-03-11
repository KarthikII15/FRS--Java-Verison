# IVIS Cloud API — Complete Integration Prompt
### FaceAttend Recognition System · Single Consolidated Implementation Guide

> **Stack:** React 18 + TypeScript + Vite + Tailwind CSS · Express.js (ES Modules) · PostgreSQL · Keycloak/JWT Auth
>
> **Goal:** Integrate all 8 live IVIS endpoints into FaceAttend. User logs in → IVIS token silently acquired → stored in PostgreSQL → all IVIS proxy calls use it automatically. Token never exposed to browser.

---

## COMPLETE FLOW

```
Browser                    FaceAttend Backend              IVIS API
   |                              |                            |
   |── POST /api/auth/login ─────▶|                            |
   |   { email, password }        |── GET /api/login/public-key▶|
   |                              |◀── { results: "<RSA key>" }─|
   |                              |── Encrypt password (RSA)    |
   |                              |── POST /api/clogin ────────▶|
   |                              |◀── { access_token, exp } ───|
   |                              |── INSERT ivis_service_token  |
   |◀── { your app token } ───────|   (PostgreSQL, id=1)        |
   |                              |                            |
   |── GET /api/ivis/... ────────▶|                            |
   |                              |── SELECT token from DB      |
   |                              |── GET /ivis/endpoint ──────▶|
   |                              |◀── { live data } ───────────|
   |◀── { live data } ────────────|                            |
```

---

## PHASE 1 — Environment Variables

### 1.1 Add to `backend/.env`

```env
# ── IVIS External API ─────────────────────────────────────────
IVIS_API_BASE=https://iportal-poc.iviscloud.net/api/client-portal

# IVIS Shared Service Account Credentials
IVIS_SERVICE_USERNAME=pmstest@gmail.com
IVIS_SERVICE_PASSWORD=your_plain_text_password_here

# IVIS Static Request Headers (from captured request)
IVIS_CUSTOMER_ID=445
IVIS_CUSTOMER_NAME=PMSTEST
IVIS_LOGIN_ID=PMSTEST
IVIS_TENANT_ID=1
```

### 1.2 Add to `backend/src/config/env.js`

Inside your existing env config object, add:

```javascript
ivis: {
  apiBase:         process.env.IVIS_API_BASE,
  serviceUsername: process.env.IVIS_SERVICE_USERNAME,
  servicePassword: process.env.IVIS_SERVICE_PASSWORD,
  customerId:      process.env.IVIS_CUSTOMER_ID,
  customerName:    process.env.IVIS_CUSTOMER_NAME,
  loginId:         process.env.IVIS_LOGIN_ID,
  tenantId:        process.env.IVIS_TENANT_ID,
},
```

---

## PHASE 2 — Database Migrations

### 2.1 Create `backend/src/db/migrations/010_add_ivis_service_token.sql`

```sql
-- Singleton table: stores the shared IVIS service account token.
-- Always contains exactly ONE row (id = 1).
-- Persists across server restarts unlike in-memory caching.

CREATE TABLE IF NOT EXISTS ivis_service_token (
  id            INTEGER      PRIMARY KEY DEFAULT 1,
  access_token  TEXT         NOT NULL,
  expires_at    TIMESTAMPTZ  NOT NULL,
  obtained_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
```

### 2.2 Create `backend/src/db/migrations/011_add_ivis_cache.sql`

> Skip this if `009_add_ivis_cache.sql` already exists in your project.

```sql
-- API response cache — reduces external IVIS API calls.
-- Responses cached for 5 minutes by default.

CREATE TABLE IF NOT EXISTS ivis_cache (
  id            SERIAL       PRIMARY KEY,
  cache_key     VARCHAR(512) UNIQUE NOT NULL,
  response_data JSONB        NOT NULL,
  fetched_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ivis_cache_key     ON ivis_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_ivis_cache_fetched ON ivis_cache (fetched_at);
```

### 2.3 Run Both Migrations

```bash
psql -U <user> -d <database> -f backend/src/db/migrations/010_add_ivis_service_token.sql
psql -U <user> -d <database> -f backend/src/db/migrations/011_add_ivis_cache.sql
```

---

## PHASE 3 — Backend: 4 New Files

### 3.1 Token Service

**File:** `backend/src/services/ivisAuth.js`

```javascript
// IVIS Shared Service Account — Login + Token Management
//
// Login flow (mirrors exactly what the IVIS browser client does):
//   Step 1: GET  /api/login/public-key  → fetch RSA public key
//   Step 2: Encrypt plain password using RSA-OAEP + SHA-256
//   Step 3: POST /api/clogin            → receive access_token
//   Step 4: Upsert token into ivis_service_token (PostgreSQL)
//
// getIvisToken() reads from DB — only re-logins when token is
// missing or within 5 minutes of expiry.

import axios  from 'axios';
import crypto from 'crypto'; // Node.js built-in — no install needed
import { query } from '../db/pool.js';
import { env }   from '../config/env.js';

const IVIS_BASE      = 'https://iportal-poc.iviscloud.net';
const PUBLIC_KEY_URL = `${IVIS_BASE}/api/login/public-key`;
const LOGIN_URL      = `${IVIS_BASE}/api/clogin`;

// Headers required by IVIS on every request
const IVIS_HEADERS = {
  'Content-Type':  'application/json',
  'Customer-Name': env.ivis.customerName,
  'Origin':        'https://cportal-poc.iviscloud.net',
  'Referer':       'https://cportal-poc.iviscloud.net/',
};

/**
 * Fetches the RSA public key from IVIS and converts it to PEM format.
 * Response shape: { results: "<base64 key>", errorCode: "200" }
 */
async function fetchPublicKey() {
  const response = await axios.get(PUBLIC_KEY_URL, { headers: IVIS_HEADERS });
  const base64Key = response.data.results;

  if (!base64Key) {
    throw new Error('[IVIS] Failed to fetch public key — "results" field missing');
  }

  // Wrap raw base64 in PEM format for Node crypto
  const pem = [
    '-----BEGIN PUBLIC KEY-----',
    ...base64Key.match(/.{1,64}/g),
    '-----END PUBLIC KEY-----',
  ].join('\n');

  return pem;
}

/**
 * Encrypts a plain-text password using RSA-OAEP + SHA-256.
 * Replicates exactly what the IVIS browser client does before login.
 */
function encryptPassword(plainPassword, publicKeyPem) {
  const encrypted = crypto.publicEncrypt(
    {
      key:      publicKeyPem,
      padding:  crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(plainPassword, 'utf8')
  );
  return encrypted.toString('base64');
}

/**
 * Full IVIS login flow:
 * Fetch public key → encrypt password → POST /api/clogin → store token in DB.
 *
 * Called at app user login time and automatically when token is near expiry.
 * @returns {string} the raw access_token
 */
export async function loginToIvis() {
  try {
    // Step 1: Get RSA public key
    const publicKeyPem = await fetchPublicKey();

    // Step 2: Encrypt password
    const encryptedPassword = encryptPassword(
      env.ivis.servicePassword,
      publicKeyPem
    );

    // Step 3: POST login
    const response = await axios.post(
      LOGIN_URL,
      {
        loginId:  env.ivis.serviceUsername,
        password: encryptedPassword,
      },
      { headers: IVIS_HEADERS }
    );

    // Handle multiple possible response shapes from IVIS
    const accessToken = response.data.access_token
                     ?? response.data.token
                     ?? response.data.results?.access_token;

    const expiresIn   = response.data.expires_in
                     ?? response.data.expiresIn
                     ?? 3600; // fallback: assume 1 hour

    if (!accessToken) {
      throw new Error(
        '[IVIS] Login succeeded but no token found in response: '
        + JSON.stringify(response.data)
      );
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Step 4: Upsert singleton token row (id = 1 always)
    await query(
      `INSERT INTO ivis_service_token (id, access_token, expires_at, obtained_at)
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         expires_at   = EXCLUDED.expires_at,
         obtained_at  = NOW()`,
      [accessToken, expiresAt]
    );

    console.log(`[IVIS] ✅ Token acquired — expires at ${expiresAt.toISOString()}`);
    return accessToken;

  } catch (err) {
    console.error('[IVIS] ❌ Login failed:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Returns a valid IVIS Bearer token.
 * Reads from PostgreSQL first — re-logins only if missing or within 5 min of expiry.
 * Called by ivisFetcher.js before every proxied API call.
 * @returns {string} valid access_token
 */
export async function getIvisToken() {
  const result = await query(
    `SELECT access_token
     FROM ivis_service_token
     WHERE id = 1
       AND expires_at > NOW() + INTERVAL '5 minutes'`
  );

  if (result.rows.length > 0) {
    return result.rows[0].access_token; // ✅ Still valid — reuse
  }

  // Token missing or near expiry — re-authenticate
  console.log('[IVIS] 🔄 Token near expiry — re-authenticating...');
  return loginToIvis();
}
```

---

### 3.2 Cache Service

**File:** `backend/src/services/ivisCache.js`

```javascript
// PostgreSQL-backed response cache for IVIS API calls.
// Default TTL: 5 minutes. Adjust TTL_MINUTES per endpoint if needed.
// Uses existing query() helper from db/pool.js — no new DB setup.

import { query } from '../db/pool.js';

const TTL_MINUTES = 5;

/**
 * Returns cached IVIS data if it exists and is within TTL.
 * @param {string} cacheKey - unique key built from endpoint path + sorted params
 * @returns {object|null} cached response data or null if stale/missing
 */
export async function getCached(cacheKey) {
  const result = await query(
    `SELECT response_data
     FROM ivis_cache
     WHERE cache_key = $1
       AND fetched_at > NOW() - INTERVAL '${TTL_MINUTES} minutes'`,
    [cacheKey]
  );
  return result.rows[0]?.response_data ?? null;
}

/**
 * Upserts a cache entry for the given key.
 * @param {string} cacheKey
 * @param {object} data - JSON response to cache
 */
export async function setCached(cacheKey, data) {
  await query(
    `INSERT INTO ivis_cache (cache_key, response_data, fetched_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (cache_key)
     DO UPDATE SET
       response_data = EXCLUDED.response_data,
       fetched_at    = NOW()`,
    [cacheKey, JSON.stringify(data)]
  );
}
```

---

### 3.3 Fetcher Utility

**File:** `backend/src/services/ivisFetcher.js`

```javascript
// Core IVIS API fetcher.
// Checks PostgreSQL cache first (5-min TTL).
// Falls back to live IVIS call if cache is stale or missing.
// Attaches all required IVIS headers automatically.

import axios from 'axios';
import { env }                  from '../config/env.js';
import { getIvisToken }         from './ivisAuth.js';
import { getCached, setCached } from './ivisCache.js';

/**
 * Fetches data from IVIS external API via cache-first strategy.
 *
 * @param {string} path   - endpoint path e.g. "presence-mgmnt/visitor-stats-hourly"
 * @param {object} params - query parameters to forward (fromTime, toTime, siteName, etc.)
 * @returns {object}      - parsed JSON response
 */
export async function fetchIvis(path, params = {}) {
  // Build deterministic cache key from path + sorted query params
  const sortedParams = new URLSearchParams(
    Object.entries(params).sort()
  ).toString();
  const cacheKey = `${path}?${sortedParams}`;

  // 1. Try PostgreSQL cache first
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // 2. Get valid token from DB (re-logins automatically if near expiry)
  const token = await getIvisToken();

  // 3. Call IVIS API with all required headers
  const response = await axios.get(
    `${env.ivis.apiBase}/${path}`,
    {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
        'customer-id':   env.ivis.customerId,
        'customer-name': env.ivis.customerName,
        'login-id':      env.ivis.loginId,
        'tenant-id':     env.ivis.tenantId,
        'site-id':       null,
        'sitegroup-id':  null,
        'Content-Type':  'application/json',
        'Origin':        'https://cportal-poc.iviscloud.net',
      },
    }
  );

  const data = response.data;

  // 4. Store response in cache
  await setCached(cacheKey, data);

  return data;
}
```

---

### 3.4 Proxy Route

**File:** `backend/src/routes/ivis.js`

```javascript
// Proxy route for all 8 IVIS endpoints.
// Protected by existing requireAuth middleware — no auth changes needed.
//
// Supported routes:
//   GET /api/ivis/presence-mgmnt/visitor-stats-hourly
//   GET /api/ivis/presence-mgmnt/zone-wise-stats
//   GET /api/ivis/presence-mgmnt/frsemployee-stats
//   GET /api/ivis/presence-mgmnt/dashboard-insights
//   GET /api/ivis/presence-mgmnt/dashboard-inoffice-insights
//   GET /api/ivis/presence-mgmnt/getCleanlinessPercentage
//   GET /api/ivis/presence-mgmnt/profilecount
//   GET /api/ivis/site-details-dropdown
//   GET /api/ivis/zone-dropdown

import express         from 'express';
import { fetchIvis }   from '../services/ivisFetcher.js';
import { requireAuth } from '../middleware/authz.js';

const router = express.Router();

// All IVIS routes require existing app authentication
router.use(requireAuth);

// Presence Management group endpoints
router.get('/presence-mgmnt/:endpoint', async (req, res) => {
  try {
    const data = await fetchIvis(
      `presence-mgmnt/${req.params.endpoint}`,
      req.query  // forwards all query params transparently
    );
    res.json(data);
  } catch (err) {
    handleError(err, res);
  }
});

// Top-level endpoints (site-details-dropdown, zone-dropdown)
router.get('/:endpoint', async (req, res) => {
  try {
    const data = await fetchIvis(req.params.endpoint, req.query);
    res.json(data);
  } catch (err) {
    handleError(err, res);
  }
});

function handleError(err, res) {
  console.error('[IVIS Proxy]', err.response?.data || err.message);
  const status = err.response?.status;

  if (status === 401) return res.status(401).json({
    error: 'IVIS token expired — will refresh on next request',
  });
  if (status === 429) return res.status(429).json({
    error: 'IVIS rate limit reached — try again shortly',
  });

  res.status(status || 500).json({
    error:   'IVIS proxy error',
    details: err.response?.data || err.message,
  });
}

export default router;
```

---

### 3.5 Mount Route + Hook Into Existing Auth

#### A) Mount in `backend/src/app.js`

Add **one line** alongside existing routes:

```javascript
import ivisRoutes from './routes/ivis.js';

// existing routes (unchanged)
app.use('/api/auth',       authRoutes);
app.use('/api/devices',    deviceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees',  employeeRoutes);
app.use('/api/dashboard',  dashboardRoutes);

// ── NEW ──
app.use('/api/ivis', ivisRoutes);
```

#### B) Hook Into `backend/src/routes/auth.js`

Add **one import** and **two fire-and-forget calls**:

```javascript
// Add at top of auth.js:
import { loginToIvis, getIvisToken } from '../services/ivisAuth.js';

// ── Inside existing POST /auth/login handler ──────────────────
// Add AFTER your user is authenticated, BEFORE your response:
loginToIvis().catch((err) =>
  console.error('[IVIS] Background login failed (non-fatal):', err.message)
);
// Does NOT block — user gets their session instantly.
// IVIS token is ready in DB within ~500ms in the background.

// ── Inside existing POST /auth/refresh handler ────────────────
// Add AFTER your token is refreshed, BEFORE your response:
getIvisToken().catch((err) =>
  console.error('[IVIS] Token refresh check failed (non-fatal):', err.message)
);
// Proactively renews IVIS token if near expiry on every app refresh.
```

---

## PHASE 4 — Frontend: 3 New Files

### 4.1 TypeScript Types

**File:** `src/app/types/ivis.ts`

```typescript
// Shared IVIS response wrapper
// Note: errorCode is always "200" even on success — this is normal IVIS behaviour
export interface IvisResponse<T> {
  results:      T[];
  errorMessage: string | null;
  errorCode:    string;
}

// visitor-stats-hourly
// results array has 24 entries — index 0–23 = hour of day
export interface HourlyVisitorEntry {
  eventDate:  string;  // "0"–"23"
  count:      number;
  total:      number;
  entryCount: number;
  exitCount:  number;
  response:   string | null;
  ackCount:   number;
}
export type VisitorStatsHourlyResponse = IvisResponse<HourlyVisitorEntry>;

// zone-wise-stats
export interface ZoneStatEntry {
  eventDate:  string;
  count:      number;
  total:      number;
  entryCount: number;
  exitCount:  number;
  response:   string | null;
  ackCount:   number;
}
export type ZoneWiseStatsResponse = IvisResponse<ZoneStatEntry>;

// frsemployee-stats
export interface FrsEmployeeEntry {
  eventDate:  string;
  count:      number;
  total:      number;
  entryCount: number;
  exitCount:  number;
  response:   string | null;
  ackCount:   number;
}
export type FrsEmployeeStatsResponse = IvisResponse<FrsEmployeeEntry>;

// dashboard-insights, dashboard-inoffice-insights,
// getCleanlinessPercentage, profilecount
// Replace [key: string]: unknown with real field names
// after testing each endpoint in Postman
export interface DashboardInsightEntry    { [key: string]: unknown }
export interface InofficeInsightEntry     { [key: string]: unknown }
export interface CleanlinessEntry         { [key: string]: unknown }
export interface ProfileCountEntry        { [key: string]: unknown }

export type DashboardInsightsResponse  = IvisResponse<DashboardInsightEntry>;
export type InofficeInsightsResponse   = IvisResponse<InofficeInsightEntry>;
export type CleanlinessResponse        = IvisResponse<CleanlinessEntry>;
export type ProfileCountResponse       = IvisResponse<ProfileCountEntry>;

// site-details-dropdown
export interface SiteDetail {
  siteId:   string | number;
  siteName: string;
  [key: string]:  unknown;
}
export type SiteDetailsResponse = IvisResponse<SiteDetail>;

// Shared filter params used across all endpoints
export interface IvisFilterParams {
  fromTime?:     string;  // "YYYY-MM-DD HH:mm:ss"
  toTime?:       string;  // "YYYY-MM-DD HH:mm:ss"
  siteName?:     string;
  cameraIds?:    string;
  staffName?:    string;
  date?:         string;  // "YYYY-MM-DD" (cleanliness endpoint)
  dayFilterType?: 'day' | 'week' | 'month';
}

// Date formatting helpers
export const formatDateTime = (d: Date): string =>
  d.toISOString().replace('T', ' ').slice(0, 19);

export const formatDate = (d: Date): string =>
  d.toISOString().slice(0, 10);
```

---

### 4.2 API Service

**File:** `src/app/services/ivisApi.ts`

```typescript
import type { IvisFilterParams } from '../types/ivis';

const BASE = '/api/ivis';

// Internal GET helper — strips undefined/null params automatically
async function get<T>(path: string, params?: IvisFilterParams): Promise<T> {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
        ) as Record<string, string>
      ).toString()
    : '';

  const res = await fetch(`${BASE}/${path}${qs}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error?.error ?? `IVIS request failed: ${res.status}`);
  }

  return res.json();
}

// ── All 8 IVIS endpoint functions ─────────────────────────────

export const ivisApi = {
  /** Hourly visitor entry/exit stats — 24 slots (0–23 = hour of day) */
  visitorStatsHourly: (p: IvisFilterParams) =>
    get('presence-mgmnt/visitor-stats-hourly', p),

  /** Zone-level entry/exit breakdown */
  zoneWiseStats: (p: IvisFilterParams) =>
    get('presence-mgmnt/zone-wise-stats', p),

  /** FRS-recognised employee stats */
  frsEmployeeStats: (p: IvisFilterParams) =>
    get('presence-mgmnt/frsemployee-stats', p),

  /** Main dashboard insight aggregates */
  dashboardInsights: (p: IvisFilterParams) =>
    get('presence-mgmnt/dashboard-insights', p),

  /** Live in-office occupancy insights */
  dashboardInofficeInsights: (p: IvisFilterParams) =>
    get('presence-mgmnt/dashboard-inoffice-insights', p),

  /** Facility cleanliness percentage for a given date */
  cleanlinessPercentage: (p: IvisFilterParams) =>
    get('presence-mgmnt/getCleanlinessPercentage', p),

  /** Total registered face/profile count — no params needed */
  profileCount: () =>
    get('presence-mgmnt/profilecount'),

  /** Site list for filter dropdowns — no params needed */
  siteDetailsDropdown: () =>
    get('site-details-dropdown'),
};
```

---

### 4.3 Reusable Hook

**File:** `src/app/hooks/useIvisData.ts`

Place alongside existing `useLiveData.ts` and `useRealTimeEngine.ts`.

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIvisDataOptions {
  /** Auto-refresh interval in ms. Omit to disable. */
  refreshInterval?: number;
  /** Set false to skip initial fetch (manual trigger). Default: true */
  enabled?: boolean;
}

interface UseIvisDataResult<T> {
  data:          T | null;
  loading:       boolean;
  error:         string | null;
  refetch:       () => void;
  lastFetchedAt: Date | null;
}

/**
 * Generic hook for all IVIS data fetching.
 * Supports auto-refresh, dependency-based re-fetching, and manual refetch.
 *
 * @example
 * const { data, loading, error, refetch } = useIvisData(
 *   () => ivisApi.visitorStatsHourly({ toTime: `${today} 23:59:59` }),
 *   [today],
 *   { refreshInterval: 30_000 }
 * );
 */
export function useIvisData<T>(
  fetcher:  () => Promise<T>,
  deps:     unknown[]          = [],
  options:  UseIvisDataOptions = {}
): UseIvisDataResult<T> {
  const { refreshInterval, enabled = true } = options;

  const [data,          setData]          = useState<T | null>(null);
  const [loading,       setLoading]       = useState(enabled);
  const [error,         setError]         = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setLastFetchedAt(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  // Initial + dependency-based fetch
  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || !enabled) return;
    const id = setInterval(fetchData, refreshInterval);
    return () => clearInterval(id);
  }, [fetchData, refreshInterval, enabled]);

  return { data, loading, error, refetch: fetchData, lastFetchedAt };
}
```

---

## PHASE 5 — Wire Into Existing Components

All UI components already exist — you only need to feed them IVIS data.

### 5.1 HRDashboard.tsx — KPI Cards

```tsx
import { useIvisData }   from '../hooks/useIvisData';
import { ivisApi }       from '../services/ivisApi';
import { formatDateTime, formatDate } from '../types/ivis';
import type { VisitorStatsHourlyResponse } from '../types/ivis';

// Inside HRDashboard component:
const today = formatDate(new Date());

const { data: visitorStats, loading: visitorLoading } =
  useIvisData<VisitorStatsHourlyResponse>(
    () => ivisApi.visitorStatsHourly({
      toTime:    `${today} 23:59:59`,
      siteName:  '',
      cameraIds: '',
      staffName: '',
    }),
    [today],
    { refreshInterval: 60_000 } // auto-refresh every 60 seconds
  );

// Derived values for MetricCard components:
const totalVisitors = visitorStats?.results?.reduce((s, h) => s + h.total,      0) ?? 0;
const totalEntries  = visitorStats?.results?.reduce((s, h) => s + h.entryCount, 0) ?? 0;
const totalExits    = visitorStats?.results?.reduce((s, h) => s + h.exitCount,  0) ?? 0;

// In JSX — feed existing MetricCard:
// <MetricCard title="Total Visitors" value={visitorLoading ? '...' : totalVisitors} />
// <MetricCard title="Entries Today"  value={totalEntries} />
// <MetricCard title="Exits Today"    value={totalExits}   />
```

### 5.2 AnalyticsCharts.tsx — Charts

```tsx
import { useIvisData } from '../hooks/useIvisData';
import { ivisApi }     from '../services/ivisApi';

const { data: visitorStats } = useIvisData(
  () => ivisApi.visitorStatsHourly({
    toTime: `${today} 23:59:59`, siteName: '', cameraIds: '',
  }),
  [today]
);

// Transform for Recharts BarChart / AreaChart / LineChart:
const hourlyChartData = visitorStats?.results?.map((h) => ({
  name:  `${h.eventDate}:00`,
  entry: h.entryCount,
  exit:  h.exitCount,
  total: h.total,
})) ?? [];

// Feed into existing chart components:
// <BarChart data={hourlyChartData} ... />
```

### 5.3 PresenceMonitor.tsx — Live Refresh

```tsx
const { data: inofficeData, lastFetchedAt } = useIvisData(
  () => ivisApi.dashboardInofficeInsights({
    fromTime: `${today} 00:00:00`, siteName: '', cameraIds: '',
  }),
  [today],
  { refreshInterval: 30_000 } // 30-second live refresh
);
```

### 5.4 FacilityIntelligenceDashboard.tsx — Zone Stats

```tsx
const { data: zoneStats } = useIvisData(
  () => ivisApi.zoneWiseStats({
    fromTime:  `${today} 00:00:00`,
    siteName:  selectedSite,
    cameraIds: selectedCamera,
  }),
  [today, selectedSite, selectedCamera]
);
```

### 5.5 FilterPanel.tsx — Site Dropdown

```tsx
import type { SiteDetailsResponse } from '../types/ivis';

const { data: siteData } = useIvisData<SiteDetailsResponse>(
  () => ivisApi.siteDetailsDropdown(),
  [] // fetch once on mount
);

const siteOptions = siteData?.results?.map((s) => ({
  label: s.siteName,
  value: String(s.siteId),
})) ?? [];

// Feed siteOptions into your existing Select/Dropdown component
```

### 5.6 AttendanceTable.tsx — FRS Employee Stats

```tsx
const { data: frsStats } = useIvisData(
  () => ivisApi.frsEmployeeStats({
    toTime:    `${today} 23:59:59`,
    staffName: selectedStaff ?? '',
    siteName:  selectedSite  ?? '',
    cameraIds: '',
  }),
  [today, selectedStaff, selectedSite]
);
```

### 5.7 FacilityConfiguration.tsx — Cleanliness

```tsx
const { data: cleanliness } = useIvisData(
  () => ivisApi.cleanlinessPercentage({ date: today }),
  [today]
);
```

---

## PHASE 6 — Testing Checklist

### Backend
- [ ] Run both DB migrations — confirm tables exist in PostgreSQL
- [ ] `IVIS_*` env vars load correctly (log `env.ivis` temporarily to verify)
- [ ] User logs into FaceAttend → `ivis_service_token` row appears in DB within ~1s
- [ ] `expires_at` in DB shows ~1 hour from login time
- [ ] Server log shows `[IVIS] ✅ Token acquired — expires at ...`
- [ ] All 8 endpoints return data via Postman (pointed at your local backend with app Bearer token)
- [ ] Second call within 5 min → served from `ivis_cache` (verify `fetched_at` unchanged in DB)
- [ ] Call without app token → 401 from `requireAuth` (IVIS never reached)
- [ ] Server restart → token loaded from DB, no re-login needed until expiry

### Frontend
- [ ] `ivisApi` calls reach `/api/ivis/*` correctly (check Browser Network tab)
- [ ] `useIvisData` cycles correctly: `loading: true` → `data: {...}` → `loading: false`
- [ ] KPI cards on HRDashboard show IVIS visitor totals
- [ ] Hourly chart in AnalyticsCharts renders with IVIS data
- [ ] Site dropdown in FilterPanel populates from `site-details-dropdown`
- [ ] Auto-refresh fires on Presence and Analytics pages (watch Network tab intervals)
- [ ] **IVIS credentials and token NOT visible in browser Network tab at any point**

---

## PHASE 7 — Endpoint Reference

| Your Route | IVIS Endpoint | Key Params | Used In |
|---|---|---|---|
| `/api/ivis/presence-mgmnt/visitor-stats-hourly` | Hourly 0–23 buckets | `toTime`, `siteName`, `cameraIds` | HRDashboard, AnalyticsCharts |
| `/api/ivis/presence-mgmnt/zone-wise-stats` | Zone breakdown | `fromTime`, `siteName`, `cameraIds` | FacilityIntelligenceDashboard |
| `/api/ivis/presence-mgmnt/frsemployee-stats` | FRS staff stats | `toTime`, `staffName`, `siteName` | AttendanceTable, AnalyticsCharts |
| `/api/ivis/presence-mgmnt/dashboard-insights` | Daily aggregates | `fromTime`, `dayFilterType` | HRDashboard |
| `/api/ivis/presence-mgmnt/dashboard-inoffice-insights` | Live occupancy | `fromTime`, `siteName` | PresenceMonitor |
| `/api/ivis/presence-mgmnt/getCleanlinessPercentage` | Cleanliness % | `date` | FacilityConfiguration |
| `/api/ivis/presence-mgmnt/profilecount` | Face profile total | *(none)* | HRDashboard KPI |
| `/api/ivis/site-details-dropdown` | Site list | *(none)* | FilterPanel |

---

## PHASE 8 — Gotchas & Important Notes

**RSA Encryption is dynamic:** The public key is fetched fresh before every login call — do not cache it long-term as the server may rotate it.

**`errorCode: "200"` in body:** The IVIS API always returns this in the JSON body alongside HTTP 200. This is not an error — ignore it.

**CORS is blocked:** `access-control-allow-origin` on the IVIS API only allows `https://cportal-poc.iviscloud.net`. Every call must go through your Express proxy — direct browser fetch will always fail.

**Token singleton:** The `ivis_service_token` table always has exactly one row (id=1). All users share this one token — there is no per-user IVIS token.

**Background login is non-fatal:** The `loginToIvis().catch(...)` call in your auth route means if IVIS is down at login time, your app login still succeeds. IVIS data will simply be unavailable until the next login or refresh triggers a retry.

**Placeholder types:** The `[key: string]: unknown` types in `ivis.ts` for `dashboard-insights`, `getCleanlinessPercentage`, and `profilecount` are intentional — replace them with real field names after testing each endpoint in Postman.

**Date format:** IVIS expects `"YYYY-MM-DD HH:mm:ss"` for `fromTime`/`toTime` and `"YYYY-MM-DD"` for `date`. Use the `formatDateTime` and `formatDate` helpers exported from `ivis.ts`.

**Cache TTL for live pages:** For `PresenceMonitor` which needs near-real-time data, the `refreshInterval: 30_000` on the hook forces a re-fetch every 30s which bypasses the 5-min cache automatically via a new cache key timestamp — or reduce `TTL_MINUTES` in `ivisCache.js` to `1` for presence-specific endpoints.

---

*End of Prompt — FaceAttend × IVIS Complete Integration*

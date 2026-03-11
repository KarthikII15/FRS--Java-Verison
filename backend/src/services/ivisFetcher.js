/**
 * ivisFetcher.js
 *
 * Unified IVIS Cloud API fetch utility.
 * Flow: PostgreSQL cache → (miss) → fresh Bearer token → axios GET → write cache → return data.
 *
 * Usage:
 *   import { fetchIvis } from './ivisFetcher.js';
 *   const data = await fetchIvis('presence-mgmnt/visitor-stats-hourly', { toTime: '...' });
 */

import axios from 'axios';
import https from 'https';
import { env } from '../config/env.js';
import { getIvisToken, invalidateIvisToken } from './ivisAuth.js';
import { getCached, setCached } from './ivisCache.js';

/**
 * Fetches data from the IVIS external API through the cache layer.
 *
 * Cache key is deterministic: `${path}?${sortedQueryParams}` so identical
 * calls with different argument ordering still hit the same cache entry.
 *
 * @param {string} path   - IVIS endpoint path, e.g. "presence-mgmnt/visitor-stats-hourly"
 * @param {object} params - Query parameters object (forwarded verbatim as URL params)
 * @returns {Promise<object>} Parsed JSON response from IVIS (or from cache)
 */
export async function fetchIvis(path, params = {}) {
    const httpsAgent = new https.Agent({
        rejectUnauthorized: env.ivis.tlsRejectUnauthorized,
    });

    // Build a deterministic, sorted cache key
    const sortedParams = new URLSearchParams(
        Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .sort()
    ).toString();
    const cacheKey = sortedParams ? `${path}?${sortedParams}` : path;

    // 1. Try the PostgreSQL cache first (5-min TTL enforced in ivisCache.js)
    const cached = await getCached(cacheKey);
    if (cached) {
        return cached;
    }

    // 2. Get a valid Bearer token (auto-refreshes when near expiry)
    const token = await getIvisToken();

    // 3. Call the IVIS Cloud API with all required custom headers
    const response = await axios.get(
        `${env.ivis.apiBase}/${path}`,
        {
            params,
            timeout: 15_000,
            httpsAgent,
            validateStatus: () => true,
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Authorization': `Bearer ${token}`,
                'Customer-Id': env.ivis.customerId,
                'Customer-Name': env.ivis.customerName,
                'Login-Id': env.ivis.loginId,
                'Tenant-Id': env.ivis.tenantId,
                'Site-Id': 'null',
                'Sitegroup-Id': 'null',
                'Content-Type': 'application/json',
                'Origin': 'https://cportal-poc.iviscloud.net',
                'Referer': 'https://cportal-poc.iviscloud.net/',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
        }
    );

    if (response.status === 401) {
        await invalidateIvisToken();
    }

    if (response.status < 200 || response.status >= 300) {
        if (response.data) {
            const payload = typeof response.data === 'object'
                ? JSON.stringify(response.data)
                : String(response.data);
            console.error('[IVIS Fetcher] Error response payload:', payload);
        }
        const err = new Error(`IVIS responded with ${response.status}`);
        err.response = { status: response.status, data: response.data };
        throw err;
    }

    const data = response.data;

    // 4. Write to cache for subsequent requests within the TTL window
    await setCached(cacheKey, data);

    return data;
}

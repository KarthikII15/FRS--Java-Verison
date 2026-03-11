/**
 * ivisCache.js
 *
 * PostgreSQL-backed cache for IVIS Cloud API responses.
 * Uses the existing `query` helper from db/pool.js — no extra DB setup needed.
 * TTL is enforced at query time (WHERE fetched_at > NOW() - INTERVAL).
 *
 * Usage:
 *   import { getCached, setCached } from './ivisCache.js';
 */

import { query } from '../db/pool.js';

/** Cache time-to-live in minutes (applied per lookup). */
const TTL_MINUTES = 5;

/**
 * Returns cached IVIS response data if a fresh entry exists.
 *
 * @param {string} cacheKey - Deterministic string key (path + sorted query params)
 * @returns {Promise<object|null>} Parsed JSONB data, or null if missing/stale
 */
export async function getCached(cacheKey) {
    try {
        const result = await query(
            `SELECT response_data
         FROM ivis_cache
        WHERE cache_key = $1
          AND fetched_at > NOW() - INTERVAL '${TTL_MINUTES} minutes'`,
            [cacheKey]
        );
        return result.rows[0]?.response_data ?? null;
    } catch (err) {
        // Cache read failure is non-fatal — fall through to live fetch
        console.warn('[IVIS Cache] getCached error (non-fatal):', err.message);
        return null;
    }
}

/**
 * Upserts a cache entry, resetting `fetched_at` to NOW().
 *
 * @param {string} cacheKey
 * @param {object} data - Raw JS object (will be JSON-serialised before storage)
 */
export async function setCached(cacheKey, data) {
    try {
        await query(
            `INSERT INTO ivis_cache (cache_key, response_data, fetched_at)
            VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (cache_key)
       DO UPDATE SET response_data = $2::jsonb,
                     fetched_at    = NOW()`,
            [cacheKey, JSON.stringify(data)]
        );
    } catch (err) {
        // Cache write failure is non-fatal — data still returned to caller
        console.warn('[IVIS Cache] setCached error (non-fatal):', err.message);
    }
}

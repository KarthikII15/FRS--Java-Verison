-- Migration: 009_add_ivis_cache
-- Creates a PostgreSQL-backed cache for IVIS Cloud API responses.
-- Responses are stored as JSONB and expire after a configurable TTL
-- enforced at query time in ivisCache.js (default: 5 minutes).

CREATE TABLE IF NOT EXISTS ivis_cache (
  id            SERIAL       PRIMARY KEY,
  cache_key     VARCHAR(512) UNIQUE NOT NULL,
  response_data JSONB        NOT NULL,
  fetched_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ivis_cache_key     ON ivis_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_ivis_cache_fetched ON ivis_cache (fetched_at);

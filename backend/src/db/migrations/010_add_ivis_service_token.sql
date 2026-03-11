-- Migration: 010_add_ivis_service_token
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

-- Migration: 012_add_ivis_sync_tables
-- IVIS sync tracking + raw aggregates + cross-reference columns

CREATE TABLE IF NOT EXISTS ivis_sync_log (
  pk_log_id       BIGSERIAL    PRIMARY KEY,
  sync_type       VARCHAR(100) NOT NULL,
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          VARCHAR(20)  NOT NULL DEFAULT 'running',
  rows_fetched    INTEGER      DEFAULT 0,
  rows_upserted   INTEGER      DEFAULT 0,
  rows_skipped    INTEGER      DEFAULT 0,
  error_message   TEXT,
  meta_json       JSONB        DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ivis_visitor_stats (
  pk_stat_id      BIGSERIAL    PRIMARY KEY,
  stat_date       DATE         NOT NULL,
  hour_of_day     SMALLINT     NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  site_name       VARCHAR(255),
  total_count     INTEGER      DEFAULT 0,
  entry_count     INTEGER      DEFAULT 0,
  exit_count      INTEGER      DEFAULT 0,
  ack_count       INTEGER      DEFAULT 0,
  synced_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (stat_date, hour_of_day, site_name)
);

CREATE TABLE IF NOT EXISTS ivis_zone_stats (
  pk_stat_id      BIGSERIAL    PRIMARY KEY,
  stat_date       DATE         NOT NULL,
  zone_name       VARCHAR(255) NOT NULL,
  site_name       VARCHAR(255),
  total_count     INTEGER      DEFAULT 0,
  entry_count     INTEGER      DEFAULT 0,
  exit_count      INTEGER      DEFAULT 0,
  synced_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (stat_date, zone_name, site_name)
);

CREATE TABLE IF NOT EXISTS ivis_cleanliness_scores (
  pk_score_id     BIGSERIAL    PRIMARY KEY,
  score_date      DATE         NOT NULL UNIQUE,
  percentage      NUMERIC(5,2),
  raw_response    JSONB,
  synced_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ivis_profile_count_log (
  pk_log_id       BIGSERIAL    PRIMARY KEY,
  recorded_date   DATE         NOT NULL UNIQUE,
  profile_count   INTEGER      NOT NULL,
  synced_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE hr_employee
  ADD COLUMN IF NOT EXISTS ivis_employee_id  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ivis_synced_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ivis_raw_json     JSONB;

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS ivis_unit_id      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ivis_synced_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ivis_visitor_stats_date
  ON ivis_visitor_stats (stat_date);
CREATE INDEX IF NOT EXISTS idx_ivis_zone_stats_date
  ON ivis_zone_stats (stat_date);
CREATE INDEX IF NOT EXISTS idx_ivis_sync_log_type
  ON ivis_sync_log (sync_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_employee_ivis_id
  ON hr_employee (ivis_employee_id)
  WHERE ivis_employee_id IS NOT NULL;

-- For IVIS-synced faces: ensure single row per employee for source
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_faces_ivis
  ON employee_faces (fk_employee_id)
  WHERE source = 'ivis_sync';

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Devices table (internal device registry for deviceRoutes)
CREATE TABLE IF NOT EXISTS devices (
  pk_device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code VARCHAR(50) UNIQUE NOT NULL,
  device_name VARCHAR(100),
  device_type VARCHAR(20) CHECK (device_type IN ('camera', 'lpu', 'sensor', 'gateway')),
  fk_site_id UUID, -- nullable; no FK to avoid cross-schema dependency
  location_description TEXT,
  ip_address INET,
  mac_address VARCHAR(17),
  keycloak_client_id VARCHAR(100),
  api_key_hash VARCHAR(64),
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'maintenance')),
  config_json JSONB DEFAULT '{}'::jsonb,
  capabilities JSONB DEFAULT '["face_detection"]'::jsonb,
  last_heartbeat_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  firmware_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_site ON devices(fk_site_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_code ON devices(device_code);
CREATE INDEX IF NOT EXISTS idx_devices_heartbeat ON devices(last_heartbeat_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ language 'plpgsql';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_devices_updated_at') THEN
    CREATE TRIGGER update_devices_updated_at
      BEFORE UPDATE ON devices
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Device events table (used by eventRepository, SearchService)
CREATE TABLE IF NOT EXISTS device_events (
  pk_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fk_device_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'FACE_DETECTED','MOTION_DETECTED','EMPLOYEE_ENTRY','EMPLOYEE_EXIT',
    'DEVICE_HEARTBEAT','DEVICE_ERROR','FRAME_CAPTURED'
  )),
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','completed','failed','ignored')),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_face_embedding JSONB, -- keep JSONB to match current insert behavior
  confidence_score FLOAT,
  frame_url TEXT,
  processing_attempts INTEGER DEFAULT 0,
  processing_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_events_device_time ON device_events(fk_device_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_unprocessed ON device_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_device_events_type_time ON device_events(event_type, occurred_at DESC);

-- Attendance events table (used by eventRepository.createAttendanceEvent)
CREATE TABLE IF NOT EXISTS attendance_events (
  pk_attendance_event_id BIGSERIAL PRIMARY KEY,
  fk_employee_id BIGINT REFERENCES hr_employee(pk_employee_id),
  fk_device_id UUID,
  fk_original_event_id UUID REFERENCES device_events(pk_event_id),
  event_type VARCHAR(50) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  confidence_score FLOAT,
  verification_method VARCHAR(50),
  recognition_model_version VARCHAR(50),
  frame_image_url TEXT,
  face_bounding_box JSONB,
  location_zone VARCHAR(120),
  entry_exit_direction VARCHAR(20),
  fk_shift_id BIGINT REFERENCES hr_shift(pk_shift_id),
  is_expected_entry BOOLEAN,
  is_on_time BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


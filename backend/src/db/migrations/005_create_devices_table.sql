-- Device management table
CREATE TABLE IF NOT EXISTS devices (
    pk_device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20) CHECK (device_type IN ('camera', 'lpu', 'sensor', 'gateway')),
    fk_site_id UUID REFERENCES sites(pk_site_id),
    location_description TEXT,
    ip_address INET,
    mac_address VARCHAR(17),
    keycloak_client_id VARCHAR(100),
    api_key_hash VARCHAR(64), -- For device-to-device auth
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'maintenance')),
    config_json JSONB DEFAULT '{}',
    capabilities JSONB DEFAULT '["face_detection"]', -- ["face_detection", "face_recognition", "motion_detection"]
    last_heartbeat_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    firmware_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_devices_site ON devices(fk_site_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_code ON devices(device_code);
CREATE INDEX idx_devices_heartbeat ON devices(last_heartbeat_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

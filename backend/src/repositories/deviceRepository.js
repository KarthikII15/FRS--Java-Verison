import { pool } from '../db/pool.js';

export async function findDeviceByClientId(clientId) {
  const result = await pool.query(
    `SELECT * FROM devices WHERE keycloak_client_id = $1`,
    [clientId]
  );
  return result.rows[0] || null;
}

export async function findDeviceById(deviceId) {
  const result = await pool.query(
    `SELECT * FROM devices WHERE pk_device_id = $1`,
    [deviceId]
  );
  return result.rows[0] || null;
}

export async function findDeviceByCode(deviceCode) {
  const result = await pool.query(
    `SELECT * FROM devices WHERE device_code = $1`,
    [deviceCode]
  );
  return result.rows[0] || null;
}

export async function updateDeviceLastSeen(deviceId) {
  await pool.query(
    `UPDATE devices 
     SET last_seen_at = NOW(), 
         status = 'online',
         updated_at = NOW()
     WHERE pk_device_id = $1`,
    [deviceId]
  );
}

export async function updateDeviceHeartbeat(deviceId, metadata = {}) {
  await pool.query(
    `UPDATE devices 
     SET last_heartbeat_at = NOW(),
         status = 'online',
         config_json = config_json || $2::jsonb,
         updated_at = NOW()
     WHERE pk_device_id = $1`,
    [deviceId, JSON.stringify(metadata)]
  );
}

export async function createDevice(deviceData) {
  const {
    deviceCode,
    deviceName,
    deviceType,
    siteId,
    locationDescription,
    ipAddress,
    keycloakClientId,
    capabilities,
    firmwareVersion
  } = deviceData;
  
  const result = await pool.query(
    `INSERT INTO devices (
      device_code, device_name, device_type, fk_site_id,
      location_description, ip_address, keycloak_client_id,
      capabilities, firmware_version, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'offline')
    RETURNING *`,
    [
      deviceCode, deviceName, deviceType, siteId,
      locationDescription, ipAddress, keycloakClientId,
      JSON.stringify(capabilities || []), firmwareVersion
    ]
  );
  
  return result.rows[0];
}

export async function listDevicesBySite(siteId) {
  const result = await pool.query(
    `SELECT * FROM devices WHERE fk_site_id = $1 ORDER BY device_code`,
    [siteId]
  );
  return result.rows;
}

export async function updateDeviceStatus(deviceId, status) {
  const result = await pool.query(
    `UPDATE devices 
     SET status = $2, updated_at = NOW()
     WHERE pk_device_id = $1
     RETURNING *`,
    [deviceId, status]
  );
  return result.rows[0];
}

export async function updateDeviceConfig(deviceId, config) {
  const result = await pool.query(
    `UPDATE devices 
     SET config_json = config_json || $2::jsonb, updated_at = NOW()
     WHERE pk_device_id = $1
     RETURNING *`,
    [deviceId, JSON.stringify(config)]
  );
  return result.rows[0];
}

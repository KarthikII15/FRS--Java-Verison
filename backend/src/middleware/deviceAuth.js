import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../config/env.js';
import { findDeviceByClientId, updateDeviceLastSeen } from '../repositories/deviceRepository.js';

// JWKS client for Keycloak device tokens
const jwks = jwksClient({
  jwksUri: `${env.keycloak.url}/realms/${env.keycloak.realm}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    return callback(null, key.getPublicKey());
  });
}

/**
 * Verify device JWT token from Keycloak
 */
export async function verifyDeviceToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `${env.keycloak.url}/realms/${env.keycloak.realm}`,
        audience: 'attendance-api', // Must match Keycloak client audience
        clockTolerance: 30,
      },
      (err, payload) => {
        if (err) return reject(err);
        
        // Verify it's a device token (not user token)
        if (payload.azp !== 'attendance-device-client') {
          return reject(new Error('Invalid token type: expected device client'));
        }
        
        // Required claims
        if (!payload.sub || !payload.device_id) {
          return reject(new Error('Missing required claims: sub or device_id'));
        }
        
        resolve(payload);
      }
    );
  });
}

/**
 * Middleware: Authenticate device requests
 */
export async function authenticateDevice(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ 
        message: 'Authorization required',
        code: 'MISSING_AUTH_HEADER'
      });
    }
    
    const token = authHeader.slice(7).trim();
    
    // Verify JWT
    const payload = await verifyDeviceToken(token);
    
    // Lookup device in database
    const device = await findDeviceByClientId(payload.device_id);
    
    if (!device) {
      return res.status(401).json({ 
        message: 'Device not registered',
        code: 'DEVICE_NOT_FOUND'
      });
    }
    
    if (device.status === 'maintenance') {
      return res.status(403).json({ 
        message: 'Device in maintenance mode',
        code: 'DEVICE_MAINTENANCE'
      });
    }
    
    // Update last seen
    await updateDeviceLastSeen(device.pk_device_id);
    
    // Attach device to request
    req.device = {
      id: device.pk_device_id,
      code: device.device_code,
      type: device.device_type,
      siteId: device.fk_site_id,
      capabilities: device.capabilities || [],
    };
    
    req.authContext = {
      type: 'device',
      deviceId: device.pk_device_id,
      clientId: payload.device_id,
      scopes: payload.scope?.split(' ') || [],
    };
    
    next();
  } catch (err) {
    console.error('[DeviceAuth] Authentication failed:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(500).json({ 
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Middleware: Check device capabilities
 */
export function requireCapability(capability) {
  return (req, res, next) => {
    const capabilities = req.device?.capabilities || [];
    
    if (!capabilities.includes(capability)) {
      return res.status(403).json({
        message: `Device lacks required capability: ${capability}`,
        code: 'MISSING_CAPABILITY',
        required: capability,
        available: capabilities
      });
    }
    
    next();
  };
}

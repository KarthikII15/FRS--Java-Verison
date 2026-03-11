/**
 * ivisAuth.js
 *
 * IVIS shared service account token manager (PostgreSQL-backed).
 * Login flow:
 *  1) GET  /api/login/public-key -> fetch RSA public key
 *  2) Encrypt password (RSA-OAEP + SHA-256)
 *  3) POST /api/clogin -> receive access_token + exp/expires_in
 *  4) Upsert into ivis_service_token (singleton row id=1)
 */

import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import { query } from '../db/pool.js';
import { env } from '../config/env.js';

const IVIS_BASE = 'https://iportal-poc.iviscloud.net';
const CUSTOMER_CODE = env.ivis.customerCode ?? env.ivis.customerName;
const PUBLIC_KEY_URL = `${IVIS_BASE}/api/login/public-key`;
const CUSTOMER_EXISTS_URL = `${IVIS_BASE}/api/iscutomerexist?customerCode=${CUSTOMER_CODE}`;
const TRUST_ENABLED_URL = `${IVIS_BASE}/api/customers/istrustenabled?customerCode=${CUSTOMER_CODE}`;
const THEME_URL = `${IVIS_BASE}/api/theme/user?customerCode=${CUSTOMER_CODE}`;
const LOGIN_URL = `${IVIS_BASE}/api/clogin`;

const IVIS_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://cportal-poc.iviscloud.net',
  'Referer': 'https://cportal-poc.iviscloud.net/',
  'Content-Type': 'application/json',
  'Customer-Name': CUSTOMER_CODE,
};

const HTTPS_AGENT = new https.Agent({
  rejectUnauthorized: env.ivis.tlsRejectUnauthorized,
});

async function fetchPublicKey() {
  const response = await axios.get(PUBLIC_KEY_URL, {
    headers: IVIS_HEADERS,
    timeout: 10_000,
    httpsAgent: HTTPS_AGENT,
  });
  const base64Key = response.data?.results;

  if (!base64Key) {
    throw new Error('[IVIS Auth] Failed to fetch public key: "results" missing.');
  }

  const pem = [
    '-----BEGIN PUBLIC KEY-----',
    ...base64Key.match(/.{1,64}/g),
    '-----END PUBLIC KEY-----',
  ].join('\n');

  return pem;
}

async function validateCustomerExists() {
  const response = await axios.get(CUSTOMER_EXISTS_URL, {
    headers: IVIS_HEADERS,
    timeout: 10_000,
    httpsAgent: HTTPS_AGENT,
  });
  if (!response.data?.results) {
    throw new Error(`[IVIS Auth] Customer "${CUSTOMER_CODE}" not found`);
  }
  return true;
}

async function checkTrustEnabled() {
  const response = await axios.get(TRUST_ENABLED_URL, {
    headers: IVIS_HEADERS,
    timeout: 10_000,
    httpsAgent: HTTPS_AGENT,
  });
  return response.data?.results;
}

async function fetchCustomerTheme() {
  try {
    const response = await axios.get(THEME_URL, {
      headers: IVIS_HEADERS,
      timeout: 10_000,
      httpsAgent: HTTPS_AGENT,
    });
    return response.data;
  } catch (err) {
    const status = err?.response?.status;
    const message = err?.response?.data?.errorMessage;
    if (status === 400 && message?.toLowerCase().includes('no theme found')) {
      console.warn('[IVIS Auth] Theme not found for customer; continuing login.');
      return null;
    }
    throw err;
  }
}

function encryptPassword(plainPassword, publicKeyPem, options) {
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      ...options,
    },
    Buffer.from(plainPassword, 'utf8')
  );
  return encrypted.toString('base64');
}

function isDecryptError(err) {
  const message = err?.response?.data?.errorMessage ?? '';
  return typeof message === 'string' && message.toLowerCase().includes('decrypt password');
}

function resolveExpiresAt(data) {
  if (data?.exp) {
    const expSeconds = Number(data.exp);
    if (Number.isFinite(expSeconds) && expSeconds > 0) {
      return new Date(expSeconds * 1000);
    }
  }

  if (data?.expires_in) {
    const expiresIn = Number(data.expires_in);
    if (Number.isFinite(expiresIn) && expiresIn > 0) {
      return new Date(Date.now() + expiresIn * 1000);
    }
  }

  // Fallback: assume 1 hour
  return new Date(Date.now() + 60 * 60 * 1000);
}

function extractAccessToken(data) {
  if (!data) return null;
  return (
    data.access_token ??
    data.accessToken ??
    data.token ??
    data?.results?.access_token ??
    data?.results?.accessToken ??
    data?.results?.token ??
    data?.result?.access_token ??
    data?.result?.token ??
    data?.data?.access_token ??
    data?.data?.token ??
    (typeof data?.results === 'string' ? data.results : null)
  );
}

/**
 * Performs a fresh IVIS login and upserts the token into PostgreSQL.
 * @returns {Promise<string>} access_token
 */
export async function loginToIvis() {
  if (!env.ivis.serviceUsername || !env.ivis.servicePassword) {
    throw new Error('[IVIS Auth] Missing IVIS service credentials in env.');
  }

  try {
    console.log('[IVIS] Starting 5-step login flow...');

    console.log('[IVIS] 1/5 Fetching public key...');
    const publicKeyPem = await fetchPublicKey();

    console.log('[IVIS] 2/5 Validating customer account...');
    await validateCustomerExists();

    console.log('[IVIS] 3/5 Checking trust status...');
    await checkTrustEnabled();

    console.log('[IVIS] 4/5 Fetching customer config...');
    await fetchCustomerTheme();

    const attempts = [
      {
        name: 'RSA-OAEP-SHA256',
        options: {
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
      },
      {
        name: 'RSA-OAEP-SHA1',
        options: {
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha1',
        },
      },
      {
        name: 'RSA-PKCS1v1_5',
        options: {
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
      },
    ];

    let response;
    let lastError;

    for (const attempt of attempts) {
      const encryptedPassword = encryptPassword(
        env.ivis.servicePassword,
        publicKeyPem,
        attempt.options
      );

      try {
        response = await axios.post(
          LOGIN_URL,
          {
            loginId: env.ivis.serviceUsername,
            password: encryptedPassword,
            customerCode: CUSTOMER_CODE,
            customerName: CUSTOMER_CODE,
          },
          {
            headers: IVIS_HEADERS,
            timeout: 10_000,
            httpsAgent: HTTPS_AGENT,
          }
        );
        console.log(`[IVIS Auth] Login succeeded using ${attempt.name}.`);
        if (response?.data) {
          const topKeys = Object.keys(response.data);
          const results = response.data?.results;
          const resultsType = Array.isArray(results) ? 'array' : typeof results;
          const resultsKeys = results && typeof results === 'object'
            ? Object.keys(results)
            : [];
          console.log('[IVIS Auth] Login response keys:', JSON.stringify(topKeys));
          console.log('[IVIS Auth] Login response results type:', resultsType);
          if (resultsKeys.length > 0) {
            console.log('[IVIS Auth] Login response results keys:', JSON.stringify(resultsKeys));
          }
        }
        break;
      } catch (err) {
        lastError = err;
        if (isDecryptError(err)) {
          console.warn(`[IVIS Auth] ${attempt.name} failed to decrypt. Retrying...`);
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw lastError ?? new Error('[IVIS Auth] Login failed: no response.');
    }

    let accessToken = extractAccessToken(response.data);

    if (!accessToken) {
      const snapshot = JSON.stringify(response.data);
      throw new Error(`[IVIS Auth] No access_token found in login response. Payload: ${snapshot}`);
    }

    if (accessToken.startsWith('Bearer ')) {
      accessToken = accessToken.slice('Bearer '.length);
    }

    console.log('[IVIS Auth] Access token preview:', `${accessToken.slice(0, 12)}... (len=${accessToken.length})`);

    const result = response.data?.results ?? {};
    const mappedCustomer =
      result.mappedCustomers?.[0] ?? result.customer ?? null;
    const mappedCustomerId =
      result.customerId ??
      mappedCustomer?.pkCustomerId ??
      mappedCustomer?.customerId ??
      mappedCustomer?.id;
    const mappedCustomerName =
      mappedCustomer?.customerName ?? result.customerName ?? env.ivis.customerName;
    const mappedCustomerCode =
      mappedCustomer?.customerCode ?? result.customerCode ?? mappedCustomerName;
    const mappedTenantId =
      result.tenantId ??
      mappedCustomer?.fkTenantId ??
      result.mappedTenants?.[0]?.tenantId ??
      result.mappedTenants?.[0]?.id;
    const mappedLoginId = result.username ?? result.email ?? env.ivis.serviceUsername;

    if (mappedCustomerId) {
      env.ivis.customerId = String(mappedCustomerId);
      console.log('[IVIS Auth] Using customerId from login response:', env.ivis.customerId);
    }
    if (mappedCustomerName) {
      env.ivis.customerName = String(mappedCustomerName);
      console.log('[IVIS Auth] Using customerName from login response:', env.ivis.customerName);
    }
    if (mappedCustomerCode) {
      env.ivis.customerCode = String(mappedCustomerCode);
      console.log('[IVIS Auth] Using customerCode from login response:', env.ivis.customerCode);
    }
    if (mappedTenantId) {
      env.ivis.tenantId = String(mappedTenantId);
      console.log('[IVIS Auth] Using tenantId from login response:', env.ivis.tenantId);
    }
    if (mappedLoginId) {
      env.ivis.loginId = String(mappedLoginId);
      console.log('[IVIS Auth] Using loginId from login response:', env.ivis.loginId);
    }

    if (result.mappedCustomers?.length) {
      console.log('[IVIS Auth] mappedCustomers[0]:', JSON.stringify(result.mappedCustomers[0]));
    }
    if (result.mappedTenants?.length) {
      console.log('[IVIS Auth] mappedTenants[0]:', JSON.stringify(result.mappedTenants[0]));
    }

    const expiresAt = resolveExpiresAt(response.data);

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

    console.log('[IVIS Auth] Token acquired, expires at', expiresAt.toISOString());
    return accessToken;
  } catch (err) {
    const url = err?.config?.url ?? 'unknown';
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error('[IVIS Auth] Login failed:', url, status ?? '');
    if (data) {
      console.error('[IVIS Auth] Response:', JSON.stringify(data));
    } else {
      console.error('[IVIS Auth] Error:', err.message);
    }
    throw err;
  }
}

/**
 * Returns a valid IVIS Bearer token.
 * Reads from PostgreSQL first, re-logins if missing or near expiry.
 */
export async function getIvisToken() {
  const result = await query(
    `SELECT access_token, expires_at
     FROM ivis_service_token
     WHERE id = 1
       AND expires_at > NOW() + INTERVAL '5 minutes'`
  );

  if (result.rows.length > 0) {
    return result.rows[0].access_token;
  }

  return loginToIvis();
}

/**
 * Marks the stored token as expired to force re-login on next request.
 */
export async function invalidateIvisToken() {
  try {
    await query(
      `UPDATE ivis_service_token
       SET expires_at = NOW()
       WHERE id = 1`
    );
    console.log('[IVIS Auth] Token invalidated in DB.');
  } catch (err) {
    console.warn('[IVIS Auth] Failed to invalidate token (non-fatal):', err.message);
  }
}

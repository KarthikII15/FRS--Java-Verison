import axios from 'axios';
import https from 'https';
import { query } from '../db/pool.js';
import { env } from '../config/env.js';

async function main() {
  const tokenResult = await query(
    `SELECT access_token FROM ivis_service_token WHERE id = 1`
  );
  const token = tokenResult.rows[0]?.access_token;
  if (!token) {
    console.error('No IVIS token in DB.');
    process.exit(1);
  }

  const httpsAgent = new https.Agent({
    rejectUnauthorized: env.ivis.tlsRejectUnauthorized,
  });

  const url = `${env.ivis.apiBase}/presence-mgmnt/profilecount`;

  const baseHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: 'https://cportal-poc.iviscloud.net',
    Referer: 'https://cportal-poc.iviscloud.net/',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  };

  const fullHeaders = {
    ...baseHeaders,
    'Customer-Id': env.ivis.customerId,
    'Customer-Name': env.ivis.customerName,
    'Login-Id': env.ivis.loginId,
    'Tenant-Id': env.ivis.tenantId,
    'Site-Id': 'null',
    'Sitegroup-Id': 'null',
    'Content-Type': 'application/json',
  };

  const tryCall = async (label, headers) => {
    try {
      const res = await axios.get(url, {
        headers,
        httpsAgent,
        validateStatus: () => true,
        timeout: 15_000,
      });
      console.log(`[${label}] status=${res.status} body=${JSON.stringify(res.data)}`);
    } catch (err) {
      console.error(`[${label}] failed:`, err.message);
    }
  };

  await tryCall('minimal-headers', baseHeaders);
  await tryCall('full-headers', fullHeaders);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });

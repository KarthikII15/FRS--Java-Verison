import axios from 'axios';
import https from 'https';
import { query } from '../db/pool.js';
import { fetchIvis } from './ivisFetcher.js';
import { env } from '../config/env.js';

const today = () => new Date().toISOString().slice(0, 10);
const todayEnd = () => `${today()} 23:59:59`;
const todayStart = () => `${today()} 00:00:00`;

const httpsAgent = new https.Agent({
  rejectUnauthorized: env.ivis.tlsRejectUnauthorized,
});

async function startLog(syncType) {
  const result = await query(
    `INSERT INTO ivis_sync_log (sync_type, started_at, status)
     VALUES ($1, NOW(), 'running') RETURNING pk_log_id`,
    [syncType]
  );
  return result.rows[0].pk_log_id;
}

async function completeLog(logId, counts) {
  await query(
    `UPDATE ivis_sync_log
     SET status        = 'success',
         completed_at  = NOW(),
         rows_fetched  = $2,
         rows_upserted = $3,
         rows_skipped  = $4
     WHERE pk_log_id = $1`,
    [logId, counts.fetched, counts.upserted, counts.skipped ?? 0]
  );
}

async function failLog(logId, error) {
  await query(
    `UPDATE ivis_sync_log
     SET status        = 'failed',
         completed_at  = NOW(),
         error_message = $2
     WHERE pk_log_id = $1`,
    [logId, error.message ?? String(error)]
  );
}

export async function syncSites() {
  const logId = await startLog('sites');
  try {
    const data = await fetchIvis('site-details-dropdown');
    const sites = data?.results ?? [];
    let upserted = 0;

    for (const site of sites) {
      await query(
        `INSERT INTO ivis_site (pk_site_id, site_name, fk_customer_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (pk_site_id)
         DO UPDATE SET site_name = EXCLUDED.site_name`,
        [site.siteId, site.siteName, env.ivis.customerId]
      );
      upserted += 1;
    }

    await completeLog(logId, { fetched: sites.length, upserted });
    return upserted;
  } catch (err) {
    await failLog(logId, err);
    throw err;
  }
}

export async function syncEmployees() {
  const logId = await startLog('employees');
  try {
    const IVIS_BASE = 'https://iportal-poc.iviscloud.net';
    const { getIvisToken } = await import('./ivisAuth.js');
    const token = await getIvisToken();

    const response = await axios.get(
      `${IVIS_BASE}/api/userprofile/syncVerifiedUsers`,
      {
        params: {
          unitId: env.ivis.deviceId ?? 'IVISPMS1001',
          lastSyncTime: '2020-01-01 00:00:00',
        },
        httpsAgent,
        headers: {
          Authorization: `Bearer ${token}`,
          'customer-id': env.ivis.customerId,
          'customer-name': env.ivis.customerName,
          'login-id': env.ivis.loginId,
          'tenant-id': env.ivis.tenantId,
          'Content-Type': 'application/json',
          Origin: 'https://cportal-poc.iviscloud.net',
        },
      }
    );

    const employees = response.data?.results ?? response.data ?? [];
    let upserted = 0;
    let skipped = 0;

    for (const emp of employees) {
      const employeeCode = emp.employeeId ?? emp.userId ?? emp.id;
      const fullName = emp.name ?? emp.fullName ?? emp.userName;
      const email = emp.email ?? emp.emailId ?? null;
      const department = emp.department ?? null;
      const status = emp.status ?? 'active';

      if (!employeeCode || !fullName) {
        skipped += 1;
        continue;
      }

      await query(
        `INSERT INTO hr_employee (
           tenant_id, customer_id, site_id, unit_id,
           employee_code, full_name, email,
           position_title, status, join_date,
           ivis_employee_id, ivis_synced_at, ivis_raw_json
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10,NOW(),$11)
         ON CONFLICT (employee_code)
         DO UPDATE SET
           full_name        = EXCLUDED.full_name,
           email            = COALESCE(EXCLUDED.email, hr_employee.email),
           status           = EXCLUDED.status,
           ivis_employee_id = EXCLUDED.ivis_employee_id,
           ivis_synced_at   = NOW(),
           ivis_raw_json    = EXCLUDED.ivis_raw_json`,
        [
          env.ivis.tenantId,
          env.ivis.customerId,
          1,
          1,
          employeeCode,
          fullName,
          email,
          department,
          status,
          String(emp.id ?? employeeCode),
          JSON.stringify(emp),
        ]
      );

      const faceUrl = emp.faceImage ?? emp.imageUrl ?? emp.faceUrl;
      if (faceUrl) {
        const empRow = await query(
          `SELECT pk_employee_id FROM hr_employee WHERE employee_code = $1`,
          [employeeCode]
        );
        const empId = empRow.rows[0]?.pk_employee_id;
        if (empId) {
          await query(
            `INSERT INTO employee_faces (
               pk_face_id, fk_employee_id, face_image_url,
               is_primary, is_active, source, enrollment_date, created_at
             )
             VALUES (gen_random_uuid(), $1, $2, true, true, 'ivis_sync', NOW(), NOW())
             ON CONFLICT (fk_employee_id)
             DO UPDATE SET
               face_image_url = EXCLUDED.face_image_url,
               is_active      = true,
               updated_at     = NOW()
             WHERE employee_faces.source = 'ivis_sync'`,
            [empId, faceUrl]
          );
        }
      }

      upserted += 1;
    }

    await completeLog(logId, { fetched: employees.length, upserted, skipped });
    return upserted;
  } catch (err) {
    await failLog(logId, err);
    throw err;
  }
}

export async function syncVisitorStats() {
  const logId = await startLog('visitorStats');
  try {
    const data = await fetchIvis('presence-mgmnt/visitor-stats-hourly', {
      toTime: todayEnd(),
      siteName: '',
      cameraIds: '',
      staffName: '',
    });

    const stats = data?.results ?? [];
    let upserted = 0;

    for (const stat of stats) {
      const hour = Number.parseInt(stat.eventDate, 10);
      if (Number.isNaN(hour)) continue;

      await query(
        `INSERT INTO ivis_visitor_stats
           (stat_date, hour_of_day, site_name, total_count,
            entry_count, exit_count, ack_count, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         ON CONFLICT (stat_date, hour_of_day, site_name)
         DO UPDATE SET
           total_count = EXCLUDED.total_count,
           entry_count = EXCLUDED.entry_count,
           exit_count  = EXCLUDED.exit_count,
           ack_count   = EXCLUDED.ack_count,
           synced_at   = NOW()`,
        [today(), hour, '', stat.total, stat.entryCount, stat.exitCount, stat.ackCount]
      );
      upserted += 1;
    }

    await completeLog(logId, { fetched: stats.length, upserted });
    return upserted;
  } catch (err) {
    await failLog(logId, err);
    throw err;
  }
}

export async function syncZoneStats() {
  const logId = await startLog('zoneStats');
  try {
    const data = await fetchIvis('presence-mgmnt/zone-wise-stats', {
      fromTime: todayStart(),
      siteName: '',
      cameraIds: '',
    });

    const stats = data?.results ?? [];
    let upserted = 0;

    for (const stat of stats) {
      const zoneName = stat.eventDate ?? stat.zoneName ?? 'unknown';

      await query(
        `INSERT INTO ivis_zone_stats
           (stat_date, zone_name, site_name, total_count,
            entry_count, exit_count, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (stat_date, zone_name, site_name)
         DO UPDATE SET
           total_count = EXCLUDED.total_count,
           entry_count = EXCLUDED.entry_count,
           exit_count  = EXCLUDED.exit_count,
           synced_at   = NOW()`,
        [today(), zoneName, '', stat.total ?? 0, stat.entryCount ?? 0, stat.exitCount ?? 0]
      );
      upserted += 1;
    }

    await completeLog(logId, { fetched: stats.length, upserted });
    return upserted;
  } catch (err) {
    await failLog(logId, err);
    throw err;
  }
}

export async function syncAttendance() {
  const logId = await startLog('attendance');
  try {
    const data = await fetchIvis('presence-mgmnt/frsemployee-stats', {
      toTime: todayEnd(),
      staffName: '',
      siteName: '',
      cameraIds: '',
    });

    const records = data?.results ?? [];
    let upserted = 0;
    let skipped = 0;

    for (const rec of records) {
      const empName = rec.eventDate ?? rec.staffName ?? rec.employeeName;
      if (!empName) {
        skipped += 1;
        continue;
      }

      const empResult = await query(
        `SELECT pk_employee_id, tenant_id, customer_id, site_id, unit_id
         FROM hr_employee
         WHERE full_name ILIKE $1
            OR ivis_employee_id = $2
         LIMIT 1`,
        [empName, String(rec.employeeId ?? empName)]
      );

      if (empResult.rows.length === 0) {
        skipped += 1;
        continue;
      }
      const emp = empResult.rows[0];

      const hasEntry = (rec.entryCount ?? 0) > 0;
      const hasExit = (rec.exitCount ?? 0) > 0;
      const status = hasEntry ? (hasExit ? 'checked_out' : 'present') : 'absent';

      await query(
        `INSERT INTO attendance_record (
           tenant_id, customer_id, site_id, unit_id,
           fk_employee_id, attendance_date,
           check_in, check_out, status,
           recognition_accuracy, created_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,
           CASE WHEN $7 THEN NOW() ELSE NULL END,
           CASE WHEN $8 THEN NOW() ELSE NULL END,
           $9, $10, NOW()
         )
         ON CONFLICT (fk_employee_id, attendance_date)
         DO UPDATE SET
           status               = EXCLUDED.status,
           recognition_accuracy = EXCLUDED.recognition_accuracy`,
        [
          emp.tenant_id,
          emp.customer_id,
          emp.site_id,
          emp.unit_id,
          emp.pk_employee_id,
          today(),
          hasEntry,
          hasExit,
          status,
          rec.total ?? 0,
        ]
      );
      upserted += 1;
    }

    await completeLog(logId, { fetched: records.length, upserted, skipped });
    return upserted;
  } catch (err) {
    await failLog(logId, err);
    throw err;
  }
}

export async function syncCleanliness() {
  const logId = await startLog('cleanliness');
  try {
    const data = await fetchIvis('presence-mgmnt/getCleanlinessPercentage', {
      date: today(),
    });

    const results = data?.results ?? [];
    const pct = Array.isArray(results)
      ? (results[0]?.percentage ?? results[0]?.value ?? null)
      : (data?.results ?? null);

    await query(
      `INSERT INTO ivis_cleanliness_scores (score_date, percentage, raw_response, synced_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (score_date)
       DO UPDATE SET
         percentage   = EXCLUDED.percentage,
         raw_response = EXCLUDED.raw_response,
         synced_at    = NOW()`,
      [today(), pct, JSON.stringify(data)]
    );

    await completeLog(logId, { fetched: 1, upserted: 1 });
    return pct;
  } catch (err) {
    await failLog(logId, err);
    throw err;
  }
}

export async function syncProfileCount() {
  const logId = await startLog('profileCount');
  try {
    const data = await fetchIvis('presence-mgmnt/profilecount');

    const count = Array.isArray(data?.results)
      ? (data.results[0]?.count ?? data.results[0]?.total ?? data.results.length)
      : (data?.results ?? 0);

    await query(
      `INSERT INTO ivis_profile_count_log (recorded_date, profile_count, synced_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (recorded_date)
       DO UPDATE SET
         profile_count = EXCLUDED.profile_count,
         synced_at     = NOW()`,
      [today(), count]
    );

    await completeLog(logId, { fetched: 1, upserted: 1 });
    return count;
  } catch (err) {
    await failLog(logId, err);
    throw err;
  }
}

export async function runFullSync() {
  const results = {};

  const run = async (name, fn) => {
    try {
      results[name] = await fn();
    } catch (err) {
      results[name] = { error: err.message };
    }
  };

  await run('sites', syncSites);
  await run('employees', syncEmployees);
  await run('visitorStats', syncVisitorStats);
  await run('zoneStats', syncZoneStats);
  await run('attendance', syncAttendance);
  await run('cleanliness', syncCleanliness);
  await run('profileCount', syncProfileCount);

  return results;
}

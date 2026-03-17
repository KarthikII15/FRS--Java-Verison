import bcrypt from "bcryptjs";
import { pool } from "../src/db/pool.js";

const ADMIN_PERMISSIONS = [
  "users.read",
  "users.manage",
  "devices.read",
  "devices.manage",
  "attendance.read",
  "attendance.manage",
  "analytics.read",
  "audit.read",
  "facility.read",
  "facility.manage",
  "aiinsights.read",
];

const HR_PERMISSIONS = [
  "users.read",
  "attendance.read",
  "attendance.manage",
  "analytics.read",
  "devices.read",
  "facility.read",
  "aiinsights.read",
];

async function getOrCreateTenant() {
  const inserted = await pool.query(
    `insert into frs_tenant(tenant_name)
     values ('Motivity Global')
     on conflict do nothing
     returning pk_tenant_id`
  );
  if (inserted.rows[0]) return inserted.rows[0].pk_tenant_id;
  const existing = await pool.query("select pk_tenant_id from frs_tenant where tenant_name='Motivity Global' limit 1");
  return existing.rows[0].pk_tenant_id;
}

async function getOrCreateCustomer(tenantId) {
  const inserted = await pool.query(
    `insert into frs_customer(customer_name, fk_tenant_id)
     values ('North America Ops', $1)
     on conflict do nothing
     returning pk_customer_id`,
    [tenantId]
  );
  if (inserted.rows[0]) return inserted.rows[0].pk_customer_id;
  const existing = await pool.query("select pk_customer_id from frs_customer where customer_name='North America Ops' limit 1");
  return existing.rows[0].pk_customer_id;
}

async function getOrCreateSite(customerId) {
  const inserted = await pool.query(
    `insert into frs_site(site_name, fk_customer_id)
     values ('Dallas Campus', $1)
     on conflict do nothing
     returning pk_site_id`,
    [customerId]
  );
  if (inserted.rows[0]) return inserted.rows[0].pk_site_id;
  const existing = await pool.query("select pk_site_id from frs_site where site_name='Dallas Campus' limit 1");
  return existing.rows[0].pk_site_id;
}

async function getOrCreateUnit(siteId) {
  const inserted = await pool.query(
    `insert into frs_unit(unit_name, fk_site_id)
     values ('HR Operations', $1)
     on conflict do nothing
     returning pk_unit_id`,
    [siteId]
  );
  if (inserted.rows[0]) return inserted.rows[0].pk_unit_id;
  const existing = await pool.query("select pk_unit_id from frs_unit where unit_name='HR Operations' limit 1");
  return existing.rows[0].pk_unit_id;
}

async function run() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const hrHash = await bcrypt.hash("hr123", 10);

  await pool.query("begin");
  try {
    const tenantId = await getOrCreateTenant();
    const customerId = await getOrCreateCustomer(tenantId);
    const siteId = await getOrCreateSite(customerId);
    const unitId = await getOrCreateUnit(siteId);

    const adminUser = await pool.query(
      `insert into frs_user(email, username, fk_user_type_id, role, password_hash, department)
       values ('admin@company.com', 'Admin User', 1, 'admin', $1, 'IT')
       on conflict (email) do update set password_hash = excluded.password_hash
       returning pk_user_id`,
      [adminHash]
    );

    const hrUser = await pool.query(
      `insert into frs_user(email, username, fk_user_type_id, role, password_hash, department)
       values ('hr@company.com', 'HR Manager', 2, 'hr', $1, 'Human Resources')
       on conflict (email) do update set password_hash = excluded.password_hash
       returning pk_user_id`,
      [hrHash]
    );

    const adminUserId = adminUser.rows[0].pk_user_id;
    const hrUserId = hrUser.rows[0].pk_user_id;

    await pool.query(
      `insert into frs_tenant_user_map(fk_user_id, fk_tenant_id)
       values ($1, $2), ($3, $2)
       on conflict do nothing`,
      [adminUserId, tenantId, hrUserId]
    );

    await pool.query(
      `insert into frs_customer_user_map(fk_user_id, fk_customer_id)
       values ($1, $2), ($3, $2)
       on conflict do nothing`,
      [adminUserId, customerId, hrUserId]
    );

    await pool.query(
      "delete from frs_user_membership where fk_user_id = any($1::bigint[])",
      [[adminUserId, hrUserId]]
    );

    await pool.query(
      `insert into frs_user_membership(fk_user_id, role, tenant_id, customer_id, site_id, unit_id, permissions)
       values
         ($1, 'admin', $2, $3, $4, null, $5::text[]),
         ($6, 'hr', $2, $3, $4, $7, $8::text[])`,
      [
        adminUserId,
        tenantId,
        customerId,
        siteId,
        ADMIN_PERMISSIONS,
        hrUserId,
        unitId,
        HR_PERMISSIONS,
      ]
    );

    await pool.query("delete from system_alert where tenant_id = $1", [tenantId]);
    await pool.query("delete from attendance_record where tenant_id = $1", [tenantId]);
    await pool.query("delete from facility_device where tenant_id = $1", [tenantId]);
    await pool.query("delete from hr_employee where tenant_id = $1", [tenantId]);
    await pool.query("delete from hr_shift where tenant_id = $1", [tenantId]);
    await pool.query("delete from hr_department where tenant_id = $1", [tenantId]);
    await pool.query("delete from audit_log where tenant_id = $1", [tenantId]);

    const engineeringDept = await pool.query(
      `insert into hr_department(tenant_id, name, code, color) values ($1, 'Engineering', 'ENG', '#3B82F6') returning pk_department_id`,
      [tenantId]
    );
    const hrDept = await pool.query(
      `insert into hr_department(tenant_id, name, code, color) values ($1, 'Human Resources', 'HR', '#EC4899') returning pk_department_id`,
      [tenantId]
    );
    const salesDept = await pool.query(
      `insert into hr_department(tenant_id, name, code, color) values ($1, 'Sales', 'SAL', '#10B981') returning pk_department_id`,
      [tenantId]
    );

    const morningShift = await pool.query(
      `insert into hr_shift(tenant_id, name, shift_type, start_time, end_time, grace_period_minutes, is_flexible)
       values ($1, 'Morning Shift', 'morning', '08:00', '17:00', 10, false)
       returning pk_shift_id`,
      [tenantId]
    );
    const eveningShift = await pool.query(
      `insert into hr_shift(tenant_id, name, shift_type, start_time, end_time, grace_period_minutes, is_flexible)
       values ($1, 'Evening Shift', 'evening', '14:00', '23:00', 15, false)
       returning pk_shift_id`,
      [tenantId]
    );
    const flexibleShift = await pool.query(
      `insert into hr_shift(tenant_id, name, shift_type, start_time, end_time, grace_period_minutes, is_flexible)
       values ($1, 'Flexible Hours', 'flexible', null, null, 0, true)
       returning pk_shift_id`,
      [tenantId]
    );

    const employeesToInsert = [
      ["EMP001", "Sarah Johnson", "sarah.johnson@company.com", engineeringDept.rows[0].pk_department_id, morningShift.rows[0].pk_shift_id, "Senior Software Engineer", "Building A", "active", "2022-03-15", "+1 234-567-8901"],
      ["EMP002", "Michael Chen", "michael.chen@company.com", engineeringDept.rows[0].pk_department_id, morningShift.rows[0].pk_shift_id, "DevOps Engineer", "Building A", "active", "2021-07-20", "+1 234-567-8902"],
      ["EMP003", "Emily Rodriguez", "emily.rodriguez@company.com", salesDept.rows[0].pk_department_id, flexibleShift.rows[0].pk_shift_id, "Marketing Manager", "Building B", "active", "2020-11-10", "+1 234-567-8903"],
      ["EMP004", "Lisa Thompson", "lisa.thompson@company.com", hrDept.rows[0].pk_department_id, morningShift.rows[0].pk_shift_id, "HR Specialist", "Building C", "active", "2020-08-30", "+1 234-567-8904"],
      ["EMP005", "Christopher Lee", "christopher.lee@company.com", engineeringDept.rows[0].pk_department_id, eveningShift.rows[0].pk_shift_id, "Backend Developer", "Building A", "active", "2022-11-05", "+1 234-567-8905"],
    ];

    const employeeIds = [];
    for (const employee of employeesToInsert) {
      const inserted = await pool.query(
        `insert into hr_employee(
          tenant_id, customer_id, site_id, unit_id, fk_department_id, fk_shift_id,
          employee_code, full_name, email, position_title, location_label, status, join_date, phone_number
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        returning pk_employee_id`,
        [
          tenantId,
          customerId,
          siteId,
          unitId,
          employee[3],
          employee[4],
          employee[0],
          employee[1],
          employee[2],
          employee[5],
          employee[6],
          employee[7],
          employee[8],
          employee[9],
        ]
      );
      employeeIds.push(inserted.rows[0].pk_employee_id);
    }

    const device1 = await pool.query(
      `insert into facility_device(
        tenant_id, customer_id, site_id, unit_id, external_device_id, name, location_label, ip_address, status, recognition_accuracy, total_scans, error_rate, model, last_active
      ) values ($1,$2,$3,$4,'device-1','Main Entrance - Building A','Building A - Ground Floor','192.168.1.101','online',98.5,15234,1.5,'FaceVision Pro X1', now())
      returning pk_device_id`,
      [tenantId, customerId, siteId, unitId]
    );
    const device2 = await pool.query(
      `insert into facility_device(
        tenant_id, customer_id, site_id, unit_id, external_device_id, name, location_label, ip_address, status, recognition_accuracy, total_scans, error_rate, model, last_active
      ) values ($1,$2,$3,$4,'device-2','Main Entrance - Building B','Building B - Ground Floor','192.168.1.102','offline',95.2,6745,4.8,'FaceVision Lite', now() - interval '2 hour')
      returning pk_device_id`,
      [tenantId, customerId, siteId, unitId]
    );

    for (let i = 0; i < employeeIds.length; i += 1) {
      for (let day = 0; day < 20; day += 1) {
        const status = day % 9 === 0 ? "absent" : day % 4 === 0 ? "late" : "present";
        const dateSql = `current_date - interval '${day} day'`;
        await pool.query(
          `insert into attendance_record(
            tenant_id, customer_id, site_id, unit_id, fk_employee_id, attendance_date,
            check_in, check_out, break_start, break_end, status, working_hours, break_duration_minutes, overtime_hours, is_late, is_early_departure, device_id, location_label, recognition_accuracy
          ) values (
            $1,$2,$3,$4,$5, (${dateSql})::date,
            case when $6='absent' then null else (${dateSql} + time '09:00') end,
            case when $6='absent' then null else (${dateSql} + time '18:00') end,
            case when $6='absent' then null else (${dateSql} + time '12:30') end,
            case when $6='absent' then null else (${dateSql} + time '13:15') end,
            $6,
            case when $6='absent' then 0 else 8.25 end,
            case when $6='absent' then 0 else 45 end,
            case when $6='present' then 0.5 else 0 end,
            ($6='late'),
            false,
            $7,
            $8,
            $9
          ) on conflict (tenant_id, fk_employee_id, attendance_date) do nothing`,
          [
            tenantId,
            customerId,
            siteId,
            unitId,
            employeeIds[i],
            status,
            day % 2 === 0 ? "device-1" : "device-2",
            "Dallas Campus",
            92 + (i % 6),
          ]
        );
      }
    }

    await pool.query(
      `insert into system_alert(
        tenant_id, customer_id, site_id, unit_id, alert_type, severity, title, message, fk_device_id, is_read
      ) values
        ($1,$2,$3,$4,'device-offline','high','Device Offline','Main Entrance - Building B has been offline for 2 hours',$5,false),
        ($1,$2,$3,$4,'late-checkin','medium','Multiple Late Check-ins','5 employees checked in late today',null,false),
        ($1,$2,$3,$4,'recognition-failure','low','Recognition Drift','Accuracy dropped below threshold for one camera',$6,true)`,
      [tenantId, customerId, siteId, unitId, device2.rows[0].pk_device_id, device1.rows[0].pk_device_id]
    );

    await pool.query(
      `insert into audit_log(
        tenant_id, customer_id, site_id, unit_id, fk_user_id, action, details, ip_address
      ) values
        ($1,$2,$3,$4,$5,'User Created','Created new HR user: hr@company.com','192.168.1.50'),
        ($1,$2,$3,$4,$5,'Device Registered','Registered device: Main Entrance - Building A','192.168.1.50'),
        ($1,$2,$3,$4,$6,'Report Exported','Exported attendance report for January 2026','192.168.1.75')`,
      [tenantId, customerId, siteId, unitId, adminUserId, hrUserId]
    );

    await pool.query("commit");
    console.log("Seed complete.");
  } catch (err) {
    await pool.query("rollback");
    throw err;
  }
}

run()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

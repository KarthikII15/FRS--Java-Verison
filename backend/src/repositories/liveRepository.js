import { query } from "../db/pool.js";
import { buildScopeWhere } from "./scopeSql.js";

export async function listEmployees(scope, { limit = 200, department, status } = {}) {
  const scopeParts = buildScopeWhere(scope, "e");
  const values = [...scopeParts.values];
  const filters = [scopeParts.whereSql];

  if (department) {
    values.push(department);
    filters.push(`d.name = $${values.length}`);
  }
  if (status) {
    values.push(status);
    filters.push(`e.status = $${values.length}`);
  }

  values.push(limit);
  const sql = `
    select
      e.pk_employee_id,
      e.employee_code,
      e.full_name,
      e.email,
      e.position_title,
      e.location_label,
      e.join_date,
      e.status,
      d.name as department_name,
      s.shift_type
    from hr_employee e
    left join hr_department d on d.pk_department_id = e.fk_department_id
    left join hr_shift s on s.pk_shift_id = e.fk_shift_id
    where ${filters.join(" and ")}
    order by e.full_name
    limit $${values.length}
  `;
  const result = await query(sql, values);
  return result.rows;
}

export async function listShifts(scope) {
  const scopeParts = buildScopeWhere(scope, "s");
  const sql = `
    select pk_shift_id, name, shift_type, start_time, end_time, grace_period_minutes, is_flexible
    from hr_shift s
    where ${scopeParts.whereSql}
    order by name
  `;
  const result = await query(sql, scopeParts.values);
  return result.rows;
}

export async function listAttendance(scope, { fromDate, toDate, limit = 500 } = {}) {
  const scopeParts = buildScopeWhere(scope, "a");
  const values = [...scopeParts.values];
  const filters = [scopeParts.whereSql];

  if (fromDate) {
    values.push(fromDate);
    filters.push(`a.attendance_date >= $${values.length}`);
  }
  if (toDate) {
    values.push(toDate);
    filters.push(`a.attendance_date <= $${values.length}`);
  }

  values.push(limit);
  const sql = `
    select
      a.pk_attendance_id,
      a.fk_employee_id,
      e.employee_code,
      e.full_name,
      a.attendance_date,
      a.check_in,
      a.check_out,
      a.break_start,
      a.break_end,
      a.status,
      a.working_hours,
      a.break_duration_minutes,
      a.overtime_hours,
      a.is_late,
      a.is_early_departure,
      a.device_id,
      a.location_label,
      a.recognition_accuracy
    from attendance_record a
    join hr_employee e on e.pk_employee_id = a.fk_employee_id
    where ${filters.join(" and ")}
    order by a.attendance_date desc, e.full_name asc
    limit $${values.length}
  `;
  const result = await query(sql, values);
  return result.rows;
}

export async function listDevices(scope, { limit = 200 } = {}) {
  const scopeParts = buildScopeWhere(scope, "d");
  const values = [...scopeParts.values, limit];
  const sql = `
    select
      pk_device_id,
      external_device_id,
      name,
      location_label,
      ip_address,
      status,
      recognition_accuracy,
      total_scans,
      error_rate,
      model,
      last_active
    from facility_device d
    where ${scopeParts.whereSql}
    order by name
    limit $${values.length}
  `;
  const result = await query(sql, values);
  return result.rows;
}

export async function listAlerts(scope, { unreadOnly = false, limit = 200 } = {}) {
  const scopeParts = buildScopeWhere(scope, "a");
  const values = [...scopeParts.values];
  const filters = [scopeParts.whereSql];
  if (unreadOnly) {
    filters.push("a.is_read = false");
  }
  values.push(limit);

  const sql = `
    select
      a.pk_alert_id,
      a.alert_type,
      a.severity,
      a.title,
      a.message,
      a.fk_employee_id,
      e.employee_code,
      a.fk_device_id,
      d.external_device_id,
      a.is_read,
      a.created_at
    from system_alert a
    left join hr_employee e on e.pk_employee_id = a.fk_employee_id
    left join facility_device d on d.pk_device_id = a.fk_device_id
    where ${filters.join(" and ")}
    order by a.created_at desc
    limit $${values.length}
  `;
  const result = await query(sql, values);
  return result.rows;
}

export async function getDashboardMetrics(scope, { forDate } = {}) {
  const scopeParts = buildScopeWhere(scope, "e");
  const date = forDate || new Date().toISOString().slice(0, 10);

  const totalEmployees = await query(
    `select count(*)::int as count from hr_employee e where ${scopeParts.whereSql}`,
    scopeParts.values
  );

  const attendanceScope = buildScopeWhere(scope, "a");
  const attendance = await query(
    `select
      count(*)::int as total_records,
      count(*) filter (where status = 'present')::int as present_today,
      count(*) filter (where status = 'late')::int as late_today,
      count(*) filter (where status = 'absent')::int as absent_today,
      count(*) filter (where status = 'on-break')::int as on_break,
      count(*) filter (where status = 'on-leave')::int as on_leave,
      coalesce(round(avg(working_hours)::numeric, 2), 0) as avg_working_hours,
      coalesce(round(sum(overtime_hours)::numeric, 2), 0) as total_overtime
    from attendance_record a
    where ${attendanceScope.whereSql}
      and a.attendance_date = $${attendanceScope.values.length + 1}`,
    [...attendanceScope.values, date]
  );

  const row = attendance.rows[0];
  const employeesCount = totalEmployees.rows[0].count;
  const attendanceRate =
    employeesCount > 0 ? Number((((row.present_today + row.late_today) / employeesCount) * 100).toFixed(2)) : 0;
  const punctualityRate =
    employeesCount > 0 ? Number(((row.present_today / employeesCount) * 100).toFixed(2)) : 0;

  return {
    totalEmployees: employeesCount,
    presentToday: row.present_today,
    lateToday: row.late_today,
    absentToday: row.absent_today,
    onBreak: row.on_break,
    onLeave: row.on_leave,
    avgWorkingHours: Number(row.avg_working_hours),
    totalOvertimeHours: Number(row.total_overtime),
    attendanceRate,
    punctualityRate,
  };
}


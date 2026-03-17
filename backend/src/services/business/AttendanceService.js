import { query } from "../../db/pool.js";
import * as eventRepo from "../../repositories/eventRepository.js";
import * as liveRepo from "../../repositories/liveRepository.js";
import { env } from "../../config/env.js";

/**
 * AttendanceService
 * High-level attendance operations and reports.
 * Integrates with repositories and optional real-time broadcaster.
 */
class AttendanceService {
  /** @type {(event:string,payload:any)=>void|null} */
  broadcaster = null;

  /**
   * Attach a broadcaster callback used for real-time updates.
   * @param {(event:string,payload:any)=>void} fn
   */
  setBroadcaster(fn) {
    this.broadcaster = typeof fn === "function" ? fn : null;
  }

  /**
   * Mark attendance for a single employee.
   * @param {{employeeId:string, deviceId?:string, timestamp?:string, status?:'present'|'late'|'absent'|'on-leave'|'on-break', scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}}} payload
   */
  async markAttendance(payload) {
    const ts = payload.timestamp || new Date().toISOString();
    const status = payload.status || "present";
    const sql = `
      insert into attendance_record(
        tenant_id, customer_id, site_id, unit_id,
        fk_employee_id, attendance_date, check_in, status, location_label
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (tenant_id, fk_employee_id, attendance_date)
      do update set check_in = coalesce(attendance_record.check_in, excluded.check_in),
                    status = excluded.status
      returning *`;
    const params = [
      payload.scope.tenantId,
      payload.scope.customerId || null,
      payload.scope.siteId || null,
      payload.scope.unitId || null,
      Number(payload.employeeId),
      ts.slice(0, 10),
      ts,
      status,
      null,
    ];
    const res = await query(sql, params);
    const record = res.rows[0];
    this.#broadcast("attendance.marked", { record });
    return record;
  }

  /**
   * Batch mark attendance.
   * @param {{items:Array<{employeeId:string,timestamp?:string,status?:string}>,scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}}} payload
   */
  async batchMarkAttendance(payload) {
    const results = [];
    for (const item of payload.items || []) {
      // eslint-disable-next-line no-await-in-loop
      const r = await this.markAttendance({ ...item, scope: payload.scope });
      results.push(r);
    }
    this.#broadcast("attendance.batchMarked", { count: results.length });
    return { count: results.length, records: results };
  }

  /**
   * Get today's attendance for scope.
   * @param {{scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}, limit?:number}} params
   */
  async getTodayAttendance({ scope, limit = 500 }) {
    const today = new Date().toISOString().slice(0, 10);
    return liveRepo.listAttendance(scope, { fromDate: today, toDate: today, limit });
  }

  /**
   * Get attendance for an employee.
   * @param {{employeeId:string, fromDate?:string, toDate?:string, scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}}} params
   */
  async getEmployeeAttendance({ employeeId, fromDate, toDate, scope }) {
    const values = [Number(employeeId)];
    const filters = ["a.fk_employee_id = $1"];
    let idx = 2;
    if (fromDate) {
      filters.push(`a.attendance_date >= $${idx++}`);
      values.push(fromDate);
    }
    if (toDate) {
      filters.push(`a.attendance_date <= $${idx++}`);
      values.push(toDate);
    }
    const whereScope = [];
    const sv = [];
    if (scope?.tenantId) {
      whereScope.push(`a.tenant_id = $${idx++}`); values.push(scope.tenantId);
    }
    if (scope?.siteId) {
      whereScope.push(`a.site_id = $${idx++}`); values.push(scope.siteId);
    }
    const sql = `
      select a.*
      from attendance_record a
      where ${filters.join(" and ")}
        ${whereScope.length ? "and " + whereScope.join(" and ") : "" }
      order by a.attendance_date desc`;
    const res = await query(sql, values.concat(sv));
    return res.rows;
  }

  /**
   * Range query.
   * @param {{fromDate:string,toDate:string,scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}, limit?:number}} params
   */
  async getAttendanceByDateRange({ fromDate, toDate, scope, limit = 1000 }) {
    return liveRepo.listAttendance(scope, { fromDate, toDate, limit });
  }

  /**
   * Who is currently present (checked-in without check-out).
   * @param {{scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}}} params
   */
  async getCurrentlyPresent({ scope }) {
    const sql = `
      select a.*, e.full_name
      from attendance_record a
      join hr_employee e on e.pk_employee_id = a.fk_employee_id
      where a.tenant_id = $1
        and a.attendance_date = $2
        and a.check_in is not null
        and a.check_out is null
      order by e.full_name`;
    const today = new Date().toISOString().slice(0, 10);
    const res = await query(sql, [scope.tenantId, today]);
    return res.rows;
  }

  /**
   * Aggregate stats for dashboard.
   * @param {{scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}, forDate?:string}} params
   */
  async getAttendanceStats({ scope, forDate }) {
    return liveRepo.getDashboardMetrics(scope, { forDate });
  }

  /**
   * Generate a simple daily report.
   * @param {{scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}, date?:string}} params
   */
  async generateDailyReport({ scope, date }) {
    const d = date || new Date().toISOString().slice(0, 10);
    const data = await this.getAttendanceByDateRange({ fromDate: d, toDate: d, scope, limit: 2000 });
    return { date: d, total: data.length, data };
  }

  /**
   * Generate a simple monthly report.
   * @param {{scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}, year:number, month:number}} params
   */
  async generateMonthlyReport({ scope, year, month }) {
    const from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const data = await this.getAttendanceByDateRange({ fromDate: from, toDate: to, scope, limit: 10000 });
    return { year, month, total: data.length, data };
  }

  /**
   * Export selected attendance rows to CSV.
   * @param {{rows:Array<any>}} params
   * @returns {string}
   */
  exportAttendance({ rows }) {
    if (!Array.isArray(rows) || rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(",")].concat(
      rows.map(r => headers.map(h => {
        const v = r[h] == null ? "" : String(r[h]).replace(/"/g, '""');
        return `"${v}"`;
      }).join(","))
    ).join("\n");
    return csv;
  }

  /**
   * Correct attendance record fields.
   * @param {{attendanceId:string,patch:Partial<{check_in:string,check_out:string,status:string}>}} params
   */
  async correctAttendance({ attendanceId, patch }) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(patch || {})) {
      fields.push(`${k} = $${idx++}`);
      values.push(v);
    }
    values.push(Number(attendanceId));
    const sql = `update attendance_record set ${fields.join(", ")}, updated_at = now() where pk_attendance_id = $${idx} returning *`;
    const res = await query(sql, values);
    const row = res.rows[0] || null;
    if (row) this.#broadcast("attendance.corrected", { id: attendanceId });
    return row;
  }

  /**
   * Delete an attendance record.
   * @param {{attendanceId:string}} params
   */
  async deleteAttendance({ attendanceId }) {
    await query(`delete from attendance_record where pk_attendance_id = $1`, [Number(attendanceId)]);
    this.#broadcast("attendance.deleted", { id: attendanceId });
    return { success: true };
  }

  /**
   * Internal broadcaster helper.
   * @param {string} event
   * @param {any} payload
   */
  #broadcast(event, payload) {
    try {
      if (this.broadcaster) this.broadcaster(event, payload);
    } catch {
      /* noop */
    }
  }
}

const attendanceService = new AttendanceService();
export default attendanceService;


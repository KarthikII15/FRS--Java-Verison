import { query } from "../../db/pool.js";

/**
 * ReportService
 * Generates attendance and device reports; basic export utilities.
 */
class ReportService {
  /** @type {Map<string, any>} */
  schedules = new Map();
  /** @type {Map<string, any>} */
  templates = new Map();

  /**
   * Daily attendance report.
   * @param {{scope:any, date:string}} params
   */
  async generateDailyAttendanceReport({ scope, date }) {
    const rows = await query(
      `select a.*, e.full_name, e.employee_code
       from attendance_record a
       join hr_employee e on e.pk_employee_id = a.fk_employee_id
       where a.tenant_id = $1 and a.attendance_date = $2
       order by e.full_name`,
      [scope.tenantId, date]
    );
    return { type: "dailyAttendance", date, rows: rows.rows };
  }

  /**
   * Monthly attendance report.
   * @param {{scope:any, year:number, month:number}} params
   */
  async generateMonthlyAttendanceReport({ scope, year, month }) {
    const from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const rows = await query(
      `select a.*, e.full_name, e.employee_code
       from attendance_record a
       join hr_employee e on e.pk_employee_id = a.fk_employee_id
       where a.tenant_id = $1 and a.attendance_date between $2 and $3
       order by a.attendance_date desc, e.full_name`,
      [scope.tenantId, from, to]
    );
    return { type: "monthlyAttendance", year, month, rows: rows.rows };
  }

  /**
   * Yearly attendance report.
   * @param {{scope:any, year:number}} params
   */
  async generateYearlyAttendanceReport({ scope, year }) {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const rows = await query(
      `select a.*, e.full_name
       from attendance_record a
       join hr_employee e on e.pk_employee_id = a.fk_employee_id
       where a.tenant_id = $1 and a.attendance_date between $2 and $3`,
      [scope.tenantId, from, to]
    );
    return { type: "yearlyAttendance", year, rows: rows.rows };
  }

  /**
   * Custom attendance report.
   * @param {{scope:any, fromDate:string, toDate:string}} params
   */
  async generateCustomAttendanceReport({ scope, fromDate, toDate }) {
    const rows = await query(
      `select a.*, e.full_name
       from attendance_record a
       join hr_employee e on e.pk_employee_id = a.fk_employee_id
       where a.tenant_id = $1 and a.attendance_date between $2 and $3`,
      [scope.tenantId, fromDate, toDate]
    );
    return { type: "customAttendance", fromDate, toDate, rows: rows.rows };
  }

  /**
   * Attendance summary aggregates.
   * @param {{scope:any, fromDate:string, toDate:string}} params
   */
  async getAttendanceSummary({ scope, fromDate, toDate }) {
    const rows = await query(
      `select status, count(*)::int as count
       from attendance_record
       where tenant_id = $1 and attendance_date between $2 and $3
       group by status`,
      [scope.tenantId, fromDate, toDate]
    );
    return rows.rows;
  }

  async generateEmployeeDirectory({ scope }) {
    const rows = await query(
      `select employee_code, full_name, email, position_title, status
       from hr_employee where tenant_id = $1 order by full_name`,
      [scope.tenantId]
    );
    return { type: "employeeDirectory", rows: rows.rows };
  }

  async generateTurnoverReport({ scope, fromDate, toDate }) {
    return { type: "turnover", fromDate, toDate, rows: [] };
  }

  async generateTenureReport({ scope }) {
    return { type: "tenure", rows: [] };
  }

  async generateDepartmentReport({ scope }) {
    const rows = await query(
      `select d.name as department, count(*)::int as count
       from hr_employee e
       left join hr_department d on d.pk_department_id = e.fk_department_id
       where e.tenant_id = $1
       group by d.name`,
      [scope.tenantId]
    );
    return { type: "department", rows: rows.rows };
  }

  async generateDeviceHealthReport({ scope }) {
    const rows = await query(
      `select status, count(*)::int as count from facility_device where tenant_id = $1 group by status`,
      [scope.tenantId]
    );
    return { type: "deviceHealth", rows: rows.rows };
  }

  async generateDeviceActivityReport({ scope, fromDate, toDate }) {
    return { type: "deviceActivity", fromDate, toDate, rows: [] };
  }

  async generateDeviceErrorReport({ scope, fromDate, toDate }) {
    return { type: "deviceErrors", fromDate, toDate, rows: [] };
  }

  async generatePeakHoursReport({ scope, fromDate, toDate }) {
    const rows = await query(
      `select extract(hour from check_in)::int as hour, count(*)::int as count
       from attendance_record
       where tenant_id = $1 and check_in is not null and attendance_date between $2 and $3
       group by 1 order by 1`,
      [scope.tenantId, fromDate, toDate]
    );
    return { type: "peakHours", rows: rows.rows };
  }

  async generateOccupancyReport({ scope, fromDate, toDate }) {
    const rows = await query(
      `select attendance_date as day, count(*)::int as count
       from attendance_record
       where tenant_id = $1 and check_in is not null and attendance_date between $2 and $3
       group by attendance_date order by 1`,
      [scope.tenantId, fromDate, toDate]
    );
    return { type: "occupancy", rows: rows.rows };
  }

  async generateTrendsReport({ scope, fromDate, toDate }) {
    return this.generateOccupancyReport({ scope, fromDate, toDate });
  }

  async generateComplianceReport({ scope, fromDate, toDate }) {
    return { type: "compliance", rows: [] };
  }

  /**
   * Export helpers.
   * @param {{rows:any[]}} params
   */
  exportToCsv({ rows }) {
    if (!rows || rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(",")].concat(
      rows.map(r => headers.map(h => {
        const v = r[h] == null ? "" : String(r[h]).replace(/"/g, '""');
        return `"${v}"`;
      }).join(","))
    ).join("\n");
    return csv;
  }

  exportToJson({ rows }) {
    return JSON.stringify(rows || [], null, 2);
  }

  exportToExcel({ rows }) {
    const csv = this.exportToCsv({ rows });
    return Buffer.from(csv, "utf8");
  }

  exportToPdf({ rows }) {
    const text = this.exportToCsv({ rows });
    return Buffer.from(text, "utf8");
  }

  /**
   * Scheduling APIs (in-memory placeholder).
   */
  scheduleReport({ id, spec }) {
    this.schedules.set(id, { id, spec, createdAt: new Date().toISOString() });
    return this.schedules.get(id);
  }

  updateScheduledReport({ id, spec }) {
    if (!this.schedules.has(id)) return null;
    const x = this.schedules.get(id);
    x.spec = spec;
    x.updatedAt = new Date().toISOString();
    return x;
  }

  deleteScheduledReport({ id }) {
    this.schedules.delete(id);
    return { success: true };
  }

  runScheduledReport({ id }) {
    const x = this.schedules.get(id) || null;
    return x;
  }

  getReportTemplates() {
    return Array.from(this.templates.values());
  }

  getReportTemplate({ id }) {
    return this.templates.get(id) || null;
  }

  createReportTemplate({ id, template }) {
    this.templates.set(id, template);
    return template;
  }

  updateReportTemplate({ id, template }) {
    if (!this.templates.has(id)) return null;
    this.templates.set(id, template);
    return template;
  }

  deleteReportTemplate({ id }) {
    this.templates.delete(id);
    return { success: true };
  }
}

const reportService = new ReportService();
export default reportService;


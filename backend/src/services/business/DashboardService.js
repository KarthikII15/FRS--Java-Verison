import * as liveRepo from "../../repositories/liveRepository.js";
import { query } from "../../db/pool.js";

/**
 * DashboardService
 * Aggregates operational and HR metrics for dashboards.
 */
class DashboardService {
  /**
   * Admin overview.
   * @param {{scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}}} params
   */
  async getAdminSummary({ scope }) {
    const metrics = await liveRepo.getDashboardMetrics(scope, {});
    const devices = await liveRepo.listDevices(scope, { limit: 500 });
    const alerts = await liveRepo.listAlerts(scope, { unreadOnly: false, limit: 50 });
    return { metrics, deviceCount: devices.length, recentAlerts: alerts.slice(0, 5) };
  }

  /**
   * System health approximation.
   * @returns {Promise<any>}
   */
  async getSystemHealth() {
    return { status: "ok" };
  }

  /**
   * Device status listing.
   * @param {{scope:any}} params
   */
  async getDeviceStatus({ scope }) {
    const devices = await liveRepo.listDevices(scope, { limit: 500 });
    const byStatus = devices.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});
    return { total: devices.length, byStatus, devices };
  }

  /**
   * Active alerts.
   * @param {{scope:any, limit?:number}} params
   */
  async getActiveAlerts({ scope, limit = 100 }) {
    const alerts = await liveRepo.listAlerts(scope, { unreadOnly: false, limit });
    return alerts;
  }

  /**
   * HR snapshot summary.
   * @param {{scope:any}} params
   */
  async getHrSummary({ scope }) {
    const metrics = await liveRepo.getDashboardMetrics(scope, {});
    return metrics;
  }

  /**
   * Current occupancy by unit/site.
   * @param {{scope:any}} params
   */
  async getCurrentOccupancy({ scope }) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await query(
      `select unit_id, count(*)::int as count
       from attendance_record
       where tenant_id = $1 and attendance_date = $2 and check_in is not null and check_out is null
       group by unit_id`,
      [scope.tenantId, today]
    );
    return rows.rows;
  }

  /**
   * Occupancy history (simple daily counts).
   * @param {{scope:any, fromDate:string, toDate:string}} params
   */
  async getOccupancyHistory({ scope, fromDate, toDate }) {
    const rows = await query(
      `select attendance_date as day, count(*)::int as count
       from attendance_record
       where tenant_id = $1 and attendance_date between $2 and $3 and check_in is not null
       group by attendance_date
       order by attendance_date`,
      [scope.tenantId, fromDate, toDate]
    );
    return rows.rows;
  }

  /**
   * Today attendance details.
   * @param {{scope:any}} params
   */
  async getTodayAttendance({ scope }) {
    const today = new Date().toISOString().slice(0, 10);
    return liveRepo.listAttendance(scope, { fromDate: today, toDate: today, limit: 2000 });
  }

  /**
   * Trends (last N days).
   * @param {{scope:any, days?:number}} params
   */
  async getAttendanceTrends({ scope, days = 14 }) {
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    return this.getOccupancyHistory({
      scope,
      fromDate: from.toISOString().slice(0, 10),
      toDate: to.toISOString().slice(0, 10),
    });
  }

  /**
   * Department summary counts.
   * @param {{scope:any}} params
   */
  async getDepartmentSummary({ scope }) {
    const rows = await query(
      `select d.name as department, count(*)::int as count
       from hr_employee e
       left join hr_department d on d.pk_department_id = e.fk_department_id
       where e.tenant_id = $1
       group by d.name
       order by d.name`,
      [scope.tenantId]
    );
    return rows.rows;
  }

  /**
   * Late arrivals today.
   * @param {{scope:any}} params
   */
  async getLateArrivals({ scope }) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await query(
      `select e.full_name, a.check_in
       from attendance_record a
       join hr_employee e on e.pk_employee_id = a.fk_employee_id
       where a.tenant_id = $1 and a.attendance_date = $2 and a.status = 'late'
       order by e.full_name`,
      [scope.tenantId, today]
    );
    return rows.rows;
  }

  /**
   * Early departures today.
   * @param {{scope:any}} params
   */
  async getEarlyDepartures({ scope }) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await query(
      `select e.full_name, a.check_out
       from attendance_record a
       join hr_employee e on e.pk_employee_id = a.fk_employee_id
       where a.tenant_id = $1 and a.attendance_date = $2 and a.is_early_departure = true
       order by e.full_name`,
      [scope.tenantId, today]
    );
    return rows.rows;
  }

  /**
   * Absentees today (no check-in).
   * @param {{scope:any}} params
   */
  async getAbsentees({ scope }) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await query(
      `select e.pk_employee_id, e.full_name
       from hr_employee e
       where e.tenant_id = $1
         and not exists (
           select 1 from attendance_record a
           where a.fk_employee_id = e.pk_employee_id
             and a.attendance_date = $2
         )
       order by e.full_name`,
      [scope.tenantId, today]
    );
    return rows.rows;
  }

  /**
   * Live presence proxy.
   * @param {{scope:any}} params
   */
  async getLivePresence({ scope }) {
    return this.getCurrentOccupancy({ scope });
  }

  /**
   * Floor occupancy placeholder.
   * @param {{scope:any}} params
   */
  async getFloorOccupancy({ scope }) {
    return [];
  }

  /**
   * Area counts placeholder.
   * @param {{scope:any}} params
   */
  async getAreaCounts({ scope }) {
    return [];
  }

  /**
   * Heatmap placeholder.
   * @param {{scope:any}} params
   */
  async getHeatmapData({ scope }) {
    return [];
  }

  /**
   * Peak hours computation (by hour bins).
   * @param {{scope:any, fromDate:string, toDate:string}} params
   */
  async getPeakHours({ scope, fromDate, toDate }) {
    const rows = await query(
      `select extract(hour from check_in)::int as hour, count(*)::int as count
       from attendance_record
       where tenant_id = $1 and check_in is not null and attendance_date between $2 and $3
       group by 1
       order by 1`,
      [scope.tenantId, fromDate, toDate]
    );
    return rows.rows;
  }

  /**
   * Average duration in office (check_out - check_in).
   * @param {{scope:any, fromDate:string, toDate:string}} params
   */
  async getAverageDuration({ scope, fromDate, toDate }) {
    const rows = await query(
      `select round(avg(extract(epoch from (check_out - check_in)))/3600.0, 2) as hours
       from attendance_record
       where tenant_id = $1 and check_in is not null and check_out is not null
         and attendance_date between $2 and $3`,
      [scope.tenantId, fromDate, toDate]
    );
    return { hours: Number(rows.rows[0]?.hours || 0) };
    }

  /**
   * Employee ranking by presence days in range.
   * @param {{scope:any, fromDate:string, toDate:string, limit?:number}} params
   */
  async getEmployeeRanking({ scope, fromDate, toDate, limit = 20 }) {
    const rows = await query(
      `select e.full_name, count(*)::int as days
       from attendance_record a
       join hr_employee e on e.pk_employee_id = a.fk_employee_id
       where a.tenant_id = $1 and a.status in ('present','late') and a.attendance_date between $2 and $3
       group by e.full_name
       order by days desc, e.full_name
       limit $4`,
      [scope.tenantId, fromDate, toDate, limit]
    );
    return rows.rows;
  }
}

const dashboardService = new DashboardService();
export default dashboardService;


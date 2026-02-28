import { query } from "../../db/pool.js";
import * as authRepo from "../../repositories/authRepository.js";

/**
 * EmployeeService
 * Employee CRUD and activity aggregation.
 */
class EmployeeService {
  /**
   * List employees with optional filters.
   * @param {{scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}, limit?:number, department?:string, status?:'active'|'inactive'|'on-leave'}} params
   */
  async getAllEmployees({ scope, limit = 200, department, status }) {
    const values = [scope.tenantId];
    let idx = 2;
    const filters = ["e.tenant_id = $1"];
    if (department) {
      filters.push(`d.name = $${idx++}`); values.push(department);
    }
    if (status) {
      filters.push(`e.status = $${idx++}`); values.push(status);
    }
    const sql = `
      select e.*, d.name as department_name
      from hr_employee e
      left join hr_department d on d.pk_department_id = e.fk_department_id
      where ${filters.join(" and ")}
      order by e.full_name
      limit ${limit}`;
    const res = await query(sql, values);
    return res.rows;
  }

  /**
   * Search employees by name/code/email.
   * @param {{scope:{tenantId:string}, q:string, limit?:number}} params
   */
  async searchEmployees({ scope, q, limit = 50 }) {
    const like = `%${q}%`;
    const res = await query(
      `select pk_employee_id, employee_code, full_name, email, position_title, status
       from hr_employee
       where tenant_id = $1 and (full_name ilike $2 or employee_code ilike $2 or email ilike $2)
       order by full_name
       limit $3`,
      [scope.tenantId, like, limit]
    );
    return res.rows;
  }

  /**
   * Get employee by id.
   * @param {{employeeId:string, scope:{tenantId:string}}} params
   */
  async getEmployeeById({ employeeId, scope }) {
    const res = await query(
      `select * from hr_employee where pk_employee_id = $1 and tenant_id = $2`,
      [Number(employeeId), scope.tenantId]
    );
    return res.rows[0] || null;
  }

  /**
   * Placeholder for fetching employee photo.
   * @param {{employeeId:string}} params
   */
  async getEmployeePhoto({ employeeId }) {
    return { employeeId, url: null };
  }

  /**
   * Attendance overview for employee.
   * @param {{employeeId:string, fromDate?:string, toDate?:string, scope:{tenantId:string}}} params
   */
  async getEmployeeAttendance({ employeeId, fromDate, toDate, scope }) {
    const values = [Number(employeeId), scope.tenantId];
    let idx = 3;
    const filters = ["a.fk_employee_id = $1", "a.tenant_id = $2"];
    if (fromDate) { filters.push(`a.attendance_date >= $${idx++}`); values.push(fromDate); }
    if (toDate) { filters.push(`a.attendance_date <= $${idx++}`); values.push(toDate); }
    const res = await query(
      `select * from attendance_record a where ${filters.join(" and ")} order by attendance_date desc`,
      values
    );
    return res.rows;
  }

  /**
   * Recent activity for employee (alerts and device scans).
   * @param {{employeeId:string, scope:{tenantId:string}}} params
   */
  async getEmployeeActivity({ employeeId, scope }) {
    const alerts = await query(
      `select * from system_alert where fk_employee_id = $1 and tenant_id = $2 order by created_at desc limit 50`,
      [Number(employeeId), scope.tenantId]
    );
    return { alerts: alerts.rows };
  }

  /**
   * Create new employee.
   * @param {{scope:{tenantId:string,customerId?:string,siteId?:string,unitId?:string}, data:any}} params
   */
  async createEmployee({ scope, data }) {
    const sql = `
      insert into hr_employee(
        tenant_id, customer_id, site_id, unit_id, fk_department_id, fk_shift_id,
        employee_code, full_name, email, position_title, location_label, status, join_date, phone_number
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      returning *`;
    const values = [
      scope.tenantId, scope.customerId || null, scope.siteId || null, scope.unitId || null,
      data.fk_department_id || null, data.fk_shift_id || null,
      data.employee_code, data.full_name, data.email, data.position_title,
      data.location_label || null, data.status || "active", data.join_date, data.phone_number || null
    ];
    const res = await query(sql, values);
    return res.rows[0];
  }

  /**
   * Update employee.
   * @param {{employeeId:string, patch:any, scope:{tenantId:string}}} params
   */
  async updateEmployee({ employeeId, patch, scope }) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(patch || {})) {
      fields.push(`${k} = $${idx++}`);
      values.push(v);
    }
    values.push(Number(employeeId));
    values.push(scope.tenantId);
    const res = await query(
      `update hr_employee set ${fields.join(", ")}, updated_at = now()
       where pk_employee_id = $${idx++} and tenant_id = $${idx}
       returning *`,
      values
    );
    return res.rows[0] || null;
  }

  /**
   * Delete employee.
   * @param {{employeeId:string, scope:{tenantId:string}}} params
   */
  async deleteEmployee({ employeeId, scope }) {
    await query(`delete from hr_employee where pk_employee_id = $1 and tenant_id = $2`, [Number(employeeId), scope.tenantId]);
    return { success: true };
  }

  /**
   * Activate employee.
   * @param {{employeeId:string, scope:{tenantId:string}}} params
   */
  async activateEmployee({ employeeId, scope }) {
    return this.updateEmployee({ employeeId, scope, patch: { status: "active" } });
  }

  /**
   * Deactivate employee.
   * @param {{employeeId:string, scope:{tenantId:string}}} params
   */
  async deactivateEmployee({ employeeId, scope }) {
    return this.updateEmployee({ employeeId, scope, patch: { status: "inactive" } });
  }

  /**
   * Assign device (placeholder mapping table).
   * @param {{employeeId:string, deviceId:string}} params
   */
  async assignDevice({ employeeId, deviceId }) {
    return { employeeId, deviceId, assigned: true };
  }

  /**
   * Bulk import basic employees.
   * @param {{rows:Array<any>, scope:{tenantId:string}}} params
   */
  async bulkImport({ rows, scope }) {
    let created = 0;
    for (const r of rows || []) {
      // eslint-disable-next-line no-await-in-loop
      await this.createEmployee({ scope, data: r });
      created += 1;
    }
    return { created };
  }
}

const employeeService = new EmployeeService();
export default employeeService;


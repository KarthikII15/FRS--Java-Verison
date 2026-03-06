import { z } from "zod";
import attendanceService from "../services/business/AttendanceService.js";

const scopeHeaders = (req) => ({
  tenantId: String(req.headers["x-tenant-id"] || req.auth?.scope?.tenantId || ""),
  customerId: req.headers["x-customer-id"] ? String(req.headers["x-customer-id"]) : undefined,
  siteId: req.headers["x-site-id"] ? String(req.headers["x-site-id"]) : undefined,
  unitId: req.headers["x-unit-id"] ? String(req.headers["x-unit-id"]) : undefined,
});

const markSchema = z.object({
  employeeId: z.string().min(1),
  timestamp: z.string().optional(),
  status: z.enum(["present", "late", "absent", "on-leave", "on-break"]).optional(),
});

const batchSchema = z.object({
  items: z.array(markSchema),
});

const rangeSchema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
});

const idSchema = z.object({ id: z.string().min(1) });

const AttendanceController = {
  async markAttendance(req, res) {
    const parsed = markSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const record = await attendanceService.markAttendance({ ...parsed.data, scope: scopeHeaders(req) });
    return res.status(201).json(record);
  },

  async batchMarkAttendance(req, res) {
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const out = await attendanceService.batchMarkAttendance({ ...parsed.data, scope: scopeHeaders(req) });
    return res.json(out);
  },

  async getTodayAttendance(req, res) {
    const data = await attendanceService.getTodayAttendance({ scope: scopeHeaders(req) });
    return res.json({ data });
  },

  async getEmployeeAttendance(req, res) {
    const qs = z.object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await attendanceService.getEmployeeAttendance({
      employeeId: String(req.params.employeeId),
      fromDate: qs.data.fromDate,
      toDate: qs.data.toDate,
      scope: scopeHeaders(req),
    });
    return res.json({ data });
    },

  async getAttendanceByDateRange(req, res) {
    const parsed = rangeSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "invalid range" });
    const data = await attendanceService.getAttendanceByDateRange({
      ...parsed.data,
      scope: scopeHeaders(req),
    });
    return res.json({ data });
  },

  async getCurrentlyPresent(req, res) {
    const data = await attendanceService.getCurrentlyPresent({ scope: scopeHeaders(req) });
    return res.json({ data });
  },

  async getAttendanceStats(req, res) {
    const qs = z.object({ forDate: z.string().optional() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const stats = await attendanceService.getAttendanceStats({ scope: scopeHeaders(req), forDate: qs.data.forDate });
    return res.json(stats);
  },

  async getDailyReport(req, res) {
    const qs = z.object({ date: z.string().optional() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const report = await attendanceService.generateDailyReport({ scope: scopeHeaders(req), date: qs.data.date });
    return res.json(report);
  },

  async getMonthlyReport(req, res) {
    const qs = z.object({ year: z.coerce.number(), month: z.coerce.number() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const report = await attendanceService.generateMonthlyReport({ scope: scopeHeaders(req), year: qs.data.year, month: qs.data.month });
    return res.json(report);
  },

  async exportAttendance(req, res) {
    const data = await attendanceService.getAttendanceByDateRange({
      fromDate: String(req.query.fromDate),
      toDate: String(req.query.toDate),
      scope: scopeHeaders(req),
      limit: 10000,
    });
    const csv = attendanceService.exportAttendance({ rows: data });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance.csv");
    return res.send(csv);
  },

  async correctAttendance(req, res) {
    const parsed = z.object({
      check_in: z.string().optional(),
      check_out: z.string().optional(),
      status: z.string().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const row = await attendanceService.correctAttendance({ attendanceId: String(req.params.id), patch: parsed.data });
    return res.json(row);
  },

  async deleteAttendance(req, res) {
    const out = await attendanceService.deleteAttendance({ attendanceId: String(req.params.id) });
    return res.json(out);
  },
};

export default AttendanceController;


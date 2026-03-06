import { z } from "zod";
import reportService from "../services/business/ReportService.js";

const scopeHeaders = (req) => ({
  tenantId: String(req.headers["x-tenant-id"] || req.auth?.scope?.tenantId || ""),
  customerId: req.headers["x-customer-id"] ? String(req.headers["x-customer-id"]) : undefined,
  siteId: req.headers["x-site-id"] ? String(req.headers["x-site-id"]) : undefined,
  unitId: req.headers["x-unit-id"] ? String(req.headers["x-unit-id"]) : undefined,
});

const ReportController = {
  async generateDailyAttendanceReport(req, res) {
    const qs = z.object({ date: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateDailyAttendanceReport({ scope: scopeHeaders(req), date: qs.data.date });
    return res.json(data);
  },
  async generateMonthlyAttendanceReport(req, res) {
    const qs = z.object({ year: z.coerce.number(), month: z.coerce.number() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateMonthlyAttendanceReport({ scope: scopeHeaders(req), year: qs.data.year, month: qs.data.month });
    return res.json(data);
  },
  async generateYearlyAttendanceReport(req, res) {
    const qs = z.object({ year: z.coerce.number() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateYearlyAttendanceReport({ scope: scopeHeaders(req), year: qs.data.year });
    return res.json(data);
  },
  async generateCustomAttendanceReport(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateCustomAttendanceReport({ scope: scopeHeaders(req), ...qs.data });
    return res.json(data);
  },
  async getAttendanceSummary(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.getAttendanceSummary({ scope: scopeHeaders(req), ...qs.data });
    return res.json({ data });
  },
  async generateEmployeeDirectory(req, res) {
    const data = await reportService.generateEmployeeDirectory({ scope: scopeHeaders(req) });
    return res.json(data);
  },
  async generateTurnoverReport(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateTurnoverReport({ scope: scopeHeaders(req), ...qs.data });
    return res.json(data);
  },
  async generateTenureReport(req, res) {
    const data = await reportService.generateTenureReport({ scope: scopeHeaders(req) });
    return res.json(data);
  },
  async generateDepartmentReport(req, res) {
    const data = await reportService.generateDepartmentReport({ scope: scopeHeaders(req) });
    return res.json(data);
  },
  async generateDeviceHealthReport(req, res) {
    const data = await reportService.generateDeviceHealthReport({ scope: scopeHeaders(req) });
    return res.json(data);
  },
  async generateDeviceActivityReport(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateDeviceActivityReport({ scope: scopeHeaders(req), ...qs.data });
    return res.json(data);
  },
  async generateDeviceErrorReport(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateDeviceErrorReport({ scope: scopeHeaders(req), ...qs.data });
    return res.json(data);
  },
  async generatePeakHoursReport(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generatePeakHoursReport({ scope: scopeHeaders(req), ...qs.data });
    return res.json(data);
  },
  async generateOccupancyReport(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateOccupancyReport({ scope: scopeHeaders(req), ...qs.data });
    return res.json(data);
  },
  async generateTrendsReport(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateTrendsReport({ scope: scopeHeaders(req), ...qs.data });
    return res.json(data);
  },
  async generateComplianceReport(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await reportService.generateComplianceReport({ scope: scopeHeaders(req), ...qs.data });
    return res.json(data);
  },
  async exportToCsv(req, res) {
    const rows = JSON.parse(String(req.query.rows || "[]"));
    const buf = reportService.exportToCsv({ rows });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=report.csv");
    return res.send(buf);
  },
  async exportToPdf(req, res) {
    const rows = JSON.parse(String(req.query.rows || "[]"));
    const buf = reportService.exportToPdf({ rows });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    return res.send(buf);
  },
  async exportToExcel(req, res) {
    const rows = JSON.parse(String(req.query.rows || "[]"));
    const buf = reportService.exportToExcel({ rows });
    res.setHeader("Content-Type", "application/vnd.ms-excel");
    res.setHeader("Content-Disposition", "attachment; filename=report.xls");
    return res.send(buf);
  },
  async exportToJson(req, res) {
    const rows = JSON.parse(String(req.query.rows || "[]"));
    const text = reportService.exportToJson({ rows });
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  },
  async getScheduledReports(_req, res) {
    return res.json({ items: [] });
  },
  async scheduleReport(req, res) {
    const parsed = z.object({ id: z.string(), spec: z.any() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const item = reportService.scheduleReport(parsed.data);
    return res.status(201).json(item);
  },
  async updateScheduledReport(req, res) {
    const parsed = z.object({ spec: z.any() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const item = reportService.updateScheduledReport({ id: String(req.params.scheduleId), spec: parsed.data.spec });
    return res.json(item || { message: "not found" });
  },
  async deleteScheduledReport(req, res) {
    const out = reportService.deleteScheduledReport({ id: String(req.params.scheduleId) });
    return res.json(out);
  },
  async runScheduledReport(req, res) {
    const item = reportService.runScheduledReport({ id: String(req.params.scheduleId) });
    return res.json(item || { message: "not found" });
  },
  async getReportTemplates(_req, res) {
    const items = reportService.getReportTemplates();
    return res.json({ items });
  },
  async getReportTemplate(req, res) {
    const item = reportService.getReportTemplate({ id: String(req.params.templateId) });
    return res.json(item || { message: "not found" });
  },
  async createReportTemplate(req, res) {
    const parsed = z.object({ id: z.string(), template: z.any() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const item = reportService.createReportTemplate({ id: parsed.data.id, template: parsed.data.template });
    return res.status(201).json(item);
  },
  async updateReportTemplate(req, res) {
    const parsed = z.object({ template: z.any() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const item = reportService.updateReportTemplate({ id: String(req.params.templateId), template: parsed.data.template });
    return res.json(item || { message: "not found" });
  },
  async deleteReportTemplate(req, res) {
    const out = reportService.deleteReportTemplate({ id: String(req.params.templateId) });
    return res.json(out);
  },
};

export default ReportController;


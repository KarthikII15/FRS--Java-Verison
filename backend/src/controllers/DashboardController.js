import { z } from "zod";
import dashboardService from "../services/business/DashboardService.js";

const scopeHeaders = (req) => ({
  tenantId: String(req.headers["x-tenant-id"] || req.auth?.scope?.tenantId || ""),
  customerId: req.headers["x-customer-id"] ? String(req.headers["x-customer-id"]) : undefined,
  siteId: req.headers["x-site-id"] ? String(req.headers["x-site-id"]) : undefined,
  unitId: req.headers["x-unit-id"] ? String(req.headers["x-unit-id"]) : undefined,
});

const DashboardController = {
  async getAdminSummary(req, res) {
    const data = await dashboardService.getAdminSummary({ scope: scopeHeaders(req) });
    return res.json(data);
  },
  async getSystemHealth(_req, res) {
    const data = await dashboardService.getSystemHealth();
    return res.json(data);
  },
  async getDeviceStatus(req, res) {
    const data = await dashboardService.getDeviceStatus({ scope: scopeHeaders(req) });
    return res.json(data);
  },
  async getActiveAlerts(req, res) {
    const data = await dashboardService.getActiveAlerts({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getHrSummary(req, res) {
    const data = await dashboardService.getHrSummary({ scope: scopeHeaders(req) });
    return res.json(data);
  },
  async getCurrentOccupancy(req, res) {
    const data = await dashboardService.getCurrentOccupancy({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getOccupancyHistory(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await dashboardService.getOccupancyHistory({ scope: scopeHeaders(req), ...qs.data });
    return res.json({ data });
  },
  async getTodayAttendance(req, res) {
    const data = await dashboardService.getTodayAttendance({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getAttendanceTrends(req, res) {
    const qs = z.object({ days: z.coerce.number().optional() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await dashboardService.getAttendanceTrends({ scope: scopeHeaders(req), days: qs.data.days });
    return res.json({ data });
  },
  async getDepartmentSummary(req, res) {
    const data = await dashboardService.getDepartmentSummary({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getLateArrivals(req, res) {
    const data = await dashboardService.getLateArrivals({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getEarlyDepartures(req, res) {
    const data = await dashboardService.getEarlyDepartures({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getAbsentees(req, res) {
    const data = await dashboardService.getAbsentees({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getLivePresence(req, res) {
    const data = await dashboardService.getLivePresence({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getFloorOccupancy(req, res) {
    const data = await dashboardService.getFloorOccupancy({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getAreaCounts(req, res) {
    const data = await dashboardService.getAreaCounts({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getHeatmapData(req, res) {
    const data = await dashboardService.getHeatmapData({ scope: scopeHeaders(req) });
    return res.json({ data });
  },
  async getPeakHours(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await dashboardService.getPeakHours({ scope: scopeHeaders(req), ...qs.data });
    return res.json({ data });
  },
  async getAverageDuration(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await dashboardService.getAverageDuration({ scope: scopeHeaders(req), ...qs.data });
    return res.json(data);
  },
  async getEmployeeRanking(req, res) {
    const qs = z.object({ fromDate: z.string(), toDate: z.string(), limit: z.coerce.number().optional() }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await dashboardService.getEmployeeRanking({ scope: scopeHeaders(req), ...qs.data });
    return res.json({ data });
  },
};

export default DashboardController;


import express from "express";
import { requireAuth, requirePermission } from "../middleware/authz.js";
import ReportController from "../controllers/ReportController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/attendance/daily", requirePermission("analytics.read"), ReportController.generateDailyAttendanceReport);
router.get("/attendance/monthly", requirePermission("analytics.read"), ReportController.generateMonthlyAttendanceReport);
router.get("/attendance/yearly", requirePermission("analytics.read"), ReportController.generateYearlyAttendanceReport);
router.get("/attendance/custom", requirePermission("analytics.read"), ReportController.generateCustomAttendanceReport);
router.get("/attendance/summary", requirePermission("analytics.read"), ReportController.getAttendanceSummary);

router.get("/employees/directory", requirePermission("analytics.read"), ReportController.generateEmployeeDirectory);
router.get("/employees/turnover", requirePermission("analytics.read"), ReportController.generateTurnoverReport);
router.get("/employees/tenure", requirePermission("analytics.read"), ReportController.generateTenureReport);
router.get("/employees/department", requirePermission("analytics.read"), ReportController.generateDepartmentReport);

router.get("/devices/health", requirePermission("analytics.read"), ReportController.generateDeviceHealthReport);
router.get("/devices/activity", requirePermission("analytics.read"), ReportController.generateDeviceActivityReport);
router.get("/devices/errors", requirePermission("analytics.read"), ReportController.generateDeviceErrorReport);

router.get("/analytics/peak-hours", requirePermission("analytics.read"), ReportController.generatePeakHoursReport);
router.get("/analytics/occupancy", requirePermission("analytics.read"), ReportController.generateOccupancyReport);
router.get("/analytics/trends", requirePermission("analytics.read"), ReportController.generateTrendsReport);
router.get("/analytics/compliance", requirePermission("analytics.read"), ReportController.generateComplianceReport);

router.get("/export/:reportId/csv", requirePermission("analytics.read"), ReportController.exportToCsv);
router.get("/export/:reportId/pdf", requirePermission("analytics.read"), ReportController.exportToPdf);
router.get("/export/:reportId/excel", requirePermission("analytics.read"), ReportController.exportToExcel);
router.get("/export/:reportId/json", requirePermission("analytics.read"), ReportController.exportToJson);

router.get("/scheduled", requirePermission("analytics.read"), ReportController.getScheduledReports);
router.post("/scheduled", requirePermission("analytics.read"), ReportController.scheduleReport);
router.put("/scheduled/:scheduleId", requirePermission("analytics.read"), ReportController.updateScheduledReport);
router.delete("/scheduled/:scheduleId", requirePermission("analytics.read"), ReportController.deleteScheduledReport);
router.post("/scheduled/:scheduleId/run", requirePermission("analytics.read"), ReportController.runScheduledReport);

router.get("/templates", requirePermission("analytics.read"), ReportController.getReportTemplates);
router.get("/templates/:templateId", requirePermission("analytics.read"), ReportController.getReportTemplate);
router.post("/templates", requirePermission("analytics.read"), ReportController.createReportTemplate);
router.put("/templates/:templateId", requirePermission("analytics.read"), ReportController.updateReportTemplate);
router.delete("/templates/:templateId", requirePermission("analytics.read"), ReportController.deleteReportTemplate);

export { router as reportRoutes };


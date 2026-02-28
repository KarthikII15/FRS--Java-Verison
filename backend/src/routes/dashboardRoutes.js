import express from "express";
import { requireAuth, requirePermission } from "../middleware/authz.js";
import DashboardController from "../controllers/DashboardController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/admin/summary", requirePermission("analytics.read"), DashboardController.getAdminSummary);
router.get("/admin/system-health", requirePermission("analytics.read"), DashboardController.getSystemHealth);
router.get("/admin/device-status", requirePermission("analytics.read"), DashboardController.getDeviceStatus);
router.get("/admin/alerts", requirePermission("analytics.read"), DashboardController.getActiveAlerts);

router.get("/hr/summary", requirePermission("analytics.read"), DashboardController.getHrSummary);
router.get("/hr/occupancy", requirePermission("analytics.read"), DashboardController.getCurrentOccupancy);
router.get("/hr/occupancy/history", requirePermission("analytics.read"), DashboardController.getOccupancyHistory);
router.get("/hr/attendance-today", requirePermission("analytics.read"), DashboardController.getTodayAttendance);
router.get("/hr/attendance-trends", requirePermission("analytics.read"), DashboardController.getAttendanceTrends);
router.get("/hr/department-summary", requirePermission("analytics.read"), DashboardController.getDepartmentSummary);
router.get("/hr/late-arrivals", requirePermission("analytics.read"), DashboardController.getLateArrivals);
router.get("/hr/early-departures", requirePermission("analytics.read"), DashboardController.getEarlyDepartures);
router.get("/hr/absentees", requirePermission("analytics.read"), DashboardController.getAbsentees);

router.get("/live/presence", requirePermission("analytics.read"), DashboardController.getLivePresence);
router.get("/live/floor/:floorId", requirePermission("analytics.read"), DashboardController.getFloorOccupancy);
router.get("/live/areas", requirePermission("analytics.read"), DashboardController.getAreaCounts);
router.get("/live/heatmap", requirePermission("analytics.read"), DashboardController.getHeatmapData);

router.get("/analytics/peak-hours", requirePermission("analytics.read"), DashboardController.getPeakHours);
router.get("/analytics/average-duration", requirePermission("analytics.read"), DashboardController.getAverageDuration);
router.get("/analytics/employee-ranking", requirePermission("analytics.read"), DashboardController.getEmployeeRanking);

export { router as dashboardRoutes };


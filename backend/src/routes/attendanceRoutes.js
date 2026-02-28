import express from "express";
import { requireAuth, requirePermission } from "../middleware/authz.js";
import AttendanceController from "../controllers/AttendanceController.js";

const router = express.Router();
router.use(requireAuth);

router.post("/mark", requirePermission("attendance.write"), AttendanceController.markAttendance);
router.post("/batch", requirePermission("attendance.write"), AttendanceController.batchMarkAttendance);
router.get("/today", requirePermission("attendance.read"), AttendanceController.getTodayAttendance);
router.get("/employee/:employeeId", requirePermission("attendance.read"), AttendanceController.getEmployeeAttendance);
router.get("/date-range", requirePermission("attendance.read"), AttendanceController.getAttendanceByDateRange);
router.get("/current", requirePermission("attendance.read"), AttendanceController.getCurrentlyPresent);
router.get("/stats", requirePermission("analytics.read"), AttendanceController.getAttendanceStats);
router.get("/reports/daily", requirePermission("analytics.read"), AttendanceController.getDailyReport);
router.get("/reports/monthly", requirePermission("analytics.read"), AttendanceController.getMonthlyReport);
router.get("/reports/export", requirePermission("analytics.read"), AttendanceController.exportAttendance);
router.put("/:id/correct", requirePermission("attendance.write"), AttendanceController.correctAttendance);
router.delete("/:id", requirePermission("attendance.write"), AttendanceController.deleteAttendance);

export { router as attendanceRoutes };


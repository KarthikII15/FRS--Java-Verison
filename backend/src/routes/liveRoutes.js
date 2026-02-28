import express from "express";
import { requireAuth, requirePermission } from "../middleware/authz.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateScopeAccess } from "../middleware/scopeExtractor.js";
import {
  getDashboardMetrics,
  listAlerts,
  listAttendance,
  listDevices,
  listEmployees,
  listShifts,
} from "../repositories/liveRepository.js";
import {
  listEmployeesSchema,
  listAttendanceSchema,
  listDevicesSchema,
  listAlertsSchema,
  getMetricsSchema,
  validateQuery,
} from "../validators/schemas.js";

const router = express.Router();

// Apply auth first, then validate scope access against user's memberships
router.use(requireAuth);
router.use(validateScopeAccess);

router.get(
  "/employees",
  requirePermission("users.read"),
  validateQuery(listEmployeesSchema),
  asyncHandler(async (req, res) => {
    const { limit, department, status } = req.validatedQuery;
    // Use scope from headers (req.scope) or fall back to auth token scope
    const scope = req.scope || req.auth.scope;
    const employees = await listEmployees(scope, { limit, department, status });
    return res.json({ data: employees });
  })
);

router.get("/shifts", requirePermission("attendance.read"), asyncHandler(async (req, res) => {
  const scope = req.scope || req.auth.scope;
  const shifts = await listShifts(scope);
  return res.json({ data: shifts });
}));

router.get(
  "/attendance",
  requirePermission("attendance.read"),
  validateQuery(listAttendanceSchema),
  asyncHandler(async (req, res) => {
    const { fromDate, toDate, limit } = req.validatedQuery;
    const scope = req.scope || req.auth.scope;
    const records = await listAttendance(scope, { fromDate, toDate, limit });
    return res.json({ data: records });
  })
);

router.get(
  "/devices",
  requirePermission("devices.read"),
  validateQuery(listDevicesSchema),
  asyncHandler(async (req, res) => {
    const { limit } = req.validatedQuery;
    const scope = req.scope || req.auth.scope;
    const devices = await listDevices(scope, { limit });
    return res.json({ data: devices });
  })
);

router.get(
  "/alerts",
  requirePermission("attendance.read"),
  validateQuery(listAlertsSchema),
  asyncHandler(async (req, res) => {
    const { unreadOnly, limit } = req.validatedQuery;
    const scope = req.scope || req.auth.scope;
    const alerts = await listAlerts(scope, { unreadOnly, limit });
    return res.json({ data: alerts });
  })
);

router.get(
  "/metrics",
  requirePermission("analytics.read"),
  validateQuery(getMetricsSchema),
  asyncHandler(async (req, res) => {
    const { forDate } = req.validatedQuery;
    const scope = req.scope || req.auth.scope;
    const metrics = await getDashboardMetrics(scope, { forDate });
    return res.json(metrics);
  })
);

export { router as liveRoutes };

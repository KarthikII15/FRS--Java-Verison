import express from "express";
import { requireAuth, requirePermission } from "../middleware/authz.js";
import EmployeeController from "../controllers/EmployeeController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", requirePermission("users.read"), EmployeeController.getAllEmployees);
router.get("/search", requirePermission("users.read"), EmployeeController.searchEmployees);
router.get("/:id", requirePermission("users.read"), EmployeeController.getEmployeeById);
router.get("/:id/photo", requirePermission("users.read"), EmployeeController.getEmployeePhoto);
router.get("/:id/attendance", requirePermission("attendance.read"), EmployeeController.getEmployeeAttendance);
router.get("/:id/activity", requirePermission("users.read"), EmployeeController.getEmployeeActivity);
router.post("/", requirePermission("users.write"), EmployeeController.createEmployee);
router.put("/:id", requirePermission("users.write"), EmployeeController.updateEmployee);
router.delete("/:id", requirePermission("users.write"), EmployeeController.deleteEmployee);
router.post("/:id/activate", requirePermission("users.write"), EmployeeController.activateEmployee);
router.post("/:id/deactivate", requirePermission("users.write"), EmployeeController.deactivateEmployee);
router.post("/:id/assign-device", requirePermission("devices.write"), EmployeeController.assignDevice);
router.post("/bulk-import", requirePermission("users.write"), EmployeeController.bulkImport);

export { router as employeeRoutes };


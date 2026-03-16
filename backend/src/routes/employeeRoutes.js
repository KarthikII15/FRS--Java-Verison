import express from "express";
import { requireAuth, requirePermission } from "../middleware/authz.js";
import EmployeeController from "../controllers/EmployeeController.js";
import { uploadSingle } from "../middleware/upload.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import edgeAIClient from "../core/clients/EdgeAIClient.js";
import faceDB from "../core/db/FaceDB.js";
import { pool } from "../db/pool.js";

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

// ── POST /api/employees/:employeeId/enroll-face
// Accepts a photo upload, runs it through the EdgeAI sidecar to get the
// 512-d ArcFace embedding, then stores it in pgvector + SQLite FaceDB.
router.post(
  "/:employeeId/enroll-face",
  requirePermission("users.write"),
  uploadSingle("photo"),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    if (!req.file?.buffer) {
      return res.status(400).json({
        message: "Photo file is required. Send as multipart/form-data with field name 'photo'.",
      });
    }

    // Step 1 — Run face detection + embedding via sidecar
    let aiResult;
    try {
      aiResult = await edgeAIClient.recognizeImageBuffer(req.file.buffer, {
        source: "enrollment",
      });
    } catch (e) {
      return res.status(503).json({
        message: "EdgeAI sidecar is unavailable: " + e.message +
          ". Ensure the Python sidecar is running on port 5000.",
      });
    }

    if (!aiResult?.embedding?.length) {
      return res.status(422).json({
        message: "No face detected in photo. Use a clear, well-lit, front-facing photo.",
      });
    }

    if ((aiResult.faceCount || 1) > 1) {
      return res.status(422).json({
        message: `${aiResult.faceCount} faces detected. Upload a photo containing only the employee.`,
      });
    }

    if (aiResult.aligned === false) {
      // Warn but still enroll — some cameras capture at angles
      console.warn(`[EnrollFace] Employee ${employeeId}: face alignment failed. Similarity may be lower.`);
    }

    // Step 2 — Store in pgvector (primary store, fast lookup)
    const vectorStr = `[${aiResult.embedding.join(",")}]`;
    await pool.query(
      `INSERT INTO employee_face_embeddings
         (employee_id, embedding, quality_score, is_primary, enrolled_by)
       VALUES ($1, $2::vector, $3, TRUE, $4)`,
      [
        employeeId,
        vectorStr,
        aiResult.confidence || null,
        req.auth?.user?.id  || null,
      ]
    );

    // Step 3 — Also sync to SQLite FaceDB (offline fallback)
    await faceDB.addFace(aiResult.embedding, {
      id:         `emp_${employeeId}_${Date.now()}`,
      employeeId: String(employeeId),
      enrolledAt: new Date().toISOString(),
    });

    return res.status(201).json({
      success:    true,
      employeeId,
      confidence: aiResult.confidence,
      aligned:    aiResult.aligned,
      faceCount:  aiResult.faceCount || 1,
      message:    "Face enrolled successfully. Employee will now be recognised by cameras.",
    });
  })
);

// ── DELETE /api/employees/:employeeId/enroll-face
// Remove all face embeddings so a fresh enroll can be done.
router.delete(
  "/:employeeId/enroll-face",
  requirePermission("users.write"),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const { rowCount } = await pool.query(
      "DELETE FROM employee_face_embeddings WHERE employee_id = $1",
      [employeeId]
    );
    return res.json({
      success: true,
      removed: rowCount,
      message: `Removed ${rowCount} face embedding(s) for employee ${employeeId}. Re-enroll to restore recognition.`,
    });
  })
);

// ── GET /api/employees/:employeeId/enroll-face
// Check enrollment status for an employee.
router.get(
  "/:employeeId/enroll-face",
  requirePermission("users.read"),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, model_version, quality_score, is_primary, enrolled_at
       FROM employee_face_embeddings
       WHERE employee_id = $1
       ORDER BY enrolled_at DESC`,
      [employeeId]
    );
    return res.json({
      employeeId,
      enrolled:       rows.length > 0,
      embeddingCount: rows.length,
      embeddings:     rows.map(r => ({
        id:           r.id,
        modelVersion: r.model_version,
        qualityScore: r.quality_score,
        isPrimary:    r.is_primary,
        enrolledAt:   r.enrolled_at,
      })),
    });
  })
);

export { router as employeeRoutes };


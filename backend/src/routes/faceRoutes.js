import express from "express";
import { requireAuth, requirePermission } from "../middleware/authz.js";
import FaceController from "../controllers/FaceController.js";
import { uploadSingle } from "../middleware/upload.js";

const router = express.Router();
router.use(requireAuth);

router.post("/register", requirePermission("analytics.read"), FaceController.registerFace);
router.post("/register/batch", requirePermission("analytics.read"), FaceController.batchRegisterFaces);
router.get("/employee/:employeeId", requirePermission("analytics.read"), FaceController.getEmployeeFaces);
router.get("/:id", requirePermission("analytics.read"), FaceController.getFaceDetails);
router.put("/:id", requirePermission("analytics.read"), FaceController.updateFace);
router.delete("/:id", requirePermission("analytics.read"), FaceController.deleteFace);

router.post("/verify", requirePermission("analytics.read"), FaceController.verifyFace);
router.post("/verify/multiple", requirePermission("analytics.read"), FaceController.verifyMultipleFaces);
router.post("/search", requirePermission("analytics.read"), FaceController.searchFaces);
router.post("/search/embedding", requirePermission("analytics.read"), FaceController.searchByEmbedding);
router.post("/recognize", requirePermission("attendance.write"), uploadSingle("image"), FaceController.recognizeAndMark);
router.post("/snapshot", requirePermission("analytics.read"), uploadSingle("snapshot"), FaceController.uploadSnapshot);

router.get("/groups", requirePermission("analytics.read"), FaceController.getFaceGroups);
router.post("/groups", requirePermission("analytics.read"), FaceController.createFaceGroup);
router.put("/groups/:groupId", requirePermission("analytics.read"), FaceController.updateFaceGroup);
router.delete("/groups/:groupId", requirePermission("analytics.read"), FaceController.deleteFaceGroup);
router.post("/groups/:groupId/add-faces", requirePermission("analytics.read"), FaceController.addFacesToGroup);
router.post("/groups/:groupId/remove-faces", requirePermission("analytics.read"), FaceController.removeFacesFromGroup);

router.get("/stats", requirePermission("analytics.read"), FaceController.getFaceStats);
router.get("/stats/matches", requirePermission("analytics.read"), FaceController.getMatchStats);
router.get("/visitors", requirePermission("analytics.read"), FaceController.getVisitors);
router.get("/visitors/:visitorId", requirePermission("analytics.read"), FaceController.getVisitorDetails);
router.post("/visitors/blacklist", requirePermission("analytics.read"), FaceController.blacklistVisitor);

export { router as faceRoutes };


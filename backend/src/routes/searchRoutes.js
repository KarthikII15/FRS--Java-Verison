import express from "express";
import { requireAuth, requirePermission } from "../middleware/authz.js";
import SearchController from "../controllers/SearchController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/events", requirePermission("analytics.read"), SearchController.searchEvents);
router.get("/events/advanced", requirePermission("analytics.read"), SearchController.advancedEventSearch);
router.get("/events/:id", requirePermission("analytics.read"), SearchController.getEventById);

router.post("/face", requirePermission("analytics.read"), SearchController.searchByFace);
router.post("/face/batch", requirePermission("analytics.read"), SearchController.batchFaceSearch);
router.post("/appearance", requirePermission("analytics.read"), SearchController.searchByAppearance);
router.post("/appearance/attributes", requirePermission("analytics.read"), SearchController.searchByAttributes);
router.post("/vehicle", requirePermission("analytics.read"), SearchController.searchByVehicle);
router.post("/vehicle/plate", requirePermission("analytics.read"), SearchController.searchByLicensePlate);

router.get("/profiles", requirePermission("analytics.read"), SearchController.getSearchProfiles);
router.get("/profiles/:profileId", requirePermission("analytics.read"), SearchController.getSearchProfile);
router.post("/profiles", requirePermission("analytics.read"), SearchController.createSearchProfile);
router.put("/profiles/:profileId", requirePermission("analytics.read"), SearchController.updateSearchProfile);
router.delete("/profiles/:profileId", requirePermission("analytics.read"), SearchController.deleteSearchProfile);

router.get("/history", requirePermission("analytics.read"), SearchController.getSearchHistory);
router.get("/history/:searchId/results", requirePermission("analytics.read"), SearchController.getSearchResults);
router.post("/history/:searchId/save", requirePermission("analytics.read"), SearchController.saveSearchResult);
router.delete("/history/:searchId", requirePermission("analytics.read"), SearchController.deleteSearchHistory);

export { router as searchRoutes };


import express from "express";
import { requireAuth } from "../middleware/authz.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get(
  "/bootstrap",
  requireAuth,
  asyncHandler(async (req, res) => {
    const catalog = req.auth?.catalog || {
      tenants: [],
      customers: [],
      sites: [],
      units: [],
    };

    return res.json({
      user: req.auth.user,
      memberships: req.auth.allMemberships || req.auth.memberships || [],
      activeScope: req.auth.scope || null,
      ...catalog,
    });
  })
);

export { router as meRoutes };

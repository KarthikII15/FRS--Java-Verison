import express from "express";
import { checkDbConnection } from "../db/pool.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/db", asyncHandler(async (_req, res) => {
  try {
    const now = await checkDbConnection();
    res.json({ status: "ok", db: "connected", now });
  } catch (error) {
    res.status(500).json({
      status: "error",
      db: "disconnected",
      message: error instanceof Error ? error.message : "unknown error",
    });
  }
}));

export { router as healthRoutes };

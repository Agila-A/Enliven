// routes/analyticsRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getAnalytics, generateReport } from "../controllers/analyticsController.js";

const router = express.Router();

// GET  /api/analytics         — full analytics data for the current user
router.get("/", requireAuth, getAnalytics);

// POST /api/analytics/report  — generate AI report from analytics data
router.post("/report", requireAuth, generateReport);

export default router;
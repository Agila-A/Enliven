// routes/dashboardRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getDashboardData } from "../controllers/dashboardController.js";

const router = express.Router();

// GET /api/dashboard → Load full dashboard data
router.get("/", requireAuth, getDashboardData);

export default router;

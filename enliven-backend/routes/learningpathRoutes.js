// routes/learningPathRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getLearningPathOverview } from "../controllers/learningPathController.js";

const router = express.Router();
router.get("/overview", requireAuth, getLearningPathOverview);
export default router;

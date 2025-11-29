import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { generateRoadmap, getUserRoadmap } from "../controllers/roadmapController.js";

const router = express.Router();

router.post("/generate", requireAuth, generateRoadmap);
router.get("/my-roadmap", requireAuth, getUserRoadmap);

export default router;

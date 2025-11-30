import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getCourseContent, getMergedCourseForUser } from "../controllers/courseController.js";

const router = express.Router();

// raw file (no auth needed if you want)
router.get("/:domain/:level", getCourseContent);

// merged with the user’s saved roadmap (auth)
router.get("/:domain/:level/merged", requireAuth, getMergedCourseForUser);

export default router;

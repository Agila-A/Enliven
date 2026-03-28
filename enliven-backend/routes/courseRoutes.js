import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getCourseContent,
  getMergedCourseForUser,
  getVideoCounts,
} from "../controllers/courseController.js";

const router = express.Router();

// Raw file content
router.get("/:domain/:level", getCourseContent);

// Merged with user's roadmap (auth required)
router.get("/:domain/:level/merged", requireAuth, getMergedCourseForUser);

// Real video count per topic across all modules (auth required)
// Used by Dashboard + LearningPath for accurate progress %
router.get("/:domain/:level/video-counts", requireAuth, getVideoCounts);

export default router;
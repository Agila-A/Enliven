// routes/progressRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  saveProgress,
  getProgressForCourse,
  saveAssessmentProgress, completeModule
} from "../controllers/progressController.js";


const router = express.Router();

router.post("/save", requireAuth, saveProgress);
router.get("/:courseId", requireAuth, getProgressForCourse);

// ⭐ NEW — assessment (module test + final exam)
router.post("/assessment", requireAuth, saveAssessmentProgress);
router.post("/complete-module", requireAuth, completeModule);

export default router;

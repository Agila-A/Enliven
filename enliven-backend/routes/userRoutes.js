// routes/userRoutes.js
import express from "express";
import {
  selectDomain,
  initialAssessment,
  getAssessmentQuestions,
  getEnrollments,
} from "../controllers/userController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Assessment question routes
router.get("/assessment-questions", requireAuth, getAssessmentQuestions);
router.post("/select-domain",        requireAuth, selectDomain);
router.post("/initial-assessment",   requireAuth, initialAssessment);

// Returns the user's enrolled courses list (used by Sidebar, etc.)
router.get("/enrollments",           requireAuth, getEnrollments);

export default router;

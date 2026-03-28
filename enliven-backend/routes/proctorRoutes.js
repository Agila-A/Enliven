// routes/proctorRoutes.js
import express from "express";
import {
  getModuleQuestions,
  getFinalQuestions,
  saveAttempt,
  getUserAttempts,
  getModuleAttempt,
} from "../controllers/proctorController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Generate questions for a specific module test (10 Qs)
router.get("/questions/:moduleId", requireAuth, getModuleQuestions);

// Generate questions for the final exam (30 Qs)
router.get("/final-questions", requireAuth, getFinalQuestions);

// Save a completed attempt (answers + proctoring violations)
router.post("/attempt", requireAuth, saveAttempt);

// Get all past attempts for current user (optional ?courseId= filter)
router.get("/attempts", requireAuth, getUserAttempts);

// Get latest attempt for a specific module (used to check if passed)
router.get("/attempt/:moduleId", requireAuth, getModuleAttempt);

export default router;
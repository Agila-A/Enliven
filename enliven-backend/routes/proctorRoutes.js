// routes/proctorRoutes.js
import express from "express";
import {
  getModuleQuestions,
  getFinalQuestions,
  saveAttempt,
  getUserAttempts,
} from "../controllers/proctorController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get questions for a module test (10 questions)
router.get("/questions/:moduleId", requireAuth, getModuleQuestions);

// Get questions for the final exam (30 questions)
router.get("/final-questions", requireAuth, getFinalQuestions);

// FIX: Save a completed attempt with answers + violations (was missing)
router.post("/attempt", requireAuth, saveAttempt);

// Get all past attempts for a user (optional courseId filter via query param)
router.get("/attempts", requireAuth, getUserAttempts);

export default router;
// enliven-backend/routes/proctorRoutes.js
import express from "express";
import {
  getModuleQuestions,
  getFinalQuestions
} from "../controllers/proctorController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Module-wise questions (10)
router.get("/questions/:moduleId", requireAuth, getModuleQuestions);

// Final exam questions (30)
router.get("/final-questions", requireAuth, getFinalQuestions);

export default router;

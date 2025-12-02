import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getProfile,
  updateProfile,
  getCourseProgress
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/me", requireAuth, getProfile);
router.put("/update", requireAuth, updateProfile);
router.get("/progress", requireAuth, getCourseProgress);

export default router;

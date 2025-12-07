import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

import {
  getProfile,
  updateProfile,
} from "../controllers/profileController.js";

import {
  addBadge,
  getBadges
} from "../controllers/badgeController.js";

const router = express.Router();

// =========================
// PROFILE ROUTES
// =========================
router.get("/me", requireAuth, getProfile);
router.put("/update", requireAuth, updateProfile);

// =========================
// BADGE ROUTES
// =========================
router.post("/add-badge", requireAuth, addBadge);
router.get("/badges", requireAuth, getBadges);

export default router;

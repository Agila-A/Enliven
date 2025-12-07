import express from "express";
import {
  selectDomain,
  initialAssessment,
  getAssessmentQuestions
} from "../controllers/userController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✔ Assessment question routes
router.get("/assessment-questions", requireAuth, getAssessmentQuestions);

router.post("/select-domain", requireAuth, selectDomain);

router.post("/initial-assessment", requireAuth, initialAssessment);

// ❌ REMOVE badge route completely
// router.post("/award-badge", requireAuth, awardBadge);

export default router;

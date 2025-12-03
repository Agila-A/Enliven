import express from "express";
import {
  selectDomain,
  initialAssessment,
  getAssessmentQuestions
} from "../controllers/userController.js";

import { awardBadge } from "../controllers/badgeController.js";
import { requireAuth } from "../middleware/authMiddleware.js";


const router = express.Router();


// ✔ Now correctly mapped to controller
router.get("/assessment-questions", requireAuth, getAssessmentQuestions);


router.post("/select-domain", requireAuth, selectDomain);


router.post("/initial-assessment", requireAuth, initialAssessment);

router.post("/award-badge", requireAuth, awardBadge);

export default router;
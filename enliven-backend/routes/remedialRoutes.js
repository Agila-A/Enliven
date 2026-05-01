import express from "express"
import { requireAuth } from "../middleware/authMiddleware.js"
import { getPlanByAttempt, getLatestPlanForModule } from "../controllers/remedialController.js"

const router = express.Router()

// Poll for plan after a failed test
router.get("/:attemptId", requireAuth, getPlanByAttempt)

// Get latest plan for a module (used by Study Buddy)
router.get("/latest/:moduleId", requireAuth, getLatestPlanForModule)

export default router

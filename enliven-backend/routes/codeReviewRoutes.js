import express from "express"
import { requireAuth } from "../middleware/authMiddleware.js"
import {
  submitCode,
  getReview,
  getSubmissionHistory,
  getFinalProjectSubmission,
  submitMentorReview,
  getPendingMentorReviews,
} from "../controllers/codeReviewController.js"

const router = express.Router()

// Student routes
router.post("/submit",                          requireAuth, submitCode)
router.get("/:submissionId",                    requireAuth, getReview)
router.get("/history/:courseId/:moduleId",      requireAuth, getSubmissionHistory)
router.get("/final/:courseId",                  requireAuth, getFinalProjectSubmission)

// Mentor routes
router.put("/:submissionId/mentor-review",      requireAuth, submitMentorReview)
router.get("/mentor/pending",                   requireAuth, getPendingMentorReviews)

export default router

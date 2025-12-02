import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { saveProgress, getProgressForCourse } from "../controllers/progressController.js";

const router = express.Router();

router.post("/save", requireAuth, saveProgress);
router.get("/:courseId", requireAuth, getProgressForCourse);

export default router;

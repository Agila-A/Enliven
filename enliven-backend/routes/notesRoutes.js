import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { generateNotes } from "../controllers/notesController.js";

const router = express.Router();

router.post("/generate", requireAuth, generateNotes);

export default router;

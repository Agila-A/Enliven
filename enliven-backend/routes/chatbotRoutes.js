// routes/chatbotRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { updateContext, getChatHistory, getContext } from "../controllers/chatbotContextController.js";
import { sendChatMessage } from "../controllers/chatbotMessageController.js";

const router = express.Router();

// Update user context (module started, video completed, roadmap created, etc.)
router.post("/context/update", requireAuth, updateContext);

// Get raw context object (for analytics / debugging)
router.get("/context", requireAuth, getContext);

// Send a chat message to Study Buddy
router.post("/message", requireAuth, sendChatMessage);

// Get full chat history
router.get("/history", requireAuth, getChatHistory);

export default router;
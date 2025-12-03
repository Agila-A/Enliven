import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

import { updateContext, getChatHistory } from "../controllers/chatbotContextController.js";
import { sendChatMessage } from "../controllers/chatbotMessageController.js";

const router = express.Router();

router.post("/context/update", requireAuth, updateContext);
router.post("/message", requireAuth, sendChatMessage);
router.get("/history", requireAuth, getChatHistory);

export default router;

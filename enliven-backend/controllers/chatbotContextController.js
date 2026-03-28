// controllers/chatbotContextController.js
import ChatbotContext from "../models/ChatbotContext.js";

/*
  POST /api/chatbot/context/update
  Called by the frontend whenever something meaningful happens:
    - user starts a module   → { event: "module_started",   currentModule: 2 }
    - user finishes a video  → { event: "video_completed",  topic: "CSS Flexbox" }
    - roadmap generated      → { event: "roadmap_created",  domain, skillLevel, totalModules }

  Assessment completion is injected AUTOMATICALLY by proctorController.saveAttempt,
  so the frontend does NOT need to call this endpoint after an exam.
*/
export const updateContext = async (req, res) => {
  try {
    const userId = req.userId;
    const { event, ...payload } = req.body;

    if (!userId)
      return res.status(400).json({ success: false, message: "Missing userId" });

    if (!event)
      return res.status(400).json({ success: false, message: "Missing event name" });

    let ctx = await ChatbotContext.findOne({ userId });
    if (!ctx) ctx = new ChatbotContext({ userId, context: {} });

    // Merge payload into context; keep assessmentHistory untouched
    ctx.context = {
      ...ctx.context,
      lastEvent: event,
      ...payload,
    };

    await ctx.save();

    return res.json({ success: true, context: ctx.context });
  } catch (err) {
    console.error("updateContext error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/*
  GET /api/chatbot/history
  Returns the full message history for the current user.
*/
export const getChatHistory = async (req, res) => {
  try {
    const ctx = await ChatbotContext.findOne({ userId: req.userId });
    return res.json({ success: true, messages: ctx?.messages || [] });
  } catch (err) {
    console.error("getChatHistory error:", err);
    return res.status(500).json({ success: false });
  }
};

/*
  GET /api/chatbot/context
  Returns the raw context object — useful for debugging or the analytics page.
*/
export const getContext = async (req, res) => {
  try {
    const ctx = await ChatbotContext.findOne({ userId: req.userId });
    return res.json({ success: true, context: ctx?.context || {} });
  } catch (err) {
    console.error("getContext error:", err);
    return res.status(500).json({ success: false });
  }
};
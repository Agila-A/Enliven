// controllers/chatbotContextController.js
import ChatbotContext from "../models/ChatbotContext.js";

/*
  POST /api/chatbot/context/update
  Body must include:
    - courseId  : string — the course this context update belongs to
    - event     : string — e.g. "module_started", "video_completed", "course_opened"
    - ...payload : any additional context fields to merge

  Assessment completion is injected AUTOMATICALLY by proctorController.saveAttempt,
  so the frontend does NOT need to call this endpoint after an exam.

  If courseId is not provided the update is silently skipped (pre-enrollment events).
*/
export const updateContext = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, event, ...payload } = req.body;

    if (!userId)
      return res.status(400).json({ success: false, message: "Missing userId" });

    if (!event)
      return res.status(400).json({ success: false, message: "Missing event name" });

    // If no courseId, silently succeed — pre-enrollment events have no course context
    if (!courseId) {
      return res.json({ success: true, context: {} });
    }

    let ctx = await ChatbotContext.findOne({ userId, courseId });
    if (!ctx) ctx = new ChatbotContext({ userId, courseId, context: {} });

    // Fix for Problem 7: Log incoming update and map lessonTitle to lastLessonTitle
    console.log(`[ChatbotContext] updateContext called with event: ${event}`);
    if (payload.lessonTitle) {
      payload.lastLessonTitle = payload.lessonTitle;
      delete payload.lessonTitle;
      console.log(`[ChatbotContext] Saving lastLessonTitle: ${payload.lastLessonTitle}`);
    }

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
  GET /api/chatbot/history?courseId=web-development-beginner
  Returns the full message history for the given (user, course) pair.
*/
export const getChatHistory = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!courseId)
      return res.json({ success: true, messages: [] });

    const ctx = await ChatbotContext.findOne({ userId: req.userId, courseId });
    return res.json({ success: true, messages: ctx?.messages || [] });
  } catch (err) {
    console.error("getChatHistory error:", err);
    return res.status(500).json({ success: false });
  }
};

/*
  GET /api/chatbot/context?courseId=web-development-beginner
  Returns the raw context object — useful for debugging or the analytics page.
*/
export const getContext = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!courseId)
      return res.json({ success: true, context: {} });

    const ctx = await ChatbotContext.findOne({ userId: req.userId, courseId });
    return res.json({ success: true, context: ctx?.context || {} });
  } catch (err) {
    console.error("getContext error:", err);
    return res.status(500).json({ success: false });
  }
};
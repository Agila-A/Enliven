// controllers/chatbotContextController.js
import ChatbotContext from "../models/ChatbotContext.js";
import Roadmap from "../models/Roadmap.js";
import Progress from "../models/Progress.js";

const toSlug  = s => String(s || "").toLowerCase().replace(/\s+/g, "-");
const toLevel = s => String(s || "").replace(/[^a-zA-Z\s]/g, "").toLowerCase().replace(/[^a-z]/g, "");

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

    const prev = ctx.context || {};
    const updated = { ...prev, lastEvent: event };

    if (payload.domain)          updated.domain          = payload.domain;
    if (payload.skillLevel)      updated.skillLevel      = payload.skillLevel;
    if (payload.currentModule != null) updated.currentModule = payload.currentModule;
    if (payload.currentModuleTitle)    updated.currentModuleTitle = payload.currentModuleTitle;
    if (payload.lastLessonTitle) updated.lastLessonTitle = payload.lastLessonTitle;
    if (payload.totalModules != null)  updated.totalModules = payload.totalModules;
    if (payload.courseId)        updated.activeCourse    = payload.courseId;
    if (payload.moduleStatus && typeof payload.moduleStatus === "object") {
      updated.completedModules = Object.entries(payload.moduleStatus)
        .filter(([, v]) => v === "completed")
        .map(([k]) => Number(k))
        .sort((a, b) => a - b);
    }
    if (payload.weakTopics)      updated.weakTopics      = payload.weakTopics;
    if (prev.assessmentHistory)  updated.assessmentHistory = prev.assessmentHistory;
    if (prev.lastAssessment)     updated.lastAssessment    = prev.lastAssessment;
    if (prev.enrolledCourses)    updated.enrolledCourses   = prev.enrolledCourses;

    if (event === "study_started" && payload.courseId) {
      updated.activeCourse = payload.courseId;
    }

    ctx.context = updated;

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

export const syncEnrolledCourses = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

    const roadmaps = await Roadmap.find({ userId });
    if (!roadmaps || roadmaps.length === 0) {
      return res.json({ success: true, enrolledCourses: [] });
    }

    const enrolledCourses = [];

    for (const rm of roadmaps) {
      const courseId = toSlug(rm.domain) + "-" + toLevel(rm.skillLevel);
      const progress = await Progress.findOne({ userId, courseId });
      
      const totalModules = rm.topics ? rm.topics.length : 0;
      let modulesPassed = 0;
      let progPercent = 0;
      let moduleStatus = {};
      let studyProgress = [];

      if (progress) {
        moduleStatus = progress.moduleStatus || {};
        modulesPassed = Object.values(moduleStatus).filter(v => v === "completed").length;
        progPercent = totalModules > 0 ? Math.round((modulesPassed / totalModules) * 100) : 0;
        studyProgress = progress.progress || [];
      }

      enrolledCourses.push({
        courseId,
        domain: rm.domain,
        skillLevel: rm.skillLevel,
        totalModules,
        modulesPassed,
        progress: progPercent,
        moduleStatus,
        studyProgress: studyProgress.map(p => ({ topicId: String(p.topicId), studyStarted: p.studyStarted }))
      });
    }

    // Merge enrolledCourses into all context documents for this user
    const contexts = await ChatbotContext.find({ userId });
    for (const ctx of contexts) {
      ctx.context = { ...ctx.context, enrolledCourses };
      await ctx.save();
    }

    return res.json({ success: true, enrolledCourses });

  } catch (err) {
    console.error("syncEnrolledCourses error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// models/ChatbotContext.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender:    { type: String, enum: ["user", "assistant"], required: true },
  text:      { type: String, required: true },
  timestamp: { type: Date,   default: Date.now },
});

const contextSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      "User",
    required: true,
    // NOTE: unique constraint removed from userId alone.
    // The compound index below enforces one context per (user, course).
  },

  // courseId = "${domain}-${level}", e.g. "web-development-beginner"
  // Matches the join key used across Progress, ProctorAttempt, and Roadmap.
  courseId: {
    type:    String,
    default: null, // null = pre-enrollment / staging context (no course yet)
  },

  /*
    context holds everything Study Buddy knows about the user for THIS course:
    {
      domain, skillLevel, currentModule, completedModules,
      lastEvent,
      lastAssessment: { moduleId, score, passed, violations, flagged, summary },
      assessmentHistory: [ ...same shape... ]
    }
  */
  context:  { type: Object,          default: {} },
  messages: { type: [messageSchema], default: [] },
});

// Compound unique index: one context per (user, course)
contextSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model("ChatbotContext", contextSchema);
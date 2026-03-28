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
    unique:   true,
  },

  /*
    context holds everything Study Buddy knows about the user:
    {
      domain, skillLevel, currentModule, completedModules,
      lastEvent,
      // injected after each assessment:
      lastAssessment: {
        moduleId, score, passed, violations: {...}, flagged, summary
      },
      assessmentHistory: [ ...same shape... ]
    }
  */
  context:  { type: Object,          default: {} },
  messages: { type: [messageSchema], default: [] },
});

export default mongoose.model("ChatbotContext", contextSchema);
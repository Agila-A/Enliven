// models/ProctorAttempt.js
import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // BUG FIX: was ObjectId ref:"Course" — there is no Course model.
  // courseId is a string like "webdevelopment-beginner", so type must be String.
  courseId: { type: String, required: true },

  moduleId: { type: String, required: true },

  questions: Array,
  userAnswers: Array,
  score: Number,

  // Proctoring violation data
  violations: {
    tabSwitches: { type: Number, default: 0 },
    faceNotDetected: { type: Number, default: 0 },
    multipleFaces: { type: Number, default: 0 },
  },

  flagged: { type: Boolean, default: false },
  reason: String,

  startedAt: Date,
  endedAt: Date,
}, { timestamps: true });

export default mongoose.model("ProctorAttempt", attemptSchema);
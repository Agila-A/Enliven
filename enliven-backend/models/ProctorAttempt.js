import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  moduleId: { type: String, required: true },

  questions: Array,
  userAnswers: Array,
  score: Number,

  videoURL: String,
  audioURL: String,

  flagged: Boolean,
  reason: String,

  startedAt: Date,
  endedAt: Date
});

export default mongoose.model("ProctorAttempt", attemptSchema);

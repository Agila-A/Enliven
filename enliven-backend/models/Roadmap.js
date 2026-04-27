// models/Roadmap.js
import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  title:          String,
  description:    String,
  sequenceNumber: Number,
});

const roadmapSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // courseId = "${domainSlug}-${levelSlug}", e.g. "web-development-beginner"
    // This is the join key used across Progress, ProctorAttempt, ChatbotContext.
    courseId:   { type: String, required: true },
    domain:     { type: String, required: true },
    skillLevel: { type: String, required: true },
    topics:     [topicSchema],
  },
  { timestamps: true }
);

// Compound unique index: one roadmap per user per course
roadmapSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model("Roadmap", roadmapSchema);

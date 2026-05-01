import mongoose from "mongoose"

const weakTopicSchema = new mongoose.Schema({
  topic:       { type: String, required: true },
  description: { type: String, default: "" },
  questionIds: [{ type: String }], // which question ids the student got wrong on this topic
}, { _id: false })

const lessonStepSchema = new mongoose.Schema({
  step:        { type: Number, required: true },
  title:       { type: String, required: true },
  explanation: { type: String, required: true },
  studyPrompt: { type: String, required: true },
  // studyPrompt is a pre-built message the student can click to send directly
  // to Study Buddy e.g. "Explain CSS specificity to me with examples"
}, { _id: false })

const remedialPlanSchema = new mongoose.Schema({
  userId:    {
    type:     mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  attemptId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref: "ProctorAttempt",
    required: true,
    unique:   true, // one plan per attempt
  },
  moduleId:    { type: String, required: true },
  moduleTitle: { type: String, default: "" },
  courseId:    { type: String, required: true },
  score:       { type: Number, required: true },

  // Core output from Groq
  summary:     { type: String, default: "" },
  // One-paragraph summary of what went wrong and why

  weakTopics:  [weakTopicSchema],
  // Specific topics/concepts the student struggled with

  lessonPlan:  [lessonStepSchema],
  // Ordered steps for the student to follow

  practicePrompts: [{ type: String }],
  // 2-3 quick Study Buddy prompts the student can click immediately

  status: {
    type:    String,
    enum:    ["pending", "ready", "failed"],
    default: "pending",
    // pending = Groq is generating, ready = done, failed = Groq errored
  },

  generatedAt: { type: Date, default: null },
}, { timestamps: true })

export default mongoose.model("RemedialPlan", remedialPlanSchema)

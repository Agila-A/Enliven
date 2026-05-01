import mongoose from "mongoose"

const lineCommentSchema = new mongoose.Schema({
  line:    { type: Number, default: null }, // null = general comment
  comment: { type: String, required: true },
  type:    {
    type: String,
    enum: ["error", "warning", "suggestion", "praise"],
    default: "suggestion"
  },
}, { _id: false })

const codeSubmissionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  courseId: { type: String, required: true },
  moduleId: { type: String, required: true },
  // "final" for final project, sequenceNumber string for module exercises

  isFinalProject: { type: Boolean, default: false },

  // What the student submitted
  code:        { type: String, required: true },
  language:    { type: String, default: "javascript" },
  // e.g. "javascript", "python", "html", "css", "java"
  description: { type: String, default: "" },
  // Optional: student describes what they built

  // AI review output
  aiReview: {
    status: {
      type:    String,
      enum:    ["pending", "ready", "failed"],
      default: "pending"
    },
    summary:          { type: String, default: "" },
    // Overall paragraph summary of the code quality

    whatWentWell:     [{ type: String }],
    // Array of specific things done correctly

    issues:           [{ type: String }],
    // Array of specific problems found

    lineComments:     [lineCommentSchema],
    // Inline comments per line (or general)

    timeComplexity:   { type: String, default: "" },
    // e.g. "O(n²) due to nested loop on line 12"

    spaceComplexity:  { type: String, default: "" },

    suggestions:      [{ type: String }],
    // Specific actionable improvements

    overallScore:     { type: Number, default: null },
    // 0-100, how good is the code quality

    generatedAt:      { type: Date, default: null },
  },

  // Mentor review (only for final projects)
  mentorReview: {
    status: {
      type:    String,
      enum:    ["pending", "approved", "rejected", "needs_revision"],
      default: "pending"
    },
    feedback:    { type: String, default: "" },
    reviewedAt:  { type: Date,   default: null },
    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },

}, { timestamps: true })

// Index for fast lookups
codeSubmissionSchema.index({ userId: 1, courseId: 1, moduleId: 1 })
codeSubmissionSchema.index({ userId: 1, isFinalProject: 1 })

export default mongoose.model("CodeSubmission", codeSubmissionSchema)

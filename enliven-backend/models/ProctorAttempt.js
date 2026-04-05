// models/ProctorAttempt.js
import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: String, required: true }, // e.g. "webdevelopment-beginner"
    moduleId: { type: String, required: true }, // e.g. "1" or "final"
    type:     { type: String, enum: ["mcq", "coding"], default: "mcq" },

    questions:   { type: Array, default: [] },
    userAnswers: { type: Array, default: [] },
    codingSolutions: [
      {
        title:  String,
        code:   String,
        passed: Boolean
      }
    ],
    score:       { type: Number, default: 0 },      // percentage 0–100
    passed:      { type: Boolean, default: false },  // score >= 60

    /* ── Proctoring violation counts ── */
    violations: {
      tabSwitches:      { type: Number, default: 0 }, // left the exam tab
      faceNotDetected:  { type: Number, default: 0 }, // no face in frame
      multipleFaces:    { type: Number, default: 0 }, // >1 face detected
      lookingAway:      { type: Number, default: 0 }, // head pose deviation
      expressionAlert:  { type: Number, default: 0 }, // suspicious expression
      noCamera:         { type: Boolean, default: false }, // camera was denied
    },

    flagged: { type: Boolean, default: false },
    reason:  { type: String,  default: "" },   // human-readable flag reason

    startedAt: { type: Date },
    endedAt:   { type: Date },

    /* quick summary sent to Study Buddy */
    summary: { type: String, default: "" },
  },
  { timestamps: true }
);

/* ── Virtual: total violation count ── */
attemptSchema.virtual("totalViolations").get(function () {
  const v = this.violations;
  return (
    (v.tabSwitches     || 0) +
    (v.faceNotDetected || 0) +
    (v.multipleFaces   || 0) +
    (v.lookingAway     || 0) +
    (v.expressionAlert || 0)
  );
});

attemptSchema.set("toJSON", { virtuals: true });

export default mongoose.model("ProctorAttempt", attemptSchema);
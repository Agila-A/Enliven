// models/User.js
import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    courseId:       { type: String, required: true }, // "web-development-beginner"
    domain:         { type: String, required: true }, // "web-development"
    skillLevel:     { type: String, required: true }, // "beginner"
    enrolledAt:     { type: Date,   default: Date.now },
    lastAccessedAt: { type: Date,   default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },

    role: {
      type: String,
      enum: ["student", "mentor", "admin"],
      default: "student",
    },

    // ── DEPRECATED (staging / migration fields) ────────────────
    // These are kept so:
    //   a) domain-selection + question generation still work
    //   b) the one-time migration can read them to seed enrollments[0]
    // New code should NOT read these for course routing; use enrollments[].
    domain:     { type: String, default: null },
    skillLevel: { type: String, default: null },

    // ── MULTI-COURSE ENROLLMENTS ────────────────────────────────
    enrollments: { type: [enrollmentSchema], default: [] },

    // Profile fields
    bio:      { type: String, default: "No bio added yet." },
    location: { type: String, default: "" },
    avatar:   { type: String, default: "" },

    // ── Streak fields ──────────────────────────────────────────
    streak:         { type: Number, default: 0 },
    longestStreak:  { type: Number, default: 0 },
    lastActiveDate: { type: Date,   default: null },

    // Saved Resources
    savedResources: [
      {
        title:     String,
        type:      String,
        link:      String,
        savedDate: String,
      },
    ],

    badges: [
      {
        id:          String,
        name:        String,
        description: String,
        icon:        String,
        awardedOn:   Date,
      },
    ],

    achievements: [
      {
        title:       String,
        description: String,
        unlocked:    Boolean,
        icon:        String,
        date:        String,
      },
    ],

    // Store questions to verify answers later
    currentAssessment: [
      {
        question:      String,
        options:       [String],
        correctAnswer: String,
        difficulty:    { type: String, enum: ["easy", "medium", "hard"] },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
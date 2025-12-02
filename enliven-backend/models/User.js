import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },

    role: {
      type: String,
      enum: ["student", "mentor", "admin"],
      default: "student",
    },

    domain: { type: String, default: null },
    skillLevel: { type: String, default: null },

    // Profile fields
    bio: { type: String, default: "No bio added yet." },
    location: { type: String, default: "" },
    avatar: { type: String, default: "" },

    // Streak fields (keep)
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },

    // Saved Resources
    savedResources: [
      {
        title: String,
        type: String,
        link: String,
        savedDate: String,
      },
    ],

    achievements: [
      {
        title: String,
        description: String,
        unlocked: Boolean,
        icon: String,
        date: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);

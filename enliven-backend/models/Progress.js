// models/Progress.js
import mongoose from "mongoose";

const topicProgressSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true },
    studyStarted: { type: Boolean, default: false },
    currentIndex: { type: Number, default: 0 },
  },
  { _id: false }
);

const progressSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: String, required: true },

    progress: [topicProgressSchema],

    moduleStatus: {
      type: Map,
      of: String, // "completed"
      default: {},
    },

    finalCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Progress", progressSchema);
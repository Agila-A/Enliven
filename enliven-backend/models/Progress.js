// models/Progress.js
import mongoose from "mongoose";

const videoProgressSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true }, // video index
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const topicProgressSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true }, // sequence number or ID
    videoProgress: {
      type: Map,
      of: Boolean,
      default: {},
    },
    currentIndex: { type: Number, default: 0 },
  },
  { _id: false }
);

const progressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: String, required: true }, // "Web Development-Intermediate"

    progress: [topicProgressSchema],

    // ⭐ NEW — stores module test completion
    moduleStatus: {
      type: Map,
      of: String, // "completed"
      default: {},
    },

    // ⭐ NEW — stores final exam completion
    finalCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Progress", progressSchema);

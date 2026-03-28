// models/Progress.js
import mongoose from "mongoose";

const topicProgressSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true },
    videoProgress: {
      type: Map,
      of: Boolean,
      default: {},
    },
    currentIndex: { type: Number, default: 0 },
    // FIX: store the real total video count for this topic.
    // CoursePage knows this when it loads the merged course content,
    // so it sends it along with every saveProgress call.
    // Dashboard and LearningPath use this for accurate % calculation.
    videoCount: { type: Number, default: 0 },
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
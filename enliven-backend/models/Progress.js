// models/Progress.js
import mongoose from "mongoose";

const videoProgressSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },   // video index (0,1,2)
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const topicProgressSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true },     // sequenceNumber as string
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
    courseId: { type: String, required: true }, // "web-development-beginner"

    progress: [topicProgressSchema], // <<🔥 THIS FIXES YOUR ERROR
  },
  { timestamps: true }
);

export default mongoose.model("Progress", progressSchema);

import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  title: String,
  description: String,
  sequenceNumber: Number,
});

const roadmapSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    domain: { type: String, required: true },
    skillLevel: { type: String, required: true },
    topics: [topicSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Roadmap", roadmapSchema);

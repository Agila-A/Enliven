import mongoose from "mongoose"

const resourceItemSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  url:         { type: String, required: true },
  description: { type: String, default: "" },
  // One sentence explaining why this resource is useful
  type:        {
    type: String,
    enum: ["article", "documentation", "tool", "practice", "video", "other"],
    required: true,
  },
  isFree:      { type: Boolean, default: true },
  difficulty:  {
    type: String,
    enum: ["beginner", "intermediate", "advanced", "all"],
    default: "all",
  },
}, { _id: false })

const resourceCacheSchema = new mongoose.Schema({
  // Composite key — one doc per user + module topic
  userId:   {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      "User",
    required: true,
  },
  courseId:  { type: String, required: true },
  // e.g. "web-development-intermediate"

  moduleId:  { type: String, required: true },
  // sequence number as string e.g. "1", "2"

  topicTitle: { type: String, required: true },
  // e.g. "Learn Advanced CSS" — used as the search context

  domain:    { type: String, required: true },
  skillLevel:{ type: String, required: true },

  // Categorized resources
  resources: {
    articles:      [resourceItemSchema],
    documentation: [resourceItemSchema],
    tools:         [resourceItemSchema],
    practice:      [resourceItemSchema],
    videos:        [resourceItemSchema],
  },

  // Metadata
  fetchedAt:  { type: Date, default: Date.now },
  expiresAt:  { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  // 7 days from fetch — after this, considered stale

  status: {
    type:    String,
    enum:    ["pending", "ready", "failed"],
    default: "pending",
  },
  // pending = agent is running, ready = done, failed = Groq errored

  triggerType: {
    type:    String,
    enum:    ["scheduled", "manual"],
    default: "scheduled",
  },
  // How was this fetch triggered

}, { timestamps: true })

// Compound unique index — one cache entry per user + course + module
resourceCacheSchema.index({ userId: 1, courseId: 1, moduleId: 1 }, { unique: true })

export default mongoose.model("ResourceCache", resourceCacheSchema)

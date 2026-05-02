import mongoose from "mongoose"

const attemptSummarySchema = new mongoose.Schema({
  id:           { type: String },
  moduleId:     { type: String },
  moduleTitle:  { type: String },
  courseId:     { type: String },
  score:        { type: Number },
  passed:       { type: Boolean },
  flagged:      { type: Boolean },
  durationMins: { type: Number, default: null },
  accuracy:     {
    correct: Number,
    total:   Number,
    pct:     Number,
  },
  integrity:    { type: Number },
  violations: {
    tabSwitches:     { type: Number, default: 0 },
    faceNotDetected: { type: Number, default: 0 },
    multipleFaces:   { type: Number, default: 0 },
    lookingAway:     { type: Number, default: 0 },
    expressionAlert: { type: Number, default: 0 },
    noCamera:        { type: Boolean, default: false },
  },
  takenAt: { type: Date },
}, { _id: false })

const analyticsSnapshotSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      "User",
    required: true,
    unique:   true,   // one snapshot doc per user, updated in place
  },

  // Overall aggregated stats across ALL attempts
  overallStats: {
    totalAttempts:   { type: Number, default: 0 },
    passedCount:     { type: Number, default: 0 },
    failedCount:     { type: Number, default: 0 },
    passRate:        { type: Number, default: 0 },
    avgScore:        { type: Number, default: 0 },
    highestScore:    { type: Number, default: 0 },
    lowestScore:     { type: Number, default: 0 },
    avgDurationMins: { type: Number, default: null },
    avgAccuracy:     { type: Number, default: null },
    avgIntegrity:    { type: Number, default: 100 },
    flaggedCount:    { type: Number, default: 0 },
  },

  // Chronological score trend for line chart
  scoreTrend: [
    {
      label:  { type: String },  // module title
      score:  { type: Number },
      passed: { type: Boolean },
      date:   { type: Date },
      _id: false,
    }
  ],

  // Per-module comparison for bar chart
  moduleComparison: [
    {
      label:    { type: String },
      score:    { type: Number },
      passed:   { type: Boolean },
      accuracy: { type: Number, default: null },
      _id: false,
    }
  ],

  // Time taken per test
  timeTaken: [
    {
      label:   { type: String },
      minutes: { type: Number },
      _id: false,
    }
  ],

  // Aggregate violation totals
  totalViolations: {
    tabSwitches:     { type: Number, default: 0 },
    faceNotDetected: { type: Number, default: 0 },
    multipleFaces:   { type: Number, default: 0 },
    lookingAway:     { type: Number, default: 0 },
    expressionAlert: { type: Number, default: 0 },
    noCameraCount:   { type: Number, default: 0 },
  },

  // Full attempt details for the table
  attemptDetails: [attemptSummarySchema],

  // Pre-generated AI coaching report (global)
  aiReport: {
    text:        { type: String, default: "" },
    generatedAt: { type: Date,   default: null },
  },

  // Per-course AI reports
  courseReports: [
    {
      courseId:    { type: String },
      text:        { type: String },
      generatedAt: { type: Date },
      _id: false,
    }
  ],

  // When this snapshot was last computed
  computedAt: { type: Date, default: Date.now },

}, { timestamps: true })

export default mongoose.model("AnalyticsSnapshot", analyticsSnapshotSchema)

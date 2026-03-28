// models/ChatbotContext.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["user", "assistant"], required: true },
  text:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const contextSchema = new mongoose.Schema({
  // BUG FIX: was plain String — should be ObjectId to match User._id
  // and allow proper population/lookup
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  context:  { type: Object,          default: {} },
  messages: { type: [messageSchema], default: [] },
});

export default mongoose.model("ChatbotContext", contextSchema);
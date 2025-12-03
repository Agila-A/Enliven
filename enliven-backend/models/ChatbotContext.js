import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["user", "assistant"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const contextSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  context: { type: Object, default: {} },
  messages: { type: [messageSchema], default: [] }   // ⭐ NEW
});

export default mongoose.model("ChatbotContext", contextSchema);

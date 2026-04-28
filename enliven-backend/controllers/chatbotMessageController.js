// controllers/chatbotMessageController.js
import ChatbotContext from "../models/ChatbotContext.js";
import { systemPrompt } from "../ai/systemPrompt.js";
import Groq from "groq-sdk";

function createGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/*
  MAX messages to keep in the sliding window sent to Groq.
  We always include the full context object separately via a second system
  message, so history can be shorter without losing personalisation.
*/
const MAX_HISTORY = 20;

/*
  POST /api/chatbot/message
  Body: { message: string, courseId: string }
  courseId is required — it identifies which per-course context to use.
*/
export const sendChatMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { message, courseId } = req.body;

    if (!message?.trim())
      return res.status(400).json({ success: false, message: "Message is required" });

    if (!courseId)
      return res.status(400).json({ success: false, message: "courseId is required" });

    // 1) Load or create context doc for this (user, course)
    let ctx = await ChatbotContext.findOne({ userId, courseId });
    if (!ctx) {
      ctx = await ChatbotContext.create({ userId, courseId, context: {}, messages: [] });
    }

    // 2) Persist the user message using $push with $slice
    // Fixes Problem 1 & 2 (race condition overwriting context) and Problem 3 (trimming history)
    await ChatbotContext.updateOne(
      { _id: ctx._id },
      {
        $push: {
          messages: {
            $each: [{ sender: "user", text: message }],
            $slice: -100
          }
        }
      }
    );

    // 3) Build the messages array for Groq
    // Problem 1 & 2: Do a FRESH findOne right before building the prompt 
    // to get any background context updates that just finished.
    let freshCtx = await ChatbotContext.findOne({ userId, courseId });

    const contextSystemMessage = {
      role: "system",
      content:
        "LIVE USER CONTEXT (use this data exclusively — do not invent or assume anything not present here):\n" +
        JSON.stringify(freshCtx.context || {}, null, 2),
    };

    // Sliding window — last MAX_HISTORY messages
    const history = freshCtx.messages
      .slice(-MAX_HISTORY)
      .slice(0, -1) // EXCLUDE the user message we just pushed, it gets added below
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

    const groqMessages = [
      { role: "system", content: systemPrompt },
      contextSystemMessage,
      ...history,
      { role: "user", content: message },
    ];

    // 4) Call Groq
    const groq = createGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1000,
      messages: groqMessages,
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Groq returned empty reply");

    // 5) Persist the assistant reply using $push and $slice to avoid overwriting context
    await ChatbotContext.updateOne(
      { _id: ctx._id },
      {
        $push: {
          messages: {
            $each: [{ sender: "assistant", text: reply }],
            $slice: -100
          }
        }
      }
    );

    // 6) Respond
    // Problem 10: contextUpdated flag
    return res.json({ success: true, reply, contextUpdated: false });

  } catch (err) {
    console.error("sendChatMessage error:", err);
    return res.status(500).json({ success: false, message: "Chatbot error" });
  }
};
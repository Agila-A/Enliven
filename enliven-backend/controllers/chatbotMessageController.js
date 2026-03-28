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
  Keeps token usage predictable. We always include the full context object
  separately via a second system message, so history can be shorter without
  losing personalisation.
*/
const MAX_HISTORY = 20;

export const sendChatMessage = async (req, res) => {
  try {
    const userId  = req.userId;
    const { message } = req.body;

    if (!message?.trim())
      return res.status(400).json({ success: false, message: "Message is required" });

    // 1) Load or create context doc
    let ctx = await ChatbotContext.findOne({ userId });
    if (!ctx) ctx = await ChatbotContext.create({ userId, context: {}, messages: [] });

    // 2) Persist the user message
    ctx.messages.push({ sender: "user", text: message });

    // 3) Build the messages array for Groq
    //
    //    We use TWO system messages:
    //      [0] system: Study Buddy persona + instructions (systemPrompt)
    //      [1] system: LIVE user context JSON — injected as a second system
    //                  message so the model cannot confuse it with example data
    //                  and always treats it as authoritative ground truth.
    //
    //    Then the sliding window of chat history follows.
    //
    //    This pattern is well-supported by llama-3.3 and prevents the bug
    //    where the model reads the example JSON in the system prompt and
    //    uses it instead of the real user data.

    const contextSystemMessage = {
      role: "system",
      content:
        "LIVE USER CONTEXT (use this data exclusively — do not invent or assume anything not present here):\n" +
        JSON.stringify(ctx.context || {}, null, 2),
    };

    // Sliding window — last MAX_HISTORY messages, EXCLUDING the one we just pushed
    const history = ctx.messages
      .slice(0, -1)                   // exclude the message we just added
      .slice(-MAX_HISTORY)            // keep last N
      .map(m => ({
        role:    m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

    const groqMessages = [
      { role: "system", content: systemPrompt },
      contextSystemMessage,           // <-- live context, clearly labelled
      ...history,
      { role: "user",   content: message },
    ];

    // 4) Call Groq
    const groq = createGroqClient();
    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens:  1000,
      messages:    groqMessages,
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Groq returned empty reply");

    // 5) Persist the assistant reply
    ctx.messages.push({ sender: "assistant", text: reply });
    await ctx.save();

    // 6) Respond
    return res.json({ success: true, reply });

  } catch (err) {
    console.error("sendChatMessage error:", err);
    return res.status(500).json({ success: false, message: "Chatbot error" });
  }
};
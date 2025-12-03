import ChatbotContext from "../models/ChatbotContext.js";
import { systemPrompt } from "../ai/systemPrompt.js";
import fetch from "node-fetch";

export const sendChatMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { message } = req.body;

    // 1) Load or create context
    let ctx = await ChatbotContext.findOne({ userId });
    if (!ctx) ctx = await ChatbotContext.create({ userId });

    // 2) Save user message
    ctx.messages.push({ sender: "user", text: message });
    await ctx.save();

    // 3) Prepare AI payload
    const payload = {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "assistant", content: JSON.stringify(ctx.context || {}) },
        // ⭐ include chat history
        ...ctx.messages.map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        })),
      ]
    };

    // 4) Get AI response
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await groqRes.json();
    const reply = data.choices[0].message.content;

    // 5) Save assistant reply
    ctx.messages.push({ sender: "assistant", text: reply });
    await ctx.save();

    // 6) Send response to frontend
    res.json({ success: true, reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Chatbot error" });
  }
};

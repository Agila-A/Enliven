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

function detectIntent(message) {
  const m = message.toLowerCase();
  if (/flashcard|flash card|card(s)?/.test(m))            return "flashcards";
  if (/diagram|flowchart|chart|visual|draw|sketch/.test(m)) return "diagram";
  if (/quiz|test me|question(s)?|mcq/.test(m))            return "quiz";
  if (/step\.by\.step|steps|walk.?through|how to/.test(m)) return "steps";
  if (/example(s)?|show me|code example/.test(m))         return "example";
  if (/explain|what is|what are|tell me|describe/.test(m)) return "explain";
  return "chat";
}

function getIntentInstruction(intent) {
  switch (intent) {
    case "flashcards":
      return `The student wants flashcards. Respond ONLY with a valid JSON object in this exact format, nothing else before or after it:
{"type":"flashcards","cards":[{"front":"Question or term","back":"Answer or definition"},{"front":"...","back":"..."}]}
Generate 5 to 8 flashcards relevant to the current module and question. Make fronts concise, backs explanatory.`;

    case "diagram":
      return `The student wants a diagram. Respond ONLY with a valid JSON object in this exact format:
{"type":"diagram","title":"Diagram title","mermaid":"graph TD\\n  A[Start] --> B[Step]\\n  B --> C[End]"}
Use Mermaid syntax. Choose the most appropriate diagram type: flowchart (graph TD), sequence (sequenceDiagram), or class diagram (classDiagram). Keep it clear and relevant to the concept asked about.`;

    case "quiz":
      return `The student wants a mini-quiz. Respond ONLY with a valid JSON object in this exact format:
{"type":"quiz","questions":[{"q":"Question text","options":["A","B","C","D"],"correct":0,"explanation":"Why A is correct"},{"q":"...","options":["..."],"correct":1,"explanation":"..."}]}
Generate exactly 4 questions. Make them relevant to the current module topic. correctIndex is 0-based.`;

    case "steps":
      return `The student wants a step-by-step breakdown. Respond with a JSON object:
{"type":"steps","title":"What you are explaining","steps":[{"number":1,"title":"Step title","content":"Explanation"},{"number":2,"title":"...","content":"..."}]}
Break it into 4 to 7 clear steps. Each step should be actionable and specific.`;

    case "example":
      return `The student wants a code example or real-world analogy. Respond with a JSON object:
{"type":"example","language":"javascript","explanation":"Brief explanation of what this demonstrates","code":"// code here"}
Match the language to the domain. If non-code domain, use type "analogy" with an "analogy" string field instead of code.`;

    default:
      return `Respond conversationally as Study Buddy. Use markdown naturally — code blocks for code, bullet points for lists. Keep responses focused and under 200 words unless the student asks for more detail.`;
  }
}

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
        },
        $set: { lastUpdated: new Date() }
      }
    );

    // 3) Build the messages array for Groq
    // Problem 1 & 2: Do a FRESH findOne right before building the prompt 
    // to get any background context updates that just finished.
    let freshCtx = await ChatbotContext.findOne({ userId, courseId });

    const intent = detectIntent(message);
    const intentInstruction = getIntentInstruction(intent);

    const contextSystemMessage = {
      role: "system",
      content:
        "LIVE USER CONTEXT (authoritative — do not invent data not present here):\n" +
        JSON.stringify(freshCtx.context || {}, null, 2),
    };

    const intentSystemMessage = {
      role: "system",
      content: intentInstruction
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
      intentSystemMessage,
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
        },
        $set: { lastUpdated: new Date() }
      }
    );

    // 6) Respond
    // Problem 10: contextUpdated flag
    return res.json({ success: true, reply, intent, contextUpdated: false });

  } catch (err) {
    console.error("sendChatMessage error:", err);
    return res.status(500).json({ success: false, message: "Chatbot error" });
  }
};
// controllers/proctorController.js
import Groq from "groq-sdk";
import ProctorAttempt from "../models/ProctorAttempt.js";

/* ─── GROQ CLIENT ─────────────────────────────────────────────── */
function createGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/* ─── JSON PARSER ─────────────────────────────────────────────────
   BUG FIX: The old regex /\{[\s\S]*?\}/g was non-greedy — it matched
   the SMALLEST possible object, so nested objects like {"options":["a","b"]}
   got torn apart into broken fragments.

   Fix: strip markdown fences, then find the outermost JSON array using
   bracket-depth counting. This correctly handles nested objects/arrays.
────────────────────────────────────────────────────────────────── */
function extractJSON(raw) {
  if (!raw) throw new Error("Empty Groq response");

  // Strip markdown code fences
  raw = raw.replace(/```json|```/gi, "").trim();

  // Find the outermost [ ... ] using depth counting
  let start = raw.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in response");

  let depth = 0;
  let end = -1;

  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "[") depth++;
    else if (raw[i] === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) throw new Error("Unterminated JSON array in response");

  const jsonStr = raw
    .slice(start, end + 1)
    .replace(/,\s*([}\]])/g, "$1")   // remove trailing commas
    .replace(/[\u0000-\u001F]+/g, " "); // sanitize control chars

  return JSON.parse(jsonStr);
}

/* ─── QUESTION GENERATOR ──────────────────────────────────────── */
async function generateQuestionsWithGroq({ topic, count }) {
  const groq = createGroqClient();

  const prompt = `
You are an exam generator.
Generate EXACTLY ${count} MCQ questions about: "${topic}"

Each question MUST have these exact fields:
- "question": string
- "options": array of exactly 4 strings
- "correctIndex": number (0–3)
- "explanation": string
- "difficulty": number (1–5)

Output ONLY a valid JSON array. No markdown, no comments, no extra text.
`.trim();

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.5,
    max_tokens: 3000,
    messages: [
      { role: "system", content: "You output only valid JSON arrays. No markdown, no explanation." },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty content");

  const parsed = extractJSON(content);

  return parsed.slice(0, count).map((q, i) => ({
    id: q.id || `q${i + 1}`,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    difficulty: q.difficulty,
  }));
}

/* ─── GET MODULE QUESTIONS ────────────────────────────────────── */
export async function getModuleQuestions(req, res) {
  try {
    const { moduleId } = req.params;
    const { domain, level } = req.query;

    if (!domain || !level) {
      return res.status(400).json({ success: false, message: "domain and level are required" });
    }

    const topic = `Module ${moduleId} of ${domain} - ${level}`;
    const questions = await generateQuestionsWithGroq({ topic, count: 10 });

    return res.json({ success: true, questions, moduleId, mode: "module" });
  } catch (err) {
    console.error("getModuleQuestions error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate module questions" });
  }
}

/* ─── GET FINAL QUESTIONS ─────────────────────────────────────── */
export async function getFinalQuestions(req, res) {
  try {
    const { domain, level } = req.query;

    if (!domain || !level) {
      return res.status(400).json({ success: false, message: "domain and level are required" });
    }

    const topic = `Final exam for ${domain} (${level})`;
    const questions = await generateQuestionsWithGroq({ topic, count: 30 });

    return res.json({ success: true, questions, mode: "final" });
  } catch (err) {
    console.error("getFinalQuestions error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate final exam questions" });
  }
}

/* ─── SAVE ATTEMPT (was completely missing) ───────────────────────
   POST /api/proctor/attempt
   Called by frontend after the exam ends with answers + violations.
────────────────────────────────────────────────────────────────── */
export async function saveAttempt(req, res) {
  try {
    const userId = req.userId;
    const {
      courseId,
      moduleId,
      questions,
      userAnswers,
      score,
      violations = {},
      flagged = false,
      reason = "",
      startedAt,
      endedAt,
    } = req.body;

    if (!courseId || !moduleId) {
      return res.status(400).json({ success: false, message: "courseId and moduleId are required" });
    }

    const attempt = await ProctorAttempt.create({
      userId,
      courseId,
      moduleId,
      questions,
      userAnswers,
      score,
      violations,
      flagged,
      reason,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      endedAt: endedAt ? new Date(endedAt) : new Date(),
    });

    return res.status(201).json({ success: true, attemptId: attempt._id, score });
  } catch (err) {
    console.error("saveAttempt error:", err);
    return res.status(500).json({ success: false, message: "Failed to save attempt" });
  }
}

/* ─── GET ATTEMPTS FOR USER ───────────────────────────────────── */
export async function getUserAttempts(req, res) {
  try {
    const userId = req.userId;
    const { courseId } = req.query;

    const filter = { userId };
    if (courseId) filter.courseId = courseId;

    const attempts = await ProctorAttempt.find(filter)
      .select("-questions") // don't send full question list back
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, attempts });
  } catch (err) {
    console.error("getUserAttempts error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch attempts" });
  }
}
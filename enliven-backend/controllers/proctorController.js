// controllers/proctorController.js
import Groq from "groq-sdk";
import ProctorAttempt  from "../models/ProctorAttempt.js";
import ChatbotContext  from "../models/ChatbotContext.js";

/* ─── GROQ CLIENT ─────────────────────────────────────────────── */
function createGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/* ─── JSON PARSER ─────────────────────────────────────────────────
   Strips markdown fences then finds the outermost JSON array using
   bracket-depth counting — handles nested objects/arrays correctly.
────────────────────────────────────────────────────────────────── */
function extractJSON(raw) {
  if (!raw) throw new Error("Empty Groq response");

  raw = raw.replace(/```json|```/gi, "").trim();

  let start = raw.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in response");

  let depth = 0, end = -1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "[") depth++;
    else if (raw[i] === "]") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error("Unterminated JSON array");

  const jsonStr = raw
    .slice(start, end + 1)
    .replace(/,\s*([}\]])/g, "$1")       // trailing commas
    .replace(/[\u0000-\u001F]+/g, " ");  // control chars

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
    model:       "llama-3.1-8b-instant",
    temperature: 0.5,
    max_tokens:  3000,
    messages: [
      { role: "system", content: "You output only valid JSON arrays. No markdown, no explanation." },
      { role: "user",   content: prompt },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty content");

  const parsed = extractJSON(content);
  return parsed.slice(0, count).map((q, i) => ({
    id:           q.id || `q${i + 1}`,
    question:     q.question,
    options:      q.options,
    correctIndex: q.correctIndex,
    explanation:  q.explanation,
    difficulty:   q.difficulty,
  }));
}

/* ─── BUILD VIOLATION SUMMARY STRING ─────────────────────────── */
function buildViolationSummary(violations = {}, flagged = false) {
  const parts = [];
  if (violations.tabSwitches     > 0) parts.push(`tab switches: ${violations.tabSwitches}`);
  if (violations.faceNotDetected > 0) parts.push(`face not detected: ${violations.faceNotDetected}x`);
  if (violations.multipleFaces   > 0) parts.push(`multiple faces detected: ${violations.multipleFaces}x`);
  if (violations.lookingAway     > 0) parts.push(`looking away from screen: ${violations.lookingAway}x`);
  if (violations.expressionAlert > 0) parts.push(`suspicious expression alerts: ${violations.expressionAlert}`);
  if (violations.noCamera)            parts.push("camera was not enabled");

  if (parts.length === 0) return "No proctoring violations detected.";
  const summary = `Proctoring violations — ${parts.join(", ")}.`;
  return flagged ? summary + " Attempt was flagged for review." : summary;
}

/* ─── INJECT ASSESSMENT RESULT INTO CHATBOT CONTEXT ──────────── */
async function injectAssessmentIntoChatbotContext(userId, attemptData) {
  try {
    let ctx = await ChatbotContext.findOne({ userId });
    if (!ctx) ctx = new ChatbotContext({ userId, context: {} });

    const historyEntry = {
      moduleId:   attemptData.moduleId,
      score:      attemptData.score,
      passed:     attemptData.passed,
      flagged:    attemptData.flagged,
      violations: attemptData.violations,
      summary:    attemptData.summary,
      takenAt:    new Date().toISOString(),
    };

    const prevHistory = Array.isArray(ctx.context.assessmentHistory)
      ? ctx.context.assessmentHistory
      : [];

    ctx.context = {
      ...ctx.context,
      lastEvent:      "assessment_completed",
      lastAssessment: historyEntry,
      assessmentHistory: [...prevHistory, historyEntry].slice(-10), // keep last 10
    };

    await ctx.save();
  } catch (err) {
    // non-fatal — log but don't block the response
    console.error("Failed to inject assessment into chatbot context:", err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
   ROUTE HANDLERS
═══════════════════════════════════════════════════════════════ */

/* ─── GET MODULE QUESTIONS ────────────────────────────────────── */
export async function getModuleQuestions(req, res) {
  try {
    const { moduleId } = req.params;
    const { domain, level } = req.query;

    if (!domain || !level)
      return res.status(400).json({ success: false, message: "domain and level are required" });

    const topic = `Module ${moduleId} of ${domain} at ${level} level`;
    const questions = await generateQuestionsWithGroq({ topic, count: 5 });

    return res.json({ success: true, questions, moduleId, mode: "module" });
  } catch (err) {
    console.error("getModuleQuestions error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate module questions" });
  }
}

/* ─── GET MODULE CODING QUESTIONS ─────────────────────────────── */
export async function getModuleCodingQuestions(req, res) {
  try {
    const { moduleId } = req.params;
    const { domain, level } = req.query;

    if (!domain || !level)
      return res.status(400).json({ success: false, message: "domain and level are required" });

    const topic = `Module ${moduleId} of ${domain} (${level})`;
    
    // Determine type based on topic name
    const isUI = /css|html|ui|ux|design|styling|layout/i.test(topic + " " + domain);
    const type = isUI ? "html_css" : "javascript";

    const groq = createGroqClient();
    const prompt = `
Generate EXACTLY 2 coding problems for: "${topic}"
Context Domain: ${domain}
Selected Type: ${type} (Strictly follow this type)

Requirements:
- Problems must be practical and real-world oriented
- Difficulty: EXACTLY 2 EASY problems (No medium/hard)
- For "javascript": 
    - The user's function is ALWAYS named "solution".
    - "testCases": [{ "input": [arg1, arg2], "expected": value }] where "input" is an array of arguments.
    - Description must precisely specify what the function returns.
- For "html_css": 
    - "testCases": [{ "selector": ".class", "property": "color", "expected": "red" }]
    - Target basic layouts and styling like buttons, cards, or flexbox alignment.
- IMPORTANT: Ensure the Sample Input/Output matches the first Hidden Test Case exactly.
- IMPORTANT: Instructions must be unambiguous.
- IMPORTANT: Test case inputs must be SIMPLE strings, numbers, or arrays. NO code snippets or logic in test case inputs.
- WARNING: Do not mix up logic (e.g., do not describe 'vowels' then test for 'lowercase'). Be consistent!
- VALIDATION: Double check that the "expected" values are mathematically/logically correct.

Return response as a SINGLE JSON OBJECT (do NOT wrap in an array):
{
  "problems": [
    {
      "title": "string",
      "description": "string",
      "type": "${type}",
      "difficulty": "easy",
      "inputFormat": "string",
      "outputFormat": "string",
      "constraints": "string",
      "sampleInput": "string",
      "sampleOutput": "string",
      "testCases": [...]
    }
  ]
}
`.trim();

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You output only valid JSON arrays. No markdown, no explanation." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty content from Groq");
    
    const data = JSON.parse(content);
    
    // Support various JSON structures Groq might return
    const problems = Array.isArray(data) ? data : (data.problems || data.questions || data.items || []);

    if (!problems || problems.length === 0) {
      console.error("No problems in Groq response:", content);
      throw new Error("No problems generated");
    }

    // Clean up problems (sometimes they come with markdown)
    const cleaned = problems.map(p => ({
      ...p,
      title: p.title?.replace(/#|`|\*/g, "").trim()
    }));

    console.log("GENERATED PROBLEMS:", JSON.stringify(cleaned, null, 2));

    return res.json({ success: true, problems: cleaned, moduleId, type });
  } catch (err) {
    console.error("getModuleCodingQuestions error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate coding problems" });
  }
}

/* ─── GET FINAL QUESTIONS ─────────────────────────────────────── */
export async function getFinalQuestions(req, res) {
  try {
    const { domain, level } = req.query;

    if (!domain || !level)
      return res.status(400).json({ success: false, message: "domain and level are required" });

    const topic = `Comprehensive final exam for ${domain} (${level} level)`;
    const questions = await generateQuestionsWithGroq({ topic, count: 30 });

    return res.json({ success: true, questions, mode: "final" });
  } catch (err) {
    console.error("getFinalQuestions error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate final exam questions" });
  }
}

/* ─── SAVE ATTEMPT ────────────────────────────────────────────── */
/*
  POST /api/proctor/attempt
  Body: {
    courseId, moduleId, questions, userAnswers, score,
    violations: {
      tabSwitches, faceNotDetected, multipleFaces,
      lookingAway, expressionAlert, noCamera
    },
    flagged, reason, startedAt, endedAt
  }
*/
export async function saveAttempt(req, res) {
  try {
    const userId = req.userId;
    const {
      courseId,
      moduleId,
      type         = "mcq",
      questions    = [],
      userAnswers  = [],
      codingSolutions = [],
      score        = 0,
      violations   = {},
      flagged      = false,
      reason       = "",
      startedAt,
      endedAt,
    } = req.body;

    if (!courseId || !moduleId)
      return res.status(400).json({ success: false, message: "courseId and moduleId are required" });

    const passed  = score >= 60;
    const summary = buildViolationSummary(violations, flagged);

    const attempt = await ProctorAttempt.create({
      userId,
      courseId,
      moduleId,
      type,
      questions,
      userAnswers,
      codingSolutions,
      score,
      passed,
      violations: {
        tabSwitches:     violations.tabSwitches     || 0,
        faceNotDetected: violations.faceNotDetected || 0,
        multipleFaces:   violations.multipleFaces   || 0,
        lookingAway:     violations.lookingAway     || 0,
        expressionAlert: violations.expressionAlert || 0,
        noCamera:        violations.noCamera        || false,
      },
      flagged,
      reason,
      summary,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      endedAt:   endedAt   ? new Date(endedAt)   : new Date(),
    });

    /* ── Push assessment result into Study Buddy context ── */
    await injectAssessmentIntoChatbotContext(userId, {
      moduleId,
      score,
      passed,
      flagged,
      violations: attempt.violations,
      summary,
    });

    return res.status(201).json({
      success: true,
      attemptId: attempt._id,
      score,
      passed,
      summary,
    });
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
      .select("-questions")   // don't send full question list
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, attempts });
  } catch (err) {
    console.error("getUserAttempts error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch attempts" });
  }
}

/* ─── GET LATEST ATTEMPT FOR A MODULE ────────────────────────── */
/*
  GET /api/proctor/attempt/:moduleId?courseId=xxx
  Used by frontend to check if user already passed a module.
*/
export async function getModuleAttempt(req, res) {
  try {
    const userId   = req.userId;
    const { moduleId } = req.params;
    const { courseId } = req.query;

    if (!courseId)
      return res.status(400).json({ success: false, message: "courseId is required" });

    const attempt = await ProctorAttempt.findOne({ userId, courseId, moduleId })
      .select("-questions")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, attempt: attempt || null });
  } catch (err) {
    console.error("getModuleAttempt error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch module attempt" });
  }
}
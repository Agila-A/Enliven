import Groq from "groq-sdk";

// FIX: safe factory loader
function createGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing (check .env)");
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Small helper to talk to Groq and get parsed JSON
async function generateQuestionsWithGroq({ topic, count }) {
  const groq = createGroqClient(); // FIX

  const prompt = `
You are an exam generator for an edtech app.

Generate EXACTLY ${count} multiple choice questions about:

"${topic}"

Rules:
- Focus on practical developer skills.
- Each question MUST have:
  - "question"
  - "options" (4)
  - "correctIndex"
  - "explanation"
  - "difficulty"
Return ONLY a JSON array.
  `.trim();

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
    max_tokens: 1500,
    messages: [
      { role: "system", content: "You generate clean JSON-only MCQ exams." },
      { role: "user", content: prompt }
    ]
  });

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from Groq");

  const jsonText = content.replace(/```json|```/g, "").trim();

  let questions;
  try {
    questions = JSON.parse(jsonText);
  } catch (err) {
    console.error("Groq JSON parse error:", err, "\nRaw:", jsonText);
    throw new Error("Failed to parse questions from Groq");
  }

  return questions.slice(0, count).map((q, index) => ({
    id: q.id || `q${index + 1}`,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    difficulty: q.difficulty
  }));
}

// MODULE QUESTIONS
export async function getModuleQuestions(req, res) {
  try {
    const { moduleId } = req.params;
    const { domain, level } = req.query;

    const topic = `Module ${moduleId} of the ${domain} - ${level} course.`;
    const questions = await generateQuestionsWithGroq({ topic, count: 10 });

    return res.json({ success: true, mode: "module", moduleId, questions });
  } catch (err) {
    console.error("getModuleQuestions error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate module questions" });
  }
}

// FINAL EXAM (30 questions)
export async function getFinalQuestions(req, res) {
  try {
    const { domain, level } = req.query;

    const topic = `Full course final exam for ${domain} - ${level}.`;
    const questions = await generateQuestionsWithGroq({ topic, count: 30 });

    return res.json({ success: true, mode: "final", questions });
  } catch (err) {
    console.error("getFinalQuestions error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate final exam questions" });
  }
}

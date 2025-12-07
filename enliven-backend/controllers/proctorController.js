import Groq from "groq-sdk";

/* CREATE CLIENT SAFELY */
function createGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY missing");
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/* SAFEST JSON EXTRACTION EVER */
function safelyParseGroqJSON(raw) {
  if (!raw) throw new Error("Empty Groq response");

  raw = raw.replace(/```json|```/g, "").trim();

  // Extract all JSON objects inside the array using streaming regex
  const objectMatches = raw.match(/\{[\s\S]*?\}/g);
  if (!objectMatches) throw new Error("No valid JSON objects found");

  const parsedObjects = [];

  for (const obj of objectMatches) {
    try {
      // Try parsing each object independently
      let clean = obj
        .replace(/,\s*}/g, "}") // remove trailing commas
        .replace(/,\s*]/g, "]")
        .replace(/[\u0000-\u001F]+/g, ""); // remove control chars

      parsedObjects.push(JSON.parse(clean));
    } catch (e) {
      // Skip only the broken object but keep the rest
      console.warn("Skipping broken object:", obj);
    }
  }

  if (parsedObjects.length === 0) {
    throw new Error("All objects were invalid JSON");
  }

  return parsedObjects;
}


/* GENERATE QUESTIONS FROM GROQ SAFELY */
async function generateQuestionsWithGroq({ topic, count }) {
  const groq = createGroqClient();

  const prompt = `
You are an exam generator.

Generate EXACTLY ${count} MCQ questions about:
"${topic}"

Each item MUST have:
- question
- options (4)
- correctIndex
- explanation
- difficulty (1–5)

Output ONLY a JSON array. No comments. No markdown.
`.trim();

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.5,
    max_tokens: 2500,
    messages: [
      { role: "system", content: "Respond ONLY with valid JSON." },
      { role: "user", content: prompt }
    ],
  });

  let content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty content");

  let parsed;
  try {
    parsed = safelyParseGroqJSON(content);

  } catch (e) {
    console.error("Groq JSON parse error:", e);
    console.log("RAW OUTPUT:", content);
    throw new Error("Failed to parse questions from Groq");
  }

  return parsed.slice(0, count).map((q, i) => ({
    id: q.id || `q${i + 1}`,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    difficulty: q.difficulty,
  }));
}

/* MODULE QUESTIONS */
export async function getModuleQuestions(req, res) {
  try {
    const { moduleId } = req.params;
    const { domain, level } = req.query;

    const topic = `Module ${moduleId} of ${domain} - ${level}`;
    const questions = await generateQuestionsWithGroq({ topic, count: 10 });

    return res.json({ success: true, questions, moduleId, mode: "module" });
  } catch (err) {
    console.error("getModuleQuestions error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate module questions" });
  }
}

/* FINAL QUESTIONS */
export async function getFinalQuestions(req, res) {
  try {
    const { domain, level } = req.query;

    const topic = `Final exam for ${domain} (${level})`;
    const questions = await generateQuestionsWithGroq({ topic, count: 30 });

    return res.json({ success: true, questions, mode: "final" });
  } catch (err) {
    console.error("getFinalQuestions error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate final exam questions" });
  }
}

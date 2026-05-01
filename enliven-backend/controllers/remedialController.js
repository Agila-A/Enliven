import Groq        from "groq-sdk"
import RemedialPlan from "../models/RemedialPlan.js"
import ChatbotContext from "../models/ChatbotContext.js"

function createGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing")
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

function extractJSON(raw) {
  if (!raw) throw new Error("Empty response")
  raw = raw.replace(/```json|```/gi, "").trim()
  const start = raw.indexOf("{")
  const end   = raw.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("No JSON object found")
  const jsonStr = raw.slice(start, end + 1)
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u0000-\u001F]+/g, " ")
  return JSON.parse(jsonStr)
}

export async function generatePlan(userId, attemptId, attemptData) {
  const {
    moduleId,
    moduleTitle,
    courseId,
    score,
    questions   = [],
    userAnswers = [],
    domain      = "",
    level       = "",
  } = attemptData

  // 1. Create a pending plan doc immediately so frontend can poll for it
  let plan = await RemedialPlan.create({
    userId,
    attemptId,
    moduleId,
    moduleTitle,
    courseId,
    score,
    status: "pending",
  })

  // 2. Identify exactly which questions were wrong
  const wrongQuestions = questions
    .map((q, i) => ({
      questionText:  q.question,
      correctAnswer: q.options?.[q.correctIndex] || "",
      studentAnswer: q.options?.[userAnswers[i]] || "No answer",
      explanation:   q.explanation || "",
      difficulty:    q.difficulty  || 1,
    }))
    .filter((_, i) => Number(userAnswers[i]) !== Number(questions[i]?.correctIndex))

  if (wrongQuestions.length === 0) {
    // Edge case: all correct but score < 60 (shouldn't happen, but handle gracefully)
    await RemedialPlan.findByIdAndUpdate(plan._id, {
      $set: {
        summary:    "You answered all questions correctly but your overall score was below the threshold. Please retake the test.",
        weakTopics: [],
        lessonPlan: [],
        practicePrompts: [],
        status:     "ready",
        generatedAt: new Date(),
      }
    })
    return
  }

  // 3. Build Groq prompt
  const prompt = `
You are a remedial tutor for an e-learning platform.

A student failed a module test on: "${moduleTitle}" in ${domain} (${level} level).
Their score: ${score}%.

These are the EXACT questions they got wrong:
${JSON.stringify(wrongQuestions, null, 2)}

Generate a targeted remedial plan in this EXACT JSON format. Output ONLY the JSON object, nothing else:

{
  "summary": "A 2-3 sentence explanation of what went wrong and the core concepts they need to strengthen. Be specific, not generic.",
  "weakTopics": [
    {
      "topic": "Specific topic name e.g. CSS Specificity",
      "description": "One sentence explaining what this topic is and why they struggled with it",
      "questionIds": ["q1", "q3"]
    }
  ],
  "lessonPlan": [
    {
      "step": 1,
      "title": "Short step title",
      "explanation": "What to do in this step and why it will help",
      "studyPrompt": "Exact message to send to Study Buddy e.g. Explain CSS specificity to me step by step with examples, I am at ${level} level"
    }
  ],
  "practicePrompts": [
    "Quiz me on CSS specificity with 4 questions",
    "Give me flashcards for the CSS box model",
    "Show me a diagram of how CSS cascade works"
  ]
}

Rules:
- weakTopics: identify 2-4 distinct weak areas from the wrong answers
- lessonPlan: exactly 3 ordered steps, each building on the previous
- practicePrompts: exactly 3 prompts, each a direct Study Buddy command
- studyPrompts must be specific to the exact weak topics, not generic
- All text must be practical and actionable, not motivational filler
`.trim()

  try {
    const groq = createGroqClient()
    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens:  1500,
      messages: [
        { role: "system", content: "You output only valid JSON objects. No markdown, no explanation, no text outside the JSON." },
        { role: "user",   content: prompt },
      ],
    })

    const raw     = completion.choices?.[0]?.message?.content
    const parsed  = extractJSON(raw)

    // 4. Save the completed plan
    await RemedialPlan.findByIdAndUpdate(plan._id, {
      $set: {
        summary:         parsed.summary         || "",
        weakTopics:      parsed.weakTopics      || [],
        lessonPlan:      parsed.lessonPlan      || [],
        practicePrompts: parsed.practicePrompts || [],
        status:          "ready",
        generatedAt:     new Date(),
      }
    })

    // 5. Inject weak topics into Study Buddy context
    // so Study Buddy already knows what to focus on when student opens it
    const weakTopicNames = (parsed.weakTopics || []).map(t => t.topic)
    if (weakTopicNames.length > 0) {
      await injectWeakTopicsIntoContext(userId, weakTopicNames, moduleTitle)
    }

  } catch (err) {
    console.error("Remedial plan generation error:", err.message)
    await RemedialPlan.findByIdAndUpdate(plan._id, {
      $set: { status: "failed" }
    })
  }
}

async function injectWeakTopicsIntoContext(userId, weakTopics, moduleTitle) {
  try {
    let ctx = await ChatbotContext.findOne({ userId })
    if (!ctx) ctx = new ChatbotContext({ userId, context: {} })

    ctx.context = {
      ...ctx.context,
      lastEvent:         "remedial_plan_ready",
      weakTopics,
      weakTopicsModule:  moduleTitle,
    }

    await ctx.save()
  } catch (err) {
    // Non-fatal
    console.error("Failed to inject weak topics into context:", err.message)
  }
}

export const getPlanByAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params
    const userId = req.userId

    const plan = await RemedialPlan.findOne({ attemptId, userId }).lean()

    if (!plan) {
      return res.json({ success: true, status: "pending", plan: null })
    }

    return res.json({ success: true, status: plan.status, plan })
  } catch (err) {
    console.error("getPlanByAttempt error:", err)
    res.status(500).json({ success: false, message: "Failed to fetch remedial plan" })
  }
}

export const getLatestPlanForModule = async (req, res) => {
  try {
    const { moduleId } = req.params
    const { courseId } = req.query
    const userId = req.userId

    const plan = await RemedialPlan.findOne({
      userId, moduleId, courseId, status: "ready"
    }).sort({ createdAt: -1 }).lean()

    return res.json({ success: true, plan: plan || null })
  } catch (err) {
    console.error("getLatestPlanForModule error:", err)
    res.status(500).json({ success: false, message: "Failed to fetch plan" })
  }
}

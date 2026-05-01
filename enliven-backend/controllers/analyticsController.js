import ProctorAttempt    from "../models/ProctorAttempt.js"
import AnalyticsSnapshot from "../models/AnalyticsSnapshot.js"
import Roadmap           from "../models/Roadmap.js"
import Groq              from "groq-sdk"

function createGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing")
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
const pct = (n, d) => d > 0 ? Math.round((n / d) * 100) : 0

function questionAccuracy(questions = [], userAnswers = []) {
  if (!questions.length) return null
  let correct = 0
  questions.forEach((q, i) => {
    if (Number(userAnswers[i]) === Number(q.correctIndex)) correct++
  })
  return { correct, total: questions.length, pct: pct(correct, questions.length) }
}

function integrityScore(violations = {}) {
  let score = 100
  score -= Math.min((violations.tabSwitches     || 0) * 10, 30)
  score -= Math.min((violations.faceNotDetected || 0) *  5, 20)
  score -= Math.min((violations.multipleFaces   || 0) * 10, 20)
  score -= Math.min((violations.lookingAway     || 0) *  3, 15)
  score -= Math.min((violations.expressionAlert || 0) *  3, 10)
  if (violations.noCamera) score -= 20
  return Math.max(0, score)
}

export async function computeSnapshot(userId) {
  // 1. Fetch all attempts sorted oldest-first
  const attempts = await ProctorAttempt.find({ userId }).sort({ createdAt: 1 }).lean()

  // 2. Fetch roadmap for module title lookup
  const roadmap = await Roadmap.findOne({ userId }).lean()
  const titleMap = {}
  if (roadmap?.topics) {
    roadmap.topics.forEach(t => { titleMap[String(t.sequenceNumber)] = t.title })
  }

  // 3. Build attempt details
  const attemptDetails = attempts.map(a => {
    const durationMs   = a.endedAt && a.startedAt
      ? new Date(a.endedAt) - new Date(a.startedAt) : null
    const durationMins = durationMs
      ? Math.round(durationMs / 60000 * 10) / 10 : null
    const accuracy     = questionAccuracy(a.questions, a.userAnswers)
    const integrity    = integrityScore(a.violations)
    const isFinal      = a.moduleId === "final"

    return {
      id:          String(a._id),
      moduleId:    a.moduleId,
      moduleTitle: isFinal ? "Final Exam" : (titleMap[a.moduleId] || `Module ${a.moduleId}`),
      courseId:    a.courseId,
      score:       a.score,
      passed:      a.passed,
      flagged:     a.flagged,
      durationMins,
      accuracy,
      integrity,
      violations:  a.violations,
      takenAt:     a.createdAt,
    }
  })

  // 4. Compute aggregates
  const scores      = attempts.map(a => a.score)
  const passedCount = attempts.filter(a => a.passed).length
  const flaggedCount= attempts.filter(a => a.flagged).length
  const durations   = attemptDetails.map(a => a.durationMins).filter(Boolean)
  const accuracies  = attemptDetails.map(a => a.accuracy?.pct).filter(v => v != null)
  const integrities = attemptDetails.map(a => a.integrity)

  const overallStats = {
    totalAttempts:   attempts.length,
    passedCount,
    failedCount:     attempts.length - passedCount,
    passRate:        pct(passedCount, attempts.length),
    avgScore:        Math.round(avg(scores)),
    highestScore:    attempts.length ? Math.max(...scores) : 0,
    lowestScore:     attempts.length ? Math.min(...scores) : 0,
    avgDurationMins: durations.length  ? Math.round(avg(durations) * 10) / 10 : null,
    avgAccuracy:     accuracies.length ? Math.round(avg(accuracies)) : null,
    avgIntegrity:    Math.round(avg(integrities)) || 100,
    flaggedCount,
  }

  const scoreTrend = attemptDetails.map(a => ({
    label: a.moduleTitle, score: a.score, passed: a.passed, date: a.takenAt,
  }))

  const moduleComparison = attemptDetails.map(a => ({
    label: a.moduleTitle, score: a.score, passed: a.passed,
    accuracy: a.accuracy?.pct ?? null,
  }))

  const timeTaken = attemptDetails
    .filter(a => a.durationMins !== null)
    .map(a => ({ label: a.moduleTitle, minutes: a.durationMins }))

  const totalViolations = attempts.reduce(
    (acc, a) => {
      acc.tabSwitches     += a.violations?.tabSwitches     || 0
      acc.faceNotDetected += a.violations?.faceNotDetected || 0
      acc.multipleFaces   += a.violations?.multipleFaces   || 0
      acc.lookingAway     += a.violations?.lookingAway     || 0
      acc.expressionAlert += a.violations?.expressionAlert || 0
      if (a.violations?.noCamera) acc.noCameraCount++
      return acc
    },
    { tabSwitches: 0, faceNotDetected: 0, multipleFaces: 0,
      lookingAway: 0, expressionAlert: 0, noCameraCount: 0 }
  )

  // 5. Save snapshot — upsert (one doc per user, updated every time)
  const snapshot = await AnalyticsSnapshot.findOneAndUpdate(
    { userId },
    {
      $set: {
        overallStats,
        scoreTrend,
        moduleComparison,
        timeTaken,
        totalViolations,
        attemptDetails,
        computedAt: new Date(),
      }
    },
    { upsert: true, new: true }
  )

  return snapshot
}

export async function generateAndStoreReport(userId) {
  try {
    const snapshot = await AnalyticsSnapshot.findOne({ userId })
    if (!snapshot || !snapshot.overallStats.totalAttempts) return

    const groq = createGroqClient()

    const prompt = `
You are an expert learning coach analysing a student's assessment performance.

OVERALL STATS:
${JSON.stringify(snapshot.overallStats, null, 2)}

SCORE TREND:
${JSON.stringify(snapshot.scoreTrend, null, 2)}

VIOLATIONS:
${JSON.stringify(snapshot.totalViolations, null, 2)}

RECENT ATTEMPTS (last 5):
${JSON.stringify(snapshot.attemptDetails.slice(-5), null, 2)}

Write a concise, encouraging, and specific performance report:
1. Overall performance summary (2-3 sentences)
2. Strengths observed (1-2 specific points from data)
3. Areas for improvement (1-2 actionable points)
4. Proctoring integrity observation (1 sentence, only if notable violations exist)
5. Motivational closing (1 sentence)

Tone: warm, professional, data-driven. Use specific numbers.
Plain paragraphs only. No bullet points. No markdown headers.
150-200 words total.
`.trim()

    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens:  400,
      messages: [
        { role: "system", content: "You are an expert learning coach. Write encouraging, data-driven performance reports in plain paragraphs." },
        { role: "user",   content: prompt },
      ],
    })

    const report = completion.choices?.[0]?.message?.content
    if (!report) return

    await AnalyticsSnapshot.findOneAndUpdate(
      { userId },
      { $set: { "aiReport.text": report, "aiReport.generatedAt": new Date() } }
    )
  } catch (err) {
    // Non-fatal — log but never block the test submission flow
    console.error("generateAndStoreReport error:", err.message)
  }
}

export const getAnalytics = async (req, res) => {
  try {
    const userId = req.userId

    const snapshot = await AnalyticsSnapshot.findOne({ userId }).lean()

    if (!snapshot || snapshot.overallStats.totalAttempts === 0) {
      return res.json({
        success: true,
        hasData:  false,
        message:  "No assessment attempts yet.",
      })
    }

    return res.json({
      success:          true,
      hasData:          true,
      overallStats:     snapshot.overallStats,
      scoreTrend:       snapshot.scoreTrend,
      moduleComparison: snapshot.moduleComparison,
      timeTaken:        snapshot.timeTaken,
      totalViolations:  snapshot.totalViolations,
      attemptDetails:   snapshot.attemptDetails,
      aiReport:         snapshot.aiReport,
      computedAt:       snapshot.computedAt,
    })
  } catch (err) {
    console.error("getAnalytics error:", err)
    res.status(500).json({ success: false, message: "Failed to load analytics" })
  }
}

export const generateReport = async (req, res) => {
  try {
    await generateAndStoreReport(req.userId)
    const snapshot = await AnalyticsSnapshot.findOne({ userId: req.userId }).lean()
    return res.json({
      success: true,
      report:  snapshot?.aiReport?.text || "",
      generatedAt: snapshot?.aiReport?.generatedAt,
    })
  } catch (err) {
    console.error("generateReport error:", err)
    res.status(500).json({ success: false, message: "Failed to generate report" })
  }
}
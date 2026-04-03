// controllers/analyticsController.js
import ProctorAttempt from "../models/ProctorAttempt.js";
import Roadmap        from "../models/Roadmap.js";
import Groq           from "groq-sdk";

function createGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/* ─── HELPERS ─────────────────────────────────────────────────── */
const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
const pct = (n, d) => d > 0 ? Math.round((n / d) * 100) : 0;

/* ─── COMPUTE PER-QUESTION ACCURACY ──────────────────────────────
   questions: [{correctIndex}], userAnswers: [number]
   Returns fraction of questions answered correctly.
────────────────────────────────────────────────────────────────── */
function questionAccuracy(questions = [], userAnswers = []) {
  if (!questions.length) return null;
  let correct = 0;
  questions.forEach((q, i) => {
    if (Number(userAnswers[i]) === Number(q.correctIndex)) correct++;
  });
  return { correct, total: questions.length, pct: pct(correct, questions.length) };
}

/* ─── PROCTORING INTEGRITY SCORE ─────────────────────────────────
   Starts at 100, deducts points per violation type.
   Returns 0-100 integer.
────────────────────────────────────────────────────────────────── */
function integrityScore(violations = {}) {
  let score = 100;
  score -= Math.min((violations.tabSwitches     || 0) * 10, 30);
  score -= Math.min((violations.faceNotDetected || 0) *  5, 20);
  score -= Math.min((violations.multipleFaces   || 0) * 10, 20);
  score -= Math.min((violations.lookingAway     || 0) *  3, 15);
  score -= Math.min((violations.expressionAlert || 0) *  3, 10);
  if (violations.noCamera) score -= 20;
  return Math.max(0, score);
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/analytics
   Returns all computed analytics for the current user.
═══════════════════════════════════════════════════════════════ */
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.userId;

    // Fetch all attempts sorted oldest-first (for trend charts)
    const attempts = await ProctorAttempt.find({ userId })
      .sort({ createdAt: 1 })
      .lean();

    if (!attempts.length) {
      return res.json({
        success:  true,
        hasData:  false,
        message:  "No assessment attempts yet.",
      });
    }

    // Fetch roadmap for module title lookup
    const roadmap = await Roadmap.findOne({ userId }).lean();
    const titleMap = {};
    if (roadmap?.topics) {
      roadmap.topics.forEach(t => { titleMap[String(t.sequenceNumber)] = t.title; });
    }

    /* ── Per-attempt detail ── */
    const attemptDetails = attempts.map(a => {
      const durationMs   = a.endedAt && a.startedAt
        ? new Date(a.endedAt) - new Date(a.startedAt)
        : null;
      const durationMins = durationMs ? Math.round(durationMs / 60000 * 10) / 10 : null;
      const accuracy     = questionAccuracy(a.questions, a.userAnswers);
      const integrity    = integrityScore(a.violations);
      const isFinal      = a.moduleId === "final";

      return {
        id:         String(a._id),
        moduleId:   a.moduleId,
        moduleTitle: isFinal
          ? "Final Exam"
          : (titleMap[a.moduleId] || `Module ${a.moduleId}`),
        courseId:    a.courseId,
        score:       a.score,
        passed:      a.passed,
        flagged:     a.flagged,
        durationMins,
        accuracy,
        integrity,
        violations:  a.violations,
        takenAt:     a.createdAt,
      };
    });

    /* ── Score trend per module (chronological) ── */
    const scoreTrend = attemptDetails.map(a => ({
      label:  a.moduleTitle,
      score:  a.score,
      passed: a.passed,
      date:   a.takenAt,
    }));

    /* ── Aggregate violation counts across all attempts ── */
    const totalViolations = attempts.reduce(
      (acc, a) => {
        acc.tabSwitches     += a.violations?.tabSwitches     || 0;
        acc.faceNotDetected += a.violations?.faceNotDetected || 0;
        acc.multipleFaces   += a.violations?.multipleFaces   || 0;
        acc.lookingAway     += a.violations?.lookingAway     || 0;
        acc.expressionAlert += a.violations?.expressionAlert || 0;
        if (a.violations?.noCamera) acc.noCameraCount++;
        return acc;
      },
      { tabSwitches: 0, faceNotDetected: 0, multipleFaces: 0,
        lookingAway: 0, expressionAlert: 0, noCameraCount: 0 }
    );

    /* ── Overall stats ── */
    const scores       = attempts.map(a => a.score);
    const passedCount  = attempts.filter(a => a.passed).length;
    const flaggedCount = attempts.filter(a => a.flagged).length;
    const durations    = attemptDetails.map(a => a.durationMins).filter(Boolean);
    const accuracies   = attemptDetails.map(a => a.accuracy?.pct).filter(v => v != null);
    const integrities  = attemptDetails.map(a => a.integrity);

    const overallStats = {
      totalAttempts:   attempts.length,
      passedCount,
      failedCount:     attempts.length - passedCount,
      passRate:        pct(passedCount, attempts.length),
      avgScore:        Math.round(avg(scores)),
      highestScore:    Math.max(...scores),
      lowestScore:     Math.min(...scores),
      avgDurationMins: durations.length ? Math.round(avg(durations) * 10) / 10 : null,
      avgAccuracy:     accuracies.length ? Math.round(avg(accuracies)) : null,
      avgIntegrity:    Math.round(avg(integrities)),
      flaggedCount,
    };

    /* ── Time taken per test (for bar chart) ── */
    const timeTaken = attemptDetails
      .filter(a => a.durationMins !== null)
      .map(a => ({ label: a.moduleTitle, minutes: a.durationMins }));

    /* ── Module comparison (score bar chart) ── */
    const moduleComparison = attemptDetails.map(a => ({
      label:    a.moduleTitle,
      score:    a.score,
      passed:   a.passed,
      accuracy: a.accuracy?.pct ?? null,
    }));

    return res.json({
      success:           true,
      hasData:           true,
      overallStats,
      scoreTrend,
      moduleComparison,
      timeTaken,
      totalViolations,
      attemptDetails,
    });
  } catch (err) {
    console.error("getAnalytics error:", err);
    res.status(500).json({ success: false, message: "Failed to load analytics" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   POST /api/analytics/report
   Calls Groq to generate a personalised AI report from analytics data.
   Body: { overallStats, scoreTrend, totalViolations, attemptDetails }
═══════════════════════════════════════════════════════════════ */
export const generateReport = async (req, res) => {
  try {
    const { overallStats, scoreTrend, totalViolations, attemptDetails } = req.body;

    if (!overallStats) {
      return res.status(400).json({ success: false, message: "Analytics data required" });
    }

    const groq = createGroqClient();

    const prompt = `
You are an expert learning coach analysing a student's assessment performance on an e-learning platform.

Here is their data:

OVERALL STATS:
${JSON.stringify(overallStats, null, 2)}

SCORE TREND (chronological):
${JSON.stringify(scoreTrend, null, 2)}

TOTAL PROCTORING VIOLATIONS:
${JSON.stringify(totalViolations, null, 2)}

ATTEMPT DETAILS:
${JSON.stringify(attemptDetails?.slice(0, 10), null, 2)}

Write a concise, encouraging, and specific performance report covering:
1. Overall performance summary (2-3 sentences)
2. Strengths observed (1-2 specific points based on data)
3. Areas for improvement (1-2 specific, actionable points)
4. Proctoring integrity observation (1 sentence, only mention if there are notable violations)
5. Motivational closing (1 sentence)

Keep the tone warm, professional, and encouraging. Use specific numbers from the data.
Write in plain paragraphs — no bullet points, no markdown headers.
Total length: 150-200 words.
`.trim();

    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens:  400,
      messages: [
        { role: "system", content: "You are an expert learning coach. Write encouraging, data-driven performance reports." },
        { role: "user",   content: prompt },
      ],
    });

    const report = completion.choices?.[0]?.message?.content;
    if (!report) throw new Error("Groq returned empty report");

    return res.json({ success: true, report });
  } catch (err) {
    console.error("generateReport error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate report" });
  }
};
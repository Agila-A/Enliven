import Groq           from "groq-sdk"
import CodeSubmission from "../models/CodeSubmission.js"
import Roadmap        from "../models/Roadmap.js"

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
  return JSON.parse(
    raw.slice(start, end + 1)
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\u0000-\u001F]+/g, " ")
  )
}

async function runCodeReview(submissionId) {
  const submission = await CodeSubmission.findById(submissionId)
  if (!submission) return

  const { code, language, description, moduleId, courseId, userId, isFinalProject } = submission

  // Get module title from roadmap
  let moduleTitle = `Module ${moduleId}`
  try {
    const roadmap = await Roadmap.findOne({ userId }).lean()
    const topic   = roadmap?.topics?.find(
      t => String(t.sequenceNumber) === String(moduleId)
    )
    if (topic?.title) moduleTitle = topic.title
  } catch { /* non-fatal */ }

  const prompt = `
You are a senior software engineer conducting a thorough code review.
Your goal is to teach, not just evaluate. Explain the WHY behind every point.

CONTEXT:
- Module: "${moduleTitle}"
- Language: ${language}
- Student description: "${description || "No description provided"}"
- This is a ${isFinalProject ? "FINAL PROJECT submission" : "module exercise"}

CODE TO REVIEW:
\`\`\`${language}
${code}
\`\`\`

Provide a thorough code review in this EXACT JSON format. Output ONLY the JSON object:

{
  "summary": "2-3 paragraph overall assessment. Be specific about what this code does, how well it does it, and the most important thing to improve. Write like a senior dev talking to a junior one they want to see grow.",
  "whatWentWell": [
    "Specific thing done correctly with explanation of why it matters",
    "Another specific strength"
  ],
  "issues": [
    "Specific problem found with explanation of why it is a problem and what could go wrong",
    "Another issue"
  ],
  "lineComments": [
    {
      "line": 5,
      "comment": "This variable name 'x' tells us nothing. Rename to something that describes what it holds e.g. 'userIndex'",
      "type": "suggestion"
    },
    {
      "line": 12,
      "comment": "Nested loop here makes this O(n²). If the input grows, this will be slow. Consider using a Map for O(n) lookup instead.",
      "type": "warning"
    }
  ],
  "timeComplexity": "O(n²) due to nested loops on lines 10-14. Refactoring to use a hashmap would bring this to O(n).",
  "spaceComplexity": "O(n) — you store all elements in the result array which is appropriate here.",
  "suggestions": [
    "Extract the validation logic on lines 3-8 into a separate function called validateInput() for reusability",
    "Add error handling for the case where the input array is empty — currently this will throw on line 10",
    "Consider using const instead of let for variables that are never reassigned"
  ],
  "overallScore": 72
}

Rules:
- lineComments: include 3-6 specific line-level comments. Use null for line if it is a general comment.
- type must be: "error" (will break), "warning" (inefficient/risky), "suggestion" (improvement), "praise" (done well)
- whatWentWell: at least 2 genuine positives — never skip this
- issues: be specific, cite line numbers in the text where relevant
- overallScore: 0-100, be honest but fair. Module exercises 50-85 range typical, final projects can go higher.
- For final projects: go deeper on architecture, patterns, and production-readiness
`.trim()

  try {
    const groq       = createGroqClient()
    const completion = await groq.chat.completions.create({
      model:       "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens:  2000,
      messages: [
        { role: "system", content: "You are a senior software engineer. Output only valid JSON." },
        { role: "user",   content: prompt },
      ],
    })

    const raw    = completion.choices?.[0]?.message?.content
    const parsed = extractJSON(raw)

    await CodeSubmission.findByIdAndUpdate(submissionId, {
      $set: {
        "aiReview.status":          "ready",
        "aiReview.summary":          parsed.summary          || "",
        "aiReview.whatWentWell":     parsed.whatWentWell     || [],
        "aiReview.issues":           parsed.issues           || [],
        "aiReview.lineComments":     parsed.lineComments     || [],
        "aiReview.timeComplexity":   parsed.timeComplexity   || "",
        "aiReview.spaceComplexity":  parsed.spaceComplexity  || "",
        "aiReview.suggestions":      parsed.suggestions      || [],
        "aiReview.overallScore":     parsed.overallScore     ?? null,
        "aiReview.generatedAt":      new Date(),
      }
    })
  } catch (err) {
    console.error("Code review generation error:", err.message)
    await CodeSubmission.findByIdAndUpdate(submissionId, {
      $set: { "aiReview.status": "failed" }
    })
  }
}

/* POST /api/code-review/submit
   Student submits code for a module or final project.
   Creates submission doc and fires AI review in background.
*/
export const submitCode = async (req, res) => {
  try {
    const userId = req.userId
    const { courseId, moduleId, code, language, description, isFinalProject } = req.body

    if (!courseId || !moduleId || !code?.trim()) {
      return res.status(400).json({
        success: false,
        message: "courseId, moduleId and code are required"
      })
    }

    if (code.length > 50000) {
      return res.status(400).json({
        success: false,
        message: "Code exceeds maximum length of 50,000 characters"
      })
    }

    // Create submission with pending review
    const submission = await CodeSubmission.create({
      userId,
      courseId,
      moduleId,
      code: code.trim(),
      language:       language       || "javascript",
      description:    description    || "",
      isFinalProject: !!isFinalProject,
      aiReview: { status: "pending" },
    })

    // Fire AI review in background — do not await
    runCodeReview(submission._id)
      .catch(err => console.error("Background code review error:", err.message))

    return res.status(201).json({
      success:      true,
      submissionId: submission._id,
      message:      "Submission received. AI review will be ready in about 15-20 seconds.",
    })
  } catch (err) {
    console.error("submitCode error:", err)
    res.status(500).json({ success: false, message: "Failed to submit code" })
  }
}

/* GET /api/code-review/:submissionId
   Poll for review status and result.
*/
export const getReview = async (req, res) => {
  try {
    const { submissionId } = req.params
    const userId = req.userId

    const submission = await CodeSubmission.findOne({ _id: submissionId, userId }).lean()
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" })
    }

    return res.json({
      success:    true,
      status:     submission.aiReview.status,
      submission: {
        id:             String(submission._id),
        code:           submission.code,
        language:       submission.language,
        description:    submission.description,
        moduleId:       submission.moduleId,
        isFinalProject: submission.isFinalProject,
        submittedAt:    submission.createdAt,
        aiReview:       submission.aiReview,
        mentorReview:   submission.mentorReview,
      }
    })
  } catch (err) {
    console.error("getReview error:", err)
    res.status(500).json({ success: false, message: "Failed to fetch review" })
  }
}

/* GET /api/code-review/history/:courseId/:moduleId
   Get all submissions for a specific module by this user.
*/
export const getSubmissionHistory = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params
    const userId = req.userId

    const submissions = await CodeSubmission.find({ userId, courseId, moduleId })
      .select("-code") // don't send full code in list view
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ success: true, submissions })
  } catch (err) {
    console.error("getSubmissionHistory error:", err)
    res.status(500).json({ success: false, message: "Failed to fetch submissions" })
  }
}

/* GET /api/code-review/final/:courseId
   Get final project submission for this user and course.
*/
export const getFinalProjectSubmission = async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.userId

    const submission = await CodeSubmission.findOne({
      userId, courseId, isFinalProject: true
    }).sort({ createdAt: -1 }).lean()

    return res.json({ success: true, submission: submission || null })
  } catch (err) {
    console.error("getFinalProjectSubmission error:", err)
    res.status(500).json({ success: false, message: "Failed to fetch final project" })
  }
}

/* PUT /api/code-review/:submissionId/mentor-review
   Mentor submits their review of a final project.
   Only accessible to users with role: "mentor".
*/
export const submitMentorReview = async (req, res) => {
  try {
    const { submissionId } = req.params
    const { status, feedback } = req.body
    const mentorId = req.userId

    if (!["approved", "rejected", "needs_revision"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be approved, rejected, or needs_revision"
      })
    }

    const submission = await CodeSubmission.findByIdAndUpdate(
      submissionId,
      {
        $set: {
          "mentorReview.status":     status,
          "mentorReview.feedback":   feedback || "",
          "mentorReview.reviewedAt": new Date(),
          "mentorReview.reviewedBy": mentorId,
        }
      },
      { new: true }
    ).lean()

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" })
    }

    return res.json({ success: true, submission })
  } catch (err) {
    console.error("submitMentorReview error:", err)
    res.status(500).json({ success: false, message: "Failed to submit mentor review" })
  }
}

/* GET /api/code-review/mentor/pending
   Mentor sees all final project submissions pending their review.
   Only accessible to mentors.
*/
export const getPendingMentorReviews = async (req, res) => {
  try {
    const submissions = await CodeSubmission.find({
      isFinalProject:         true,
      "mentorReview.status":  "pending",
    })
      .populate("userId", "name email domain skillLevel")
      .sort({ createdAt: 1 }) // oldest first — review in order
      .lean()

    return res.json({ success: true, submissions })
  } catch (err) {
    console.error("getPendingMentorReviews error:", err)
    res.status(500).json({ success: false, message: "Failed to fetch pending reviews" })
  }
}

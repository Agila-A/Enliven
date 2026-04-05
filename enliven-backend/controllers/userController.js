import User from "../models/User.js";
import { getGroqClient } from "../ai/groqClient.js";
import { assessmentQuestions } from "../data/assessmentQuestions.js";

// ---------------------
// 1. DOMAIN SELECTION
// ---------------------
export const selectDomain = async (req, res) => {
  try {
    const userId = req.userId;
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, message: "Domain is required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { domain },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Domain selected successfully",
      domain: user.domain
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------
// 2. INITIAL ASSESSMENT
// ---------------------
export const initialAssessment = async (req, res) => {
  try {
    const userId = req.userId;
    const { answers } = req.body; 

    const user = await User.findById(userId);
    if (!user || !user.currentAssessment || user.currentAssessment.length === 0) {
      return res.status(400).json({ success: false, message: "Assessment not found" });
    }

    if (!answers || answers.length !== user.currentAssessment.length) {
      return res.status(400).json({
        success: false,
        message: `Exactly ${user.currentAssessment.length} answers are required`
      });
    }

    let results = {
      easy: { correct: 0, total: 3 },
      medium: { correct: 0, total: 4 },
      hard: { correct: 0, total: 3 }
    };

    user.currentAssessment.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) {
        results[q.difficulty].correct++;
      }
    });

    let skillLevel = "Beginner";
    const { easy, medium, hard } = results;

    // Advanced: Strong across all levels (Easy 3, Medium 3-4, Hard 2-3)
    if (easy.correct >= 2 && medium.correct >= 3 && hard.correct >= 2) {
      skillLevel = "Advanced";
    }
    // Intermediate: Good in Easy/Medium (Easy 2-3, Medium 2-4), Partial in Hard (1-2)
    else if (easy.correct >= 2 && medium.correct >= 2) {
      skillLevel = "Intermediate";
    }
    // Beginner: Otherwise (Mostly correct in Easy, Struggles with Medium/Hard)
    else {
      skillLevel = "Beginner";
    }

    user.skillLevel = skillLevel;
    await user.save();

    return res.json({
      success: true,
      message: "Skill level determined",
      skillLevel: user.skillLevel,
      domain: user.domain
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------
// 0. GET ASSESSMENT QUESTIONS
// ---------------------
export const getAssessmentQuestions = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user || !user.domain) {
      return res.status(400).json({ success: false, message: "Please select a domain first" });
    }

    const groq = getGroqClient();
    const domain = user.domain;

    const prompt = `
INPUT:
- Domain: ${domain}

STEP 1 — Generate Questions:
Create exactly 10 multiple-choice questions for the given domain.

Requirements:
- Questions must be strictly related to the selected domain
- Difficulty must gradually increase:
  - Questions 1–3 → Easy (basic fundamentals)
  - Questions 4–7 → Medium (applied understanding)
  - Questions 8–10 → Hard (advanced concepts)
- Each question must have exactly 4 options
- Only one correct answer
- Questions must be practical and real-world oriented
- Avoid generic or theoretical questions

STEP 3 — Return response in STRICT JSON format:

{
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A/B/C/D",
      "difficulty": "easy/medium/hard"
    }
  ],
  "evaluationRules": {
    "beginner": "description",
    "intermediate": "description",
    "advanced": "description"
  }
}
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(response.choices[0].message.content);
    
    // Store in user model for validation
    user.currentAssessment = data.questions;
    await user.save();

    // Return questions to frontend (maybe hide correct answers?)
    // Actually, for initial assessment, we can return questions without correct answers for extra security
    const frontendQuestions = data.questions.map(q => ({
      question: q.question,
      options: q.options,
      difficulty: q.difficulty
    }));

    return res.json({
      success: true,
      questions: frontendQuestions,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

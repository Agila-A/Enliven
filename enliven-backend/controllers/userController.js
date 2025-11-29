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
    const groq = getGroqClient();
    const userId = req.userId;
    const { answers } = req.body; 

    if (!answers || answers.length !== 5) {
      return res.status(400).json({
        success: false,
        message: "Five answers are required"
      });
    }

    const prompt = `
You are an evaluator. Classify the student's skill level based on these MCQ answers.

Options Meaning:
A = Very Low
B = Basic
C = Moderate
D = Strong

User Answers: ${answers.join(", ")}

Return only one word:
Beginner, Intermediate, or Advanced.
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }]
    });

    const skillLevel = response.choices[0].message.content.trim();

    const user = await User.findByIdAndUpdate(
      userId,
      { skillLevel },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Skill level determined",
      skillLevel: user.skillLevel
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------
// 0. GET ASSESSMENT QUESTIONS
// ---------------------
export const getAssessmentQuestions = (req, res) => {
  try {
    return res.json({
      success: true,
      questions: assessmentQuestions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

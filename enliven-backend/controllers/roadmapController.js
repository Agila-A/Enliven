import Roadmap from "../models/Roadmap.js";
import { getGroqClient } from "../ai/groqClient.js";

export const generateRoadmap = async (req, res) => {
  try {
    const userId = req.userId;
    const { domain, skillLevel } = req.body;

    if (!domain || !skillLevel) {
      return res.status(400).json({ message: "Domain & skillLevel required" });
    }

    const groq = getGroqClient();

    const prompt = `
Generate a clean JSON roadmap for a student.

Domain: ${domain}
Skill Level: ${skillLevel}

Return only a JSON array like this:
[
  {
    "title": "Step name",
    "description": "One sentence",
    "sequenceNumber": 1
  }
]

Rules:
- 6 to 8 steps max.
- DO NOT include videoLinks or any URLs.
- Return only valid JSON, no extra text.
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const jsonText = response.choices[0].message.content.trim();
    const topics = JSON.parse(jsonText);

    const roadmap = await Roadmap.create({
      userId,
      domain,
      skillLevel,
      topics,
    });

    return res.json({ success: true, roadmap });

  } catch (err) {
    console.error("AI Roadmap Error:", err);
    return res.status(500).json({ message: "Error generating roadmap" });
  }
};


export const getUserRoadmap = async (req, res) => {
  try {
    const userId = req.userId;

    const roadmap = await Roadmap.findOne({ userId });

    if (!roadmap) {
      return res.status(404).json({ message: "No roadmap found" });
    }

    return res.json({ success: true, roadmap });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

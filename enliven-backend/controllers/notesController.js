// src/controllers/notesController.js
import { getGroqClient } from "../ai/groqClient.js";

export const generateNotes = async (req, res) => {
  try {
    const { videoTitle, videoUrl } = req.body;

    if (!videoTitle) {
      return res.status(400).json({ success: false, message: "videoTitle required" });
    }

    const groq = getGroqClient();

    const prompt = `
Generate clean and structured study notes for the video:

Title: "${videoTitle}"
${videoUrl ? `Video URL: ${videoUrl}` : ""}

Rules:
- Write clean, structured notes in simple Markdown
- Use bullet points, numbered lists, and section headings
- Keep the notes beginner‑friendly and easy to understand
- Use only info logically related to the video title (and URL if provided)
- DO NOT mention anything about watching or not watching the video
- DO NOT add asterisks for bold unless necessary (use plain headings instead)
- Avoid unnecessary decoration, emojis, or filler phrases
- Notes must be concise and focused on key concepts
- Return only Markdown-formatted plain text (NO JSON, NO extra explanations)
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const notes = response.choices[0].message.content;

    return res.json({ success: true, notes });

  } catch (err) {
    console.error("Notes AI Error:", err);
    res.status(500).json({ success: false, message: "Failed to generate notes" });
  }
};


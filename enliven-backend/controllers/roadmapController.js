// controllers/roadmapController.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Roadmap from "../models/Roadmap.js";
import { getGroqClient } from "../ai/groqClient.js";

// ---------- PATHS ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.resolve(__dirname, "..", "data", "course-content");

// ---------- HELPERS ----------
const toSlug = (s = "") => s.toLowerCase().trim().replace(/\s+/g, "-");
const toLevel = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "");

// Load the JSON steps for a domain/level
async function loadAllowedTitles(domainSlug, levelLower) {
  const file = path.join(baseDir, domainSlug, `${levelLower}.json`);
  const raw = await fs.readFile(file, "utf-8");
  const json = JSON.parse(raw);

  return (json.steps || []).map((s) => s.title).filter(Boolean);
}

// Snap generated titles to allowed list
function snapToAllowed(title, allowedTitles) {
  if (!title) return null;
  const lower = title.toLowerCase().trim();

  // 1. exact
  const exact = allowedTitles.find(
    (t) => t.toLowerCase().trim() === lower
  );
  if (exact) return exact;

  // 2. substring
  for (const t of allowedTitles) {
    const tl = t.toLowerCase();
    if (tl.includes(lower) || lower.includes(tl)) return t;
  }

  // 3. word overlap
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  for (const t of allowedTitles) {
    const tl = t.toLowerCase();
    const overlap = words.filter(w => tl.includes(w));
    if (overlap.length) return t;
  }

  return null;
}

// Clean JSON parsing from Groq
function parseJSONSafe(text) {
  if (!text) throw new Error("Empty Groq response");

  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
}

// ===================================================================
//  POST /api/roadmap/generate
// ===================================================================

export const generateRoadmap = async (req, res) => {
  try {
    const userId = req.userId;
    let { domain, skillLevel } = req.body;

    if (!domain || !skillLevel) {
      return res.status(400).json({ message: "Domain & skillLevel required" });
    }

    skillLevel = skillLevel.toString().trim();

    const domainSlug = toSlug(domain);        // web-development
    const levelLower = toLevel(skillLevel);   // beginner

    // ---- Load course titles from your JSON ----
    const allowedTitles = await loadAllowedTitles(domainSlug, levelLower);

    if (!allowedTitles.length) {
      return res.status(400).json({ message: "No course content found for domain/level" });
    }

    // ---- Prompt for Groq ----
    const groq = getGroqClient();
    const prompt = `
You're generating a learning roadmap.

Domain: ${domain}
Level: ${skillLevel}

Use ONLY these step titles exactly:
${allowedTitles.map((t, i) => `${i + 1}. "${t}"`).join("\n")}

Task:
- Pick 5–7 titles from the list that match a ${skillLevel} learner.
- Order them logically.
- Add one-sentence descriptions.
- Start numbering from 1 using "sequenceNumber".

Return ONLY valid JSON array:
[
  { "title": "<title>", "description": "<sentence>", "sequenceNumber": 1 }
]
`.trim();

    let topics = [];

    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      const rawText = response.choices?.[0]?.message?.content?.trim();
      const rawJson = parseJSONSafe(rawText);

      const seen = new Set();

      topics = rawJson
        .map((step, idx) => {
          const snapped = snapToAllowed(step.title, allowedTitles);
          if (!snapped || seen.has(snapped)) return null;

          seen.add(snapped);

          return {
            title: snapped,
            description: step.description?.toString() || "",
            sequenceNumber: Number(step.sequenceNumber) || idx + 1
          };
        })
        .filter(Boolean);

      if (!topics.length) throw new Error("Groq returned no valid steps");
    } catch (err) {
      // ---- FALLBACK ----
      topics = allowedTitles.slice(0, 6).map((t, i) => ({
        title: t,
        description: `Learn ${t} with hands-on practice.`,
        sequenceNumber: i + 1,
      }));
    }

    // ---- Save to DB (UPSERT) ----
    const roadmap = await Roadmap.findOneAndUpdate(
      { userId },
      {
        userId,
        domain: domainSlug,
        skillLevel: levelLower,
        topics: topics.sort((a, b) => a.sequenceNumber - b.sequenceNumber),
      },
      { new: true, upsert: true }
    );

    return res.json({ success: true, roadmap });

  } catch (err) {
    console.error("AI Roadmap Error:", err);
    return res.status(500).json({ message: "Error generating roadmap" });
  }
};

// ===================================================================
//  GET /api/roadmap/me
// ===================================================================

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

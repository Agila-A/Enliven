import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Roadmap from "../models/Roadmap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Go to: backend/src/controllers → back 1 → into data/course-content
const baseDir = path.resolve(__dirname, "..", "data", "course-content");

const toSlug = (s) => s.toLowerCase().replace(/\s+/g, "-");
const toLevel = (s) => s.toLowerCase();

async function loadContent(domain, level) {
  const file = path.join(baseDir, toSlug(domain), `${toLevel(level)}.json`);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw);
}

/* ------------------------------------------------------------------
   SMART MATCHING: Handles mismatched titles between Groq & JSON file
-------------------------------------------------------------------*/
function findMatchForTitle(topicTitle, map) {
  if (!topicTitle) return null;

  const lower = topicTitle.toLowerCase().trim();

  // 1. perfect match
  if (map.has(lower)) return map.get(lower);

  // 2. loose matching — substring match
  for (const [key, value] of map.entries()) {
    if (key.includes(lower) || lower.includes(key)) {
      return value;
    }
  }

  // 3. word-based fuzzy match: match at least one keyword
  const topicWords = lower.split(" ").filter(w => w.length > 2);

  for (const [key, value] of map.entries()) {
    const keyWords = key.split(" ");
    const common = topicWords.filter(w => keyWords.includes(w));
    if (common.length >= 1) {
      return value;
    }
  }

  return null;
}

// ------------------------------------------------------------------
// GET /api/courses/:domain/:level
// ------------------------------------------------------------------
export const getCourseContent = async (req, res) => {
  try {
    const { domain, level } = req.params;
    const data = await loadContent(domain, level);

    res.json({ success: true, domain, level, ...data });
  } catch (e) {
    console.error(e);
    res.status(404).json({ success: false, message: "Course content not found" });
  }
};

// ------------------------------------------------------------------
// GET /api/courses/:domain/:level/merged
// Merges: Roadmap topics + JSON links/resources
// ------------------------------------------------------------------
export const getMergedCourseForUser = async (req, res) => {
  try {
    const { domain, level } = req.params;
    const userId = req.userId;

    const roadmap = await Roadmap.findOne({
  userId,
  domain: domain.toLowerCase(),
  skillLevel: level.toLowerCase(),
});



    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "No roadmap for user"
      });
    }

    const content = await loadContent(domain, level);

    // map titles from JSON → content
    const map = new Map(
      (content.steps || []).map(s => [s.title.toLowerCase().trim(), s])
    );

    const items = roadmap.topics
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map(t => {
        const matched = findMatchForTitle(t.title, map);

        return {
          sequenceNumber: t.sequenceNumber,
          title: t.title,
          description: t.description,
          links: matched?.links || [],
          resources: matched?.resources || []
        };
      });

    res.json({
      success: true,
      domain,
      level,
      skillLevel: roadmap.skillLevel,
      items
    });

  } catch (e) {
    console.error("MERGE ERROR:", e);
    res.status(500).json({
      success: false,
      message: "Failed to build course content"
    });
  }
};

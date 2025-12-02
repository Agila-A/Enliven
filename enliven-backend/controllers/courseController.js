// src/controllers/courseController.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Roadmap from "../models/Roadmap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base path: backend/src/data/course-content/<domain>/<level>.json
const baseDir = path.resolve(__dirname, "..", "data", "course-content");

// -------------------------
// Helpers
// -------------------------
const toSlug = (s = "") => s.toLowerCase().replace(/\s+/g, "-");
const toLevel = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "");
const norm = (s = "") => s.toLowerCase().trim();

// Load JSON file for domain + level
async function loadContent(domain, level) {
  const filePath = path.join(baseDir, toSlug(domain), `${toLevel(level)}.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

// Compare roadmap title to JSON step title
function smartMatch(topicTitle, map) {
  if (!topicTitle) return null;
  const lower = norm(topicTitle);

  // 1) exact
  if (map.has(lower)) return map.get(lower);

  // 2) contains
  for (const [key, value] of map.entries()) {
    if (key.includes(lower) || lower.includes(key)) return value;
  }

  // 3) token overlap
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  for (const [key, value] of map.entries()) {
    const keyWords = key.split(/\s+/);
    const overlap = words.filter(w => keyWords.includes(w));
    if (overlap.length >= 1) return value;
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

    res.json({
      success: true,
      domain: toSlug(domain),
      level: toLevel(level),
      ...data,
    });
  } catch (err) {
    console.error(err);
    res.status(404).json({ success: false, message: "Course content not found" });
  }
};

// ------------------------------------------------------------------
// GET /api/courses/:domain/:level/merged
// RESTORES VIDEO SUPPORT (links → videos)
// ------------------------------------------------------------------
export const getMergedCourseForUser = async (req, res) => {
  try {
    const { domain, level } = req.params;
    const userId = req.userId;

    const domainSlug = toSlug(domain);
    const levelLower = toLevel(level);

    // Fetch roadmap
    const roadmap = await Roadmap.findOne({
      userId,
      domain: domainSlug,
      skillLevel: levelLower,
    });

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "No roadmap found for this user",
      });
    }

    // Load JSON content
    const content = await loadContent(domainSlug, levelLower);
    const steps = Array.isArray(content.steps) ? content.steps : [];

    // Map step titles
    const stepMap = new Map(
      steps.map(s => [norm(s.title || ""), s])
    );

    // Merge roadmap with JSON steps
    const items = roadmap.topics
      .slice()
      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
      .map(topic => {
        const matched = smartMatch(topic.title, stepMap);

        return {
          sequenceNumber: topic.sequenceNumber,
          title: topic.title,
          description: topic.description,

          // RESTORE VIDEOS HERE
          videos:
            (matched?.links || []).map(link => ({
              title: topic.title,
              url: link,
              duration: null,
              thumbnail: null,
            })),

          resources: matched?.resources || [],
        };
      });

    res.json({
      success: true,
      domain: domainSlug,
      level: levelLower,
      items,
    });
  } catch (err) {
    console.error("MERGE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to merge course content",
    });
  }
};

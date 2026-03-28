// controllers/courseController.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Roadmap from "../models/Roadmap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const baseDir    = path.resolve(__dirname, "..", "data", "course-content");

/* ─── HELPERS ─────────────────────────────────────────────────── */
const toSlug  = (s = "") => s.toLowerCase().replace(/\s+/g, "-");
const toLevel = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "");
const norm    = (s = "") => s.toLowerCase().trim();

async function loadContent(domain, level) {
  const filePath = path.join(baseDir, toSlug(domain), `${toLevel(level)}.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

/* ─── FLEXIBLE ROADMAP QUERY ──────────────────────────────────────
   The AI sometimes appends trailing punctuation to skillLevel when saving
   e.g. "Intermediate." instead of "intermediate".
   This tries exact slug → prefix regex → domain-only fallback.
────────────────────────────────────────────────────────────────── */
async function findRoadmap(userId, domainSlug, levelSlug) {
  // 1) Exact slug match (correctly saved records)
  let roadmap = await Roadmap.findOne({ userId, domain: domainSlug, skillLevel: levelSlug });
  if (roadmap) return roadmap;

  // 2) Case-insensitive prefix match handles "Intermediate.", "INTERMEDIATE" etc.
  roadmap = await Roadmap.findOne({
    userId,
    domain:     domainSlug,
    skillLevel: { $regex: new RegExp(`^${levelSlug}`, "i") },
  });
  if (roadmap) return roadmap;

  // 3) Last resort — match userId + domain only (one active roadmap per user)
  return await Roadmap.findOne({ userId, domain: domainSlug });
}

function smartMatch(topicTitle, map) {
  if (!topicTitle) return null;
  const lower = norm(topicTitle);
  if (map.has(lower)) return map.get(lower);
  for (const [key, value] of map.entries()) {
    if (key.includes(lower) || lower.includes(key)) return value;
  }
  const words = lower.split(/\s+/).filter(w => w.length > 1);
  for (const [key, value] of map.entries()) {
    const overlap = words.filter(w => key.split(/\s+/).includes(w));
    if (overlap.length >= 1) return value;
  }
  return null;
}

/* ─── GET /api/courses/:domain/:level ────────────────────────── */
export const getCourseContent = async (req, res) => {
  try {
    const { domain, level } = req.params;
    const data = await loadContent(domain, level);
    res.json({ success: true, domain: toSlug(domain), level: toLevel(level), ...data });
  } catch (err) {
    console.error(err);
    res.status(404).json({ success: false, message: "Course content not found" });
  }
};

/* ─── GET /api/courses/:domain/:level/merged ─────────────────── */
export const getMergedCourseForUser = async (req, res) => {
  try {
    const { domain, level } = req.params;
    const userId = req.userId;

    const domainSlug = toSlug(domain);
    const levelLower = toLevel(level);

    const roadmap = await findRoadmap(userId, domainSlug, levelLower);
    if (!roadmap) {
      return res.status(404).json({ success: false, message: "No roadmap found for this user" });
    }

    const content = await loadContent(domainSlug, levelLower);
    const steps   = Array.isArray(content.steps) ? content.steps : [];
    const stepMap = new Map(steps.map(s => [norm(s.title || ""), s]));

    const items = roadmap.topics
      .slice()
      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
      .map(topic => {
        const matched = smartMatch(topic.title, stepMap);
        return {
          sequenceNumber: topic.sequenceNumber,
          title:          topic.title,
          description:    topic.description,
          videos: (matched?.links || []).map(link => ({
            title: topic.title, url: link, duration: null, thumbnail: null,
          })),
          resources: matched?.resources || [],
        };
      });

    res.json({ success: true, domain: domainSlug, level: levelLower, items });
  } catch (err) {
    console.error("MERGE ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to merge course content" });
  }
};

/* ─── GET /api/courses/:domain/:level/video-counts ───────────────
   Returns real video count per topic across ALL modules.
   Response: { success: true, totalVideos: 14, topics: { "1": 3, "2": 2, ... } }
────────────────────────────────────────────────────────────────── */
export const getVideoCounts = async (req, res) => {
  try {
    const { domain, level } = req.params;
    const userId = req.userId;

    const domainSlug = toSlug(domain);
    const levelLower = toLevel(level);

    const roadmap = await findRoadmap(userId, domainSlug, levelLower);
    if (!roadmap) {
      return res.status(404).json({ success: false, message: "No roadmap found" });
    }

    const content = await loadContent(domainSlug, levelLower);
    const steps   = Array.isArray(content.steps) ? content.steps : [];
    const stepMap = new Map(steps.map(s => [norm(s.title || ""), s]));

    const topicCounts = {};
    let totalVideos = 0;

    roadmap.topics
      .slice()
      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
      .forEach(topic => {
        const matched = smartMatch(topic.title, stepMap);
        const count   = matched?.links?.length || 0;
        topicCounts[String(topic.sequenceNumber)] = count;
        totalVideos += count;
      });

    res.json({ success: true, totalVideos, topics: topicCounts });
  } catch (err) {
    console.error("getVideoCounts error:", err);
    res.status(500).json({ success: false, message: "Failed to get video counts" });
  }
};
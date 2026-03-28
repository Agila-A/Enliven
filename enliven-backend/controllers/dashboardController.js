// controllers/dashboardController.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Progress from "../models/Progress.js";
import Roadmap from "../models/Roadmap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const baseDir    = path.resolve(__dirname, "..", "data", "course-content");

/* ─── SLUG HELPERS (must match courseController exactly) ────────── */
const toSlug       = (s = "") => s.toLowerCase().replace(/\s+/g, "-");
const toLevel      = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "");
// Strip trailing punctuation AI sometimes appends e.g. "Intermediate." → "Intermediate"
const cleanLevel   = (s = "") => toLevel(s.replace(/[^a-zA-Z\s]/g, "").trim());
const norm         = (s = "") => s.toLowerCase().trim();

async function loadContent(domain, level) {
  const filePath = path.join(baseDir, toSlug(domain), `${level}.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
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

/* ─── Get real total video count from course JSON ────────────────
   Returns { totalVideos, topicCounts: { "1": 3, "2": 2, ... } }
   Falls back gracefully if the JSON file doesn't exist yet.
────────────────────────────────────────────────────────────────── */
async function getRealVideoCounts(roadmap, domainSlug, levelSlug) {
  try {
    const content = await loadContent(domainSlug, levelSlug);
    const steps   = Array.isArray(content.steps) ? content.steps : [];
    const stepMap = new Map(steps.map(s => [norm(s.title || ""), s]));

    const topicCounts = {};
    let totalVideos = 0;

    for (const topic of roadmap.topics) {
      const matched = smartMatch(topic.title, stepMap);
      const count   = matched?.links?.length || 0;
      topicCounts[String(topic.sequenceNumber)] = count;
      totalVideos += count;
    }

    return { totalVideos, topicCounts };
  } catch {
    // Course JSON not found — fall back to 0 (progress will show 0% until fixed)
    return { totalVideos: 0, topicCounts: {} };
  }
}

/* ─── STREAK HELPER ───────────────────────────────────────────── */
function todayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function updateStreak(user) {
  const today = todayUTC();
  const last  = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  const diff  = last ? Math.round((today - last) / 86400000) : -1;
  let changed = false;

  if (diff === -1) {
    user.streak = 1; user.longestStreak = Math.max(user.longestStreak || 0, 1);
    user.lastActiveDate = today; changed = true;
  } else if (diff === 0) {
    // same day — do nothing
  } else if (diff === 1) {
    user.streak = (user.streak || 0) + 1;
    user.longestStreak = Math.max(user.longestStreak || 0, user.streak);
    user.lastActiveDate = today; changed = true;
  } else {
    user.streak = 1; user.lastActiveDate = today; changed = true;
  }

  if (changed) await user.save();
}

/* ─── DASHBOARD ───────────────────────────────────────────────── */
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await updateStreak(user);

    if (!user.domain || !user.skillLevel) {
      return res.json({ success: true, dashboard: { user, continueLearning: null } });
    }

    // FIX: strip trailing punctuation from skillLevel before slugifying
    // e.g. "Intermediate." stored in DB → clean to "intermediate" for file lookup
    const domainSlug = toSlug(user.domain);
    const levelSlug  = cleanLevel(user.skillLevel);
    const courseId   = `${domainSlug}-${levelSlug}`;

    // Flexible query: handles skillLevel saved with trailing punctuation e.g. "Intermediate."
    const roadmap     = await Roadmap.findOne({ userId }).lean(); // userId alone is enough — one roadmap per user
    const progressDoc = await Progress.findOne({ userId, courseId }).lean();

    // FIX: use roadmap's own domain/skillLevel (cleaned) for file lookup,
    // not user.domain/user.skillLevel which may mismatch what's stored in roadmap
    const rmDomainSlug = roadmap ? toSlug(roadmap.domain) : domainSlug;
    const rmLevelSlug  = roadmap ? cleanLevel(roadmap.skillLevel) : levelSlug;

    const { totalVideos, topicCounts } = roadmap
      ? await getRealVideoCounts(roadmap, rmDomainSlug, rmLevelSlug)
      : { totalVideos: 0, topicCounts: {} };

    // Count completed videos from progress doc
    let completedLessons = 0;
    if (progressDoc?.progress?.length) {
      progressDoc.progress.forEach(topic => {
        if (topic.videoProgress && typeof topic.videoProgress === "object") {
          completedLessons += Object.values(topic.videoProgress).filter(Boolean).length;
        }
      });
    }

    const totalLessons    = totalVideos; // real total across all modules
    const progressPercent = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    const continueLearning = {
      domain:           user.domain,
      skillLevel:       user.skillLevel,
      courseId,
      progress:         progressPercent,
      completedLessons,
      totalLessons,
      totalModules:     roadmap?.topics?.length || 0,
      // Only mark completed when final exam is done — not just videos
      completed:        progressDoc?.finalCompleted === true,
    };

    return res.status(200).json({
      success: true,
      dashboard: { user, continueLearning },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard" });
  }
};
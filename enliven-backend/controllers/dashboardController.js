// controllers/dashboardController.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import User     from "../models/User.js";
import Progress from "../models/Progress.js";
import Roadmap  from "../models/Roadmap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const baseDir    = path.resolve(__dirname, "..", "data", "course-content");

/* ─── SLUG HELPERS (must match courseController exactly) ────────── */
const toSlug     = (s = "") => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toLevel    = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "");
const cleanLevel = (s = "") => toLevel(s.replace(/[^a-zA-Z\s]/g, "").trim());
const norm       = (s = "") => s.toLowerCase().trim();

async function loadContent(domain, level) {
  const filePath = path.join(baseDir, toSlug(domain), `${level}.json`);
  const raw      = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function smartMatch(topicTitle, map) {
  if (!topicTitle) return null;
  const lower = norm(topicTitle);
  if (map.has(lower)) return map.get(lower);
  for (const [key, value] of map.entries()) {
    if (key.includes(lower) || lower.includes(key)) return value;
  }
  const words = lower.split(/\s+/).filter((w) => w.length > 1);
  for (const [key, value] of map.entries()) {
    const overlap = words.filter((w) => key.split(/\s+/).includes(w));
    if (overlap.length >= 1) return value;
  }
  return null;
}

/* ─── Get real total video count from course JSON ──────────────── */
async function getRealVideoCounts(roadmap, domainSlug, levelSlug) {
  try {
    const content  = await loadContent(domainSlug, levelSlug);
    const steps    = Array.isArray(content.steps) ? content.steps : [];
    const stepMap  = new Map(steps.map((s) => [norm(s.title || ""), s]));
    const topicCounts = {};
    let   totalVideos = 0;

    for (const topic of roadmap.topics) {
      const matched = smartMatch(topic.title, stepMap);
      const count   = matched?.links?.length || 0;
      topicCounts[String(topic.sequenceNumber)] = count;
      totalVideos += count;
    }
    return { totalVideos, topicCounts };
  } catch {
    return { totalVideos: 0, topicCounts: {} };
  }
}

/* ─── Count completed videos from a Progress doc ───────────────── */
function countCompletedLessons(progressDoc) {
  let completed = 0;
  if (progressDoc?.progress?.length) {
    progressDoc.progress.forEach((topic) => {
      if (topic.videoProgress && typeof topic.videoProgress === "object") {
        completed += Object.values(topic.videoProgress).filter(Boolean).length;
      }
    });
  }
  return completed;
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
    user.streak = 1;
    user.longestStreak  = Math.max(user.longestStreak || 0, 1);
    user.lastActiveDate = today;
    changed = true;
  } else if (diff === 0) {
    // same day — do nothing
  } else if (diff === 1) {
    user.streak = (user.streak || 0) + 1;
    user.longestStreak  = Math.max(user.longestStreak || 0, user.streak);
    user.lastActiveDate = today;
    changed = true;
  } else {
    user.streak = 1;
    user.lastActiveDate = today;
    changed = true;
  }

  if (changed) await user.save();
}

/* ─── Build effective enrollments list (with migration fallback) ── */
function getEffectiveEnrollments(user) {
  // If the user already has enrollments, use them directly.
  if (user.enrollments && user.enrollments.length > 0) {
    return user.enrollments;
  }

  // BACKWARD COMPAT: old user with domain/skillLevel but no enrollments array yet.
  // Synthesise one enrollment entry in-memory (do NOT save here — the migration
  // route or roadmapController will persist it properly).
  if (user.domain && user.skillLevel) {
    const domainSlug = toSlug(user.domain);
    const levelSlug  = cleanLevel(user.skillLevel);
    return [
      {
        courseId:       `${domainSlug}-${levelSlug}`,
        domain:         domainSlug,
        skillLevel:     levelSlug,
        enrolledAt:     user.createdAt || new Date(),
        lastAccessedAt: user.lastActiveDate || null,
      },
    ];
  }

  return [];
}

/* ─── Build one course card ─────────────────────────────────────── */
async function buildCourseCard(userId, enrollment) {
  const { courseId, domain, skillLevel, enrolledAt, lastAccessedAt } = enrollment;

  const domainSlug = toSlug(domain);
  const levelSlug  = cleanLevel(skillLevel);

  const [roadmap, progressDoc] = await Promise.all([
    Roadmap.findOne({ userId, courseId }).lean(),
    Progress.findOne({ userId, courseId }).lean(),
  ]);

  const { totalVideos } = roadmap
    ? await getRealVideoCounts(roadmap, domainSlug, levelSlug)
    : { totalVideos: 0 };

  const completedLessons = countCompletedLessons(progressDoc);
  const totalLessons     = totalVideos;
  const progressPercent  = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  return {
    courseId,
    domain,
    skillLevel,
    enrolledAt,
    lastAccessedAt,
    progress:         progressPercent,
    completedLessons,
    totalLessons,
    totalModules:     roadmap?.topics?.length || 0,
    completed:        progressDoc?.finalCompleted === true,
  };
}

/* ─── DASHBOARD ───────────────────────────────────────────────── */
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await updateStreak(user);

    // Get the effective enrollment list (handles pre-migration users too)
    const enrollments = getEffectiveEnrollments(user);

    if (enrollments.length === 0) {
      // No courses at all — return empty state
      return res.json({
        success:   true,
        dashboard: { user, courses: [] },
      });
    }

    // Build a card for every enrolled course in parallel
    const courses = await Promise.all(
      enrollments.map((e) => buildCourseCard(userId, e))
    );

    // Sort: most recently accessed first, then by enrolledAt
    courses.sort((a, b) => {
      const aT = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const bT = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
      return bT - aT;
    });

    return res.status(200).json({
      success:   true,
      dashboard: { user, courses },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard" });
  }
};
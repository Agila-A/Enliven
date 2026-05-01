// controllers/dashboardController.js
import User     from "../models/User.js";
import Progress from "../models/Progress.js";
import Roadmap  from "../models/Roadmap.js";

/* ─── SLUG HELPERS (must match courseController exactly) ────────── */
const toSlug     = (s = "") => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toLevel    = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "");
const cleanLevel = (s = "") => toLevel(s.replace(/[^a-zA-Z\s]/g, "").trim());
const norm       = (s = "") => s.toLowerCase().trim();



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

  const [roadmap, progressDoc] = await Promise.all([
    Roadmap.findOne({ userId, courseId }).lean(),
    Progress.findOne({ userId, courseId }).lean(),
  ]);

  const totalModules = roadmap?.topics?.length || 0;

  let passedModules = 0;
  if (progressDoc && progressDoc.moduleStatus) {
    const statusObj = progressDoc.moduleStatus;
    if (statusObj instanceof Map) {
      passedModules = Array.from(statusObj.values()).filter(v => v === "completed").length;
    } else {
      passedModules = Object.values(statusObj).filter(v => v === "completed").length;
    }
  }

  const progressPercent = totalModules > 0
    ? Math.round((passedModules / totalModules) * 100)
    : 0;

  return {
    courseId,
    domain,
    skillLevel,
    enrolledAt,
    lastAccessedAt,
    progress:         progressPercent,
    passedModules,
    totalModules,
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
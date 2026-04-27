// controllers/migrationController.js
//
// One-time migration to bring old data in line with the multi-course schema.
// Safe to run multiple times — all operations are idempotent.
//
// What it does:
//   1. Users with domain+skillLevel but empty enrollments → seeds enrollments[0]
//   2. Roadmap docs missing courseId → sets courseId from domain+skillLevel
//   3. ChatbotContext docs missing courseId → derives courseId from context fields
//
import User          from "../models/User.js";
import Roadmap       from "../models/Roadmap.js";
import ChatbotContext from "../models/ChatbotContext.js";

const toSlug  = (s = "") => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toLevel = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "");

export const runMigration = async (req, res) => {
  const report = { usersUpdated: 0, roadmapsUpdated: 0, contextsUpdated: 0, errors: [] };

  try {
    /* ── 1. Fix User Enrollments ─────────────────────────────────── */
    const users = await User.find({});
    for (const user of users) {
      let changed = false;

      // a) Migrate legacy domain/skillLevel to enrollments if empty
      if (user.enrollments.length === 0 && user.domain) {
        const dSlug = toSlug(user.domain);
        const lSlug = toLevel(user.skillLevel || "beginner");
        user.enrollments.push({
          courseId: `${dSlug}-${lSlug}`,
          domain: dSlug,
          skillLevel: lSlug,
          enrolledAt: user.createdAt || new Date(),
        });
        changed = true;
      }

      // b) Fix existing enrollments with bad slugs (e.g. "ai/ml")
      for (const enr of user.enrollments) {
        const correctDSlug = toSlug(enr.domain);
        const correctLSlug = toLevel(enr.skillLevel);
        const correctCID   = `${correctDSlug}-${correctLSlug}`;

        if (enr.courseId !== correctCID || enr.domain !== correctDSlug) {
          enr.courseId = correctCID;
          enr.domain   = correctDSlug;
          changed = true;
        }
      }

      if (changed) {
        await user.save();
        report.usersUpdated++;
      }
    }

    /* ── 2. Fix Roadmaps ─────────────────────────────────────────── */
    const roadmaps = await Roadmap.find({});
    for (const rm of roadmaps) {
      const dSlug = toSlug(rm.domain);
      const lSlug = toLevel(rm.skillLevel);
      const cId   = `${dSlug}-${lSlug}`;

      if (rm.courseId !== cId || rm.domain !== dSlug) {
        try {
          rm.courseId = cId;
          rm.domain   = dSlug;
          await rm.save();
          report.roadmapsUpdated++;
        } catch (err) {
          if (err.code === 11000) {
            // Duplicate after rename? Delete the old/extra one
            await Roadmap.deleteOne({ _id: rm._id });
          } else {
            report.errors.push(`Roadmap ${rm._id}: ${err.message}`);
          }
        }
      }
    }

    /* ── 3. Fix ChatbotContexts ───────────────────────────────────── */
    const contexts = await ChatbotContext.find({});
    for (const ctx of contexts) {
      const domain = ctx.courseId?.split("-")[0] || ctx.context?.domain;
      const level  = ctx.context?.skillLevel || "beginner";

      if (domain) {
        const dSlug = toSlug(domain);
        const lSlug = toLevel(level);
        const cId   = `${dSlug}-${lSlug}`;

        if (ctx.courseId !== cId) {
          try {
            ctx.courseId = cId;
            await ctx.save();
            report.contextsUpdated++;
          } catch (err) {
            if (err.code === 11000) {
              await ChatbotContext.deleteOne({ _id: ctx._id });
            } else {
              report.errors.push(`Context ${ctx._id}: ${err.message}`);
            }
          }
        }
      }
    }

    return res.json({ success: true, report });
  } catch (err) {
    console.error("Migration Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

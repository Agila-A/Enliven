// controllers/profileController.js
import User from "../models/User.js";

/* ─── STREAK HELPER (same logic as dashboardController) ───────────
   Kept as a shared utility here. If you want to DRY this up later,
   move it to utils/streak.js and import from both controllers.
────────────────────────────────────────────────────────────────── */
function todayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysDiff(dateA, dateB) {
  return Math.round((dateA - dateB) / (24 * 60 * 60 * 1000));
}

async function updateStreak(user) {
  const today = todayUTC();
  const last  = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  let changed = false;

  if (!last) {
    user.streak        = 1;
    user.longestStreak = Math.max(user.longestStreak || 0, 1);
    user.lastActiveDate = today;
    changed = true;
  } else {
    const diff = daysDiff(today, last);
    if (diff === 0) {
      // already recorded today
    } else if (diff === 1) {
      user.streak        = (user.streak || 0) + 1;
      user.longestStreak = Math.max(user.longestStreak || 0, user.streak);
      user.lastActiveDate = today;
      changed = true;
    } else {
      user.streak        = 1;
      user.lastActiveDate = today;
      changed = true;
    }
  }

  if (changed) await user.save();
  return user;
}

/* ─── GET /api/profile/me ─────────────────────────────────────── */
export const getProfile = async (req, res) => {
  try {
    // Not lean — we may need to save streak update
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update streak whenever user visits their profile (counts as activity)
    await updateStreak(user);

    res.json({ success: true, user });
  } catch (err) {
    console.error("Profile load error:", err);
    res.status(500).json({ success: false, message: "Failed to load profile" });
  }
};

/* ─── PUT /api/profile/update ─────────────────────────────────── */
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, location } = req.body;

    // Whitelist fields — never let the client overwrite streak/badges/etc.
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { name, bio, location } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};
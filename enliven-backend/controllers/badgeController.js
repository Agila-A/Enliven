import User from "../models/User.js";

export async function awardBadge(req, res) {
  try {
    const userId = req.userId;
    const { badge } = req.body;

    const user = await User.findById(userId);

    // Prevent duplicates
    if (user.badges.some(b => b.id === badge.id)) {
      return res.json({ success: true, message: "Badge already earned" });
    }

    user.badges.push({
      ...badge,
      awardedOn: new Date()
    });

    await user.save();

    return res.json({ success: true, message: "Badge awarded!" });

  } catch (err) {
    console.error("awardBadge error:", err);
    res.status(500).json({ success: false, message: "Failed to award badge" });
  }
}

import User from "../models/User.js";
import Badge from "../models/Badge.js";

/**
 * ===========================================
 *  ADD / AWARD A BADGE TO USER
 * ===========================================
 */
export const addBadge = async (req, res) => {
  try {
    const userId = req.userId;   // ✔ correct
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Badge ID is required"
      });
    }

    // ⭐ 1. Fetch badge from MongoDB (true source of data)
    const badge = await Badge.findOne({ id });

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: "Badge not found in database"
      });
    }

    // ⭐ 2. Check if user already has this badge
    const user = await User.findById(userId);
    const already = user.badges.find(b => b.id === id);

    if (already) {
      return res.json({
        success: true,
        message: "Badge already earned",
        badge: already
      });
    }

    // ⭐ 3. Create awarded badge object
    const awardedBadge = {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      awardedOn: new Date()
    };

    // ⭐ 4. Push to user document
    user.badges.push(awardedBadge);
    await user.save();

    return res.json({
      success: true,
      message: "Badge awarded successfully",
      badge: awardedBadge
    });

  } catch (err) {
    console.error("❌ Badge Add Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while awarding badge"
    });
  }
};


/**
 * ===========================================
 *  GET ALL USER BADGES
 * ===========================================
 */
export const getBadges = async (req, res) => {
  try {
    const userId = req.userId;   // ✔ correct

    const user = await User.findById(userId).select("badges");

    return res.json({
      success: true,
      badges: user.badges || []
    });

  } catch (err) {
    console.error("❌ Get Badges Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch badges"
    });
  }
};

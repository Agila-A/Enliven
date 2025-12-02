// controllers/profileController.js
import User from "../models/User.js";
import Progress from "../models/Progress.js";

// ---------------------------------------------
// GET /api/profile/me
// ---------------------------------------------
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Profile load error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load profile",
    });
  }
};

// ---------------------------------------------
// PUT /api/profile/update
// ---------------------------------------------
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, location } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, bio, location },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

// ---------------------------------------------
// GET /api/profile/progress
// ---------------------------------------------
export const getCourseProgress = async (req, res) => {
  try {
    const userId = req.userId;

    const domain = req.query.domain;
    const level = req.query.level;

    if (!domain || !level) {
      return res.status(400).json({
        success: false,
        message: "Missing domain or level",
      });
    }

    const courseId = `${domain.toLowerCase()}-${level.toLowerCase()}`;

    const progressDoc = await Progress.findOne({ userId, courseId });

    res.json({
      success: true,
      progress: progressDoc?.progress || [],
    });

  } catch (err) {
    console.error("Get Course Progress Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load course progress",
    });
  }
};

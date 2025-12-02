// controllers/profileController.js
import User from "../models/User.js";

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

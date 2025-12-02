// controllers/dashboardController.js
import User from "../models/User.js";
import Roadmap from "../models/Roadmap.js";

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const domain = user.domain?.toLowerCase();
    const level = user.skillLevel?.toLowerCase();

    const roadmap = await Roadmap.findOne({
      userId,
      domain,
      skillLevel: level,
    });

    // -------------------------
    // RESPONSE without progress
    // -------------------------
    return res.json({
      success: true,
      dashboard: {
        user,
        continueLearning: [
          {
            title: user.domain || "Your Course",
            description: "Keep learning and finish your course!",
          },
        ],
      },
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard",
    });
  }
};

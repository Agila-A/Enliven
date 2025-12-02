// controllers/dashboardController.js
import User from "../models/User.js";
import Roadmap from "../models/Roadmap.js";
import Progress from "../models/Progress.js";

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

    const courseId = `${domain}-${level}`;
    const progressDoc = await Progress.findOne({ userId, courseId });

    // -------------------------
    // CALCULATE COURSE PROGRESS
    // -------------------------
    let completedVideos = 0;
    let totalVideos = 0;

    if (progressDoc?.progress?.length) {
      progressDoc.progress.forEach(t => {
        const videoStates = Object.values(t.videoProgress || {});
        totalVideos += videoStates.length;
        completedVideos += videoStates.filter(Boolean).length;
      });
    }

    const courseProgress =
      totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    // -------------------------
    // RESPONSE
    // -------------------------
    return res.json({
      success: true,
      dashboard: {
        user,
        continueLearning: [
          {
            title: user.domain, // FIXED
            progress: courseProgress,
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

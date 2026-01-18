// controllers/dashboardController.js
import User from "../models/User.js";
import Progress from "../models/Progress.js";
import Roadmap from "../models/Roadmap.js";

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.userId;

    // 1️⃣ User
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // If user hasn't selected domain yet
    if (!user.domain || !user.skillLevel) {
      return res.json({
        success: true,
        dashboard: {
          user,
          continueLearning: null,
        },
      });
    }

    // 2️⃣ Build courseId (IMPORTANT — must match Progress.courseId)
    const courseId = `${user.domain}-${user.skillLevel}`.toLowerCase();

    // 3️⃣ Fetch roadmap (for totals only)
    const roadmap = await Roadmap.findOne({
      userId,
      domain: user.domain,
      skillLevel: user.skillLevel,
    });

    // 4️⃣ Fetch progress (SOURCE OF TRUTH)
    const progressDoc = await Progress.findOne({ userId, courseId }).lean();

    let completedLessons = 0;
    let totalLessons = 0;

    if (roadmap?.topics?.length) {
      roadmap.topics.forEach(t => {
        totalLessons += t.videos?.length || 0;
      });
    }

    if (progressDoc?.progress?.length) {
      progressDoc.progress.forEach(topic => {
        if (topic.videoProgress) {
          completedLessons += Array.from(topic.videoProgress.values()).filter(
            Boolean
          ).length;
        }
      });
    }

    const progressPercent =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    const continueLearning = {
      domain: user.domain,
      skillLevel: user.skillLevel,
      courseId: Progress.courseId,
      progress: progressPercent,
      completedLessons,
      totalLessons,
      completed:
        progressDoc?.finalCompleted === true ||
        (totalLessons > 0 && completedLessons === totalLessons),
    };

    // 5️⃣ Response
    return res.status(200).json({
      success: true,
      dashboard: {
        user,
        continueLearning,
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

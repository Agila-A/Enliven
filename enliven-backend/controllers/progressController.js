// controllers/progressController.js
import Progress from "../models/Progress.js";

// --------------------------------------------------
// SAVE PROGRESS
// --------------------------------------------------
export const saveProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, topicId, videoProgress, currentIndex } = req.body;

    if (!courseId || !topicId) {
      return res.status(400).json({ success: false, message: "Missing courseId or topicId" });
    }

    // 1️⃣ Find progress doc
    let progressDoc = await Progress.findOne({ userId, courseId });

    // 2️⃣ If not exist, create new
    if (!progressDoc) {
      progressDoc = new Progress({
        userId,
        courseId,
        progress: [],
      });
    }

    // 3️⃣ Check if topic exists
    let topic = progressDoc.progress.find(t => t.topicId === String(topicId));

    if (topic) {
      // Update existing topic
      topic.videoProgress = videoProgress || {};
      topic.currentIndex = Number(currentIndex) || 0;
    } else {
      // Add new topic entry
      progressDoc.progress.push({
        topicId: String(topicId),
        videoProgress: videoProgress || {},
        currentIndex: Number(currentIndex) || 0
      });
    }

    await progressDoc.save();

    res.json({ success: true, message: "Progress saved!" });

  } catch (err) {
    console.error("Progress Save Error:", err);
    res.status(500).json({ success: false, message: "Failed to save progress" });
  }
};


// --------------------------------------------------
// GET PROGRESS FOR COURSE
// --------------------------------------------------
export const getProgressForCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.params;

    const doc = await Progress.findOne({ userId, courseId });

    res.json({
      success: true,
      progress: doc?.progress || [],
    });

  } catch (err) {
    console.error("Get Progress Error:", err);
    res.status(500).json({ success: false, message: "Failed to load progress" });
  }
};

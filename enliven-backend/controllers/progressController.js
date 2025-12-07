// controllers/progressController.js
import Progress from "../models/Progress.js";

// --------------------------------------------------
// SAVE VIDEO / TOPIC PROGRESS  (original)
// --------------------------------------------------
export const saveProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, topicId, videoProgress, currentIndex } = req.body;

    if (!courseId || !topicId) {
      return res.status(400).json({ success: false, message: "Missing courseId or topicId" });
    }

    let progressDoc = await Progress.findOne({ userId, courseId });

    if (!progressDoc) {
      progressDoc = new Progress({
        userId,
        courseId,
        progress: [],
      });
    }

    let topic = progressDoc.progress.find(t => t.topicId === String(topicId));

    if (topic) {
      topic.videoProgress = videoProgress || {};
      topic.currentIndex = Number(currentIndex) || 0;
    } else {
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
// GET PROGRESS FOR A COURSE
// --------------------------------------------------
export const getProgressForCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.params;

    const doc = await Progress.findOne({ userId, courseId });

    res.json({
      success: true,
      progress: doc?.progress || [],
      moduleStatus: doc?.moduleStatus || {},
      finalCompleted: doc?.finalCompleted || false,
    });

  } catch (err) {
    console.error("Get Progress Error:", err);
    res.status(500).json({ success: false, message: "Failed to load progress" });
  }
};

// --------------------------------------------------
// ⭐ NEW — SAVE ASSESSMENT PROGRESS (module test or final exam)
// --------------------------------------------------
export const saveAssessmentProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, moduleId, isFinal } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "Missing courseId" });
    }

    let progressDoc = await Progress.findOne({ userId, courseId });

    if (!progressDoc) {
      progressDoc = new Progress({
        userId,
        courseId,
        progress: [],
      });
    }

    if (isFinal) {
      progressDoc.finalCompleted = true;
    } else if (moduleId) {
      progressDoc.moduleStatus.set(moduleId, "completed");
    }

    await progressDoc.save();

    res.json({ success: true });

  } catch (err) {
    console.error("Assessment Progress Error:", err);
    res.status(500).json({ success: false });
  }
};

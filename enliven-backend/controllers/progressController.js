// controllers/progressController.js
import Progress from "../models/Progress.js";

const ensureProgressDoc = async (userId, courseId) => {
  let doc = await Progress.findOne({ userId, courseId });
  if (!doc) doc = await Progress.create({ userId, courseId, progress: [] });
  return doc;
};

const upsertTopic = (doc, topicId, patch) => {
  const id = String(topicId);
  const idx = doc.progress.findIndex(p => String(p.topicId) === id);
  if (idx === -1) {
    doc.progress.push({ topicId: id, videoProgress: {}, currentIndex: 0, ...patch });
  } else {
    // merge map-like object safely
    if (patch.videoProgress) {
      doc.progress[idx].videoProgress = {
        ...(doc.progress[idx].videoProgress || {}),
        ...patch.videoProgress,
      };
    }
    if (typeof patch.currentIndex === "number") {
      doc.progress[idx].currentIndex = patch.currentIndex;
    }
  }
};

// POST /api/progress/save
export const saveProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, topicId, videoProgress = {}, currentIndex = 0 } = req.body;

    if (!courseId || !topicId)
      return res.status(400).json({ success: false, message: "courseId and topicId required" });

    const doc = await ensureProgressDoc(userId, courseId);
    upsertTopic(doc, topicId, { videoProgress, currentIndex });
    await doc.save();

    res.json({ success: true });
  } catch (err) {
    console.error("saveProgress error:", err);
    res.status(500).json({ success: false, message: "Failed to save progress" });
  }
};

// GET /api/progress/:courseId
export const getProgressForCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.params;

    const doc = await Progress.findOne({ userId, courseId }).lean();
    res.json({
      success: true,
      progress: doc?.progress || [],
      moduleStatus: doc?.moduleStatus || {},
      finalCompleted: !!doc?.finalCompleted,
    });
  } catch (err) {
    console.error("getProgressForCourse error:", err);
    res.status(500).json({ success: false, message: "Failed to load progress" });
  }
};

// POST /api/progress/assessment  (module tests + final)
export const saveAssessmentProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, type, moduleId } = req.body; // type: "module" | "final"

    if (!courseId || !type) {
      return res.status(400).json({ success: false, message: "courseId and type required" });
    }

    const doc = await ensureProgressDoc(userId, courseId);

    if (type === "module") {
      if (!moduleId) return res.status(400).json({ success: false, message: "moduleId required" });
      const map = doc.moduleStatus || new Map();
      map.set ? map.set(String(moduleId), "completed") : (map[String(moduleId)] = "completed");
      doc.moduleStatus = map;
    } else if (type === "final") {
      doc.finalCompleted = true;
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    await doc.save();
    res.json({ success: true });
  } catch (err) {
    console.error("saveAssessmentProgress error:", err);
    res.status(500).json({ success: false, message: "Failed to save assessment status" });
  }
};

// controllers/progressController.js
import Progress from "../models/Progress.js";

/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

const ensureProgressDoc = async (userId, courseId) => {
  let doc = await Progress.findOne({ userId, courseId });

  if (!doc) {
    doc = await Progress.create({
      userId,
      courseId,
      progress: [],
      moduleStatus: {},
      finalCompleted: false,
    });
  }

  return doc;
};

const normalizeMap = (map) => {
  // Always return a plain JS object (NOT mongoose map)
  if (!map) return {};
  if (map instanceof Map) return Object.fromEntries(map);
  if (typeof map === "object") return { ...map };
  return {};
};

const upsertTopic = (doc, topicId, videoProgressPatch, currentIndex) => {
  const tid = String(topicId);

  let topic = doc.progress.find(p => String(p.topicId) === tid);

  if (!topic) {
    topic = {
      topicId: tid,
      videoProgress: {},
      currentIndex: 0,
    };
    doc.progress.push(topic);
  }

  // 🔥 SAFE merge (no mongoose internals)
  const existing = normalizeMap(topic.videoProgress);
  const incoming = normalizeMap(videoProgressPatch);

  topic.videoProgress = {
    ...existing,
    ...incoming,
  };

  if (typeof currentIndex === "number") {
    topic.currentIndex = currentIndex;
  }
};

/* --------------------------------------------------
   POST /api/progress/save
-------------------------------------------------- */
export const saveProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, topicId, videoProgress = {}, currentIndex } = req.body;

    if (!userId || !courseId || !topicId) {
      return res.status(400).json({
        success: false,
        message: "userId, courseId and topicId are required",
      });
    }

    const doc = await ensureProgressDoc(userId, courseId);

    upsertTopic(doc, topicId, videoProgress, currentIndex);

    await doc.save();

    res.json({ success: true });
  } catch (err) {
    console.error("saveProgress error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save progress",
    });
  }
};

/* --------------------------------------------------
   GET /api/progress/:courseId
-------------------------------------------------- */
export const getProgressForCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.params;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "userId and courseId required",
      });
    }

    const doc = await Progress.findOne({ userId, courseId }).lean();

    res.json({
      success: true,
      progress: doc?.progress || [],
      moduleStatus: doc?.moduleStatus || {},
      finalCompleted: Boolean(doc?.finalCompleted),
    });
  } catch (err) {
    console.error("getProgressForCourse error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load progress",
    });
  }
};

/* --------------------------------------------------
   POST /api/progress/assessment
   type: "module" | "final"
-------------------------------------------------- */
export const saveAssessmentProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, type, moduleId } = req.body;

    if (!userId || !courseId || !type) {
      return res.status(400).json({
        success: false,
        message: "userId, courseId and type required",
      });
    }

    const doc = await ensureProgressDoc(userId, courseId);

    if (type === "module") {
      if (!moduleId) {
        return res.status(400).json({
          success: false,
          message: "moduleId required for module assessment",
        });
      }

      const map = normalizeMap(doc.moduleStatus);
      map[String(moduleId)] = "completed";
      doc.moduleStatus = map;
    }

    if (type === "final") {
      doc.finalCompleted = true;
    }

    await doc.save();
    res.json({ success: true });
  } catch (err) {
    console.error("saveAssessmentProgress error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save assessment progress",
    });
  }
};

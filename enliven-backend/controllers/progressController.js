// controllers/progressController.js
import Progress from "../models/Progress.js";

/* ─── HELPERS ─────────────────────────────────────────────────── */

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
  if (!map) return {};
  if (map instanceof Map) return Object.fromEntries(map);
  if (typeof map === "object") return { ...map };
  return {};
};

// FIX: accept videoCount and store it on the topic row
const upsertTopic = (doc, topicId, videoProgressPatch, currentIndex, videoCount) => {
  const tid = String(topicId);
  let topic = doc.progress.find(p => String(p.topicId) === tid);

  if (!topic) {
    topic = { topicId: tid, videoProgress: {}, currentIndex: 0, videoCount: 0 };
    doc.progress.push(topic);
  }

  const existing = normalizeMap(topic.videoProgress);
  const incoming = normalizeMap(videoProgressPatch);
  topic.videoProgress = { ...existing, ...incoming };

  if (typeof currentIndex === "number") topic.currentIndex = currentIndex;

  // Always update videoCount if a valid value is sent — this is the actual
  // total from the merged course JSON, so it's authoritative.
  if (typeof videoCount === "number" && videoCount > 0) {
    topic.videoCount = videoCount;
  }
};

/* ─── POST /api/progress/save ─────────────────────────────────── */
export const saveProgress = async (req, res) => {
  try {
    const userId = req.userId;
    // FIX: destructure videoCount from body
    const { courseId, topicId, videoProgress = {}, currentIndex, videoCount } = req.body;

    if (!userId || !courseId || !topicId) {
      return res.status(400).json({
        success: false,
        message: "userId, courseId and topicId are required",
      });
    }

    const doc = await ensureProgressDoc(userId, courseId);
    upsertTopic(doc, topicId, videoProgress, currentIndex, videoCount);
    await doc.save();

    res.json({ success: true });
  } catch (err) {
    console.error("saveProgress error:", err);
    res.status(500).json({ success: false, message: "Failed to save progress" });
  }
};

/* ─── GET /api/progress/:courseId ─────────────────────────────── */
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

    // FIX: don't use .lean() here — we need to convert the Map manually
    const doc = await Progress.findOne({ userId, courseId });

    if (!doc) {
      return res.json({
        success: true,
        progress: [],
        moduleStatus: {},
        finalCompleted: false,
      });
    }

    // FIX: Mongoose Map → plain object (lean() doesn't do this reliably for Maps)
    const moduleStatusPlain = {};
    if (doc.moduleStatus) {
      for (const [k, v] of doc.moduleStatus.entries()) {
        moduleStatusPlain[k] = v;
      }
    }

    // Convert progress array — videoProgress is also a Map
    const progressPlain = (doc.progress || []).map(p => ({
      topicId:       p.topicId,
      currentIndex:  p.currentIndex,
      videoCount:    p.videoCount,
      videoProgress: p.videoProgress
        ? Object.fromEntries(p.videoProgress.entries())
        : {},
    }));

    res.json({
      success:       true,
      progress:      progressPlain,
      moduleStatus:  moduleStatusPlain,
      finalCompleted: Boolean(doc.finalCompleted),
    });
  } catch (err) {
    console.error("getProgressForCourse error:", err);
    res.status(500).json({ success: false, message: "Failed to load progress" });
  }
};

export async function completeModule(req, res) {
  try {
    const userId = req.userId;
    const { courseId, moduleId } = req.body;

    if (!courseId || !moduleId)
      return res.status(400).json({ success: false, message: "courseId and moduleId are required" });

    // Use findOneAndUpdate with dot-notation on the Map field
    const updated = await Progress.findOneAndUpdate(
      { userId, courseId },
      { $set: { [`moduleStatus.${moduleId}`]: "completed" } },
      { upsert: true, new: true }
    );

    // FIX: Mongoose Map serializes weirdly — convert to plain object before sending
    const moduleStatusPlain = {};
    if (updated.moduleStatus) {
      for (const [k, v] of updated.moduleStatus.entries()) {
        moduleStatusPlain[k] = v;
      }
    }

    return res.json({ success: true, moduleStatus: moduleStatusPlain });
  } catch (err) {
    console.error("completeModule error:", err);
    return res.status(500).json({ success: false, message: "Failed to mark module complete" });
  }
}

/* ─── POST /api/progress/assessment ───────────────────────────── */
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
    res.status(500).json({ success: false, message: "Failed to save assessment progress" });
  }
};
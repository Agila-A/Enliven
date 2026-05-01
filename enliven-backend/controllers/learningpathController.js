// controllers/learningPathController.js
import Roadmap from "../models/Roadmap.js";
import Progress from "../models/Progress.js";

const slug = s => String(s || "").toLowerCase().replace(/\s+/g, "-");
const cleanLvl = s => s.replace(/[^a-zA-Z\s]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export const getLearningPathOverview = async (req, res) => {
  try {
    const userId = req.userId;

    const roadmap = await Roadmap.findOne({ userId }).lean();
    if (!roadmap) {
      return res.json({
        success: true,
        message: "No roadmap yet",
        domain: null,
        skillLevel: null,
        totals: { modulesPassed: 0, totalModules: 0, percent: 0 },
        topics: [],
        continuePath: null,
      });
    }

    const domainSlug = slug(roadmap.domain);
    const levelSlug  = cleanLvl(roadmap.skillLevel);
    const courseId   = `${domainSlug}-${levelSlug}`;

    const progDoc = await Progress.findOne({ userId, courseId });

    // Build a map: topicId → { studyStarted, currentIndex }
    const progressMap = new Map();
    if (progDoc?.progress) {
      for (const p of progDoc.progress) {
        progressMap.set(String(p.topicId), {
          studyStarted: !!p.studyStarted,
          currentIndex: Number.isFinite(p.currentIndex) ? p.currentIndex : 0,
        });
      }
    }

    let modulesPassed = 0;
    const totalModules = roadmap.topics ? roadmap.topics.length : 0;

    const moduleStatus = {};
    if (progDoc?.moduleStatus) {
      for (const [k, v] of progDoc.moduleStatus.entries()) {
        moduleStatus[k] = v;
      }
    }

    const topics = (roadmap.topics || [])
      .slice()
      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
      .map(step => {
        const topicId = String(step.sequenceNumber);
        const p = progressMap.get(topicId);

        const testPassed = moduleStatus[topicId] === "completed";
        if (testPassed) modulesPassed++;

        return {
          sequenceNumber: step.sequenceNumber,
          title: step.title,
          description: step.description || "",
          studyStarted: p ? p.studyStarted : false,
          testPassed,
          next: p ? { topicId, currentIndex: p.currentIndex } : null,
        };
      });

    const percent = totalModules > 0
      ? Math.round((modulesPassed / totalModules) * 100)
      : 0;

    res.json({
      success: true,
      domain: domainSlug,
      skillLevel: levelSlug,
      totals: { modulesPassed, totalModules, percent },
      topics,
      continuePath: { url: `/courses/${domainSlug}/${levelSlug}`, domainSlug, levelSlug },
    });
  } catch (err) {
    console.error("Learning Path overview error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
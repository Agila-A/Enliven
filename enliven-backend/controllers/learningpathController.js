// controllers/learningPathController.js
import Roadmap from "../models/Roadmap.js";
import Progress from "../models/Progress.js";

const slug = s => String(s || "").toLowerCase().replace(/\s+/g, "-");
const lvl  = s => String(s || "").toLowerCase();

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
        totals: { videosDone: 0, videosTotal: 0, percent: 0 },
        topics: [],
        continuePath: null,
      });
    }

    const domainSlug = slug(roadmap.domain);
    const levelSlug  = lvl(roadmap.skillLevel);
    const courseId   = `${domainSlug}-${levelSlug}`;

    const progDoc = await Progress.findOne({ userId, courseId }).lean();

    // Build a map: topicId → { currentIndex, videoProgress }
    const progressMap = new Map();
    if (progDoc?.progress) {
      for (const p of progDoc.progress) {
        progressMap.set(String(p.topicId), {
          currentIndex: Number.isFinite(p.currentIndex) ? p.currentIndex : 0,
          videoProgress: p.videoProgress || {},
        });
      }
    }

    let aggDone = 0;
    let aggTotal = 0;

    const topics = (roadmap.topics || [])
      .slice()
      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
      .map(step => {
        const topicId = String(step.sequenceNumber);
        const p = progressMap.get(topicId);

        const doneCount = p
          ? Object.values(p.videoProgress).filter(Boolean).length
          : 0;

        // BUG FIX: use actual video count from roadmap topic as denominator.
        // Old code used Object.keys(videoProgress).length — that only counts
        // videos the user has *opened*, so a topic with 5 videos where 0 were
        // opened shows 0% correctly but one opened shows 100% prematurely.
        const totalVideos = step.videos?.length || 0;

        aggDone  += doneCount;
        aggTotal += totalVideos;

        const percent = totalVideos > 0
          ? Math.round((doneCount / totalVideos) * 100)
          : 0;

        // Determine if this module's test is passed
        const moduleStatus = progDoc?.moduleStatus || {};
        const testPassed = moduleStatus[topicId] === "completed";

        return {
          sequenceNumber: step.sequenceNumber,
          title: step.title,
          description: step.description || "",
          percent,
          videosDone: doneCount,
          videosTotal: totalVideos,
          testPassed,
          next: p ? { topicId, currentIndex: p.currentIndex } : null,
        };
      });

    const overall = aggTotal > 0
      ? Math.round((aggDone / aggTotal) * 100)
      : 0;

    res.json({
      success: true,
      domain: domainSlug,
      skillLevel: levelSlug,
      totals: { videosDone: aggDone, videosTotal: aggTotal, percent: overall },
      topics,
      continuePath: { url: `/courses/${domainSlug}/${levelSlug}`, domainSlug, levelSlug },
    });
  } catch (err) {
    console.error("Learning Path overview error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
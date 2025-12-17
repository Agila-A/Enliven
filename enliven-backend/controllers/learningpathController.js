// controllers/learningPathController.js
import Roadmap from "../models/Roadmap.js";
import Progress from "../models/Progress.js";

const slug = s => String(s || "").toLowerCase().replace(/\s+/g, "-");
const lvl  = s => String(s || "").toLowerCase();

export const getLearningPathOverview = async (req, res) => {
  try {
    const userId = req.userId;

    // one active roadmap per user
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

    // get saved progress doc for this course
    const progDoc = await Progress.findOne({ userId, courseId }).lean();

    // We only have per-topic videoProgress and currentIndex here.
    // The “videosTotal” comes later inside CoursePage from merged JSON. For learning path,
    // we’ll display per-topic percent using only saved info: if nothing is saved => 0%.
    const progressMap = new Map(); // topicId -> { currentIndex, videoProgress }
    if (progDoc?.progress) {
      for (const p of progDoc.progress) {
        progressMap.set(String(p.topicId), {
          currentIndex: Number.isFinite(p.currentIndex) ? p.currentIndex : 0,
          videoProgress: p.videoProgress || {},
        });
      }
    }

    // Summaries (without knowing exact total videos yet -> we derive % by ratio of completed flags we have)
    let aggDone = 0, aggTotal = 0;
    const topics = (roadmap.topics || [])
      .slice()
      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
      .map(step => {
        const topicId = String(step.sequenceNumber);
        const p = progressMap.get(topicId);

        const doneCount = p ? Object.values(p.videoProgress || {}).filter(Boolean).length : 0;
        const totalSeen = p ? Object.keys(p.videoProgress || {}).length : 0;

        aggDone  += doneCount;
        aggTotal += totalSeen;

        const percent = totalSeen ? Math.round((doneCount / totalSeen) * 100) : 0;

        return {
          sequenceNumber: step.sequenceNumber,
          title: step.title,
          description: step.description || "",
          percent,
          videosDone: doneCount,
          videosTracked: totalSeen,
          next: p ? { topicId, currentIndex: p.currentIndex } : null,
        };
      });

    const overall = aggTotal ? Math.round((aggDone / aggTotal) * 100) : 0;

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

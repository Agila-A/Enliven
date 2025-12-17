// src/components/LearningPath/LearningPath.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Lock,
  Target,
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";

const toSlug = (s = "") => s.toLowerCase().trim().replace(/\s+/g, "-");
const toLevel = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "");
const pct = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

// Convert your Map<number,bool>-like object into "done count"
const countDone = (videoProgressObj) => {
  if (!videoProgressObj || typeof videoProgressObj !== "object") return 0;
  return Object.values(videoProgressObj).filter(Boolean).length;
};

export default function LearningPath() {
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null); // { domain, skillLevel, topics: [{sequenceNumber,title,description}] }
  const [perTopic, setPerTopic] = useState({}); // topicId -> { videosDone, videosTotal, percent }
  const [selected, setSelected] = useState(null);

  const navigate = useNavigate();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // derive courseId from roadmap
  const courseId = useMemo(() => {
    if (!roadmap) return null;
    return `${roadmap.domain}-${roadmap.skillLevel}`; // same as CoursePage
  }, [roadmap]);

  // ---- load roadmap + then progress ----
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        // 1) roadmap
        const r = await fetch(
          `${import.meta.env.VITE_API_URL}/api/roadmap/my-roadmap`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!r.ok) {
          // graceful fallback if no roadmap yet
          if (mounted) {
            setRoadmap(null);
            setPerTopic({});
          }
          return;
        }

        const rj = await r.json();
        if (!rj?.success || !rj?.roadmap) {
          if (mounted) {
            setRoadmap(null);
            setPerTopic({});
          }
          return;
        }

        const rm = rj.roadmap;
        if (mounted) setRoadmap(rm);

        // 2) progress for this course (optional)
        const cid = `${rm.domain}-${rm.skillLevel}`;
        const p = await fetch(
          `${import.meta.env.VITE_API_URL}/api/progress/${cid}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        let topicStats = {};
        if (p.ok) {
          const pj = await p.json();
          const arr = Array.isArray(pj?.progress) ? pj.progress : [];

          // Build quick lookup: topicId -> { videosDone, videosTotal, percent }
          // We don’t know videosTotal from roadmap alone, so we infer it from videoProgress keys length.
          for (const row of arr) {
            const tId = String(row.topicId);
            const videosDone = countDone(row.videoProgress);
            const videosTotal = Math.max(
              videosDone,
              Object.keys(row.videoProgress || {}).length
            );
            topicStats[tId] = {
              videosDone,
              videosTotal,
              percent: pct(videosDone, videosTotal),
            };
          }
        }

        if (mounted) setPerTopic(topicStats);
      } catch (e) {
        console.error("LearningPath load error:", e);
        if (mounted) {
          setRoadmap(null);
          setPerTopic({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  if (loading) return <p className="p-8">Loading your learning path…</p>;

  if (!roadmap || !Array.isArray(roadmap.topics) || roadmap.topics.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Your Learning Path</h1>
        <p className="text-muted-foreground">
          No roadmap yet. Generate one from your assessment or select a domain & level.
        </p>
      </div>
    );
  }

  const domainSlug = toSlug(roadmap.domain);
  const levelSlug = toLevel(roadmap.skillLevel);

  // compute overall stats
  const totals = roadmap.topics.reduce(
    (acc, t) => {
      const tid = String(t.sequenceNumber);
      const s = perTopic[tid] || { videosDone: 0, videosTotal: 0, percent: 0 };
      acc.done += s.videosDone;
      acc.total += s.videosTotal;
      return acc;
    },
    { done: 0, total: 0 }
  );
  const overallPercent = pct(totals.done, totals.total);

  // UI helpers
  const statusFor = (index) => {
    // Very simple lock logic: first is open; each next unlocked if previous has 100%
    if (index === 0) return "unlocked";
    const prev = roadmap.topics[index - 1];
    const prevStat = perTopic[String(prev.sequenceNumber)];
    const prevDone = prevStat?.percent === 100;
    return prevDone ? "unlocked" : "locked";
  };

  const statusIcon = (status) => {
    if (status === "locked") return <Lock className="w-6 h-6 text-muted-foreground" />;
    if (status === "unlocked") return <Circle className="w-6 h-6 text-gray-500" />;
    return <CheckCircle2 className="w-6 h-6 text-success" />;
  };

  const goToModule = (topicSeq) => {
    navigate(`/courses/${domainSlug}/${levelSlug}`, {
      state: { moduleId: String(topicSeq) },
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Learning Path</h1>
        <p className="text-muted-foreground">
          Follow your personalized journey to mastery. Complete modules sequentially to unlock new content.
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-primary to-[#582B5B] rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {roadmap.domain} — {roadmap.skillLevel}
            </h2>
            <p className="text-white/80">Personalized learning track</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{overallPercent}%</p>
            <p className="text-sm text-white/80">Complete</p>
          </div>
        </div>

        <ProgressBar progress={overallPercent} className="mb-4" />

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Videos Done</span>
            </div>
            <p className="text-2xl font-bold">
              {totals.done} / {Math.max(totals.total, totals.done)}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Modules</span>
            </div>
            <p className="text-2xl font-bold">{roadmap.topics.length}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Award className="w-4 h-4" />
              <span className="text-sm">Track</span>
            </div>
            <p className="text-2xl font-bold">Active</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Modules list */}
        <div className="lg:col-span-2 space-y-6">
          {roadmap.topics
            .slice()
            .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
            .map((t, idx) => {
              const tid = String(t.sequenceNumber);
              const stat = perTopic[tid] || { videosDone: 0, videosTotal: 0, percent: 0 };
              const status =
                stat.percent === 100 ? "completed" : statusFor(idx);
              const locked = status === "locked";
              const current = status !== "locked" && stat.percent > 0 && stat.percent < 100;

              return (
                <div key={tid} className="relative">
                  {idx < roadmap.topics.length - 1 && (
                    <div className="absolute left-12 top-20 w-0.5 h-12 bg-border" />
                  )}

                  <div
                    className={`bg-card rounded-xl border-2 p-6 transition-all ${
                      current
                        ? "border-primary shadow-lg"
                        : locked
                        ? "border-border opacity-60"
                        : "border-border hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* icon */}
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                          locked ? "bg-secondary" : "bg-primary/10"
                        }`}
                      >
                        {statusIcon(status)}
                      </div>

                      {/* content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              {!locked && current && (
                                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                                  In Progress
                                </span>
                              )}
                              {status === "completed" && (
                                <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                                  Completed
                                </span>
                              )}
                            </div>
                            <h3 className="text-xl font-semibold mb-1">
                              {t.title}
                            </h3>
                            {t.description && (
                              <p className="text-muted-foreground text-sm">
                                {t.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* stats */}
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-3 mb-4">
                          <span className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-1" />
                            {stat.videosTotal || 0} videos
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {stat.videosDone}/{stat.videosTotal || 0} done
                          </span>
                        </div>

                        {/* progress */}
                        {!locked && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-semibold">{stat.percent}%</span>
                            </div>
                            <ProgressBar progress={stat.percent} />
                          </div>
                        )}

                        {/* actions */}
                        <div className="mt-4">
                          {locked ? (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Lock className="w-4 h-4 mr-2" />
                              Complete previous modules to unlock
                            </div>
                          ) : (
                            <Button
                              variant={current ? "default" : "outline"}
                              className={current ? "bg-primary hover:bg-primary/90" : ""}
                              onClick={() => goToModule(t.sequenceNumber)}
                            >
                              {status === "completed" ? "Review Module" : "Continue Learning"}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Sidebar: details */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border p-6 sticky top-24">
            {selected ? (
              <>
                <h3 className="text-xl font-semibold mb-2">{selected.title}</h3>
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}

                <div className="mt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Target className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Learning Objectives</h4>
                  </div>
                  <ul className="space-y-2">
                    {(selected.objectives || []).map((o, i) => (
                      <li key={i} className="flex items-start space-x-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-[#582B5B]" />
                    <h4 className="font-semibold">Expected Outcomes</h4>
                  </div>
                  <ul className="space-y-2">
                    {(selected.outcomes || []).map((o, i) => (
                      <li key={i} className="flex items-start space-x-2 text-sm">
                        <Award className="w-4 h-4 text-[#864F6C] mt-0.5 flex-shrink-0" />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  className="w-full mt-6"
                  onClick={() => goToModule(selected.sequenceNumber)}
                >
                  Open Module
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Select a module card to view details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

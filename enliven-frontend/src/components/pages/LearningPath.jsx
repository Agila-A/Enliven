// src/components/LearningPath/LearningPath.jsx
import React, { useEffect, useState } from "react";
import {
  CheckCircle2, Circle, Lock, Target,
  BookOpen, Clock, TrendingUp, Award, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";

// ── slug helpers ──────────────────────────────────────────────────
const toSlug  = (s = "") => s.toLowerCase().trim().replace(/\s+/g, "-");
// Strip non-alpha chars (trailing "." etc.) THEN lowercase — handles "Intermediate." → "intermediate"
const toLevel = (s = "") => s.replace(/[^a-zA-Z\s]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const pct     = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

const countDone = (vp) => {
  if (!vp || typeof vp !== "object") return 0;
  return Object.values(vp).filter(Boolean).length;
};

export default function LearningPath() {
  const [loading, setLoading]         = useState(true);
  const [roadmap, setRoadmap]         = useState(null);
  const [perTopic, setPerTopic]       = useState({});
  const [moduleStatus, setModuleStatus] = useState({});
  const [selected, setSelected]       = useState(null);

  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        // ── 1. Roadmap ────────────────────────────────────────────
        const r = await fetch(
          `${import.meta.env.VITE_API_URL}/api/roadmap/my-roadmap`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!r.ok) { if (mounted) { setRoadmap(null); setPerTopic({}); } return; }

        const rj = await r.json();
        if (!rj?.success || !rj?.roadmap) {
          if (mounted) { setRoadmap(null); setPerTopic({}); } return;
        }

        const rm = rj.roadmap;
        if (mounted) setRoadmap(rm);

        // FIX: strip trailing punctuation before building slugs
        // "Intermediate." → "intermediate",  "Web Development" → "web-development"
        const domainSlug = toSlug(rm.domain);
        const levelSlug  = toLevel(rm.skillLevel);
        const cid        = `${domainSlug}-${levelSlug}`;

        // ── 2. Fetch progress + real video counts in parallel ─────
        const [pRes, vcRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/progress/${cid}`,
            { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/api/courses/${domainSlug}/${levelSlug}/video-counts`,
            { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        // Real video counts per topic from course JSON e.g. { "1": 2, "2": 3, ... }
        // Covers ALL modules including ones the user hasn't visited yet
        let realCounts = {};
        if (vcRes.ok) {
          const vcj = await vcRes.json();
          realCounts = vcj.topics || {};
        }

        // ── 3. Seed ALL topics with real totals (0 done) ──────────
        // KEY FIX: unvisited modules now contribute to the denominator
        // so 2 done out of 11 total = 18%, not 2/2 = 100%
        const topicStats = {};
        for (const t of rm.topics || []) {
          const tid = String(t.sequenceNumber);
          topicStats[tid] = {
            videosDone:  0,
            videosTotal: realCounts[tid] || 0,
            percent:     0,
          };
        }

        // ── 4. Overlay actual progress for visited topics ─────────
        let dbModuleStatus = {};
        if (pRes.ok) {
          const pj = await pRes.json();
          dbModuleStatus = pj.moduleStatus || {};

          for (const row of (pj.progress || [])) {
            const tId        = String(row.topicId);
            const videosDone = countDone(row.videoProgress);
            const videosTotal =
              realCounts[tId] > 0 ? realCounts[tId] :
              row.videoCount  > 0 ? row.videoCount  :
              Math.max(videosDone, Object.keys(row.videoProgress || {}).length);

            topicStats[tId] = { videosDone, videosTotal, percent: pct(videosDone, videosTotal) };
          }
        }

        if (mounted) { setPerTopic(topicStats); setModuleStatus(dbModuleStatus); }
      } catch (e) {
        console.error("LearningPath load error:", e);
        if (mounted) { setRoadmap(null); setPerTopic({}); }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
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
  const levelSlug  = toLevel(roadmap.skillLevel);

  // Overall stats — uses ALL topics including unvisited ones
  const totals = roadmap.topics.reduce(
    (acc, t) => {
      const s = perTopic[String(t.sequenceNumber)] || { videosDone: 0, videosTotal: 0 };
      acc.done  += s.videosDone;
      acc.total += s.videosTotal;
      return acc;
    },
    { done: 0, total: 0 }
  );
  const overallPercent = pct(totals.done, totals.total);

  // Lock logic: module N unlocks only when module N-1's test is passed in DB
  const statusFor = (index) => {
    if (index === 0) return "unlocked";
    const prevId = String(roadmap.topics[index - 1].sequenceNumber);
    return moduleStatus[prevId] === "completed" ? "unlocked" : "locked";
  };

  const statusIcon = (s) => {
    if (s === "locked")    return <Lock className="w-6 h-6 text-muted-foreground" />;
    if (s === "completed") return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    return <Circle className="w-6 h-6 text-gray-500" />;
  };

  const goToModule = (seq) =>
    navigate(`/courses/${domainSlug}/${levelSlug}`, { state: { moduleId: String(seq) } });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Learning Path</h1>
        <p className="text-muted-foreground">
          Follow your personalized journey to mastery. Complete modules sequentially to unlock new content.
        </p>
      </div>

      {/* ── Overall Progress Banner ── */}
      <div className="bg-gradient-to-r from-primary to-[#582B5B] rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{roadmap.domain} — {roadmap.skillLevel}</h2>
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
              <CheckCircle2 className="w-4 h-4" /><span className="text-sm">Videos Done</span>
            </div>
            {/* FIX: show real total, not Math.max(total,done) */}
            <p className="text-2xl font-bold">{totals.done} / {totals.total}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4" /><span className="text-sm">Modules</span>
            </div>
            <p className="text-2xl font-bold">{roadmap.topics.length}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Award className="w-4 h-4" /><span className="text-sm">Track</span>
            </div>
            <p className="text-2xl font-bold">Active</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Module Cards ── */}
        <div className="lg:col-span-2 space-y-6">
          {roadmap.topics
            .slice()
            .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
            .map((t, idx) => {
              const tid         = String(t.sequenceNumber);
              const stat        = perTopic[tid] || { videosDone: 0, videosTotal: 0, percent: 0 };
              const isCompleted = moduleStatus[tid] === "completed";
              const statusVal   = isCompleted ? "completed" : statusFor(idx);
              const locked      = statusVal === "locked";
              const current     = !locked && !isCompleted && stat.percent > 0 && stat.percent < 100;

              return (
                <div key={tid} className="relative">
                  {idx < roadmap.topics.length - 1 && (
                    <div className="absolute left-12 top-20 w-0.5 h-12 bg-border" />
                  )}
                  <div
                    className={`bg-card rounded-xl border-2 p-6 transition-all cursor-pointer ${
                      current     ? "border-primary shadow-lg" :
                      locked      ? "border-border opacity-60" :
                      isCompleted ? "border-green-300"         :
                                    "border-border hover:shadow-md"
                    }`}
                    onClick={() => !locked && setSelected(t)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        locked ? "bg-secondary" : "bg-primary/10"
                      }`}>
                        {statusIcon(statusVal)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {current && (
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                              In Progress
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                              Completed
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-semibold mb-1">{t.title}</h3>
                        {t.description && (
                          <p className="text-muted-foreground text-sm">{t.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-3 mb-4">
                          <span className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-1" />{stat.videosTotal || 0} videos
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {stat.videosDone}/{stat.videosTotal || 0} done
                          </span>
                        </div>

                        {!locked && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-semibold">{stat.percent}%</span>
                            </div>
                            <ProgressBar progress={stat.percent} />
                          </div>
                        )}

                        <div className="mt-4">
                          {locked ? (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Lock className="w-4 h-4 mr-2" />Complete previous module test to unlock
                            </div>
                          ) : (
                            <Button
                              variant={current ? "default" : "outline"}
                              className={current ? "bg-primary hover:bg-primary/90" : ""}
                              onClick={(e) => { e.stopPropagation(); goToModule(t.sequenceNumber); }}
                            >
                              {isCompleted ? "Review Module" : "Continue Learning"}
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

        {/* ── Detail Sidebar ── */}
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
                <Button className="w-full mt-6" onClick={() => goToModule(selected.sequenceNumber)}>
                  Open Module
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Select a module card to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

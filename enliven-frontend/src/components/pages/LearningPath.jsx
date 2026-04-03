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

        const domainSlug = toSlug(rm.domain);
        const levelSlug  = toLevel(rm.skillLevel);
        const cid        = `${domainSlug}-${levelSlug}`;

        const [pRes, vcRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/progress/${cid}`,
            { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/api/courses/${domainSlug}/${levelSlug}/video-counts`,
            { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        let realCounts = {};
        if (vcRes.ok) {
          const vcj = await vcRes.json();
          realCounts = vcj.topics || {};
        }

        const topicStats = {};
        for (const t of rm.topics || []) {
          const tid = String(t.sequenceNumber);
          topicStats[tid] = {
            videosDone:  0,
            videosTotal: realCounts[tid] || 0,
            percent:     0,
          };
        }

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

  if (loading) return <div className="p-10 flex justify-center"><p className="text-foreground/70 font-medium">Loading your learning path…</p></div>;

  if (!roadmap || !Array.isArray(roadmap.topics) || roadmap.topics.length === 0) {
    return (
      <div className="p-8 min-h-screen bg-cream/20 font-sans">
        <h1 className="text-3xl font-bold mb-4 text-foreground tracking-tight">Your Learning Path</h1>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-cream text-center">
             <p className="text-foreground/60 text-lg">
                No roadmap yet. Generate one from your assessment or select a domain & level.
            </p>
            <button 
                className="mt-6 px-8 py-3 bg-red text-white font-bold rounded-xl shadow-md hover:bg-red/90 transition-all"
                onClick={() => navigate('/assessment')}
            >
                Take Assessment
            </button>
        </div>
      </div>
    );
  }

  const domainSlug = toSlug(roadmap.domain);
  const levelSlug  = toLevel(roadmap.skillLevel);

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

  const statusFor = (index) => {
    if (index === 0) return "unlocked";
    const prevId = String(roadmap.topics[index - 1].sequenceNumber);
    return moduleStatus[prevId] === "completed" ? "unlocked" : "locked";
  };

  const statusIcon = (s) => {
    if (s === "locked")    return <Lock className="w-6 h-6 text-foreground/40" />;
    if (s === "completed") return <CheckCircle2 className="w-6 h-6 text-green" />;
    return <Circle className="w-6 h-6 text-yellow" />;
  };

  const goToModule = (seq) =>
    navigate(`/courses/${domainSlug}/${levelSlug}`, { state: { moduleId: String(seq) } });

  return (
    <div className="p-8 min-h-screen bg-cream/20 font-sans">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-3 text-foreground tracking-tight">Your Learning Path</h1>
        <p className="text-foreground/70 text-lg">
          Follow your personalized journey to mastery. Complete modules sequentially to unlock new content.
        </p>
      </div>

      {/* ── Overall Progress Banner ── */}
      <div className="bg-red rounded-3xl p-8 text-white mb-10 shadow-md relative overflow-hidden group">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[120%] bg-white/10 rounded-full blur-3xl transform rotate-12 group-hover:bg-white/20 transition-all"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 relative z-10 gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-2 tracking-tight">{roadmap.domain} — {roadmap.skillLevel}</h2>
            <p className="text-white/80 font-medium">Personalized learning track</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 text-center border border-white/30 shadow-inner">
            <p className="text-4xl font-bold mb-1">{overallPercent}%</p>
            <p className="text-sm text-white/80 font-bold uppercase tracking-widest">Complete</p>
          </div>
        </div>

        <div className="relative z-10">
            <ProgressBar progress={overallPercent} className="mb-6" colorClass="bg-green" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <div className="flex items-center space-x-2 mb-2 text-white/80">
              <CheckCircle2 className="w-5 h-5" /><span className="text-sm font-semibold uppercase tracking-wider">Videos Done</span>
            </div>
            <p className="text-3xl font-bold">{totals.done} / {totals.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <div className="flex items-center space-x-2 mb-2 text-white/80">
              <Clock className="w-5 h-5" /><span className="text-sm font-semibold uppercase tracking-wider">Modules</span>
            </div>
            <p className="text-3xl font-bold">{roadmap.topics.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <div className="flex items-center space-x-2 mb-2 text-white/80">
              <Award className="w-5 h-5" /><span className="text-sm font-semibold uppercase tracking-wider">Track</span>
            </div>
            <p className="text-3xl font-bold">Active</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* ── Module Cards ── */}
        <div className="lg:col-span-2 space-y-6 relative">
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
                <div key={tid} className="relative group">
                  {idx < roadmap.topics.length - 1 && (
                    <div className="absolute left-[3.25rem] top-24 w-1 h-16 bg-cream/50 z-0" />
                  )}
                  <div
                    className={`bg-white rounded-3xl border-2 p-8 transition-all duration-300 relative z-10 cursor-pointer shadow-sm ${
                      current     ? "border-red shadow-soft transform -translate-y-1" :
                      locked      ? "border-cream/50 opacity-70 cursor-not-allowed" :
                      isCompleted ? "border-green/50 hover:shadow-soft hover:border-green" :
                                    "border-cream hover:shadow-soft hover:border-yellow"
                    }`}
                    onClick={() => !locked && setSelected(t)}
                  >
                    <div className="flex items-start space-x-6">
                      <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
                        locked ? "bg-cream text-foreground/40" : 
                        isCompleted ? "bg-green/10" : "bg-yellow/10"
                      }`}>
                        {statusIcon(statusVal)}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {current && (
                            <span className="text-xs font-bold text-red bg-red/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
                              In Progress
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-xs font-bold text-green bg-green/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
                              Completed
                            </span>
                          )}
                        </div>

                        <h3 className={`text-2xl font-bold mb-2 ${locked ? "text-foreground/60" : "text-foreground"}`}>{t.title}</h3>
                        {t.description && (
                          <p className="text-foreground/60 font-medium mb-4">{t.description}</p>
                        )}

                        <div className="flex items-center space-x-6 text-sm font-semibold text-foreground/50 mb-6">
                          <span className="flex items-center">
                            <BookOpen className="w-5 h-5 mr-2 text-foreground/40" />{stat.videosTotal || 0} videos
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-foreground/40" />
                            {stat.videosDone}/{stat.videosTotal || 0} done
                          </span>
                        </div>

                        {!locked && (
                          <div className="space-y-3 mb-6 bg-cream/20 p-4 rounded-2xl border border-cream/50">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-foreground/70 font-bold uppercase tracking-wider text-xs">Progress</span>
                              <span className="font-bold text-foreground">{stat.percent}%</span>
                            </div>
                            <ProgressBar progress={stat.percent} colorClass={isCompleted ? "bg-green" : "bg-yellow"} />
                          </div>
                        )}

                        <div>
                          {locked ? (
                            <div className="flex items-center text-sm font-medium text-foreground/50 bg-cream/30 p-3 rounded-xl">
                              <Lock className="w-5 h-5 mr-3" />Complete previous module test to unlock
                            </div>
                          ) : (
                            <button
                              className={`w-full sm:w-auto px-6 py-3 font-bold rounded-xl shadow-xs transition-all flex items-center justify-center tracking-wide ${
                                  current ? "bg-red text-white hover:bg-red/90 hover:shadow-md" : "bg-white border-2 border-red text-red hover:bg-red/5"
                              }`}
                              onClick={(e) => { e.stopPropagation(); goToModule(t.sequenceNumber); }}
                            >
                              {isCompleted ? "Review Module" : "Continue Learning"}
                              <ChevronRight className="w-5 h-5 ml-2" />
                            </button>
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
          <div className="bg-white rounded-3xl border border-cream p-8 sticky top-28 shadow-sm">
            {selected ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="w-12 h-12 bg-red/10 text-red rounded-xl flex items-center justify-center mb-6">
                    <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">{selected.title}</h3>
                {selected.description && (
                  <p className="text-base text-foreground/60 font-medium mb-8 leading-relaxed">{selected.description}</p>
                )}
                
                <div className="mb-8 p-5 bg-green/5 rounded-2xl border border-green/10">
                  <div className="flex items-center space-x-3 mb-4">
                    <Target className="w-6 h-6 text-green" />
                    <h4 className="font-bold text-lg text-foreground">Learning Objectives</h4>
                  </div>
                  <ul className="space-y-3">
                    {(selected.objectives || []).map((o, i) => (
                      <li key={i} className="flex items-start space-x-3 text-sm font-medium text-foreground/70">
                        <CheckCircle2 className="w-5 h-5 text-green mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mb-8 p-5 bg-yellow/5 rounded-2xl border border-yellow/10">
                  <div className="flex items-center space-x-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-yellow" />
                    <h4 className="font-bold text-lg text-foreground">Expected Outcomes</h4>
                  </div>
                  <ul className="space-y-3">
                    {(selected.outcomes || []).map((o, i) => (
                      <li key={i} className="flex items-start space-x-3 text-sm font-medium text-foreground/70">
                        <Award className="w-5 h-5 text-yellow mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button 
                  className="w-full py-4 bg-red text-white font-bold rounded-xl shadow-md hover:bg-red/90 transition-all hover:-translate-y-0.5" 
                  onClick={() => goToModule(selected.sequenceNumber)}>
                  Open Module
                </button>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-cream/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Target className="w-10 h-10 text-foreground/30" />
                </div>
                <h4 className="text-xl font-bold mb-2">Module Details</h4>
                <p className="text-foreground/50 font-medium px-4">Select any module card from the path to view its objectives and outcomes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

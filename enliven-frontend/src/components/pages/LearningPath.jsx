import React, { useEffect, useState } from "react";
import {
  CheckCircle2, Lock, Target,
  BookOpen, Clock, Award, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressBar } from "../ProgressBar";

const toSlug  = (s = "") => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toLevel = (s = "") => s.replace(/[^a-zA-Z\s]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export default function LearningPath() {
  const [loading, setLoading]         = useState(true);
  const [roadmap, setRoadmap]         = useState(null);
  const [topicsStatus, setTopicsStatus] = useState([]);
  const [totals, setTotals]           = useState({ modulesPassed: 0, totalModules: 0, percent: 0 });
  const [selected, setSelected]       = useState(null);

  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const r = await fetch(
          `${import.meta.env.VITE_API_URL}/api/learning-path`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!r.ok) { if (mounted) { setRoadmap(null); } return; }

        const rj = await r.json();
        if (!rj?.success) {
          if (mounted) { setRoadmap(null); } return;
        }

        if (mounted) { 
          // Reconstruct roadmap structure enough for the UI
          setRoadmap({
            domain: rj.domain,
            skillLevel: rj.skillLevel,
            topics: rj.topics
          });
          setTopicsStatus(rj.topics || []);
          setTotals(rj.totals || { modulesPassed: 0, totalModules: 0, percent: 0 });
        }

      } catch (e) {
        console.error("LearningPath load error:", e);
        if (mounted) { setRoadmap(null); }
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

  const overallPercent = totals.percent;
  const domainRaw = roadmap.domain.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const levelRaw = roadmap.skillLevel.charAt(0).toUpperCase() + roadmap.skillLevel.slice(1);
  const domainSlug = toSlug(roadmap.domain);
  const levelSlug = toLevel(roadmap.skillLevel);

  const goToModule = () =>
    navigate(`/courses/${domainSlug}/${levelSlug}`);

  return (
    <div className="p-8 min-h-screen bg-cream/20 font-sans">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-3 text-foreground tracking-tight">Your Learning Path</h1>
        <p className="text-foreground/70 text-lg">
          Follow your personalized journey to mastery. Complete modules sequentially to unlock new content.
        </p>
      </div>

      <div className="bg-red rounded-3xl p-8 text-white mb-10 shadow-md relative overflow-hidden group">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[120%] bg-white/10 rounded-full blur-3xl transform rotate-12 group-hover:bg-white/20 transition-all"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 relative z-10 gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-2 tracking-tight">{domainRaw} — {levelRaw}</h2>
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
              <CheckCircle2 className="w-5 h-5" /><span className="text-sm font-semibold uppercase tracking-wider">Modules Passed</span>
            </div>
            <p className="text-3xl font-bold">{totals.modulesPassed} / {totals.totalModules}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <div className="flex items-center space-x-2 mb-2 text-white/80">
              <Clock className="w-5 h-5" /><span className="text-sm font-semibold uppercase tracking-wider">Total Modules</span>
            </div>
            <p className="text-3xl font-bold">{totals.totalModules}</p>
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
        <div className="lg:col-span-2 space-y-6 relative">
          {topicsStatus.map((t, idx) => {
            const isFirst = idx === 0;
            const prevPassed = idx > 0 ? topicsStatus[idx - 1].testPassed : false;
            const locked = !isFirst && !prevPassed;
            
            const isCompleted = t.testPassed;
            const studyStarted = t.studyStarted;
            const current = !locked && !isCompleted;

            return (
              <div key={t.sequenceNumber} className="relative group">
                {idx < topicsStatus.length - 1 && (
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
                      isCompleted ? "bg-green/10 text-green" : "bg-red/10 text-red"
                    }`}>
                      {locked ? <Lock className="w-6 h-6" /> : isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {locked && (
                          <span className="text-xs font-bold text-foreground/40 bg-cream/30 px-3 py-1.5 rounded-full uppercase tracking-wider">
                            Locked
                          </span>
                        )}
                        {current && studyStarted && (
                          <span className="text-xs font-bold text-red bg-red/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
                            Studying
                          </span>
                        )}
                        {current && !studyStarted && (
                          <span className="text-xs font-bold text-yellow bg-yellow/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
                            Not Started
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-xs font-bold text-green bg-green/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
                            Passed
                          </span>
                        )}
                      </div>

                      <h3 className={`text-2xl font-bold mb-2 ${locked ? "text-foreground/60" : "text-foreground"}`}>{t.title}</h3>
                      {t.description && (
                        <p className="text-foreground/60 font-medium mb-4">{t.description}</p>
                      )}

                      <div>
                        {locked ? (
                          <div className="flex items-center text-sm font-medium text-foreground/50 bg-cream/30 p-3 rounded-xl mt-4">
                            <Lock className="w-5 h-5 mr-3" />Complete previous module test to unlock
                          </div>
                        ) : (
                          <button
                            className={`w-full sm:w-auto mt-4 px-6 py-3 font-bold rounded-xl shadow-xs transition-all flex items-center justify-center tracking-wide ${
                                current ? "bg-red text-white hover:bg-red/90 hover:shadow-md" : "bg-white border-2 border-red text-red hover:bg-red/5"
                            }`}
                            onClick={(e) => { e.stopPropagation(); goToModule(); }}
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
                
                <button 
                  className="w-full py-4 bg-red text-white font-bold rounded-xl shadow-md hover:bg-red/90 transition-all hover:-translate-y-0.5" 
                  onClick={() => goToModule()}>
                  Open Module
                </button>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-cream/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Target className="w-10 h-10 text-foreground/30" />
                </div>
                <h4 className="text-xl font-bold mb-2">Module Details</h4>
                <p className="text-foreground/50 font-medium px-4">Select any module card from the path to view its details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

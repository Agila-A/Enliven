// pages/AnalyticsPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { TrendingUp, Shield, Clock, Target, Award, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import Chart from "chart.js/auto";

/* ─── COLOUR HELPERS ─────────────────────────────────────────── */
const scoreColor = (score) =>
  score >= 80 ? "#94B38A" : score >= 60 ? "#EEBF43" : "#C54F2D";

/* ─── STAT CARD ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, colorClass = "text-foreground" }) {
  return (
    <div className="bg-white border-2 border-cream rounded-3xl p-6 flex flex-col justify-center shadow-sm hover:shadow-soft transition-all transform hover:-translate-y-1 group">
      <div className="flex items-start gap-5">
          <div className="p-4 rounded-xl bg-cream/30 text-foreground/50 group-hover:bg-red/10 group-hover:text-red transition-colors flex-shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-foreground/50 font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-1">{label}</p>
            <p className={`text-3xl font-black tracking-tight ${colorClass}`}>{value}</p>
            {sub && <p className="text-sm font-medium text-foreground/60 mt-2 bg-cream/20 px-2.5 py-1 inline-block rounded-md">{sub}</p>}
          </div>
      </div>
    </div>
  );
}

/* ─── CHART WRAPPER ──────────────────────────────────────────── */
function ChartCard({ title, children }) {
  return (
    <div className="bg-white border-2 border-cream rounded-3xl p-8 shadow-sm flex flex-col h-full">
      <h3 className="font-bold text-xl mb-6 text-foreground">{title}</h3>
      <div className="flex-1 relative">
        {children}
      </div>
    </div>
  );
}

/* ─── INTEGRITY BADGE ─────────────────────────────────────────── */
function IntegrityBadge({ score }) {
  const color =
    score >= 90 ? "bg-green/10 text-green border-green/20"
    : score >= 70 ? "bg-yellow/10 text-yellow-700 border-yellow/20"
    : "bg-red/10 text-red border-red/20";
  const label = score >= 90 ? "Excellent" : score >= 70 ? "Fair" : "Needs attention";
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border uppercase tracking-wider ${color}`}>
      <Shield className="w-3.5 h-3.5" />
      {label} ({score}/100)
    </span>
  );
}

/* ─── HELPER: FORMAT TIME AGO ─────────────────────────────────── */
function formatTimeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError]         = useState("");
  const [enrollments, setEnrollments] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState("all");
  const [showPicker, setShowPicker] = useState(false);

  // Chart refs
  const scoreTrendRef    = useRef(null);
  const moduleBarRef     = useRef(null);
  const violationRef     = useRef(null);
  const timeRef          = useRef(null);
  const chartInstances   = useRef({});

  const token = localStorage.getItem("token");

  /* ── Fetch analytics & enrollments ── */
  useEffect(() => {
    async function load() {
      try {
        const [aRes, eRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/analytics`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/api/user/enrollments`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const data = await aRes.json();
        const eData = await eRes.json();

        if (eData.success) setEnrollments(eData.enrollments || []);

        if (!data.success && data.hasData !== false) throw new Error(data.message);
        
        setAnalytics(data);
      } catch (e) {
        setError("Failed to load analytics. " + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  /* ── Compute dynamic stats if filtered ── */
  const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
  const pct = (n, d) => d > 0 ? Math.round((n / d) * 100) : 0;

  const filteredAttempts = activeCourseId === "all" || (!analytics?.hasData)
    ? (analytics?.attemptDetails || [])
    : (analytics?.attemptDetails || []).filter(a => a.courseId === activeCourseId);

  const scores = filteredAttempts.map(a => a.score);
  const passedCount = filteredAttempts.filter(a => a.passed).length;
  const flaggedCount = filteredAttempts.filter(a => a.flagged).length;
  const durations = filteredAttempts.map(a => a.durationMins).filter(Boolean);
  const accuracies = filteredAttempts.map(a => a.accuracy?.pct).filter(v => v != null);
  const integrities = filteredAttempts.map(a => a.integrity);

  const displayStats = activeCourseId === "all" ? analytics?.overallStats : {
    totalAttempts: filteredAttempts.length,
    passedCount,
    failedCount: filteredAttempts.length - passedCount,
    passRate: pct(passedCount, filteredAttempts.length),
    avgScore: Math.round(avg(scores)),
    highestScore: filteredAttempts.length ? Math.max(...scores) : 0,
    lowestScore: filteredAttempts.length ? Math.min(...scores) : 0,
    avgDurationMins: durations.length ? Math.round(avg(durations) * 10) / 10 : null,
    avgAccuracy: accuracies.length ? Math.round(avg(accuracies)) : null,
    avgIntegrity: Math.round(avg(integrities)) || 100,
    flaggedCount
  };

  const displayTrend = activeCourseId === "all" ? analytics?.scoreTrend : filteredAttempts.map(a => ({
    label: a.moduleTitle, score: a.score, passed: a.passed, date: a.takenAt,
  }));

  const displayComparison = activeCourseId === "all" ? analytics?.moduleComparison : filteredAttempts.map(a => ({
    label: a.moduleTitle, score: a.score, passed: a.passed, accuracy: a.accuracy?.pct ?? null,
  }));

  const displayTime = activeCourseId === "all" ? analytics?.timeTaken : filteredAttempts.filter(a => a.durationMins !== null).map(a => ({
    label: a.moduleTitle, minutes: a.durationMins
  }));

  const displayViolations = activeCourseId === "all" ? analytics?.totalViolations : filteredAttempts.reduce(
    (acc, a) => {
      acc.tabSwitches += a.violations?.tabSwitches || 0;
      acc.faceNotDetected += a.violations?.faceNotDetected || 0;
      acc.multipleFaces += a.violations?.multipleFaces || 0;
      acc.lookingAway += a.violations?.lookingAway || 0;
      acc.expressionAlert += a.violations?.expressionAlert || 0;
      if (a.violations?.noCamera) acc.noCameraCount++;
      return acc;
    },
    { tabSwitches: 0, faceNotDetected: 0, multipleFaces: 0, lookingAway: 0, expressionAlert: 0, noCameraCount: 0 }
  );

  /* ── Build charts after data loads ── */
  useEffect(() => {
    if (!analytics?.hasData) return;

    const scoreTrend = displayTrend;
    const moduleComparison = displayComparison;
    const totalViolations = displayViolations;
    const timeTaken = displayTime;

    // Destroy existing instances before re-creating
    Object.values(chartInstances.current).forEach(c => c?.destroy());
    chartInstances.current = {};

    /* Score trend line chart */
    if (scoreTrendRef.current && scoreTrend?.length) {
      chartInstances.current.trend = new Chart(scoreTrendRef.current, {
        type: "line",
        data: {
          labels:   scoreTrend.map(s => s.label),
          datasets: [{
            label:           "Score (%)",
            data:            scoreTrend.map(s => s.score),
            borderColor:     "#C54F2D", // red
            backgroundColor: "rgba(197, 79, 45, 0.1)",
            borderWidth:     3,
            pointRadius:     6,
            pointBackgroundColor: scoreTrend.map(s => scoreColor(s.score)),
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            tension:         0.4,
            fill:            true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, max: 100, grid: { color: "rgba(0,0,0,0.05)" } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    /* Module comparison bar chart */
    if (moduleBarRef.current && moduleComparison?.length) {
      chartInstances.current.modules = new Chart(moduleBarRef.current, {
        type: "bar",
        data: {
          labels: moduleComparison.map(m => m.label),
          datasets: [
            {
              label:           "Score (%)",
              data:            moduleComparison.map(m => m.score),
              backgroundColor: moduleComparison.map(m => scoreColor(m.score)),
              borderRadius:    8,
              borderSkipped:   false,
            },
            {
              label:           "Accuracy (%)",
              data:            moduleComparison.map(m => m.accuracy ?? 0),
              backgroundColor: "rgba(238, 191, 67, 0.2)", // yellow/20
              borderColor:     "#EEBF43", // yellow
              borderWidth:     2,
              borderRadius:    8,
              borderSkipped:   false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { 
              position: "bottom", 
              labels: { 
                boxWidth: 12, 
                usePointStyle: true, 
                padding: 20, 
                font: { family: "'Inter', sans-serif", weight: 'bold' } 
              } 
            } 
          },
          scales: {
            y: { min: 0, max: 100, grid: { color: "rgba(0,0,0,0.05)" } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    /* Violation breakdown doughnut */
    if (violationRef.current) {
      const v = totalViolations;
      const labels = ["Tab switches", "Face not detected", "Multiple faces", "Looking away", "Expression alerts"];
      const values = [v.tabSwitches, v.faceNotDetected, v.multipleFaces, v.lookingAway, v.expressionAlert];
      const total  = values.reduce((s, n) => s + n, 0);

      chartInstances.current.violations = new Chart(violationRef.current, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data:            values,
            backgroundColor: ["#C54F2D", "#EEBF43", "#94B38A", "#6366f1", "#8b5cf6"], // brand colors
            borderWidth:     4,
            borderColor:     "#ffffff",
            hoverOffset:     8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout:  "70%",
          plugins: {
            legend: { position: "right", labels: { boxWidth: 10, usePointStyle: true, font: { size: 12, family: "'Inter', sans-serif", weight: '500' } } },
            title:  { display: true, text: total === 0 ? "No violations recorded" : `${total} total violations`, font: { size: 16, family: "'Inter', sans-serif", weight: 'bold'}, padding: { bottom: 20 } },
          },
        },
      });
    }

    /* Time taken bar chart */
    if (timeRef.current && timeTaken?.length) {
      chartInstances.current.time = new Chart(timeRef.current, {
        type: "bar",
        data: {
          labels:   timeTaken.map(t => t.label),
          datasets: [{
            label:           "Minutes",
            data:            timeTaken.map(t => t.minutes),
            backgroundColor: "#94B38A", // green
            borderRadius:    8,
            borderSkipped:   false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    return () => {
      Object.values(chartInstances.current).forEach(c => c?.destroy());
    };
  }, [analytics, activeCourseId]);

  /* ── Generate AI report ── */
  const handleRegenerateReport = async () => {
    setReportLoading(true);
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/report?courseId=${activeCourseId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(prev => {
          const next = { ...prev };
          if (activeCourseId === "all") {
            next.aiReport = { text: data.report, generatedAt: data.generatedAt };
          } else {
            if (!next.courseReports) next.courseReports = [];
            const idx = next.courseReports.findIndex(r => r.courseId === activeCourseId);
            if (idx >= 0) {
              next.courseReports[idx] = { courseId: activeCourseId, text: data.report, generatedAt: data.generatedAt };
            } else {
              next.courseReports.push({ courseId: activeCourseId, text: data.report, generatedAt: data.generatedAt });
            }
          }
          return next;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  };

  const currentReportObj = activeCourseId === "all" 
    ? analytics?.aiReport 
    : analytics?.courseReports?.find(r => r.courseId === activeCourseId);

  /* ── Loading / error / empty states ── */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center font-sans tracking-wide">
        <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-red mb-4" />
            <p className="text-foreground/70 font-bold">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex justify-center font-sans tracking-wide">
          <div className="bg-red/10 text-red border border-red/20 px-6 py-4 rounded-xl font-bold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              {error}
          </div>
      </div>
    );
  }

  if (!analytics?.hasData) {
    return (
      <div className="min-h-[calc(100vh-6rem)] p-8 flex items-center justify-center font-sans tracking-wide">
        <div className="bg-white border-2 border-cream rounded-[2rem] p-16 max-w-lg w-full text-center shadow-sm">
            <div className="w-24 h-24 bg-cream/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <TrendingUp className="w-10 h-10 text-foreground/40" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">No assessment attempts yet</h2>
            <p className="text-foreground/60 font-medium">
                Complete your first module test to unlock your personalized analytics dashboard.
            </p>
        </div>
      </div>
    );
  }

  const overallStats = displayStats;
  const attemptDetails = filteredAttempts;

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans tracking-wide bg-cream/20 min-h-[calc(100vh-4rem)]">

      {/* ── Header ── */}
      <div className="bg-white border border-cream rounded-3xl p-8 shadow-sm text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-visible">
        <div>
            <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">Analytics Dashboard</h1>
            <p className="text-foreground/60 font-medium text-lg">
              Track your assessment performance across all modules.
            </p>
            {analytics?.computedAt && (
              <p className="text-sm text-muted-foreground mt-2 font-bold tracking-widest uppercase opacity-70">
                Last updated: {formatTimeAgo(analytics.computedAt)}
              </p>
            )}
        </div>
        <div className="flex flex-col gap-4 md:items-end z-20">
          <div className="bg-cream/40 px-6 py-4 rounded-2xl flex items-center gap-4 border border-cream/80 w-max self-center md:self-end">
              <Award className="w-8 h-8 text-yellow" />
              <div className="text-left">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">Total Tests</p>
                  <p className="text-xl font-black text-foreground leading-none">{overallStats?.totalAttempts || 0}</p>
              </div>
          </div>
          
          {/* Course Switcher */}
          {enrollments.length > 0 && (
            <div className="relative w-max self-center md:self-end">
               <button
                 onClick={() => setShowPicker((v) => !v)}
                 className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-xs font-bold uppercase tracking-widest text-foreground hover:bg-cream/50 transition-colors border-2 border-cream/50 hover:border-primary/30"
               >
                 <Shield className="w-4 h-4 text-primary" />
                 {activeCourseId === "all" ? "All Courses" : enrollments.find(e => e.courseId === activeCourseId)?.courseId.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                 <svg className={`w-4 h-4 transition-transform text-muted-foreground ${showPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
               </button>

               {showPicker && (
                 <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-cream/50 rounded-2xl p-3 shadow-xl z-50 flex flex-col gap-2">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 pb-1">Filter Analytics</p>
                   <button
                     onClick={() => { setActiveCourseId("all"); setShowPicker(false); }}
                     className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                       activeCourseId === "all" ? "bg-primary text-white" : "hover:bg-cream/50 text-foreground"
                     }`}
                   >
                     All Courses
                   </button>
                   {enrollments.map((e) => (
                     <button
                       key={e.courseId}
                       onClick={() => { setActiveCourseId(e.courseId); setShowPicker(false); }}
                       className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                         e.courseId === activeCourseId ? "bg-primary text-white" : "hover:bg-cream/50 text-foreground"
                       }`}
                     >
                       {e.courseId.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                     </button>
                   ))}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Report ── */}
      <div className="bg-card border-2 border-cream rounded-3xl p-6 md:p-8 bg-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-black text-xl flex items-center gap-2">
              <span className="text-red">✨</span> AI performance report
            </h3>
            <p className="text-sm text-foreground/50 font-bold uppercase tracking-widest mt-2">
              Auto-generated after every test · {currentReportObj?.generatedAt
                ? `Last generated ${formatTimeAgo(currentReportObj.generatedAt)}`
                : "Not yet generated"}
            </p>
          </div>
          <Button onClick={handleRegenerateReport} disabled={reportLoading} className="shrink-0 bg-red text-white hover:bg-red/90 border border-transparent font-bold">
            {reportLoading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating…</>
              : "↻ Regenerate"}
          </Button>
        </div>

        {currentReportObj?.text ? (
          <div className="mt-4 p-6 bg-cream/20 rounded-2xl border border-cream text-sm md:text-base leading-relaxed font-medium text-foreground whitespace-pre-wrap shadow-inner max-h-64 overflow-y-auto custom-scrollbar">
            {currentReportObj.text}
          </div>
        ) : (
          <div className="mt-4 p-8 border-2 border-dashed border-cream/80 rounded-2xl text-center text-foreground/50 text-sm font-bold tracking-widest uppercase">
            {displayStats?.totalAttempts > 0
              ? "Report is being generated — check back in a moment."
              : "Complete your first module test to see your AI coaching report."}
          </div>
        )}
      </div>

      {/* ── Stat Cards Row ── */}
      {overallStats?.totalAttempts > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Average score"
            value={`${overallStats.avgScore}%`}
            sub={`Best: ${overallStats.highestScore}% · Lowest: ${overallStats.lowestScore}%`}
            icon={Target}
            colorClass={overallStats.avgScore >= 60 ? "text-green" : "text-red"}
          />
          <StatCard
            label="Pass rate"
            value={`${overallStats.passRate}%`}
            sub={`${overallStats.passedCount} passed · ${overallStats.failedCount} failed`}
            icon={Award}
            colorClass={overallStats.passRate >= 60 ? "text-green" : "text-red"}
          />
          <StatCard
            label="Avg time per test"
            value={overallStats.avgDurationMins ? `${overallStats.avgDurationMins} min` : "—"}
            sub={`${overallStats.totalAttempts} tests taken`}
            icon={Clock}
            colorClass="text-foreground"
          />
          <StatCard
            label="Proctoring integrity"
            value={`${overallStats.avgIntegrity}/100`}
            sub={overallStats.flaggedCount > 0 ? `${overallStats.flaggedCount} flagged` : "No flags"}
            icon={Shield}
            colorClass={overallStats.avgIntegrity >= 80 ? "text-green" : "text-yellow"}
          />
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-cream rounded-3xl p-10 text-center text-foreground/50 font-bold uppercase tracking-widest text-sm">
          No attempts found for this course.
        </div>
      )}

      {/* ── Charts Row 1 ── */}
      <div className="grid lg:grid-cols-2 gap-8">
        <ChartCard title="Score trend over time">
          <div className="h-[250px] w-full">
             <canvas ref={scoreTrendRef} />
          </div>
        </ChartCard>
        <ChartCard title="Module comparison — score vs accuracy">
           <div className="h-[250px] w-full">
             <canvas ref={moduleBarRef} />
           </div>
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid lg:grid-cols-2 gap-8">
        <ChartCard title="Proctoring violation breakdown">
            <div className="h-[300px] w-full flex justify-center pb-4">
              <canvas ref={violationRef} />
            </div>
        </ChartCard>
        <ChartCard title="Time taken per test">
           <div className="h-[300px] w-full">
             <canvas ref={timeRef} />
           </div>
        </ChartCard>
      </div>

      {/* ── Attempt Table ── */}
      <div className="bg-white border-2 border-cream rounded-3xl p-8 shadow-sm">
        <h3 className="font-bold text-xl mb-6 text-foreground">All attempts</h3>
        <div className="overflow-x-auto custom-scrollbar pb-2">
          <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="border-b border-cream">
                <th className="pb-4 font-bold text-xs uppercase tracking-widest text-foreground/50">Module</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-widest text-foreground/50 pl-4">Score</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-widest text-foreground/50">Accuracy</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-widest text-foreground/50">Time</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-widest text-foreground/50">Integrity</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-widest text-foreground/50">Status</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-widest text-foreground/50">Date</th>
              </tr>
            </thead>
            <tbody>
              {attemptDetails.slice().reverse().map(a => (
                <tr key={a.id} className="border-b border-cream/50 last:border-0 hover:bg-cream/20 transition-colors">
                  <td className="py-4 font-bold text-foreground text-sm pr-4 max-w-[200px] truncate" title={a.moduleTitle}>{a.moduleTitle}</td>
                  <td className="py-4 pl-4">
                    <span style={{ color: scoreColor(a.score) }} className="font-black text-lg bg-white/50 px-2 py-1 rounded shadow-inner">
                      {a.score}%
                    </span>
                  </td>
                  <td className="py-4 font-medium text-foreground/70 text-sm">
                    {a.accuracy ? `${a.accuracy.correct}/${a.accuracy.total} (${a.accuracy.pct}%)` : "—"}
                  </td>
                  <td className="py-4 font-medium text-foreground/70 text-sm">
                    {a.durationMins ? `${a.durationMins} min` : "—"}
                  </td>
                  <td className="py-4 pr-6">
                    <IntegrityBadge score={a.integrity} />
                  </td>
                  <td className="py-4 pr-6 flex gap-2">
                    {a.passed ? (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-green/10 text-green border border-green/20">
                        Passed
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-red/10 text-red border border-red/20">
                        Failed
                      </span>
                    )}
                    {a.flagged && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-yellow/10 text-yellow-700 border border-yellow/20">
                        Flagged
                      </span>
                    )}
                  </td>
                  <td className="py-4 font-medium text-foreground/50 text-xs">
                    {new Date(a.takenAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

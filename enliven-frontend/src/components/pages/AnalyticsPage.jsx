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

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [report, setReport]       = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError]         = useState("");

  // Chart refs
  const scoreTrendRef    = useRef(null);
  const moduleBarRef     = useRef(null);
  const violationRef     = useRef(null);
  const timeRef          = useRef(null);
  const chartInstances   = useRef({});

  const token = localStorage.getItem("token");

  /* ── Fetch analytics ── */
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setAnalytics(data);
      } catch (e) {
        setError("Failed to load analytics. " + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Build charts after data loads ── */
  useEffect(() => {
    if (!analytics?.hasData) return;

    const { scoreTrend, moduleComparison, totalViolations, timeTaken } = analytics;

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
            backgroundColor: ["#C54F2D", "#EEBF43", "#94B38A", "#2B124C", "#582B5B"], // custom palette + old brand secondary colors basically
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
  }, [analytics]);

  /* ── Generate AI report ── */
  const handleGenerateReport = async () => {
    if (!analytics?.hasData) return;
    setReportLoading(true);
    setReport("");
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/report`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          overallStats:   analytics.overallStats,
          scoreTrend:     analytics.scoreTrend,
          totalViolations: analytics.totalViolations,
          attemptDetails: analytics.attemptDetails,
        }),
      });
      const data = await res.json();
      if (data.success) setReport(data.report);
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  };

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
            <h2 className="text-2xl font-bold mb-3 text-foreground">No data yet</h2>
            <p className="text-foreground/60 font-medium">
                Complete your first module test to unlock your personalized analytics dashboard.
            </p>
        </div>
      </div>
    );
  }

  const { overallStats, totalViolations, attemptDetails } = analytics;

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans tracking-wide bg-cream/20 min-h-[calc(100vh-4rem)]">

      {/* ── Header ── */}
      <div className="bg-white border border-cream rounded-3xl p-8 shadow-sm text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
            <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">Analytics Dashboard</h1>
            <p className="text-foreground/60 font-medium text-lg">
            Track your assessment performance across all modules.
            </p>
        </div>
        <div className="bg-cream/40 px-6 py-4 rounded-2xl flex items-center gap-4 border border-cream/80">
            <Award className="w-8 h-8 text-yellow" />
            <div className="text-left">
                <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">Total Tests</p>
                <p className="text-xl font-black text-foreground leading-none">{overallStats.totalAttempts}</p>
            </div>
        </div>
      </div>

      {/* ── Stat Cards Row ── */}
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

      {/* ── AI Report ── */}
      <div className="bg-red text-white border border-red/40 rounded-3xl p-8 md:p-10 shadow-md relative overflow-hidden group">
        <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-white/10 rounded-full blur-3xl transform rotate-45 pointer-events-none group-hover:bg-white/20 transition-all"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <h3 className="font-black text-2xl mb-1 flex items-center gap-3">
              ✨ Personalised AI Report
            </h3>
             <p className="text-white/80 font-medium max-w-xl text-sm">
              Get an instant, actionable breakdown of your performance, proctoring integrity, and learning velocity generated by Enliven AI.
            </p>
          </div>
          <button 
            className="px-8 py-4 bg-white text-red font-extrabold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center shrink-0 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
            onClick={handleGenerateReport} disabled={reportLoading}
          >
            {reportLoading
              ? <><Loader2 className="w-5 h-5 animate-spin mr-3" />Generating Insights…</>
              : report ? "Regenerate Report" : "Generate Report"}
          </button>
        </div>

        {report && (
          <div className="p-8 bg-black/10 backdrop-blur-sm rounded-2xl border border-white/20 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium relative z-10 shadow-inner">
            {report}
          </div>
        )}

        {!report && !reportLoading && (
          <div className="p-10 border-2 border-dashed border-white/30 rounded-2xl text-center text-white/60 font-bold uppercase tracking-widest text-sm relative z-10">
            Click "Generate report" to analyse your data.
          </div>
        )}
      </div>

    </div>
  );
}

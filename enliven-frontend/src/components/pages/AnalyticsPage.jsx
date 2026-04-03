// pages/AnalyticsPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { TrendingUp, Shield, Clock, Target, Award, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import Chart from "chart.js/auto";

/* ─── COLOUR HELPERS ─────────────────────────────────────────── */
const scoreColor = (score) =>
  score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

/* ─── STAT CARD ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, color = "text-primary" }) {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg bg-primary/10 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-semibold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── CHART WRAPPER ──────────────────────────────────────────── */
function ChartCard({ title, children }) {
  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="font-semibold text-base mb-4">{title}</h3>
      {children}
    </div>
  );
}

/* ─── INTEGRITY BADGE ─────────────────────────────────────────── */
function IntegrityBadge({ score }) {
  const color =
    score >= 90 ? "bg-green-50 text-green-700 border-green-200"
    : score >= 70 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  const label = score >= 90 ? "Excellent" : score >= 70 ? "Fair" : "Needs attention";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border font-medium ${color}`}>
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
            borderColor:     "#6366f1",
            backgroundColor: "rgba(99,102,241,0.1)",
            borderWidth:     2,
            pointRadius:     5,
            pointBackgroundColor: scoreTrend.map(s => scoreColor(s.score)),
            tension:         0.3,
            fill:            true,
          }],
        },
        options: {
          responsive: true,
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
              borderRadius:    6,
              barThickness:    32,
            },
            {
              label:           "Accuracy (%)",
              data:            moduleComparison.map(m => m.accuracy ?? 0),
              backgroundColor: "rgba(99,102,241,0.25)",
              borderColor:     "#6366f1",
              borderWidth:     1.5,
              borderRadius:    6,
              barThickness:    32,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
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
            backgroundColor: ["#ef4444","#f59e0b","#8b5cf6","#06b6d4","#ec4899"],
            borderWidth:     0,
            hoverOffset:     6,
          }],
        },
        options: {
          responsive: true,
          cutout:  "68%",
          plugins: {
            legend: { position: "right", labels: { boxWidth: 10, font: { size: 12 } } },
            title:  { display: true, text: total === 0 ? "No violations recorded" : `${total} total violations` },
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
            backgroundColor: "#6366f1",
            borderRadius:    6,
            barThickness:    28,
          }],
        },
        options: {
          responsive: true,
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
      <div className="p-8 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading analytics…
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  if (!analytics?.hasData) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No data yet</h2>
        <p className="text-muted-foreground">
          Complete your first module test to see your analytics here.
        </p>
      </div>
    );
  }

  const { overallStats, totalViolations, attemptDetails } = analytics;

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold mb-1">Analytics</h1>
        <p className="text-muted-foreground">
          Your assessment performance across all modules.
        </p>
      </div>

      {/* ── Stat Cards Row ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Average score"
          value={`${overallStats.avgScore}%`}
          sub={`Best: ${overallStats.highestScore}% · Lowest: ${overallStats.lowestScore}%`}
          icon={Target}
        />
        <StatCard
          label="Pass rate"
          value={`${overallStats.passRate}%`}
          sub={`${overallStats.passedCount} passed · ${overallStats.failedCount} failed`}
          icon={Award}
          color={overallStats.passRate >= 60 ? "text-green-600" : "text-red-600"}
        />
        <StatCard
          label="Avg time per test"
          value={overallStats.avgDurationMins ? `${overallStats.avgDurationMins} min` : "—"}
          sub={`${overallStats.totalAttempts} tests taken`}
          icon={Clock}
        />
        <StatCard
          label="Proctoring integrity"
          value={`${overallStats.avgIntegrity}/100`}
          sub={overallStats.flaggedCount > 0 ? `${overallStats.flaggedCount} flagged` : "No flags"}
          icon={Shield}
          color={overallStats.avgIntegrity >= 80 ? "text-green-600" : "text-amber-600"}
        />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Score trend over time">
          <canvas ref={scoreTrendRef} height={200} />
        </ChartCard>
        <ChartCard title="Module comparison — score vs accuracy">
          <canvas ref={moduleBarRef} height={200} />
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Proctoring violation breakdown">
          <canvas ref={violationRef} height={220} />
        </ChartCard>
        <ChartCard title="Time taken per test">
          <canvas ref={timeRef} height={220} />
        </ChartCard>
      </div>

      {/* ── Attempt Table ── */}
      <div className="bg-card border rounded-xl p-6">
        <h3 className="font-semibold text-base mb-4">All attempts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Module</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Accuracy</th>
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Integrity</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {attemptDetails.slice().reverse().map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="py-3 font-medium">{a.moduleTitle}</td>
                  <td className="py-3">
                    <span style={{ color: scoreColor(a.score) }} className="font-semibold">
                      {a.score}%
                    </span>
                  </td>
                  <td className="py-3">
                    {a.accuracy ? `${a.accuracy.correct}/${a.accuracy.total} (${a.accuracy.pct}%)` : "—"}
                  </td>
                  <td className="py-3">
                    {a.durationMins ? `${a.durationMins} min` : "—"}
                  </td>
                  <td className="py-3">
                    <IntegrityBadge score={a.integrity} />
                  </td>
                  <td className="py-3">
                    {a.passed ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        Passed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        Failed
                      </span>
                    )}
                    {a.flagged && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        Flagged
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {new Date(a.takenAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AI Report ── */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-base">AI performance report</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generated by Groq — personalised insights based on your data.
            </p>
          </div>
          <Button onClick={handleGenerateReport} disabled={reportLoading}>
            {reportLoading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating…</>
              : report ? "Regenerate report" : "✨ Generate report"}
          </Button>
        </div>

        {report && (
          <div className="mt-4 p-4 bg-secondary/50 rounded-lg border text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {report}
          </div>
        )}

        {!report && !reportLoading && (
          <div className="mt-4 p-6 border border-dashed rounded-lg text-center text-muted-foreground text-sm">
            Click "Generate report" to get personalised feedback from the AI coach.
          </div>
        )}
      </div>

    </div>
  );
}

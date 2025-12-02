import React, { useEffect, useState } from "react";
import { BookOpen, Play, ChevronRight, Flame } from "lucide-react";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";
import { StatsCard } from "../StatsCard";

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();
        if (json.success) {
          setData(json.dashboard);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) return <p className="p-10">Loading Dashboard…</p>;
  if (!data) return <p className="p-10">Failed to load dashboard.</p>;

  const { user, courseProgress } = data;
  const progressPercent = courseProgress?.percent || 0;

  return (
    <div className="p-8 space-y-8">

      {/* ------------------ HEADER ------------------ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Streak */}
        <div className="bg-gradient-to-r from-orange-100 to-orange-200 rounded-xl px-4 py-3 flex items-center space-x-2">
          <Flame className="w-5 h-5 text-orange-600" />
          <div>
            <p className="text-xs text-orange-800">Daily Streak</p>
            <p className="text-xl font-bold text-orange-900">{user.streak} Days</p>
          </div>
        </div>
      </div>

      {/* ------------------ PROFILE BADGE ------------------ */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-gradient-to-br from-primary to-[#582B5B] rounded-xl p-6 text-white">
          <div className="text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl">👨‍🎓</span>
            </div>

            <h3 className="text-xl font-semibold mb-1">{user.name}</h3>
            <p className="text-white/80 text-sm mb-4">
              {user.skillLevel?.toUpperCase()} Learner
            </p>

            <Button
              variant="secondary"
              className="w-full bg-white text-primary hover:bg-white/90"
              onClick={() => onNavigate("profile")}
            >
              View Profile
            </Button>
          </div>
        </div>

        {/* ------------------ BASIC INFO CARDS ------------------ */}
        <div className="lg:col-span-3 grid sm:grid-cols-3 gap-6">
          <StatsCard
            title="Domain"
            value={user.domain || "Not Selected"}
            icon={BookOpen}
            trend={{ value: "", positive: true }}
            color="primary"
          />

          <StatsCard
            title="Skill Level"
            value={user.skillLevel || "Unknown"}
            icon={BookOpen}
            trend={{ value: "", positive: true }}
            color="purple"
          />

          <StatsCard
            title="Achievements"
            value={user.achievements?.length || 0}
            icon={BookOpen}
            trend={{ value: "", positive: true }}
            color="success"
          />
        </div>
      </div>

      {/* ------------------ CONTINUE LEARNING ------------------ */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Continue Learning</h2>
          <Button variant="ghost" onClick={() => onNavigate("courses")}>
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* ---- Single Course Card ---- */}
        <div
          className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition cursor-pointer"
          onClick={() => onNavigate("courses")}
        >
          <div className="flex items-center space-x-4 mb-3">
            <Play className="w-10 h-10 text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Web Development</h3>
              <p className="text-sm text-muted-foreground">Progress</p>
            </div>
          </div>

          <ProgressBar progress={progressPercent} />

          <p className="text-sm text-muted-foreground mt-3">
            Keep learning and finish your course!
          </p>
        </div>
      </div>
    </div>
  );
}

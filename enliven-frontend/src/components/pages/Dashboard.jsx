import React, { useEffect, useState } from "react";
import { BookOpen, Play, ChevronRight, Flame } from "lucide-react";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";
import { StatsCard } from "../StatsCard";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/dashboard`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

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

  const { user } = data;

  return (
    <div className="p-8 space-y-8">

      {/* HEADER */}
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
        <div className="bg-gradient-to-r from-orange-100 to-orange-200
          rounded-xl px-4 py-3 flex items-center space-x-2">
          <Flame className="w-5 h-5 text-orange-600" />
          <div>
            <p className="text-xs text-orange-800">Daily Streak</p>
            <p className="text-xl font-bold text-orange-900">{user.streak} Days</p>
          </div>
        </div>
      </div>

      {/* PROFILE BADGE */}
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
              onClick={() => navigate("/profile")}
            >
              View Profile
            </Button>
          </div>
        </div>

        {/* BASIC INFO CARDS */}
        <div className="lg:col-span-3 grid sm:grid-cols-3 gap-6">
          <StatsCard
            title="Domain"
            value={user.domain || "Not Selected"}
            icon={BookOpen}
            color="primary"
          />
          <StatsCard
            title="Skill Level"
            value={user.skillLevel || "Unknown"}
            icon={BookOpen}
            color="purple"
          />
          <StatsCard
            title="Achievements"
            value={user.badges?.length || 0}
            icon={BookOpen}
            color="success"
          />
        </div>
      </div>

{/* CONTINUE LEARNING SECTION */}
<div>
  <h2 className="text-2xl font-semibold mb-4">Your Course</h2>

  {user.badges?.some(b => b.id === "course-completion") ? (
    // 🎉 COURSE COMPLETED CARD
    <div className="bg-green-50 border border-green-300 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-green-700">
            {user.domain}
          </p>

          <h3 className="text-2xl font-bold mt-1 text-green-900">
            🎉 Course Completed!
          </h3>

          <p className="text-green-700 mt-1">
            Congratulations! You have completed the entire course.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => navigate("/profile")}
          >
            View Badge
          </Button>

          {/* ⭐ Still show Continue Learning (review course) */}
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/courses/${user.domain}/${user.skillLevel}`)
            }
          >
            Review Course
          </Button>
        </div>
      </div>
    </div>
  ) : (
    // ⭐ NORMAL CONTINUE LEARNING CARD
    <div
      className="bg-card rounded-xl border p-6 cursor-pointer hover:shadow-lg transition"
      onClick={() => navigate(`/courses/${user.domain}/${user.skillLevel}`)}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary font-semibold uppercase">
            {user.domain}
          </p>

          <h3 className="text-xl font-bold mt-1">
            {user.domain} — {user.skillLevel}
          </h3>

          <p className="text-muted-foreground text-sm mt-1">
            Continue where you left off
          </p>
        </div>

        <Play className="w-10 h-10 text-primary" />
      </div>
    </div>
  )}
</div>



    </div>
  );
}

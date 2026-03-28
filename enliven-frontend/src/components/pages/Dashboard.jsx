import React, { useEffect, useState } from "react";
import { BookOpen, Play, Flame, Trophy } from "lucide-react";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";
import { StatsCard } from "../StatsCard";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseNav, setCourseNav] = useState(false); // loading state for "Continue Learning"
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/dashboard`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (json.success) setData(json.dashboard);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // BUG FIX: same fix as Sidebar — don't rely only on localStorage.
  // After a fresh login, localStorage.roadmap is empty.
  // Always fall back to the API so returning users go to the right course.
  const goToCourse = async () => {
    // Fast path — if roadmap is cached in this session use it immediately
    const cached = localStorage.getItem("roadmap");
    if (cached) {
      try {
        const roadmap = JSON.parse(cached);
        if (roadmap?.domain && roadmap?.skillLevel) {
          const domain = roadmap.domain.toLowerCase().replace(/\s+/g, "-");
          const level  = roadmap.skillLevel.toLowerCase().replace(/[^a-z]/g, "");
          navigate(`/courses/${domain}/${level}`);
          return;
        }
      } catch { /* corrupted cache, fall through */ }
    }

    // API fallback
    setCourseNav(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/roadmap/my-roadmap`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const roadmap = data?.roadmap;
        if (roadmap?.domain && roadmap?.skillLevel) {
          localStorage.setItem("roadmap", JSON.stringify(roadmap));
          const domain = roadmap.domain.toLowerCase().replace(/\s+/g, "-");
          const level  = roadmap.skillLevel.toLowerCase().replace(/[^a-z]/g, "");
          navigate(`/courses/${domain}/${level}`);
          return;
        }
      }
      navigate("/assessment");
    } catch {
      navigate("/assessment");
    } finally {
      setCourseNav(false);
    }
  };

  if (loading) return <p className="p-10">Loading Dashboard…</p>;
  if (!data)   return <p className="p-10">Failed to load dashboard.</p>;

  const { user, continueLearning } = data;

  return (
    <div className="p-8 space-y-8">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Streak badge */}
        <div className="bg-gradient-to-r from-orange-100 to-orange-200 rounded-xl px-4 py-3 flex items-center space-x-3">
          <Flame className="w-6 h-6 text-orange-600" />
          <div>
            <p className="text-xs text-orange-800 font-medium">Daily Streak</p>
            <p className="text-2xl font-bold text-orange-900">
              {user.streak ?? 0} {user.streak === 1 ? "Day" : "Days"}
            </p>
            {(user.longestStreak ?? 0) > 0 && (
              <p className="text-xs text-orange-700">
                Best: {user.longestStreak} days
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── PROFILE CARD + STATS ── */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-gradient-to-br from-primary to-[#582B5B] rounded-xl p-6 text-white">
          <div className="text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl">👨‍🎓</span>
            </div>
            <h3 className="text-xl font-semibold mb-1">{user.name}</h3>
            <p className="text-white/80 text-sm mb-4">
              {user.skillLevel?.toUpperCase() || "LEARNER"}
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

        <div className="lg:col-span-3 grid sm:grid-cols-3 gap-6">
          <StatsCard title="Domain"       value={user.domain     || "Not Selected"} icon={BookOpen} />
          <StatsCard title="Skill Level"  value={user.skillLevel || "Unknown"}      icon={BookOpen} />
          <StatsCard title="Achievements" value={user.badges?.length ?? 0}          icon={Trophy} />
        </div>
      </div>

      {/* ── CONTINUE LEARNING ── */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Course</h2>

        {!continueLearning ? (
          // User hasn't set domain/skillLevel yet
          <div className="bg-card rounded-xl border p-6 text-center">
            <p className="text-muted-foreground mb-4">
              You haven't started a course yet. Complete the assessment to get your personalized roadmap!
            </p>
            <Button onClick={() => navigate("/assessment")}>
              Start Assessment
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-primary font-semibold uppercase tracking-wide">
                  {continueLearning.domain}
                </p>
                <h3 className="text-xl font-bold capitalize">
                  {continueLearning.skillLevel}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {continueLearning.completed
                    ? "🎉 Course completed!"
                    : "Continue where you left off"}
                </p>
              </div>
              <Play className="w-10 h-10 text-primary" />
            </div>

            <ProgressBar progress={continueLearning.progress ?? 0} />

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {continueLearning.completedLessons ?? 0} /{" "}
                {continueLearning.totalLessons ?? 0} lessons completed
                {continueLearning.totalLessons === 0 && (
                  <span className="ml-1 text-xs text-orange-500">
                    (start watching to track progress)
                  </span>
                )}
              </p>

              <Button onClick={goToCourse} disabled={courseNav}>
                {courseNav ? "Loading…" : continueLearning.completed ? "Review Course" : "Continue Learning"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

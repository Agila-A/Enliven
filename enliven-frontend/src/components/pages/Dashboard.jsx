import React, { useEffect, useState } from "react";
import { BookOpen, Play, Flame, Trophy } from "lucide-react";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";
import { StatsCard } from "../StatsCard";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseNav, setCourseNav] = useState(false);
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

  const goToCourse = async () => {
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
      } catch { }
    }

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

  if (loading) return <div className="p-10 flex justify-center"><p className="text-foreground/70 font-medium">Loading Dashboard…</p></div>;
  if (!data)   return <div className="p-10 flex justify-center"><p className="text-red font-medium">Failed to load dashboard.</p></div>;

  const { user, continueLearning } = data;

  return (
    <div className="p-8 space-y-10 min-h-screen bg-cream/20 font-sans">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-foreground tracking-tight">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-foreground/70 text-lg">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Streak badge */}
        <div className="bg-yellow/10 border border-yellow/30 rounded-2xl px-6 py-4 flex items-center space-x-4 shadow-sm hover:shadow-soft transition-all">
          <div className="bg-yellow/20 p-2 rounded-xl">
             <Flame className="w-8 h-8 text-yellow" />
          </div>
          <div>
            <p className="text-sm text-yellow-800 font-semibold uppercase tracking-wider">Daily Streak</p>
            <p className="text-3xl font-bold text-foreground">
              {user.streak ?? 0} <span className="text-xl font-medium text-foreground/80">{user.streak === 1 ? "Day" : "Days"}</span>
            </p>
            {(user.longestStreak ?? 0) > 0 && (
              <p className="text-xs text-foreground/60 mt-1 font-medium">
                Best: {user.longestStreak} days
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── PROFILE CARD + STATS ── */}
      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 bg-red rounded-3xl p-8 text-white shadow-md relative overflow-hidden group">
          {/* Abstract background highlight */}
           <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
           
          <div className="text-center relative z-10">
            <div className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-white/30 shadow-inner">
              <span className="text-5xl">👨‍🎓</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">{user.name}</h3>
            <p className="text-white/80 font-medium mb-8 tracking-wider">
              {user.skillLevel?.toUpperCase() || "LEARNER"}
            </p>
            <button
              className="w-full py-3 bg-white text-red font-bold rounded-xl shadow-sm hover:shadow-md hover:bg-cream transition-all"
              onClick={() => navigate("/profile")}
            >
              View Profile
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 grid sm:grid-cols-3 gap-8">
          <StatsCard title="Domain"       value={user.domain     || "Not Selected"} icon={BookOpen} colorClass="text-green" bgClass="bg-green/10" borderClass="border-green/20" />
          <StatsCard title="Skill Level"  value={user.skillLevel || "Unknown"}      icon={BookOpen} colorClass="text-yellow" bgClass="bg-yellow/10" borderClass="border-yellow/20" />
          <StatsCard title="Achievements" value={user.badges?.length ?? 0}          icon={Trophy} colorClass="text-red" bgClass="bg-red/10" borderClass="border-red/20" />
        </div>
      </div>

      {/* ── CONTINUE LEARNING ── */}
      <div>
        <h2 className="text-3xl font-bold mb-6 text-foreground">Your Course</h2>

        {!continueLearning ? (
          <div className="bg-white rounded-3xl border border-cream p-10 text-center shadow-sm">
            <div className="mx-auto w-20 h-20 bg-cream rounded-full flex items-center justify-center mb-6">
               <BookOpen className="w-10 h-10 text-red/50" />
            </div>
            <p className="text-foreground/70 text-lg mb-8 max-w-lg mx-auto">
              You haven't started a course yet. Complete the assessment to get your personalized roadmap!
            </p>
            <button 
              onClick={() => navigate("/assessment")}
              className="px-8 py-3 bg-green text-white font-bold rounded-xl shadow-md hover:bg-green/90 transition-all"
            >
              Start Assessment
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-cream p-8 shadow-sm hover:shadow-soft transition-shadow">
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-sm text-green font-bold uppercase tracking-widest mb-1">
                  {continueLearning.domain}
                </p>
                <h3 className="text-2xl font-bold capitalize text-foreground mb-2">
                  {continueLearning.skillLevel}
                </h3>
                <p className="text-foreground/60 font-medium">
                  {continueLearning.completed
                    ? "🎉 Course completed!"
                    : "Continue where you left off"}
                </p>
              </div>
              <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center shadow-sm">
                <Play className="w-8 h-8 text-red" />
              </div>
            </div>

            <ProgressBar progress={continueLearning.progress ?? 0} colorClass="bg-green" />

            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
              <p className="text-base text-foreground/70 font-medium">
                <span className="font-bold text-foreground">{continueLearning.completedLessons ?? 0}</span> /{" "}
                {continueLearning.totalLessons ?? 0} lessons completed
                {continueLearning.totalLessons === 0 && (
                  <span className="block sm:inline sm:ml-2 text-sm text-yellow-600">
                    (start watching to track progress)
                  </span>
                )}
              </p>

              <button 
                onClick={goToCourse} 
                disabled={courseNav}
                className="w-full sm:w-auto px-8 py-3 bg-red text-white font-bold rounded-xl shadow-md hover:bg-red/90 transition-all disabled:opacity-70 disabled:cursor-wait"
              >
                {courseNav ? "Loading…" : continueLearning.completed ? "Review Course" : "Continue Learning"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { BookOpen, Play, Flame, Trophy, PlusCircle, CheckCircle2, Clock } from "lucide-react";
import { ProgressBar } from "../ProgressBar";
import { StatsCard }   from "../StatsCard";
import { useNavigate } from "react-router-dom";

/* ── Helpers ──────────────────────────────────────────────────────────── */
function formatDomain(domain = "") {
  return domain.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function levelColour(level = "") {
  const l = level.toLowerCase();
  if (l === "beginner")     return { bar: "bg-green",  badge: "bg-green/10 text-green border-green/20" };
  if (l === "intermediate") return { bar: "bg-yellow", badge: "bg-yellow/10 text-yellow-700 border-yellow/20" };
  if (l === "advanced")     return { bar: "bg-red",    badge: "bg-red/10 text-red border-red/20" };
  return { bar: "bg-foreground/40", badge: "bg-cream text-foreground/60 border-cream" };
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ── Course Card ──────────────────────────────────────────────────────── */
function CourseCard({ course, onContinue, navigating }) {
  const colours  = levelColour(course.skillLevel);
  const lastSeen = timeAgo(course.lastAccessedAt);

  return (
    <div className="bg-white rounded-3xl border border-cream p-7 shadow-sm hover:shadow-soft transition-all duration-300 flex flex-col gap-5 group">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-1">
            {lastSeen && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {lastSeen}
              </span>
            )}
          </p>
          <h3 className="font-bold text-lg text-foreground leading-tight truncate">
            {formatDomain(course.domain)}
          </h3>
          <span className={`inline-block mt-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full border ${colours.badge}`}>
            {course.skillLevel}
          </span>
        </div>

        <div className="shrink-0 w-12 h-12 bg-cream rounded-2xl flex items-center justify-center group-hover:bg-red/10 transition-colors">
          {course.completed
            ? <CheckCircle2 className="w-6 h-6 text-green" />
            : <Play className="w-6 h-6 text-red" />}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Progress</span>
          <span className="text-sm font-extrabold text-foreground">{course.progress ?? 0}%</span>
        </div>
        <ProgressBar progress={course.progress ?? 0} colorClass={colours.bar} />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-sm text-foreground/60 font-medium">
        <span>
          <b className="text-foreground">{course.completedLessons ?? 0}</b>
          {" / "}{course.totalLessons ?? 0} lessons
        </span>
        <span>
          <b className="text-foreground">{course.totalModules ?? 0}</b> modules
        </span>
      </div>

      {/* CTA */}
      <button
        onClick={() => onContinue(course)}
        disabled={navigating === course.courseId}
        className="w-full py-3 rounded-xl bg-red text-white font-bold text-sm shadow-sm hover:bg-red/90 hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-wait"
      >
        {navigating === course.courseId
          ? "Loading…"
          : course.completed
            ? "Review Course"
            : "Continue Learning"}
      </button>
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [navigating, setNavigating] = useState(null); // courseId being navigated to
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("token");
        const res   = await fetch(
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

  /* Navigate to a course page, setting activeCourseId first */
  const goToCourse = async (course) => {
    setNavigating(course.courseId);
    try {
      localStorage.setItem("activeCourseId", course.courseId);
      const d = (course.domain || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const l = (course.skillLevel || "").toLowerCase().replace(/[^a-z]/g, "");
      navigate(`/courses/${d}/${l}`);
    } finally {
      setNavigating(null);
    }
  };

  if (loading) return (
    <div className="p-10 flex justify-center">
      <p className="text-foreground/70 font-medium">Loading Dashboard…</p>
    </div>
  );
  if (!data) return (
    <div className="p-10 flex justify-center">
      <p className="text-red font-medium">Failed to load dashboard.</p>
    </div>
  );

  const { user, courses = [] } = data;

  /* Total lessons/completions across ALL courses for stats */
  const totalCompleted = courses.reduce((s, c) => s + (c.completedLessons ?? 0), 0);
  const totalLessons   = courses.reduce((s, c) => s + (c.totalLessons ?? 0),     0);

  return (
    <div className="p-8 space-y-10 min-h-screen bg-cream/20 font-sans">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-foreground tracking-tight">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-foreground/70 text-lg">
            {courses.length > 0
              ? `You're enrolled in ${courses.length} course${courses.length > 1 ? "s" : ""}. Keep it up!`
              : "Ready to start your learning journey?"}
          </p>
        </div>

        {/* Streak badge */}
        <div className="bg-yellow/10 border border-yellow/30 rounded-2xl px-6 py-4 flex items-center space-x-4 shadow-sm hover:shadow-soft transition-all shrink-0">
          <div className="bg-yellow/20 p-2 rounded-xl">
            <Flame className="w-8 h-8 text-yellow" />
          </div>
          <div>
            <p className="text-sm text-yellow-800 font-semibold uppercase tracking-wider">Daily Streak</p>
            <p className="text-3xl font-bold text-foreground">
              {user.streak ?? 0}{" "}
              <span className="text-xl font-medium text-foreground/80">
                {user.streak === 1 ? "Day" : "Days"}
              </span>
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
          <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
          <div className="text-center relative z-10">
            <div className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-white/30 shadow-inner">
              <span className="text-5xl">👨‍🎓</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">{user.name}</h3>
            <p className="text-white/80 font-medium mb-8 tracking-wider">
              {courses.length > 0
                ? `${courses.length} Course${courses.length > 1 ? "s" : ""} Enrolled`
                : "No Courses Yet"}
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
          <StatsCard title="Courses Enrolled" value={courses.length}              icon={BookOpen} colorClass="text-green"  bgClass="bg-green/10"  borderClass="border-green/20" />
          <StatsCard title="Lessons Done"      value={totalCompleted}             icon={BookOpen} colorClass="text-yellow" bgClass="bg-yellow/10" borderClass="border-yellow/20" />
          <StatsCard title="Achievements"      value={user.badges?.length ?? 0}   icon={Trophy}   colorClass="text-red"    bgClass="bg-red/10"    borderClass="border-red/20" />
        </div>
      </div>

      {/* ── COURSES GRID ── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-foreground">
            {courses.length > 0 ? "Your Courses" : "Get Started"}
          </h2>
          {courses.length > 0 && (
            <button
              onClick={() => navigate("/select-domain")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green text-white font-bold text-sm shadow-sm hover:bg-green/90 hover:shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Enroll in New Course
            </button>
          )}
        </div>

        {courses.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-3xl border border-cream p-10 text-center shadow-sm">
            <div className="mx-auto w-20 h-20 bg-cream rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-red/50" />
            </div>
            <p className="text-foreground/70 text-lg mb-8 max-w-lg mx-auto">
              You haven't started a course yet. Complete the assessment to get your personalized roadmap!
            </p>
            <button
              onClick={() => navigate("/select-domain")}
              className="px-8 py-3 bg-green text-white font-bold rounded-xl shadow-md hover:bg-green/90 transition-all"
            >
              Start My First Course
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.courseId}
                course={course}
                onContinue={goToCourse}
                navigating={navigating}
              />
            ))}

            {/* "Add another course" card */}
            <button
              onClick={() => navigate("/select-domain")}
              className="bg-white rounded-3xl border-2 border-dashed border-cream p-7 shadow-sm hover:border-green/40 hover:shadow-soft transition-all flex flex-col items-center justify-center gap-4 text-foreground/40 hover:text-green group min-h-[280px]"
            >
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-current flex items-center justify-center group-hover:bg-green/5 transition-colors">
                <PlusCircle className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-base">Enroll in New Course</p>
                <p className="text-sm mt-1 text-foreground/30">Pick a domain &amp; take the assessment</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

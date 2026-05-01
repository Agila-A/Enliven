import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Route as RouteIcon,
  BarChart3,
  User,
  LogOut,
  MessageCircle,
  Loader2,
  BookOpen,
  PlusCircle,
  ChevronRight,
} from "lucide-react";

/* ── Top-level nav items (after Courses) ── */
const menuItems = [
  { id: "analytics",     label: "Analytics",     icon: BarChart3 },
  { id: "studybuddy",    label: "Study Buddy",   icon: MessageCircle },
  { id: "profile",       label: "Profile",       icon: User },
];

/* ── Pretty-print a courseId like "web-development-beginner" ─────────── */
function formatCourseId(courseId = "") {
  return courseId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ── Colour pill for skill level ─────────────────────────────────────── */
function levelColour(level = "") {
  const l = level.toLowerCase();
  if (l === "beginner")     return "bg-green/20 text-green";
  if (l === "intermediate") return "bg-yellow/20 text-yellow-700";
  if (l === "advanced")     return "bg-red/20 text-red";
  return "bg-cream text-foreground/60";
}

export default function Sidebar() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const [enrollments,  setEnrollments]  = useState([]);
  const [enrollLoading, setEnrollLoading] = useState(true);
  const [coursesOpen,  setCoursesOpen]  = useState(true); // accordion open by default

  /* ── Load enrollments on mount ──────────────────────────────────── */
  useEffect(() => {
    async function loadEnrollments() {
      try {
        const token = localStorage.getItem("token");
        const res   = await fetch(
          `${import.meta.env.VITE_API_URL}/api/user/enrollments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setEnrollments(data.enrollments || []);
        }
      } catch (err) {
        console.error("Sidebar enrollments load error:", err);
      } finally {
        setEnrollLoading(false);
      }
    }
    loadEnrollments();
  }, []);

  /* ── Navigate to a specific course ─────────────────────────────── */
  const goToCourse = (enrollment) => {
    const { domain, skillLevel, courseId } = enrollment;
    const d = (domain || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const l = (skillLevel || "").toLowerCase().replace(/[^a-z]/g, "");
    // Set active course so StudyBuddy picks it up
    localStorage.setItem("activeCourseId", courseId);
    navigate(`/courses/${d}/${l}`);
  };

  /* ── Log out ────────────────────────────────────────────────────── */
  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
          method:  "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("roadmap");
      localStorage.removeItem("user");
      localStorage.removeItem("activeCourseId");
      navigate("/login", { replace: true });
    }
  };

  const go = (id) => {
    if (id === "studybuddy") { navigate("/study-buddy"); return; }
    navigate(`/${id}`);
  };

  const isActive = (id) => {
    if (id === "dashboard")     return pathname === "/dashboard";
    if (id === "studybuddy")    return pathname === "/study-buddy";
    if (id === "learning-path") return pathname === "/learning-path";
    return pathname === `/${id}`;
  };

  const isCourseActive = (enrollment) => {
    const d = (enrollment.domain || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const l = (enrollment.skillLevel || "").toLowerCase().replace(/[^a-z]/g, "");
    return pathname === `/courses/${d}/${l}`;
  };

  return (
    <aside className="w-64 bg-white/70 backdrop-blur-xl border-r border-cream h-screen sticky top-0 flex flex-col font-sans shadow-soft">

      {/* ── LOGO ───────────────────────────────────────────────────── */}
      <div className="p-6 border-b border-cream/50 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <span className="text-2xl font-bold text-foreground">Enliven</span>
        </div>
      </div>

      {/* ── SCROLLABLE NAV ─────────────────────────────────────────── */}
      <nav className="flex-1 p-5 space-y-1 overflow-y-auto">

        {/* Dashboard (First item) */}
        <button
          onClick={() => go("dashboard")}
          className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${
            isActive("dashboard")
              ? "bg-red text-white shadow-md font-semibold"
              : "text-foreground hover:bg-cream hover:text-red font-medium"
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${isActive("dashboard") ? "text-white" : "text-foreground/70"}`} />
          <span>Dashboard</span>
        </button>
        <div className="pt-2">
          {/* Section header — collapsible accordion */}
          <button
            onClick={() => setCoursesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-foreground/50 hover:bg-cream/60 transition-all"
          >
            <div className="flex items-center space-x-3">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">My Courses</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${coursesOpen ? "rotate-90" : ""}`}
            />
          </button>

          {coursesOpen && (
            <div className="mt-1 space-y-1 pl-2">

              {/* Enrollment list */}
              {enrollLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-foreground/40 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading…</span>
                </div>
              ) : enrollments.length === 0 ? (
                <p className="px-4 py-2 text-sm text-foreground/40 font-medium">No courses yet</p>
              ) : (
                enrollments.map((enrollment) => {
                  const active = isCourseActive(enrollment);
                  return (
                    <button
                      key={enrollment.courseId}
                      onClick={() => goToCourse(enrollment)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                        active
                          ? "bg-red/10 border border-red/20"
                          : "hover:bg-cream/80 border border-transparent"
                      }`}
                    >
                      <p className={`text-sm font-bold truncate ${active ? "text-red" : "text-foreground"}`}>
                        {/* Nicely formatted domain from courseId */}
                        {enrollment.domain
                          ? enrollment.domain.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                          : formatCourseId(enrollment.courseId)}
                      </p>
                      <span className={`inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${levelColour(enrollment.skillLevel)}`}>
                        {enrollment.skillLevel || "—"}
                      </span>
                    </button>
                  );
                })
              )}

              {/* Enroll in new course */}
              <button
                onClick={() => navigate("/select-domain")}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-green hover:bg-green/10 border border-dashed border-green/30 hover:border-green/60 transition-all mt-1"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Enroll in New Course</span>
              </button>

            </div>
          )}
        </div>

        {/* Remaining menu items */}
        <div className="pt-2 space-y-1">
          {menuItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive(id)
                  ? "bg-red text-white shadow-md font-semibold"
                  : "text-foreground hover:bg-cream hover:text-red font-medium"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive(id) ? "text-white" : "text-foreground/70"}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── LOGOUT ─────────────────────────────────────────────────── */}
      <div className="p-5 border-t border-cream/50 bg-white/40 shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-red font-medium hover:bg-red/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

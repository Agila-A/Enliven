import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Route as RouteIcon,
  BookOpen,
  BarChart3,
  User,
  LogOut,
  MessageCircle,
  Loader2,
} from "lucide-react";

const menuItems = [
  { id: "dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { id: "learning-path", label: "Learning Path", icon: RouteIcon },
  { id: "courses",       label: "Courses",       icon: BookOpen },
  { id: "analytics",     label: "Analytics",     icon: BarChart3 },
  { id: "studybuddy",    label: "StudyBuddy",    icon: MessageCircle },
  { id: "profile",       label: "Profile",       icon: User },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [coursesLoading, setCoursesLoading] = useState(false);

  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("roadmap");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  };

  const goToCourses = async () => {
    // Fast path: roadmap already cached in localStorage from this session
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
      } catch {
        // corrupted cache — fall through to API fetch
      }
    }

    // BUG FIX: localStorage is empty after a fresh login (roadmap is only written
    // during the initial assessment, not on login). Always fall back to the API
    // so returning users aren't sent to /assessment by mistake.
    setCoursesLoading(true);
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
          // Repopulate localStorage so subsequent clicks are instant
          localStorage.setItem("roadmap", JSON.stringify(roadmap));

          const domain = roadmap.domain.toLowerCase().replace(/\s+/g, "-");
          const level  = roadmap.skillLevel.toLowerCase().replace(/[^a-z]/g, "");
          navigate(`/courses/${domain}/${level}`);
          return;
        }
      }

      // No roadmap in DB either — user genuinely hasn't done assessment yet
      navigate("/assessment");
    } catch (err) {
      console.error("Sidebar courses nav error:", err);
      navigate("/assessment");
    } finally {
      setCoursesLoading(false);
    }
  };

  const go = (id) => {
    if (id === "studybuddy") { navigate("/study-buddy"); return; }
    if (id === "courses")    { goToCourses(); return; }
    navigate(`/${id}`);
  };

  const isActive = (id) => {
    if (id === "courses") return pathname.startsWith("/courses");
    return pathname === `/${id}`;
  };

  return (
    <aside className="w-64 bg-card border-r border-border h-screen sticky top-0 flex flex-col">
      {/* LOGO */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-[#582B5B] rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold">E</span>
          </div>
          <span className="text-lg font-semibold">Enliven</span>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => go(id)}
            disabled={id === "courses" && coursesLoading}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              isActive(id)
                ? "bg-primary text-white shadow-md"
                : "text-foreground hover:bg-secondary"
            } ${id === "courses" && coursesLoading ? "opacity-60 cursor-wait" : ""}`}
          >
            {id === "courses" && coursesLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <Icon className={`w-5 h-5 ${isActive(id) ? "text-white" : "text-muted-foreground"}`} />
            )}
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </nav>

      {/* LOGOUT */}
      <div className="p-4 border-t border-border">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

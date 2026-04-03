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
      }
    }

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
          localStorage.setItem("roadmap", JSON.stringify(roadmap));

          const domain = roadmap.domain.toLowerCase().replace(/\s+/g, "-");
          const level  = roadmap.skillLevel.toLowerCase().replace(/[^a-z]/g, "");
          navigate(`/courses/${domain}/${level}`);
          return;
        }
      }
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
    <aside className="w-64 bg-white/70 backdrop-blur-xl border-r border-cream h-screen sticky top-0 flex flex-col font-sans shadow-soft">
      {/* LOGO */}
      <div className="p-6 border-b border-cream/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <span className="text-2xl font-bold text-foreground">Enliven</span>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 p-5 space-y-2 overflow-y-auto">
        {menuItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => go(id)}
            disabled={id === "courses" && coursesLoading}
            className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${
              isActive(id)
                ? "bg-red text-white shadow-md font-semibold transform hover:scale-[1.02]"
                : "text-foreground hover:bg-cream hover:text-red font-medium"
            } ${id === "courses" && coursesLoading ? "opacity-60 cursor-wait" : ""}`}
          >
            {id === "courses" && coursesLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-current" />
            ) : (
              <Icon className={`w-5 h-5 ${isActive(id) ? "text-white" : "text-foreground/70"}`} />
            )}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* LOGOUT */}
      <div className="p-5 border-t border-cream/50 bg-white/40">
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

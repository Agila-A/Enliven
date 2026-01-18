import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Route as RouteIcon,
  BookOpen,
  BarChart3,
  User,
  LogOut,
  MessageCircle
} from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "learning-path", label: "Learning Path", icon: RouteIcon },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "studybuddy", label: "StudyBuddy", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const logout = async () => {
    try {
      // Optional backend logout (safe even if endpoint doesn't exist)
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } finally {
      // 🔥 CLEAR ALL CLIENT STATE
      localStorage.removeItem("token");
      localStorage.removeItem("roadmap");
      localStorage.removeItem("user");

      navigate("/login", { replace: true });
    }
  };

  const go = (id) => {
    // StudyBuddy
    if (id === "studybuddy") {
      navigate("/study-buddy");
      return;
    }

    // Courses → EXACT same logic as before (working)
    if (id === "courses") {
      const roadmap = JSON.parse(localStorage.getItem("roadmap"));
      if (roadmap) {
        const domain = roadmap.domain.toLowerCase().replace(/\s+/g, "-");
        const level = roadmap.skillLevel.toLowerCase();
        navigate(`/courses/${domain}/${level}`);
      } else {
        navigate("/assessment");
      }
      return;
    }

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
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              isActive(id)
                ? "bg-primary text-white shadow-md"
                : "text-foreground hover:bg-secondary"
            }`}
          >
            <Icon
              className={`w-5 h-5 ${
                isActive(id) ? "text-white" : "text-muted-foreground"
              }`}
            />
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

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Route as RouteIcon,
  BookOpen,
  BarChart3,
  User,
  Settings,
  LogOut,
  MessageCircle
} from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "learning-path", label: "Learning Path", icon: RouteIcon },
  { id: "courses", label: "Courses", icon: BookOpen },
  // ⭐ REMOVED assessment
  { id: "analytics", label: "Analytics", icon: BarChart3 },

  // ⭐ NEW — StudyBuddy
  { id: "studybuddy", label: "StudyBuddy", icon: MessageCircle },

  { id: "profile", label: "Profile", icon: User },
];

const bottomItems = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "logout", label: "Logout", icon: LogOut },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = (id) => {
    // StudyBuddy
    if (id === "studybuddy") {
      navigate("/study-buddy");
      return;
    }

    // Courses → use roadmap
    if (id === "courses") {
      const roadmap = JSON.parse(localStorage.getItem("roadmap"));
      if (roadmap) {
        const domain = roadmap.domain.toLowerCase().replace(/\s+/g, "-");
        const level = roadmap.skillLevel.toLowerCase();
        navigate(`/courses/${domain}/${level}`);
      } else {
        navigate("/assessment"); // kept same fallback if needed
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

      {/* BOTTOM SETTINGS */}
      <div className="p-4 border-t border-border space-y-1">
        {bottomItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => go(id)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors"
          >
            <Icon className="w-5 h-5 text-muted-foreground" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

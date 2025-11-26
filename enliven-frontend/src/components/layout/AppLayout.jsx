import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the current page name from URL for highlighting
  const activePage = location.pathname.replace("/", "") || "dashboard";

  const handleSidebarNavigate = async (page) => {
    // 🔥 LOGOUT HANDLING
    if (page === "logout") {
      try {
        await fetch("http://localhost:5000/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (err) {
        console.log("Logout error:", err);
      }

      // Clear login state
      localStorage.removeItem("loggedIn");

      // Redirect to login
      navigate("/login");
      return;
    }

    // Normal navigation
    navigate(`/${page}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar isLanding={false} />
      <div className="flex">
        <Sidebar activePage={activePage} onNavigate={handleSidebarNavigate} />
        <main className="flex-1 overflow-y-auto px-6 pt-24">
          {children}
        </main>
      </div>
    </div>
  );
}

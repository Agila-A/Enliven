import React, { useState } from "react";
import { Sparkles, Bell, User, LogOut, Settings, CreditCard, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export default function Navbar({ onGetStarted, isLanding = false }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const notifications = [
    { id: 1, title: "New Roadmap Generated", time: "2m ago", read: false },
    { id: 2, title: "Exam Passed: HTML Basics", time: "1h ago", read: true },
    { id: 3, title: "Daily Goal Achieved! 🏆", time: "5h ago", read: true },
  ];
  return (
    <nav className="w-full fixed top-0 left-0 bg-cream/90 backdrop-blur-xl border-b border-white/20 z-50">
      {/* FULL WIDTH NAVBAR */}
      <div className="w-full px-6 py-4 flex items-center justify-between">

        {/* LOGO - ALWAYS LEFT */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-red grid place-items-center shadow-md group-hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            Enliven
          </span>
        </a>

        {/* NAVIGATION LINKS */}
        {isLanding ? (
          <div className="hidden md:flex items-center space-x-10">
            <a
              href="#features"
              className="text-foreground/80 hover:text-red transition-colors font-semibold"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-foreground/80 hover:text-red transition-colors font-semibold"
            >
              How It Works
            </a>

            <a
              href="#about"
              className="text-foreground/80 hover:text-red transition-colors font-semibold"
            >
              About
            </a>
          </div>
        ) : (
          <div className="flex-1 px-8 hidden md:block">
            <input
              type="search"
              placeholder="Search courses, topics..."
              className="w-full px-5 py-3 bg-white rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-red/50 focus:border-transparent transition-all shadow-sm placeholder-muted-foreground"
            />
          </div>
        )}

        {/* RIGHT SIDE BUTTONS */}
        <div className="flex items-center space-x-4">
          {isLanding ? (
            <>
              {/* SIGN IN */}
              <button className="hidden md:inline-flex text-foreground/80 font-semibold hover:text-red transition-colors">
                Sign In
              </button>

              {/* FIXED PRIMARY BUTTON */}
              <button
                onClick={onGetStarted}
                className="px-6 py-2.5 bg-red text-white rounded-full font-semibold shadow-md hover:shadow-lg hover:bg-red/90 transition-all transform hover:-translate-y-0.5"
              >
                Get Started
              </button>
            </>
          ) : (
            <>
              {/* DASHBOARD NOTIFICATIONS */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                  className={`p-3 rounded-xl relative transition-all shadow-sm border ${showNotifications ? 'bg-white border-red/20 ring-2 ring-red/10' : 'bg-white/50 border-white/40 hover:bg-white'}`}
                >
                  <Bell className={`w-5 h-5 ${showNotifications ? 'text-red' : 'text-foreground/80'}`} />
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-yellow rounded-full border-2 border-white shadow-sm"></span>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-cream overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-cream flex justify-between items-center bg-cream/20">
                      <h3 className="font-bold text-foreground">Notifications</h3>
                      <button className="text-xs font-bold text-red hover:underline">Mark all as read</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className="p-4 hover:bg-cream/20 transition-colors border-b border-cream/50 cursor-pointer group">
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm font-bold ${n.read ? 'text-foreground/70' : 'text-foreground'}`}>{n.title}</span>
                            {!n.read && <div className="w-2 h-2 bg-red rounded-full mt-1.5"></div>}
                          </div>
                          <span className="text-xs text-foreground/40 font-medium">{n.time}</span>
                        </div>
                      ))}
                    </div>
                    <button className="w-full p-3 text-sm font-bold text-foreground/60 hover:bg-cream/30 transition-colors">
                      View all notifications
                    </button>
                  </div>
                )}
              </div>

              {/* USER ICON / PROFILE MENU */}
              <div className="relative">
                <button
                  onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                  className={`flex items-center gap-2 p-1.5 rounded-xl transition-all shadow-sm border ${showProfileMenu ? 'bg-white border-red/20 ring-2 ring-red/10' : 'bg-white/50 border-white/40 hover:bg-white'} group`}
                >
                  <div className="w-9 h-9 bg-green rounded-lg flex items-center justify-center group-hover:bg-green/90 transition-colors">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-foreground/40 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-cream overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-cream bg-cream/20">
                      <p className="text-sm font-bold text-foreground">Student User</p>
                      <p className="text-xs text-foreground/50 font-medium">Free Plan</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => { navigate("/profile"); setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-foreground/70 hover:bg-cream/30 hover:text-red rounded-xl transition-all"
                      >
                        <User className="w-4 h-4" /> My Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red hover:bg-red/5 rounded-xl transition-all"
                      >
                        <LogOut className="w-4 h-4" /> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

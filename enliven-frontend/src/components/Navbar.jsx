import React, { useState } from "react";
import { Sparkles, Bell, User, LogOut, Settings, CreditCard, ChevronDown, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export default function Navbar({ onGetStarted, isLanding = false }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : { name: "Student User", role: "student" };

  const handleLogout = () => {
    localStorage.clear();
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

        {/* NAVIGATION LINKS - Hidden when not landing */}
        {isLanding && (
          <div className="hidden md:flex items-center space-x-10">
            <a
              href="#features"
              className="text-foreground/80 hover:text-red transition-colors font-bold text-sm uppercase tracking-widest"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-foreground/80 hover:text-red transition-colors font-bold text-sm uppercase tracking-widest"
            >
              How It Works
            </a>

            <a
              href="#about"
              className="text-foreground/80 hover:text-red transition-colors font-bold text-sm uppercase tracking-widest"
            >
              About
            </a>
          </div>
        )}

        {/* SPACING ELEMENT FOR DASHBOARD */}
        {!isLanding && <div className="flex-1" />}

        {/* RIGHT SIDE BUTTONS */}
        <div className="flex items-center space-x-6">
          {!isLanding && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm group hover:bg-amber-100 transition-colors">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-black text-amber-700">{user.streak || 0}</span>
              <span className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest ml-1">Day Streak</span>
            </div>
          )}

          {isLanding ? (
            <>
              {/* SIGN IN */}
              <button 
                onClick={() => navigate("/login")}
                className="hidden md:inline-flex text-foreground/80 font-bold text-sm uppercase tracking-widest hover:text-red transition-colors"
              >
                Sign In
              </button>

              {/* FIXED PRIMARY BUTTON */}
              <button
                onClick={onGetStarted}
                className="px-8 py-3 bg-red text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red/20 hover:shadow-red/30 hover:bg-red/90 transition-all transform hover:-translate-y-0.5 active:scale-95"
              >
                Get Started
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              {/* DASHBOARD NOTIFICATIONS */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                  className={`p-3 rounded-2xl relative transition-all shadow-sm border ${showNotifications ? 'bg-white border-red/30 ring-4 ring-red/5' : 'bg-white/60 border-white/40 hover:bg-white hover:border-red/20'}`}
                >
                  <Bell className={`w-5 h-5 ${showNotifications ? 'text-red' : 'text-foreground/70'}`} />
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red rounded-full border-2 border-white animate-pulse"></span>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-cream overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-5 border-b border-cream flex justify-between items-center bg-cream/10">
                      <h3 className="font-black text-sm uppercase tracking-widest text-foreground">Notifications</h3>
                      <button className="text-[10px] font-black text-red uppercase tracking-widest hover:underline">Clear</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                      {notifications.map(n => (
                        <div key={n.id} className="p-4 hover:bg-cream/20 transition-all rounded-2xl border border-transparent hover:border-cream cursor-pointer group relative">
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-xs font-bold leading-snug ${n.read ? 'text-foreground/60' : 'text-foreground'}`}>{n.title}</span>
                            {!n.read && <div className="w-2 h-2 bg-red rounded-full mt-1.5 flex-shrink-0"></div>}
                          </div>
                          <span className="text-[9px] text-foreground/30 font-black uppercase tracking-widest">{n.time}</span>
                        </div>
                      ))}
                    </div>
                    <button className="w-full p-4 text-[10px] font-black text-foreground/40 uppercase tracking-widest hover:bg-cream/20 transition-all border-t border-cream">
                      See all history
                    </button>
                  </div>
                )}
              </div>

              {/* USER ICON / PROFILE MENU */}
              <div className="relative">
                <button
                  onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                  className={`flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl transition-all shadow-sm border ${showProfileMenu ? 'bg-white border-red/30 ring-4 ring-red/5' : 'bg-white/60 border-white/40 hover:bg-white hover:border-red/20'} group`}
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-green to-emerald-600 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="hidden lg:block text-left">
                     <p className="text-[11px] font-black text-foreground uppercase tracking-tight leading-none">{user.name.split(' ')[0]}</p>
                     <p className="text-[8px] font-black text-red uppercase tracking-widest mt-1 opacity-60">Level {user.streak > 10 ? 'Elite' : 'Basic'}</p>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-foreground/30 transition-transform duration-300 ${showProfileMenu ? 'rotate-180 text-red' : ''}`} />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl border border-cream overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-6 border-b border-cream bg-cream/10 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-3 bg-red/10 rounded-bl-2xl">
                          <span className="text-[8px] font-black uppercase tracking-widest text-red">Active</span>
                       </div>
                      <p className="text-sm font-black text-foreground uppercase tracking-tight">{user.name}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{user.role}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => { navigate("/profile"); setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-foreground/70 uppercase tracking-widest hover:bg-cream/30 hover:text-red rounded-2xl transition-all"
                      >
                        <User className="w-4 h-4 opacity-40" /> My Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-red uppercase tracking-widest hover:bg-red/5 rounded-2xl transition-all"
                      >
                        <LogOut className="w-4 h-4" /> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

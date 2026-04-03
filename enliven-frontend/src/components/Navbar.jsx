import React from "react";
import { Sparkles, Bell, User } from "lucide-react";
import { Button } from "./ui/button";

export default function Navbar({ onGetStarted, isLanding = false }) {
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
              <button className="p-3 hover:bg-white rounded-xl relative transition-colors shadow-sm bg-white/50 border border-white/40">
                <Bell className="w-5 h-5 text-foreground/80" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-yellow rounded-full border-2 border-white"></span>
              </button>

              {/* USER ICON */}
              <button className="flex items-center justify-center p-1.5 hover:bg-white rounded-xl transition-colors shadow-sm bg-white/50 border border-white/40 group">
                <div className="w-9 h-9 bg-green rounded-lg flex items-center justify-center group-hover:bg-green/90 transition-colors">
                  <User className="w-5 h-5 text-white" />
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

import React from "react";
import { Sparkles, Bell, User } from "lucide-react";
import { Button } from "./ui/button";

export function Navbar({ onGetStarted, isLanding = false }) {
  return (
    <nav className="w-full fixed top-0 left-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 z-50">
      {/* FULL WIDTH NAVBAR */}
      <div className="w-full px-6 py-4 flex items-center justify-between">
        
        {/* LOGO - ALWAYS LEFT */}
        <a href="#" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C6FF8] to-[#582B5B] grid place-items-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold bg-gradient-to-r from-[#6C6FF8] to-[#582B5B] bg-clip-text text-transparent">
            Enliven
          </span>
        </a>

        {/* NAVIGATION LINKS */}
        {isLanding ? (
          <div className="hidden md:flex items-center space-x-10">
            <a
              href="#features"
              className="text-gray-800 hover:text-[#6C6FF8] transition-colors font-medium"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-gray-800 hover:text-[#6C6FF8] transition-colors font-medium"
            >
              How It Works
            </a>

            <a
              href="#about"
              className="text-gray-800 hover:text-[#6C6FF8] transition-colors font-medium"
            >
              About
            </a>
          </div>
        ) : (
          <div className="flex-1 px-8 hidden md:block">
            <input
              type="search"
              placeholder="Search courses, topics..."
              className="w-full px-4 py-2 bg-gray-100 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C6FF8]"
            />
          </div>
        )}

        {/* RIGHT SIDE BUTTONS */}
        <div className="flex items-center space-x-4">
          {isLanding ? (
            <>
              {/* SIGN IN */}
              <button className="hidden md:inline-flex text-gray-700 font-medium hover:text-[#6C6FF8]">
                Sign In
              </button>

              {/* FIXED BLUE BUTTON */}
              <button
                onClick={onGetStarted}
                className="px-6 py-2 bg-enliven-primary text-white rounded-full font-semibold text-lg hover:bg-enliven-primary-dark transition"
              >
                Get Started
              </button>
            </>
          ) : (
            <>
              {/* DASHBOARD NOTIFICATIONS */}
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* USER ICON */}
              <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-[#6C6FF8] to-[#582B5B] rounded-full flex items-center justify-center">
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

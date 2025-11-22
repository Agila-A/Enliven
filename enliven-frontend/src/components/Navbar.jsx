import React from 'react';
import { Sparkles, Bell, User } from 'lucide-react';
import { Button } from './ui/button';

export function Navbar({ onGetStarted, isLanding = false }) {
  return (
    <nav className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-primary to-[#582B5B] p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-primary to-[#582B5B] bg-clip-text text-transparent">
              Enliven
            </span>
          </div>

          {/* Navigation Links - Desktop */}
          {isLanding ? (
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors">
                How It Works
              </a>
              <a href="#testimonials" className="text-foreground hover:text-primary transition-colors">
                Testimonials
              </a>
            </div>
          ) : (
            <div className="flex-1 px-8">
              <div className="max-w-md">
                <input 
                  type="search" 
                  placeholder="Search courses, topics..."
                  className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {isLanding ? (
              <>
                <Button variant="ghost" className="hidden md:inline-flex">
                  Sign In
                </Button>
                <Button onClick={onGetStarted} className="bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </>
            ) : (
              <>
                <button className="p-2 hover:bg-secondary rounded-lg transition-colors relative">
                  <Bell className="w-5 h-5 text-foreground" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
                </button>
                <button className="flex items-center space-x-2 p-2 hover:bg-secondary rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-[#582B5B] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/pages/LandingPage';
import { Dashboard } from './components/pages/Dashboard';
import { LearningPath } from './components/pages/LearningPath';
import { CoursePage } from './components/pages/CoursePage';
import { AssessmentPage } from './components/pages/AssessmentPage';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { ProfilePage } from './components/pages/ProfilePage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleGetStarted = () => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleTryDemo = () => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  // Landing page view (no sidebar)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen">
        <Navbar onGetStarted={handleGetStarted} isLanding={true} />
        <LandingPage onGetStarted={handleGetStarted} onTryDemo={handleTryDemo} />
      </div>
    );
  }

  // App view (with sidebar)
  return (
    <div className="min-h-screen">
      <Navbar isLanding={false} />
      <div className="flex">
        <Sidebar activePage={currentPage} onNavigate={handleNavigate} />
        <main className="flex-1 overflow-y-auto px-6 pt-24">


          {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentPage === 'learning-path' && <LearningPath />}
          {currentPage === 'courses' && <CoursePage />}
          {currentPage === 'assessment' && <AssessmentPage />}
          {currentPage === 'analytics' && <AnalyticsPage />}
          {currentPage === 'profile' && <ProfilePage />}
        </main>
      </div>
    </div>
  );
}

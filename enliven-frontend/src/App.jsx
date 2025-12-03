import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./components/pages/LandingPage";
import Signup from "./components/pages/Signup";
import Login from "./components/pages/Login";

import Dashboard from "./components/pages/Dashboard";
import LearningPath from "./components/pages/LearningPath";
import CoursePage from "./components/pages/CoursePage";
import AssessmentPage from "./components/pages/AssessmentPage";
import AnalyticsPage from "./components/pages/AnalyticsPage";
import ProfilePage from "./components/pages/ProfilePage";

import AppLayout from "./components/layout/AppLayout";

import DomainSelect from "./components/pages/DomainSelect";
import InitialAssessment from "./components/pages/InitialAssessment";
import RoadmapPage from "./components/pages/Roadmap";
import StudyBuddyChat from "./components/pages/StudyBuddyChat";

const isLogged = () => localStorage.getItem("loggedIn") === "true";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* ❌ NO LAYOUT HERE */}
        <Route
          path="/select-domain"
          element={
            isLogged() ? <DomainSelect /> : <Navigate to="/login" />
          }
        />

        {/* ❌ NO LAYOUT HERE */}
        <Route
          path="/initial-assessment"
          element={
            isLogged() ? <InitialAssessment /> : <Navigate to="/login" />
          }
        />

        {/* ❌ NO LAYOUT HERE */}
        <Route
          path="/roadmap"
          element={
            isLogged() ? <RoadmapPage /> : <Navigate to="/login" />
          }
        />

        {/* Pages WITH sidebar + topbar */}
        <Route
          path="/dashboard"
          element={
            isLogged() ? (
              <AppLayout>
                <Dashboard />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/learning-path"
          element={
            isLogged() ? (
              <AppLayout>
                <LearningPath />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/courses/:domain/:level"
          element={
            isLogged() ? (
              <AppLayout>
                <CoursePage />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/assessment"
          element={
            isLogged() ? (
              <AppLayout>
                <AssessmentPage />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/analytics"
          element={
            isLogged() ? (
              <AppLayout>
                <AnalyticsPage />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/profile"
          element={
            isLogged() ? (
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
  path="/study-buddy"
  element={
    isLogged() ? (
      <AppLayout>
        <StudyBuddyChat />
      </AppLayout>
    ) : (
      <Navigate to="/login" />
    )
  }
/>

      </Routes>
    </BrowserRouter>
  );
}

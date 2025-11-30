import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

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


// Auth Check
const isLogged = () => localStorage.getItem("loggedIn") === "true";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* Domain Selection */}
        <Route
          path="/select-domain"
          element={
            isLogged() ? (
              <AppLayout>
                <DomainSelect />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Initial Assessment */}
        <Route
          path="/initial-assessment"
          element={
            isLogged() ? (
              <AppLayout>
                <InitialAssessment />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
  path="/roadmap"
  element={
    isLogged() ? (
      <AppLayout>
        <RoadmapPage />
      </AppLayout>
    ) : (
      <Navigate to="/login" />
    )
  }
/>


        {/* Protected Pages */}
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

      </Routes>
    </BrowserRouter>
  );
}

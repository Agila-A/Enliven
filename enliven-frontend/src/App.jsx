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

// FIXED AUTH CHECK
const isLoggedIn = () => {
  return localStorage.getItem("loggedIn") === "true";
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* Protected pages */}
        <Route
          path="/dashboard"
          element={
            isLoggedIn() ? (
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
            isLoggedIn() ? (
              <AppLayout>
                <LearningPath />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/courses"
          element={
            isLoggedIn() ? (
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
            isLoggedIn() ? (
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
            isLoggedIn() ? (
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
            isLoggedIn() ? (
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

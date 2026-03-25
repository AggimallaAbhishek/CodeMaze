import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import PageFeedback from "./components/PageFeedback";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuthStore } from "./store/useAuthStore";

const GraphTraversalPage = lazy(() => import("./pages/GraphTraversalPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const LevelsPage = lazy(() => import("./pages/LevelsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const PathfindingPage = lazy(() => import("./pages/PathfindingPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ReplayPage = lazy(() => import("./pages/ReplayPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const SortingPage = lazy(() => import("./pages/SortingPage"));

function HomeRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/levels" : "/login"} replace />;
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageFeedback panel>Loading page...</PageFeedback>}>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/levels"
            element={
              <ProtectedRoute>
                <LevelsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/levels/:levelId/sorting"
            element={
              <ProtectedRoute>
                <SortingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/levels/:levelId/pathfinding"
            element={
              <ProtectedRoute>
                <PathfindingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/levels/:levelId/graph-traversal"
            element={
              <ProtectedRoute>
                <GraphTraversalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/replay/:submissionId"
            element={
              <ProtectedRoute>
                <ReplayPage />
              </ProtectedRoute>
            }
          />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

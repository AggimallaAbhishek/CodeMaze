import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import GraphTraversalPage from "./pages/GraphTraversalPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LevelsPage from "./pages/LevelsPage";
import LoginPage from "./pages/LoginPage";
import PathfindingPage from "./pages/PathfindingPage";
import ProfilePage from "./pages/ProfilePage";
import ReplayPage from "./pages/ReplayPage";
import RegisterPage from "./pages/RegisterPage";
import SortingPage from "./pages/SortingPage";
import { useAuthStore } from "./store/useAuthStore";

function HomeRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/levels" : "/login"} replace />;
}

export default function App() {
  return (
    <Layout>
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
    </Layout>
  );
}

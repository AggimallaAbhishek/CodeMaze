import { Navigate, useLocation } from "react-router-dom";

import PageFeedback from "./PageFeedback";
import { useAuthStore } from "../store/useAuthStore";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const authReady = useAuthStore((state) => state.authReady);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!authReady) {
    return <PageFeedback panel>Checking session...</PageFeedback>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

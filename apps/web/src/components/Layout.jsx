import { Link, useNavigate } from "react-router-dom";

import { logoutUser } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearAuthSession = useAuthStore((state) => state.clearAuthSession);

  async function handleLogout() {
    try {
      await logoutUser(refreshToken, accessToken);
    } catch (error) {
      console.debug("logout_request_failed", { message: error.message });
    } finally {
      clearAuthSession();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <Link className="brand" to="/">
          Algorithm Puzzle Lab
        </Link>
        <nav className="menu-links">
          <Link to="/levels">Levels</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          {user ? <Link to="/profile">Profile</Link> : null}
        </nav>
        <div className="account-cluster">
          {user ? (
            <>
              <span className="pill">{user.username}</span>
              <span className="pill subtle">XP {user.total_xp ?? 0}</span>
              <button className="ghost-btn" onClick={handleLogout} type="button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="ghost-btn" to="/login">
                Login
              </Link>
              <Link className="ghost-btn" to="/register">
                Register
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="page-container">{children}</main>
    </div>
  );
}

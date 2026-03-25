import { Link, NavLink, useNavigate } from "react-router-dom";

import { logoutUser } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

function navigationLinkClass({ isActive }) {
  return isActive ? "nav-link active" : "nav-link";
}

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
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="top-nav">
        <Link className="brand" to="/">
          Algorithm Puzzle Lab
        </Link>
        <nav className="menu-links" aria-label="Primary">
          <NavLink className={navigationLinkClass} to="/levels">
            Levels
          </NavLink>
          <NavLink className={navigationLinkClass} to="/leaderboard">
            Leaderboard
          </NavLink>
          {user ? (
            <NavLink className={navigationLinkClass} to="/profile">
              Profile
            </NavLink>
          ) : null}
        </nav>
        <div className="account-cluster" aria-label="Account controls">
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
      <main id="main-content" className="page-container" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

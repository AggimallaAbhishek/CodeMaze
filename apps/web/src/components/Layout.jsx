import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import useThemePreference from "../hooks/useThemePreference";
import { logoutUser } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

function navigationLinkClass({ isActive }) {
  return isActive ? "nav-link active" : "nav-link";
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearAuthSession = useAuthStore((state) => state.clearAuthSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, isDarkTheme, toggleTheme } = useThemePreference();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    try {
      await logoutUser(accessToken);
    } catch (error) {
      console.debug("logout_request_failed", { message: error.message });
    } finally {
      clearAuthSession();
      navigate("/login", { replace: true });
    }
  }

  function handleToggleTheme() {
    console.debug("theme_toggle_clicked", { nextTheme: isDarkTheme ? "light" : "dark" });
    toggleTheme();
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="top-nav">
        <div className="top-nav-shell">
          <Link className="brand" to="/">
            CODE<span>MAZE</span>
          </Link>

          <nav className="menu-links" aria-label="Primary">
            <NavLink className={navigationLinkClass} to="/">
              Home
            </NavLink>
            <NavLink className={navigationLinkClass} to="/levels">
              Play
            </NavLink>
            <NavLink className={navigationLinkClass} to="/leaderboard">
              Leaderboard
            </NavLink>
            {user ? (
              <NavLink className={navigationLinkClass} to="/profile">
                Dashboard
              </NavLink>
            ) : null}
          </nav>

          <div className="nav-utility-row">
            <button
              type="button"
              className="theme-toggle"
              onClick={handleToggleTheme}
              aria-label={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={!isDarkTheme}
              title={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="theme-toggle-track">
                <span className="theme-toggle-thumb" aria-hidden="true">
                  {isDarkTheme ? "☾" : "☀"}
                </span>
                <span className="theme-toggle-copy">{theme === "dark" ? "Dark" : "Light"}</span>
              </span>
            </button>

            <div className="account-cluster" aria-label="Account controls">
              {user ? (
                <>
                  <span className="pill">{user.username}</span>
                  <span className="pill subtle">XP {user.total_xp ?? 0}</span>
                  <Link className="primary-btn nav-cta-btn" to="/levels">
                    Play Now
                  </Link>
                  <button className="ghost-btn" onClick={handleLogout} type="button">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link className="ghost-btn" to="/login">
                    Login
                  </Link>
                  <Link className="primary-btn nav-cta-btn" to="/register">
                    Get Started
                  </Link>
                </>
              )}
            </div>

            <button
              className={menuOpen ? "nav-toggle open" : "nav-toggle"}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label="Toggle navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <div id="mobile-nav" className={menuOpen ? "mobile-nav open" : "mobile-nav"}>
          <div className="mobile-nav-meta">
            {user ? (
              <>
                <span className="pill">{user.username}</span>
                <span className="pill subtle">XP {user.total_xp ?? 0}</span>
              </>
            ) : (
              <span className="muted-text">Train sorting, pathfinding, and graph traversal on the go.</span>
            )}
          </div>
          <NavLink className={navigationLinkClass} to="/">
            Home
          </NavLink>
          <NavLink className={navigationLinkClass} to="/levels">
            Play
          </NavLink>
          <NavLink className={navigationLinkClass} to="/leaderboard">
            Leaderboard
          </NavLink>
          {user ? (
            <NavLink className={navigationLinkClass} to="/profile">
              Dashboard
            </NavLink>
          ) : null}
          {user ? (
            <button className="ghost-btn mobile-logout" onClick={handleLogout} type="button">
              Logout
            </button>
          ) : (
            <>
              <Link className="ghost-btn" to="/login">
                Login
              </Link>
              <Link className="primary-btn nav-cta-btn" to="/register">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>
      <main id="main-content" className="page-container" tabIndex={-1}>
        {children}
      </main>
      <footer className="footer-shell">
        <div className="footer-grid">
          <div className="footer-brand-block">
            <Link className="brand footer-brand" to="/">
              CODE<span>MAZE</span>
            </Link>
            <p className="muted-text">
              A game-first DSA training platform for sorting, pathfinding, and graph traversal mastery.
            </p>
          </div>
          <div className="footer-links-block">
            <Link to="/levels">Challenge Deck</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            {user ? <Link to="/profile">Dashboard</Link> : <Link to="/register">Create Account</Link>}
          </div>
        </div>
      </footer>
    </div>
  );
}

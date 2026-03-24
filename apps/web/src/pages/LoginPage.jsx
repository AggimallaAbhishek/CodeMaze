import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getCurrentUser, loginUser } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuthSession = useAuthStore((state) => state.setAuthSession);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const auth = await loginUser({ email, password });
      const user = await getCurrentUser(auth.access);
      setAuthSession({
        user,
        access: auth.access,
        refresh: auth.refresh
      });

      const nextRoute = location.state?.from ?? "/levels";
      navigate(nextRoute, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <h1>Welcome Back</h1>
      <p className="muted-text">Sign in to continue your algorithm challenge streak.</p>
      <form onSubmit={onSubmit} className="form-stack">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>
      <p className="muted-text">
        Need an account? <Link to="/register">Register</Link>
      </p>
    </section>
  );
}

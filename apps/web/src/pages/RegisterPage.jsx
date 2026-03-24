import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuthSession = useAuthStore((state) => state.setAuthSession);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await registerUser({ email, username, password });
      setAuthSession({
        user: response.user,
        access: response.access,
        refresh: response.refresh
      });
      navigate("/levels", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <h1>Create Account</h1>
      <p className="muted-text">Track your puzzle scores and leaderboard progression.</p>
      <form onSubmit={onSubmit} className="form-stack">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="register-username">Username</label>
        <input
          id="register-username"
          type="text"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
      <p className="muted-text">
        Already registered? <Link to="/login">Login</Link>
      </p>
    </section>
  );
}

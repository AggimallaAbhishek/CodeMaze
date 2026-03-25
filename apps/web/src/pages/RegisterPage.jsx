import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import PageFeedback from "../components/PageFeedback";
import { registerUser } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuthSession = useAuthStore((state) => state.setAuthSession);

  function applyServerError(message) {
    const normalized = message.trim();
    const fieldMatch = normalized.match(/^(Email|Username|Password):\s*(.+)$/i);
    if (fieldMatch) {
      const [, rawField, rawMessage] = fieldMatch;
      const field = rawField.toLowerCase();
      setFieldErrors((previous) => ({
        ...previous,
        [field]: rawMessage
      }));
      setError("");
      return;
    }
    setError(normalized);
  }

  function validateForm(nextEmail, nextUsername, nextPassword) {
    const nextErrors = { email: "", username: "", password: "" };

    if (!nextEmail.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(nextEmail.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!nextUsername.trim()) {
      nextErrors.username = "Username is required.";
    } else if (nextUsername.trim().length < 3) {
      nextErrors.username = "Username must be at least 3 characters.";
    }

    if (!nextPassword) {
      nextErrors.password = "Password is required.";
    } else if (nextPassword.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    return nextErrors;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    const validationErrors = validateForm(email, username, password);
    setFieldErrors(validationErrors);
    if (validationErrors.email || validationErrors.username || validationErrors.password) {
      console.debug("register_validation_failed", {
        hasEmailError: Boolean(validationErrors.email),
        hasUsernameError: Boolean(validationErrors.username),
        hasPasswordError: Boolean(validationErrors.password)
      });
      return;
    }

    setLoading(true);

    try {
      console.debug("register_submit_started");
      const response = await registerUser({
        email: email.trim(),
        username: username.trim(),
        password
      });
      setAuthSession({
        user: response.user,
        access: response.access
      });
      console.debug("register_submit_succeeded", { userId: response.user.id });
      navigate("/levels", { replace: true });
    } catch (err) {
      console.debug("register_submit_failed", { message: err.message });
      applyServerError(err.message || "Request failed.");
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
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldErrors.email) {
              setFieldErrors((previous) => ({ ...previous, email: "" }));
            }
          }}
          disabled={loading}
        />
        {fieldErrors.email ? <PageFeedback variant="error">{fieldErrors.email}</PageFeedback> : null}

        <label htmlFor="register-username">Username</label>
        <input
          id="register-username"
          type="text"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            if (fieldErrors.username) {
              setFieldErrors((previous) => ({ ...previous, username: "" }));
            }
          }}
          disabled={loading}
        />
        {fieldErrors.username ? <PageFeedback variant="error">{fieldErrors.username}</PageFeedback> : null}

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldErrors.password) {
              setFieldErrors((previous) => ({ ...previous, password: "" }));
            }
          }}
          disabled={loading}
        />
        {fieldErrors.password ? <PageFeedback variant="error">{fieldErrors.password}</PageFeedback> : null}

        {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

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

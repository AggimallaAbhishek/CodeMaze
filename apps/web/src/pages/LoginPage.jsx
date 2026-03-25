import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import AuthInputField from "../components/auth/AuthInputField";
import AuthSubmitButton from "../components/auth/AuthSubmitButton";
import PageFeedback from "../components/PageFeedback";
import { getCurrentUser, loginUser } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const featureItems = [
  {
    title: "Live Visualizations",
    description: "Watch sorting, pathfinding, and graph traversal flows as you solve.",
    icon: "PS"
  },
  {
    title: "Global Leaderboard",
    description: "Compete weekly and climb with validated submissions.",
    icon: "LB"
  },
  {
    title: "XP Progression",
    description: "Unlock badges and track mastery across all game modes.",
    icon: "XP"
  }
];

function buildParticleStyles(index) {
  const left = (index * 17) % 100;
  const bottom = (index * 13) % 40;
  const duration = 4 + (index % 6);
  const delay = (index % 8) * 0.55;
  const size = index % 3 === 0 ? 3 : 2;
  return {
    left: `${left}%`,
    bottom: `${bottom}%`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    width: `${size}px`,
    height: `${size}px`
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuthSession = useAuthStore((state) => state.setAuthSession);
  const particles = useMemo(() => Array.from({ length: 28 }, (_, index) => buildParticleStyles(index)), []);

  function validateForm(nextEmail, nextPassword) {
    const nextErrors = { email: "", password: "" };

    if (!nextEmail.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(nextEmail.trim())) {
      nextErrors.email = "Enter a valid email address.";
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
    const validationErrors = validateForm(email, password);
    setFieldErrors(validationErrors);
    if (validationErrors.email || validationErrors.password) {
      console.debug("login_validation_failed", {
        hasEmailError: Boolean(validationErrors.email),
        hasPasswordError: Boolean(validationErrors.password)
      });
      return;
    }

    setLoading(true);

    try {
      console.debug("login_submit_started", { rememberMe });
      const auth = await loginUser({ email: email.trim(), password });
      const user = await getCurrentUser(auth.access);
      setAuthSession({
        user,
        access: auth.access
      });

      const nextRoute = location.state?.from ?? "/levels";
      console.debug("login_submit_succeeded", { userId: user.id, redirect: nextRoute });
      navigate(nextRoute, { replace: true });
    } catch (err) {
      console.debug("login_submit_failed", { message: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-template-shell">
      <div className="login-template-bg-wrap" aria-hidden="true">
        <div className="login-template-bg-grid" />
        <div className="login-template-orb login-template-orb-1" />
        <div className="login-template-orb login-template-orb-2" />
        <div className="login-template-orb login-template-orb-3" />
        <div className="login-template-particles">
          {particles.map((style, index) => (
            <span key={`particle-${index}`} className="login-template-particle" style={style} />
          ))}
        </div>
        <div className="login-template-scanline" />
      </div>

      <div className="login-template-card">
        <aside className="login-template-left">
          <div className="login-template-left-tag">
            <span className="login-template-pulse-dot" />
            Season 3 Live
          </div>
          <h2 className="login-template-left-title">
            <span className="t-white">Level Up</span>
            <span className="t-cyan">Your Code.</span>
            <span className="t-magenta">Beat the Board.</span>
          </h2>
          <p className="login-template-left-desc">
            Join players mastering DSA through interactive challenges, live solver feedback, and leaderboard competition.
          </p>

          <div className="login-template-feature-list">
            {featureItems.map((item) => (
              <article key={item.title} className="login-template-feature-item">
                <span className="login-template-feature-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="login-template-feature-text">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="login-template-bars" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <span key={`bar-${index}`} className={`login-template-bar login-template-bar-${(index % 5) + 1}`} />
            ))}
          </div>
        </aside>

        <div className="login-template-right">
          <div className="login-template-tabs">
            <button type="button" className="login-template-tab active">
              Login
            </button>
            <Link className="login-template-tab" to="/register">
              Register
            </Link>
          </div>

          <header className="login-template-form-header">
            <h1 className="login-template-form-title">
              Welcome Back<span aria-hidden="true">.</span>
            </h1>
            <p className="login-template-form-subtitle">
              New here? <Link to="/register">Create an account</Link>
            </p>
          </header>

          <div className="login-template-social-row">
            <button type="button" className="login-template-social-btn" onClick={() => setError("GitHub sign-in is not configured yet.")}>
              GH
            </button>
            <button type="button" className="login-template-social-btn" onClick={() => setError("Google sign-in is not configured yet.")}>
              GG
            </button>
            <button type="button" className="login-template-social-btn" onClick={() => setError("Discord sign-in is not configured yet.")}>
              DS
            </button>
          </div>

          <div className="login-template-divider">
            <span />
            <p>or continue with email</p>
            <span />
          </div>

          <form onSubmit={onSubmit} className="login-template-form" noValidate>
            <AuthInputField
              id="login-email"
              label="Email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((previous) => ({ ...previous, email: "" }));
                }
              }}
              type="email"
              autoComplete="email"
              placeholder="player@codemaze.gg"
              icon="◎"
              error={fieldErrors.email}
              disabled={loading}
            />

            <AuthInputField
              id="login-password"
              label="Password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((previous) => ({ ...previous, password: "" }));
                }
              }}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              icon="L"
              error={fieldErrors.password}
              disabled={loading}
              rightAdornment={
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              }
            />

            <div className="login-template-extra-row">
              <label className="login-template-remember">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="login-template-forgot" onClick={() => setError("Forgot password flow is not configured yet.")}>
                Forgot password?
              </button>
            </div>

            {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

            <AuthSubmitButton loading={loading} text="Enter Arena" loadingText="Signing In" />
          </form>
        </div>
      </div>
    </section>
  );
}

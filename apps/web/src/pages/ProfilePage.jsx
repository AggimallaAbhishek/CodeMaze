import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import PageFeedback from "../components/PageFeedback";
import { getCurrentUser, getMySubmissions } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { gameTypeLabel } from "../utils/gameModes";
import { buildProfileInsights, filterSubmissionsByMode, PROFILE_RUN_FILTERS } from "../utils/profileInsights";
import { toActionableError } from "../utils/errors";

export default function ProfilePage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRunFilter, setActiveRunFilter] = useState("all");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      try {
        const [profile, recentSubmissions] = await Promise.all([
          getCurrentUser(accessToken),
          getMySubmissions(accessToken, { limit: 12 })
        ]);
        if (!active) {
          return;
        }
        console.debug("profile_loaded", {
          submissions: recentSubmissions.length,
          badges: profile.badges?.length ?? 0
        });
        updateUserProfile(profile);
        setSubmissions(recentSubmissions);
      } catch (err) {
        if (active) {
          setError(toActionableError(err, "Unable to load your profile right now. Check the API connection and try again."));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [accessToken, updateUserProfile]);

  const insights = useMemo(() => buildProfileInsights(user, submissions), [submissions, user]);
  const filteredSubmissions = useMemo(
    () => filterSubmissionsByMode(submissions, activeRunFilter),
    [activeRunFilter, submissions]
  );
  const displayName = user?.username ?? "Player";

  if (loading) {
    return <PageFeedback panel>Loading profile...</PageFeedback>;
  }

  return (
    <section className="dashboard-page-shell profile-page-modern">
      <article className="profile-command-surface">
        <div className="profile-command-grid">
          <div className="profile-identity-panel">
            <div className="profile-identity-top">
              <div className="identity-avatar profile-identity-avatar" aria-hidden="true">
                {displayName.slice(0, 1).toUpperCase()}
              </div>

              <div className="profile-identity-copy">
                <p className="section-label">Player Hub</p>
                <h1 className="section-title profile-command-title">{displayName}</h1>
                <p className="section-subtitle">
                  Track XP growth, replayable runs, mastery spread, and progression momentum from one command-grade
                  dashboard.
                </p>
              </div>

              <Link className="ghost-btn" to="/levels">
                Back to Levels
              </Link>
            </div>

            <div className="profile-chip-row">
              <span className="pill subtle">{user?.is_verified ? "Verified operator" : "Verification pending"}</span>
              <span className="pill subtle">Level {user?.progression?.level ?? 1}</span>
              {insights.dominantMode ? <span className="pill subtle">{gameTypeLabel(insights.dominantMode)} focus</span> : null}
            </div>

            <p className="profile-identity-meta">{user?.email ?? "Authenticated account active"}</p>

            <div className="xp-track-shell profile-xp-shell">
              <div className="xp-track-labels">
                <span>XP Progress</span>
                <span>
                  {user?.progression?.xp_into_level ?? 0} / {user?.progression?.xp_for_next_level ?? 100}
                </span>
              </div>
              <div className="xp-track-modern">
                <div className="xp-fill-modern" style={{ width: `${insights.progressRatio}%` }} />
              </div>
            </div>

            <div className="profile-intel-grid">
              {insights.intelCards.map((card) => (
                <article key={card.label} className="profile-intel-card">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <p>{card.helper}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="profile-signal-stack">
            <div className="profile-hero-stat-grid">
              {insights.heroStats.map((card) => (
                <article key={card.label} className={`summary-stat-card ${card.accent}`}>
                  <span className="summary-icon">{card.label}</span>
                  <strong>{card.value}</strong>
                  <span>{card.helper}</span>
                </article>
              ))}
            </div>

            <article className="dashboard-panel profile-mastery-panel">
              <div className="panel-title-row">
                <h2>Mode Mastery</h2>
                <span className="muted-text">Derived from recent validated runs</span>
              </div>
              <div className="topic-stack">
                {insights.masteryTracks.map((track) => (
                  <div key={track.key} className="topic-row-modern">
                    <div className="topic-row-header">
                      <span>{track.label}</span>
                      <span className={`topic-value ${track.accent}`}>{track.value}%</span>
                    </div>
                    <div className="topic-track-modern">
                      <div className={`topic-fill-modern ${track.accent}`} style={{ width: `${track.value}%` }} />
                    </div>
                    <span className="muted-text">{track.helper}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </article>

      {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

      <div className="profile-content-grid">
        <div className="dashboard-stack-modern">
          <article className="dashboard-panel">
            <div className="profile-runs-head">
              <div>
                <h2>Recent Runs</h2>
                <p className="muted-text">Replay-ready submissions, filterable by arena type.</p>
              </div>
              <div className="profile-runs-toolbar">
                <div className="profile-filter-tabs" role="tablist" aria-label="Recent run filters">
                  {PROFILE_RUN_FILTERS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      aria-selected={activeRunFilter === item.value}
                      className={`profile-filter-tab${activeRunFilter === item.value ? " active" : ""}`}
                      onClick={() => setActiveRunFilter(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <Link className="ghost-btn" to="/leaderboard">
                  Leaderboard
                </Link>
              </div>
            </div>

            <div className="table-shell">
              {filteredSubmissions.length ? (
                <table className="profile-runs-table">
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Mode</th>
                      <th>Score</th>
                      <th>Stars</th>
                      <th>Status</th>
                      <th>Replay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission) => (
                      <tr key={submission.id}>
                        <td>{submission.level.title}</td>
                        <td>{gameTypeLabel(submission.level.game_type)}</td>
                        <td>{submission.score}</td>
                        <td>{submission.stars}</td>
                        <td>{submission.is_best ? "Personal Best" : "Logged"}</td>
                        <td>
                          <Link to={`/replay/${submission.id}`}>Open</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state-card compact">
                  <h3>No runs recorded for this filter</h3>
                  <p>Switch the filter or complete a validated puzzle run to unlock replay history and progression tracking.</p>
                </div>
              )}
            </div>
          </article>
        </div>

        <div className="dashboard-stack-modern">
          <article className="dashboard-panel profile-snapshot-panel">
            <div className="panel-title-row">
              <h2>Command Snapshot</h2>
              <span className="muted-text">Current progression pulse</span>
            </div>
            <div className="profile-snapshot-grid">
              {insights.snapshotCards.map((card) => (
                <article key={card.label} className="profile-snapshot-card">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <p>{card.helper}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="panel-title-row">
              <h2>Badges</h2>
              <span className="muted-text">{(user?.badges ?? []).length} unlocked</span>
            </div>
            {(user?.badges ?? []).length ? (
              <div className="achievement-grid-modern">
                {(user?.badges ?? []).map((badge) => (
                  <article key={badge.code} className="achievement-card unlocked">
                    <strong>{badge.title}</strong>
                    <span>{badge.description}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted-text">No badges earned yet. Submit a validated puzzle run to start unlocking them.</p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

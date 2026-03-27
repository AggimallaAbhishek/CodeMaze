import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import PageFeedback from "../components/PageFeedback";
import { getCurrentUser, getMySubmissions } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { toActionableError } from "../utils/errors";

function gameTypeLabel(gameType) {
  if (gameType === "sorting") {
    return "Sorting";
  }
  if (gameType === "pathfinding") {
    return "Pathfinding";
  }
  if (gameType === "graph_traversal") {
    return "Graph Traversal";
  }
  return gameType;
}

export default function ProfilePage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return <PageFeedback panel>Loading profile...</PageFeedback>;
  }

  return (
    <section className="dashboard-page-shell">
      <div className="section-head">
        <div className="section-stack">
          <p className="section-label">Player Hub</p>
          <h1 className="section-title">{user?.username ?? "Player Profile"}</h1>
          <p className="section-subtitle">Track XP growth, unlocked badges, replayable runs, and progression metrics in one command panel.</p>
        </div>
        <Link className="ghost-btn" to="/levels">
          Back to Levels
        </Link>
      </div>

      {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

      <div className="dashboard-grid-modern">
        <article className="identity-card">
          <div className="identity-avatar" aria-hidden="true">
            🧑‍💻
          </div>
          <div className="identity-name">{user?.username ?? "Player"}</div>
          <div className="identity-rank">
            {user?.is_verified ? "Verified operator" : "Verification pending"} • Level {user?.progression?.level ?? 1}
          </div>
          <div className="xp-track-shell">
            <div className="xp-track-labels">
              <span>XP Progress</span>
              <span>
                {user?.progression?.xp_into_level ?? 0} / {user?.progression?.xp_for_next_level ?? 100}
              </span>
            </div>
            <div className="xp-track-modern">
              <div
                className="xp-fill-modern"
                style={{
                  width: `${
                    user?.progression?.xp_for_next_level
                      ? Math.round(((user.progression.xp_into_level ?? 0) / user.progression.xp_for_next_level) * 100)
                      : 0
                  }%`
                }}
              />
            </div>
          </div>
          <div className="identity-stat-grid">
            <div className="identity-stat">
              <strong>{user?.stats?.solved_count ?? 0}</strong>
              <span>Solved</span>
            </div>
            <div className="identity-stat">
              <strong>{user?.stats?.best_score ?? 0}</strong>
              <span>Best Score</span>
            </div>
            <div className="identity-stat">
              <strong>{user?.stats?.personal_best_count ?? 0}</strong>
              <span>Best Runs</span>
            </div>
            <div className="identity-stat">
              <strong>{user?.total_xp ?? 0}</strong>
              <span>Total XP</span>
            </div>
          </div>
        </article>

        <div className="dashboard-stack-modern">
          <div className="summary-stat-grid">
            <article className="summary-stat-card cyan">
              <span className="summary-icon">🏆</span>
              <strong>{user?.total_xp ?? 0}</strong>
              <span>Total XP</span>
            </article>
            <article className="summary-stat-card magenta">
              <span className="summary-icon">🎯</span>
              <strong>{user?.stats?.solved_count ?? 0}</strong>
              <span>Validated Clears</span>
            </article>
            <article className="summary-stat-card green">
              <span className="summary-icon">📈</span>
              <strong>{user?.progression?.xp_to_next_level ?? 0}</strong>
              <span>XP To Next Level</span>
            </article>
          </div>

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

          <article className="dashboard-panel">
            <div className="section-head compact">
              <div>
                <h2>Recent Runs</h2>
                <p className="muted-text">Latest submissions with replay access.</p>
              </div>
              <Link className="ghost-btn" to="/leaderboard">
                Leaderboard
              </Link>
            </div>
            <div className="table-shell">
              {submissions.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Mode</th>
                      <th>Score</th>
                      <th>Stars</th>
                      <th>Replay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id}>
                        <td>{submission.level.title}</td>
                        <td>{gameTypeLabel(submission.level.game_type)}</td>
                        <td>{submission.score}</td>
                        <td>{submission.stars}</td>
                        <td>
                          <Link to={`/replay/${submission.id}`}>Open</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state-card compact">
                  <h3>No runs recorded yet</h3>
                  <p>Complete a validated puzzle run to unlock replay history and progression tracking.</p>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

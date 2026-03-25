import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import PageFeedback from "../components/PageFeedback";
import { getCurrentUser, getMySubmissions } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

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
          setError(err.message);
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
    <section className="panel profile-shell">
      <div className="section-head">
        <div>
          <h1>{user?.username ?? "Player Profile"}</h1>
          <p className="muted-text">Track XP growth, earned badges, and recent replay-ready runs.</p>
        </div>
        <Link className="ghost-btn" to="/levels">
          Back to Levels
        </Link>
      </div>

      {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

      <div className="profile-grid">
        <article className="profile-card">
          <span className="label">Current Level</span>
          <strong>{user?.progression?.level ?? 1}</strong>
          <p className="muted-text">
            {user?.progression?.xp_into_level ?? 0} / {user?.progression?.xp_for_next_level ?? 100} XP in this level
          </p>
        </article>
        <article className="profile-card">
          <span className="label">Total XP</span>
          <strong>{user?.total_xp ?? 0}</strong>
          <p className="muted-text">{user?.progression?.xp_to_next_level ?? 0} XP to next level</p>
        </article>
        <article className="profile-card">
          <span className="label">Solved Runs</span>
          <strong>{user?.stats?.solved_count ?? 0}</strong>
          <p className="muted-text">Best score: {user?.stats?.best_score ?? 0}</p>
        </article>
        <article className="profile-card">
          <span className="label">Personal Bests</span>
          <strong>{user?.stats?.personal_best_count ?? 0}</strong>
          <p className="muted-text">Verified account: {user?.is_verified ? "Yes" : "No"}</p>
        </article>
      </div>

      <div className="profile-sections">
        <section className="profile-card tall">
          <h2>Badges</h2>
          {(user?.badges ?? []).length ? (
            <div className="badge-grid">
              {(user?.badges ?? []).map((badge) => (
                <article key={badge.code} className="badge-card">
                  <strong>{badge.title}</strong>
                  <p className="muted-text">{badge.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-text">No badges earned yet. Submit a validated puzzle run to start unlocking them.</p>
          )}
        </section>

        <section className="profile-card tall">
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
          </div>
        </section>
      </div>
    </section>
  );
}

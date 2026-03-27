import { useEffect, useState } from "react";

import PageFeedback from "../components/PageFeedback";
import { getGlobalLeaderboard, getLevelLeaderboard, getLevels } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { toActionableError } from "../utils/errors";

const scopes = [
  { value: "all_time", label: "All Time" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" }
];

export default function LeaderboardPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [entries, setEntries] = useState([]);
  const [levels, setLevels] = useState([]);
  const [scope, setScope] = useState("all_time");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLevels() {
      try {
        const payload = await getLevels({ token: accessToken });
        if (!active) {
          return;
        }
        setLevels(payload);
      } catch (err) {
        if (active) {
          setError(toActionableError(err, "Unable to load level filters right now. Check the API connection and try again."));
        }
      }
    }

    loadLevels();
    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      setLoading(true);
      setError("");
      try {
        const payload = selectedLevelId
          ? await getLevelLeaderboard(selectedLevelId, scope, accessToken)
          : await getGlobalLeaderboard(scope, accessToken);
        if (!active) {
          return;
        }
        console.debug("leaderboard_loaded", {
          scope,
          levelId: selectedLevelId || "global",
          count: payload.entries.length
        });
        setEntries(payload.entries);
        setUserRank(payload.user_rank ?? null);
      } catch (err) {
        if (active) {
          setError(toActionableError(err, "Unable to load leaderboard standings right now. Check the API connection and try again."));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();
    return () => {
      active = false;
    };
  }, [accessToken, scope, selectedLevelId]);

  return (
    <section className="leaderboard-page-shell">
      <div className="section-head">
        <div className="section-stack">
          <p className="section-label">Rankings</p>
          <h1 className="section-title">{selectedLevelId ? "Level Leaderboard" : "Global Leaderboard"}</h1>
          <p className="section-subtitle">Switch between scope snapshots and per-level views without leaving the arena.</p>
        </div>
      </div>

      <div className="leaderboard-layout-modern">
        <article className="leaderboard-card-modern">
          <div className="leaderboard-header-modern">
            <div>
              <h2>Active Standings</h2>
              <p className="muted-text">Redis-backed snapshots with optional per-level focus.</p>
            </div>
            <div className="filter-row leaderboard-controls">
              <div className="scope-tabs" role="tablist" aria-label="Leaderboard scopes">
                {scopes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={scope === item.value}
                    className={scope === item.value ? "ghost-btn active" : "ghost-btn"}
                    onClick={() => setScope(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="select-field">
                <span className="label">Level Filter</span>
                <select value={selectedLevelId} onChange={(event) => setSelectedLevelId(event.target.value)}>
                  <option value="">All Levels</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {userRank ? (
            <div className="hero-stat-grid compact">
              <div className="hero-stat-card">
                <strong>{userRank.rank}</strong>
                <span>Your Rank</span>
              </div>
              <div className="hero-stat-card">
                <strong>{userRank.score}</strong>
                <span>Your Score</span>
              </div>
            </div>
          ) : null}

          {loading ? <PageFeedback>Loading leaderboard...</PageFeedback> : null}
          {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}
          {!loading && !entries.length ? (
            <div className="empty-state-card compact">
              <h3>No standings available yet</h3>
              <p>Validated submissions will appear here once this scope has recorded scores.</p>
            </div>
          ) : null}

          <div className="table-shell">
            {entries.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={`${entry.user_id}-${entry.rank}`}>
                      <td>#{entry.rank}</td>
                      <td>{entry.username}</td>
                      <td>{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </article>

        <aside className="season-card-modern">
          <div className="season-banner-modern">
            <strong>{selectedLevelId ? "LEVEL FOCUS" : "SEASON 3"}</strong>
            <span>{selectedLevelId ? "Scoped challenge view active" : "Ends in 6d 14h 22m"}</span>
          </div>
          <h2>{selectedLevelId ? "Level Focus" : "Season Rewards"}</h2>
          <div className="reward-stack">
            {selectedLevelId
              ? levels
                  .filter((level) => level.id === selectedLevelId)
                  .map((level) => (
                    <div key={level.id} className="reward-row-modern">
                      <span className="reward-rank-modern">Mode</span>
                      <span className="reward-copy-modern">{level.title}</span>
                      <strong>Difficulty {level.difficulty}</strong>
                    </div>
                  ))
              : [
                  ["#1", "👑", "Legend frame + exclusive seasonal badge", "10,000 XP"],
                  ["#2", "🥈", "Silver frame + 5000 XP boost", "5,000 XP"],
                  ["#3", "🥉", "Bronze badge + 2500 XP", "2,500 XP"],
                  ["Top 10", "⭐", "Elite border + spotlight", "1,000 XP"]
                ].map(([rank, icon, name, value]) => (
                  <div key={rank} className="reward-row-modern">
                    <span className="reward-rank-modern">{rank}</span>
                    <span className="reward-icon-modern">{icon}</span>
                    <span className="reward-copy-modern">{name}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

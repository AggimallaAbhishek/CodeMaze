import { useEffect, useState } from "react";

import { getGlobalLeaderboard, getLevelLeaderboard, getLevels } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

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
          setError(err.message);
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
          setError(err.message);
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
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>{selectedLevelId ? "Level Leaderboard" : "Global Leaderboard"}</h1>
          <p className="muted-text">Switch between scope snapshots and per-level rankings without leaving the page.</p>
        </div>
      </div>

      <div className="filter-row">
        <div className="scope-tabs" role="tablist" aria-label="Leaderboard scopes">
          {scopes.map((item) => (
            <button
              key={item.value}
              type="button"
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

      {userRank ? (
        <div className="score-strip compact">
          <div>
            <span className="label">Your Rank</span>
            <strong>{userRank.rank}</strong>
          </div>
          <div>
            <span className="label">Your Score</span>
            <strong>{userRank.score}</strong>
          </div>
        </div>
      ) : null}

      {loading ? <p>Loading leaderboard...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="table-shell">
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
                <td>{entry.rank}</td>
                <td>{entry.username}</td>
                <td>{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";

import { getGlobalLeaderboard } from "../lib/apiClient";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      try {
        const payload = await getGlobalLeaderboard("all_time");
        if (!active) {
          return;
        }
        console.debug("leaderboard_loaded", { count: payload.entries.length });
        setEntries(payload.entries);
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
  }, []);

  return (
    <section className="panel">
      <h1>Global Leaderboard</h1>
      <p className="muted-text">Top performers across all sorting challenges.</p>

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

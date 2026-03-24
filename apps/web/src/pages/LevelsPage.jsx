import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getLevels } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

export default function LevelsPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLevels() {
      try {
        const data = await getLevels({ gameType: "sorting", token: accessToken });
        if (!active) {
          return;
        }
        console.debug("levels_loaded", { count: data.length });
        setLevels(data);
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

    loadLevels();
    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Sorting Challenge Levels</h1>
          <p className="muted-text">Pick a level and optimize your move sequence.</p>
        </div>
        <Link className="ghost-btn" to="/leaderboard">
          View Leaderboard
        </Link>
      </div>

      {loading ? <p>Loading levels...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="level-grid">
        {levels.map((level) => (
          <article key={level.id} className="level-card">
            <h2>{level.title}</h2>
            <p>Difficulty: {level.difficulty}</p>
            <Link className="primary-btn" to={`/levels/${level.id}/sorting`}>
              Play Sorting
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

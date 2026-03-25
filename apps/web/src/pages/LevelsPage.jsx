import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getLevels } from "../lib/apiClient";
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

function levelRoute(level) {
  if (level.game_type === "sorting") {
    return `/levels/${level.id}/sorting`;
  }
  if (level.game_type === "pathfinding") {
    return `/levels/${level.id}/pathfinding`;
  }
  return null;
}

export default function LevelsPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLevels() {
      try {
        const data = await getLevels({ token: accessToken });
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
          <h1>Puzzle Levels</h1>
          <p className="muted-text">Pick a sorting or pathfinding challenge and optimize your strategy.</p>
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
            <p>Mode: {gameTypeLabel(level.game_type)}</p>
            <p>Difficulty: {level.difficulty}</p>
            {levelRoute(level) ? (
              <Link className="primary-btn" to={levelRoute(level)}>
                {level.game_type === "sorting" ? "Play Sorting" : "Play Maze"}
              </Link>
            ) : (
              <button type="button" className="ghost-btn" disabled>
                Coming Soon
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import PageFeedback from "../components/PageFeedback";
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
  if (level.game_type === "graph_traversal") {
    return `/levels/${level.id}/graph-traversal`;
  }
  return `/levels/${level.id}/sorting`;
}

function levelActionLabel(gameType) {
  if (gameType === "sorting") {
    return "Play Sorting";
  }
  if (gameType === "pathfinding") {
    return "Play Maze";
  }
  if (gameType === "graph_traversal") {
    return "Play Graph";
  }
  return "Play";
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
          <p className="muted-text">Pick a sorting, pathfinding, or graph traversal challenge and optimize your strategy.</p>
        </div>
        <Link className="ghost-btn" to="/leaderboard">
          View Leaderboard
        </Link>
      </div>

      {loading ? <PageFeedback>Loading levels...</PageFeedback> : null}
      {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

      <div className="level-grid">
        {levels.map((level) => (
          <article key={level.id} className="level-card">
            <h2>{level.title}</h2>
            <p>Mode: {gameTypeLabel(level.game_type)}</p>
            <p>Difficulty: {level.difficulty}</p>
            <Link className="primary-btn" to={levelRoute(level)}>
              {levelActionLabel(level.game_type)}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

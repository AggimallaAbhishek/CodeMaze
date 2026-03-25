import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ModeCard from "../components/ModeCard";
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

  const groupedLevels = useMemo(
    () => ({
      sorting: levels.filter((level) => level.game_type === "sorting"),
      pathfinding: levels.filter((level) => level.game_type === "pathfinding"),
      graph_traversal: levels.filter((level) => level.game_type === "graph_traversal")
    }),
    [levels]
  );

  const summary = useMemo(
    () => [
      { label: "Live Challenges", value: levels.length },
      { label: "Sorting Decks", value: groupedLevels.sorting.length },
      { label: "Maze Runs", value: groupedLevels.pathfinding.length },
      { label: "Graph Labs", value: groupedLevels.graph_traversal.length }
    ],
    [groupedLevels, levels.length]
  );

  return (
    <section className="challenge-page-shell">
      <div className="panel challenge-hero-panel">
        <div className="section-stack">
          <p className="section-label">Challenge Deck</p>
          <h1 className="section-title">
            Live <span className="neon-cyan">Game Modes</span>
          </h1>
          <p className="section-subtitle">
            Every card below routes into a real validated puzzle run. The template’s card language is now wired directly
            into the platform’s playable levels.
          </p>
        </div>
        <div className="hero-stat-grid compact">
          {summary.map((item) => (
            <div key={item.label} className="hero-stat-card">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-head level-page-head">
        <div>
          <h2>Playable Challenges</h2>
          <p className="muted-text">Pick a live arena, then move into the actual game page for server-validated scoring.</p>
        </div>
        <Link className="ghost-btn" to="/leaderboard">
          View Leaderboard
        </Link>
      </div>

      {loading ? <PageFeedback>Loading levels...</PageFeedback> : null}
      {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

      {Object.entries(groupedLevels).map(([gameType, items]) => (
        <section key={gameType} className="challenge-group">
          <div className="section-head compact-card-head">
            <div>
              <h3>{gameTypeLabel(gameType)}</h3>
              <p className="muted-text">
                {gameType === "sorting"
                  ? "Precision swaps, comparison tracking, and replayable validated submissions."
                  : gameType === "pathfinding"
                    ? "Contiguous route planning across weighted and unweighted maze layouts."
                    : "Canonical BFS and DFS order challenges with teaching cues."}
              </p>
            </div>
            <span className="pill subtle">{items.length} live</span>
          </div>

          <div className="modes-grid challenge-grid">
            {items.map((level) => (
              <ModeCard
                key={level.id}
                accent={gameType === "graph_traversal" ? "graph" : gameType}
                badge={`Difficulty ${level.difficulty}`}
                title={level.title}
                description={`${gameTypeLabel(level.game_type)} arena with verified scoring and full replay support.`}
                stats={[`Mode: ${gameTypeLabel(level.game_type)}`, `Deck position ${level.order_index}`]}
                actionLabel={levelActionLabel(level.game_type)}
                to={levelRoute(level)}
              />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

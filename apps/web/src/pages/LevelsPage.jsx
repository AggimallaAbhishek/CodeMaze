import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ModeCard from "../components/ModeCard";
import PageFeedback from "../components/PageFeedback";
import { getLevels } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { GAME_MODE_META, gameTypeActionLabel, gameTypeLabel } from "../utils/gameModes";
import { buildLevelCatalogData } from "../utils/levelCatalog";
import { toActionableError } from "../utils/errors";

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

export default function LevelsPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSpotlight, setActiveSpotlight] = useState("sorting");

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
          setError(toActionableError(err, "Unable to load challenge decks right now. Check the API connection and try again."));
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

  const catalog = useMemo(() => buildLevelCatalogData(levels), [levels]);
  const groupedLevels = catalog.groupedLevels;

  useEffect(() => {
    const selectedLane = catalog.spotlight.find((item) => item.key === activeSpotlight && item.count);
    if (!selectedLane) {
      setActiveSpotlight(catalog.defaultSpotlight);
    }
  }, [activeSpotlight, catalog.defaultSpotlight, catalog.spotlight]);

  const spotlight = catalog.spotlight.find((item) => item.key === activeSpotlight) ?? catalog.spotlight[0];

  return (
    <section className="challenge-page-shell levels-page-modern">
      <article className="levels-command-surface">
        <div className="levels-command-grid">
          <div className="levels-command-copy">
            <div className="hero-eyebrow">
              <span className="pulse-dot" aria-hidden="true" />
              Live validated challenge deck
            </div>

            <div className="section-stack">
              <p className="section-label">Challenge Deck</p>
              <h1 className="section-title levels-command-title">
                Choose the <span className="neon-cyan">Arena</span> That Matches Your Thinking.
              </h1>
              <p className="section-subtitle">
                Every lane below routes into a scored server-validated run. Use the spotlight panel to preview the live
                deck, then drop straight into the mode you want to sharpen.
              </p>
            </div>

            <div className="levels-mode-tabs" role="tablist" aria-label="Challenge mode spotlight">
              {catalog.spotlight.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={activeSpotlight === item.key}
                  className={`levels-mode-tab levels-mode-tab-${item.theme}${activeSpotlight === item.key ? " active" : ""}`}
                  disabled={!item.count}
                  onClick={() => setActiveSpotlight(item.key)}
                >
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              ))}
            </div>

            <div className="levels-summary-grid">
              {catalog.summary.map((item) => (
                <article key={item.label} className="levels-summary-card">
                  <span className="levels-summary-label">{item.label}</span>
                  <strong>{item.value}</strong>
                  <span className="levels-summary-detail">{item.detail}</span>
                </article>
              ))}
            </div>
          </div>

          <aside className={`levels-spotlight-card levels-spotlight-${spotlight.theme}`}>
            <div className="levels-spotlight-head">
              <div className="levels-spotlight-heading">
                <span className="levels-spotlight-icon" aria-hidden="true">
                  {spotlight.icon}
                </span>
                <div>
                  <p className="levels-spotlight-label">Mode spotlight</p>
                  <h2>{spotlight.label}</h2>
                </div>
              </div>
              <span className="pill subtle">{spotlight.count} live</span>
            </div>

            <p className="levels-spotlight-headline">{spotlight.headline}</p>
            <p className="muted-text">{spotlight.description}</p>

            <div className="levels-spotlight-metrics">
              <article className="levels-metric-card">
                <span>Featured Deck</span>
                <strong>{spotlight.featuredTitle}</strong>
              </article>
              <article className="levels-metric-card">
                <span>Difficulty Spread</span>
                <strong>{spotlight.difficultyLabel}</strong>
              </article>
              <article className="levels-metric-card">
                <span>Average Tier</span>
                <strong>{spotlight.averageDifficulty}</strong>
              </article>
            </div>

            <div className="levels-queue-panel">
              <div className="panel-title-row">
                <h3>Queue Preview</h3>
                <Link className="ghost-btn" to="/leaderboard">
                  Season Ladder
                </Link>
              </div>

              {spotlight.queue.length ? (
                <div className="levels-queue-list" role="list" aria-label={`${spotlight.label} queue preview`}>
                  {spotlight.queue.map((level) => (
                    <div key={level.id} className="levels-queue-row" role="listitem">
                      <div>
                        <strong>{level.title}</strong>
                        <span>Deck position {level.order_index}</span>
                      </div>
                      <span className="pill subtle">D{level.difficulty}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">{GAME_MODE_META[spotlight.key]?.emptyCopy}</p>
              )}
            </div>

            <div className="levels-spotlight-actions">
              {spotlight.primaryLevel ? (
                <Link className="btn-play levels-spotlight-cta" to={levelRoute(spotlight.primaryLevel)}>
                  {gameTypeActionLabel(spotlight.primaryLevel.game_type)}
                </Link>
              ) : (
                <span className="ghost-btn pseudo-disabled">Waiting For Seed</span>
              )}
              <Link className="ghost-btn" to="/profile">
                Open Dashboard
              </Link>
            </div>
          </aside>
        </div>
      </article>

      <div className="section-head level-page-head levels-page-head">
        <div>
          <h2>Playable Challenges</h2>
          <p className="muted-text">
            Pick a live arena, then move into the actual game page for server-validated scoring, replays, and
            progression credit.
          </p>
        </div>
        <div className="levels-page-actions">
          <Link className="ghost-btn" to="/leaderboard">
            View Leaderboard
          </Link>
          <Link className="ghost-btn" to="/profile">
            Player Hub
          </Link>
        </div>
      </div>

      {loading ? <PageFeedback>Loading levels...</PageFeedback> : null}
      {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}
      {!loading && !levels.length ? (
        <div className="empty-state-card">
          <h2>No challenges are seeded yet</h2>
          <p>Run the seed commands for sorting, pathfinding, and graph traversal levels, then reload this page.</p>
        </div>
      ) : null}

      {catalog.spotlight.map((lane) => {
        const items = groupedLevels[lane.key];

        return (
          <section key={lane.key} className={`challenge-group challenge-lane challenge-lane-${lane.theme}`}>
            <div className="challenge-lane-head">
              <div>
                <p className="challenge-lane-kicker">{lane.eyebrow}</p>
                <h2>{gameTypeLabel(lane.key)}</h2>
                <p className="muted-text">{lane.description}</p>
              </div>
              <div className="challenge-lane-meta">
                <span className="pill subtle">{items.length} live</span>
                <span className="challenge-meta-chip">{lane.difficultyLabel}</span>
                {lane.featuredLevel ? <span className="challenge-meta-chip">{lane.featuredLevel.title}</span> : null}
              </div>
            </div>

            <div className="modes-grid challenge-grid">
              {items.length ? (
                items.map((level) => (
                  <ModeCard
                    key={level.id}
                    accent={lane.accent}
                    badge={`Difficulty ${level.difficulty}`}
                    className="levels-mode-card"
                    description={`${gameTypeLabel(level.game_type)} arena with verified scoring, fast replay access, and progression credit on submit.`}
                    footerMeta={lane.headline}
                    icon={lane.icon}
                    stats={[`Mode: ${gameTypeLabel(level.game_type)}`, `Deck ${level.order_index}`]}
                    title={level.title}
                    actionLabel={gameTypeActionLabel(level.game_type)}
                    to={levelRoute(level)}
                  />
                ))
              ) : (
                <div className="empty-state-card compact">
                  <h3>No {gameTypeLabel(lane.key).toLowerCase()} levels available</h3>
                  <p>{lane.emptyCopy}</p>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </section>
  );
}

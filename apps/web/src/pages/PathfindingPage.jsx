import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import GameModeHeader from "../components/GameModeHeader";
import GameStatsGrid from "../components/GameStatsGrid";
import PageFeedback from "../components/PageFeedback";
import PathfindingGrid from "../components/PathfindingGrid";
import ResultOverlay from "../components/ResultOverlay";
import { getLevelById, requestLevelHint, startLevelSession, submitMoves } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { usePathfindingGameStore } from "../store/usePathfindingGameStore";
import { toActionableError } from "../utils/errors";
import { buildPathMoves, isSameCell } from "../utils/pathfinding";

export default function PathfindingPage() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const mergeProgressionSnapshot = useAuthStore((state) => state.mergeProgressionSnapshot);

  const {
    level,
    sessionId,
    expiresIn,
    pathCells,
    redoCells,
    elapsedSeconds,
    status,
    result,
    error,
    initializeLevel,
    setSession,
    appendCell,
    undoStep,
    redoStep,
    incrementTimer,
    applyResult,
    setError,
    resetPath
  } = usePathfindingGameStore();

  const [loadingLevel, setLoadingLevel] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showOptimalPath, setShowOptimalPath] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintMessage, setHintMessage] = useState("");
  const [hintPreview, setHintPreview] = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      navigate("/login", { replace: true });
    }
  }, [accessToken, navigate]);

  useEffect(() => {
    let active = true;

    async function loadLevelAndStartSession() {
      setLoadingLevel(true);
      try {
        const loadedLevel = await getLevelById(levelId, accessToken);
        if (!active) {
          return;
        }
        if (loadedLevel.game_type !== "pathfinding") {
          setError("Selected level is not a pathfinding maze.");
          return;
        }
        console.debug("pathfinding_level_loaded", { levelId: loadedLevel.id });
        initializeLevel(loadedLevel);

        const session = await startLevelSession(loadedLevel.id, accessToken);
        if (!active) {
          return;
        }
        setSession({ sessionId: session.session_id, expiresIn: session.expires_in });
      } catch (err) {
        if (active) {
          setError(toActionableError(err, "Unable to load this maze right now. Check the API connection and try again."));
        }
      } finally {
        if (active) {
          setLoadingLevel(false);
        }
      }
    }

    loadLevelAndStartSession();
    return () => {
      active = false;
    };
  }, [accessToken, initializeLevel, levelId, setError, setSession]);

  useEffect(() => {
    if (status !== "playing") {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      incrementTimer();
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [incrementTimer, status]);

  const endCell = level?.config?.end ?? [0, 0];
  const reachedGoal = isSameCell(pathCells[pathCells.length - 1], endCell);
  const modeLabel = level?.config?.weighted ? "Dijkstra (weighted)" : "BFS (unweighted)";
  const roundStats = useMemo(
    () => [
      { label: "Path Cells", value: pathCells.length },
      { label: "Timer", value: `${elapsedSeconds}s` },
      { label: "Session TTL", value: `${expiresIn}s` },
      { label: "Hints Used", value: hintsUsed },
      { label: "Goal Reached?", value: reachedGoal ? "Yes" : "No" }
    ],
    [elapsedSeconds, expiresIn, hintsUsed, pathCells.length, reachedGoal]
  );

  const optimalPathCells = useMemo(() => {
    if (!showOptimalPath) {
      return [];
    }
    return (result?.optimal_moves ?? [])
      .map((move) => move.cell)
      .filter((cell) => Array.isArray(cell) && cell.length === 2);
  }, [result, showOptimalPath]);

  async function handleSubmit() {
    if (!sessionId || !level) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const submission = await submitMoves(
        {
          session_id: sessionId,
          level_id: level.id,
          moves: buildPathMoves(pathCells),
          hints_used: hintsUsed,
          time_elapsed: elapsedSeconds
        },
        accessToken
      );
      applyResult(submission);
      mergeProgressionSnapshot({
        totalXp: submission.total_xp,
        progression: submission.progression,
        awardedBadges: submission.awarded_badges
      });
    } catch (err) {
      setError(toActionableError(err, "Unable to submit this maze route right now. Try again in a moment."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHint() {
    if (!sessionId || !level) {
      return;
    }

    setLoadingHint(true);
    setError("");

    try {
      const hint = await requestLevelHint(
        level.id,
        {
          session_id: sessionId,
          moves: buildPathMoves(pathCells)
        },
        accessToken
      );
      setHintMessage(hint.message);
      setHintPreview(hint.preview_move);
      setHintsUsed(hint.hints_used_total ?? 0);
    } catch (err) {
      setError(toActionableError(err, "Hint service is temporarily unavailable for this maze."));
    } finally {
      setLoadingHint(false);
    }
  }

  function handleResetPath() {
    resetPath();
    setHintMessage("");
    setHintPreview(null);
    setHintsUsed(0);
    setShowOptimalPath(false);
  }

  if (loadingLevel) {
    return <PageFeedback panel>Loading pathfinding level...</PageFeedback>;
  }

  return (
    <section className="gameplay-shell pathfinding-mode">
      <GameModeHeader
        tag="Pathfinding Maze"
        title={level?.title ?? "Maze Challenge"}
        subtitle="Draw a contiguous route from start to end and compare your run against the canonical shortest path."
        modeValue={modeLabel}
      />

      <GameStatsGrid stats={roundStats} />

      <article className="gameplay-board-card">
        <PathfindingGrid
          grid={level?.config?.grid ?? []}
          weights={level?.config?.weights ?? []}
          pathCells={pathCells}
          optimalPathCells={optimalPathCells}
          hintCell={hintPreview?.cell ?? null}
          start={level?.config?.start ?? [0, 0]}
          end={level?.config?.end ?? [0, 0]}
          weighted={Boolean(level?.config?.weighted)}
          onSelectCell={appendCell}
          disabled={status !== "playing"}
        />
      </article>

      <div className="gameplay-message-stack">
        <p className="muted-text gameplay-note">
          Click adjacent open cells to draw a route from <strong>S</strong> to <strong>E</strong>. You can undo/redo
          before submitting.
        </p>
        {hintMessage ? <p className="muted-text hint-copy">{hintMessage}</p> : null}
        {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}
      </div>

      <div className="action-row gameplay-actions">
        <button type="button" className="ghost-btn" onClick={undoStep} disabled={status !== "playing" || pathCells.length <= 1}>
          Undo
        </button>
        <button type="button" className="ghost-btn" onClick={redoStep} disabled={status !== "playing" || !redoCells.length}>
          Redo
        </button>
        <button type="button" className="ghost-btn" onClick={handleResetPath} disabled={status !== "playing"}>
          Reset Path
        </button>
        <button type="button" className="ghost-btn" onClick={handleHint} disabled={loadingHint || status !== "playing"}>
          {loadingHint ? "Loading Hint..." : "Use Hint (-10)"}
        </button>
        <button type="button" className="primary-btn" disabled={submitting || status !== "playing" || pathCells.length <= 1} onClick={handleSubmit}>
          {submitting ? "Submitting..." : "Submit Path"}
        </button>
        {result?.optimal_moves?.length ? (
          <button type="button" className="ghost-btn" onClick={() => setShowOptimalPath((value) => !value)}>
            {showOptimalPath ? "Hide Optimal Path" : "Show Optimal Path"}
          </button>
        ) : null}
      </div>

      <ResultOverlay result={result} replayHref={result?.submission_id ? `/replay/${result.submission_id}` : ""} />
    </section>
  );
}

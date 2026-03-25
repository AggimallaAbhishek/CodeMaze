import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import PathfindingGrid from "../components/PathfindingGrid";
import ResultOverlay from "../components/ResultOverlay";
import { getLevelById, requestLevelHint, startLevelSession, submitMoves } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { usePathfindingGameStore } from "../store/usePathfindingGameStore";
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
          setError(err.message);
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
      setError(err.message);
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
      setError(err.message);
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
    return <section className="panel">Loading pathfinding level...</section>;
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>{level?.title ?? "Maze Challenge"}</h1>
          <p className="muted-text">
            Mode: <strong>{modeLabel}</strong>
          </p>
        </div>
        <Link className="ghost-btn" to="/levels">
          Back to Levels
        </Link>
      </div>

      <div className="score-strip">
        <div>
          <span className="label">Path Cells</span>
          <strong>{pathCells.length}</strong>
        </div>
        <div>
          <span className="label">Timer</span>
          <strong>{elapsedSeconds}s</strong>
        </div>
        <div>
          <span className="label">Session TTL</span>
          <strong>{expiresIn}s</strong>
        </div>
        <div>
          <span className="label">Hints Used</span>
          <strong>{hintsUsed}</strong>
        </div>
        <div>
          <span className="label">Goal Reached?</span>
          <strong>{reachedGoal ? "Yes" : "No"}</strong>
        </div>
      </div>

      <p className="muted-text">
        Click adjacent open cells to draw a route from <strong>S</strong> to <strong>E</strong>. You can undo/redo
        before submitting.
      </p>

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

      {hintMessage ? <p className="muted-text hint-copy">{hintMessage}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="action-row">
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

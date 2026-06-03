import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DpBoard from "../components/DpBoard";
import GameModeHeader from "../components/GameModeHeader";
import GameStatsGrid from "../components/GameStatsGrid";
import PageFeedback from "../components/PageFeedback";
import ResultOverlay from "../components/ResultOverlay";
import { getLevelById, requestLevelHint, startLevelSession, submitMoves } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { useDynamicProgrammingGameStore } from "../store/useDynamicProgrammingGameStore";
import { buildDpMoves } from "../utils/dp";
import { toActionableError } from "../utils/errors";

function computeBaseCases(config) {
  const problemType = config?.problem_type ?? "";
  const baseCases = [];

  if (problemType === "fibonacci") {
    baseCases.push({ row: 0, col: 0, value: 0 });
    if ((config.n ?? 0) >= 1) {
      baseCases.push({ row: 0, col: 1, value: 1 });
    }
  } else if (problemType === "coin_change") {
    baseCases.push({ row: 0, col: 0, value: 0 });
  } else if (problemType === "knapsack") {
    const numItems = (config.weights?.length ?? 0) + 1;
    const capacity = (config.capacity ?? 0) + 1;
    for (let col = 0; col < capacity; col++) {
      baseCases.push({ row: 0, col, value: 0 });
    }
    for (let row = 1; row < numItems; row++) {
      baseCases.push({ row, col: 0, value: 0 });
    }
  } else if (problemType === "grid_traveler") {
    const numRows = config.rows ?? 1;
    const numCols = config.cols ?? 1;
    for (let col = 0; col < numCols; col++) {
      baseCases.push({ row: 0, col, value: 1 });
    }
    for (let row = 1; row < numRows; row++) {
      baseCases.push({ row, col: 0, value: 1 });
    }
  }

  return baseCases;
}

export default function DynamicProgrammingPage() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const mergeProgressionSnapshot = useAuthStore((state) => state.mergeProgressionSnapshot);

  const {
    level,
    sessionId,
    expiresIn,
    filledCells,
    redoCells,
    baseCases,
    tableRows,
    tableCols,
    problemType,
    elapsedSeconds,
    status,
    result,
    error,
    initializeLevel,
    setSession,
    setBaseCases,
    fillCell,
    undoStep,
    redoStep,
    incrementTimer,
    applyResult,
    setError,
    resetTable
  } = useDynamicProgrammingGameStore();

  const [loadingLevel, setLoadingLevel] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        if (loadedLevel.game_type !== "dynamic_programming") {
          setError("Selected level is not a dynamic programming puzzle.");
          return;
        }
        console.debug("dp_level_loaded", { levelId: loadedLevel.id });
        initializeLevel(loadedLevel);

        const levelBaseCases = computeBaseCases(loadedLevel.config);
        setBaseCases(levelBaseCases);

        const session = await startLevelSession(loadedLevel.id, accessToken);
        if (!active) {
          return;
        }
        setSession({ sessionId: session.session_id, expiresIn: session.expires_in });
      } catch (err) {
        if (active) {
          setError(toActionableError(err, "Unable to load this DP puzzle right now. Check the API connection and try again."));
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
  }, [accessToken, initializeLevel, levelId, setBaseCases, setError, setSession]);

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

  const totalCells = tableRows * tableCols;
  const cellsFilled = filledCells.length + baseCases.length;

  const roundStats = useMemo(
    () => [
      { label: "Cells Filled", value: filledCells.length },
      { label: "Timer", value: `${elapsedSeconds}s` },
      { label: "Session TTL", value: `${expiresIn}s` },
      { label: "Hints Used", value: hintsUsed },
      { label: "Target Steps", value: totalCells - baseCases.length }
    ],
    [baseCases.length, elapsedSeconds, expiresIn, filledCells.length, hintsUsed, totalCells]
  );

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
          moves: buildDpMoves(filledCells),
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
      setError(toActionableError(err, "Unable to submit this solution right now. Try again in a moment."));
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
          moves: buildDpMoves(filledCells)
        },
        accessToken
      );
      setHintMessage(hint.message);
      setHintPreview(hint.preview_move);
      setHintsUsed(hint.hints_used_total ?? 0);
    } catch (err) {
      setError(toActionableError(err, "Hint service is temporarily unavailable for this DP puzzle."));
    } finally {
      setLoadingHint(false);
    }
  }

  function handleResetTable() {
    resetTable();
    setHintMessage("");
    setHintPreview(null);
    setHintsUsed(0);
  }

  if (loadingLevel) {
    return <PageFeedback panel>Loading dynamic programming level...</PageFeedback>;
  }

  return (
    <section className="gameplay-shell dp-mode">
      <GameModeHeader
        tag="Optimization Lab"
        title={level?.title ?? "Dynamic Programming Challenge"}
        subtitle="Fill the DP table cell by cell, building optimal substructure solutions with step-validated scoring."
        modeValue={problemType.replace(/_/g, " ").toUpperCase()}
      />

      <GameStatsGrid stats={roundStats} />

      <div className="teaching-panel gameplay-teaching-panel">
        <div>
          <span className="label">Problem Type</span>
          <p>{problemType.replace(/_/g, " ") || "Unknown"}</p>
        </div>
        <div>
          <span className="label">Table Dimensions</span>
          <p>{tableRows} × {tableCols}</p>
        </div>
        <div>
          <span className="label">Cells Filled / Total</span>
          <p>{cellsFilled} / {totalCells}</p>
        </div>
      </div>

      <article className="gameplay-board-card">
        <DpBoard
          rows={tableRows}
          cols={tableCols}
          baseCases={baseCases}
          filledCells={filledCells}
          problemType={problemType}
          config={level?.config ?? {}}
          onFillCell={fillCell}
          disabled={status !== "playing"}
          hintCell={hintPreview ?? null}
        />
      </article>

      <div className="gameplay-message-stack">
        <p className="muted-text gameplay-note">Fill each cell in dependency order to maximize score and stars.</p>
        {hintMessage ? <p className="muted-text hint-copy">{hintMessage}</p> : null}
        {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}
      </div>

      <div className="action-row gameplay-actions">
        <button type="button" className="ghost-btn" onClick={undoStep} disabled={status !== "playing" || filledCells.length === 0}>
          Undo
        </button>
        <button type="button" className="ghost-btn" onClick={redoStep} disabled={status !== "playing" || !redoCells.length}>
          Redo
        </button>
        <button type="button" className="ghost-btn" onClick={handleResetTable} disabled={status !== "playing"}>
          Reset Table
        </button>
        <button type="button" className="ghost-btn" onClick={handleHint} disabled={loadingHint || status !== "playing"}>
          {loadingHint ? "Loading Hint..." : "Use Hint (-10)"}
        </button>
        <button type="button" className="primary-btn" disabled={submitting || status !== "playing" || filledCells.length === 0} onClick={handleSubmit}>
          {submitting ? "Submitting..." : "Submit Solution"}
        </button>
      </div>

      <ResultOverlay result={result} replayHref={result?.submission_id ? `/replay/${result.submission_id}` : ""} />
    </section>
  );
}

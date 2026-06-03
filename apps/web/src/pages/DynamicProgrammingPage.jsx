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
import { buildDpMoves, computeBaseCases } from "../utils/dp";
import { toActionableError } from "../utils/errors";

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
        if (!active) return;
        if (loadedLevel.game_type !== "dynamic_programming") {
          setError("Selected level is not a dynamic programming puzzle.");
          return;
        }
        console.debug("dp_level_loaded", { levelId: loadedLevel.id });
        initializeLevel(loadedLevel);
        const computedBaseCases = computeBaseCases(loadedLevel.config ?? {});
        setBaseCases(computedBaseCases);

        const session = await startLevelSession(loadedLevel.id, accessToken);
        if (!active) return;
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
    if (status !== "playing") return undefined;
    const timerId = window.setInterval(() => incrementTimer(), 1000);
    return () => window.clearInterval(timerId);
  }, [incrementTimer, status]);

  const targetSteps = (tableRows * tableCols) - baseCases.length;

  const roundStats = useMemo(
    () => [
      { label: "Cells Filled", value: filledCells.length },
      { label: "Timer", value: `${elapsedSeconds}s` },
      { label: "Session TTL", value: `${expiresIn}s` },
      { label: "Hints Used", value: hintsUsed },
      { label: "Target Steps", value: targetSteps }
    ],
    [elapsedSeconds, expiresIn, filledCells.length, hintsUsed, targetSteps]
  );

  async function handleSubmit() {
    if (!sessionId || !level) return;
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
      setError(toActionableError(err, "Unable to submit this DP table right now. Try again in a moment."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHint() {
    if (!sessionId || !level) return;
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
    return <PageFeedback panel>Loading DP level...</PageFeedback>;
  }

  return (
    <section className="gameplay-shell dp-mode">
      <GameModeHeader
        tag="Optimization Lab"
        title={level?.title ?? "DP Challenge"}
        subtitle="Fill the dynamic programming table step by step, using optimal subproblems to construct the final solution."
        modeValue={problemType ? problemType.replace("_", " ").toUpperCase() : "DP"}
      />

      <GameStatsGrid stats={roundStats} />

      <div className="teaching-panel gameplay-teaching-panel">
        <div>
          <span className="label">Problem Type</span>
          <p>{problemType ? problemType.replace("_", " ") : "Unknown"}</p>
        </div>
        <div>
          <span className="label">Table Dimensions</span>
          <p>{tableRows} rows x {tableCols} cols</p>
        </div>
        <div>
          <span className="label">Progress</span>
          <p>{filledCells.length} / {targetSteps} cells filled</p>
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
          hintCell={hintPreview}
        />
      </article>

      <div className="gameplay-message-stack">
        <p className="muted-text gameplay-note">Hover over empty cells to see their dependencies based on the recurrence relation.</p>
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
        <button type="button" className="primary-btn" disabled={submitting || status !== "playing"} onClick={handleSubmit}>
          {submitting ? "Submitting..." : "Submit Table"}
        </button>
      </div>

      <ResultOverlay result={result} replayHref={result?.submission_id ? `/replay/${result.submission_id}` : ""} />
    </section>
  );
}

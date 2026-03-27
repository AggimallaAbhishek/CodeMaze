import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import GameModeHeader from "../components/GameModeHeader";
import GameStatsGrid from "../components/GameStatsGrid";
import PageFeedback from "../components/PageFeedback";
import ResultOverlay from "../components/ResultOverlay";
import SortingCanvas from "../components/SortingCanvas";
import { getLevelById, requestLevelHint, startLevelSession, submitMoves } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { useSortingGameStore } from "../store/useSortingGameStore";
import { toActionableError } from "../utils/errors";
import { isSorted } from "../utils/sorting";

export default function SortingPage() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const mergeProgressionSnapshot = useAuthStore((state) => state.mergeProgressionSnapshot);

  const {
    level,
    sessionId,
    expiresIn,
    workingArray,
    moves,
    selectedIndex,
    elapsedSeconds,
    status,
    result,
    error,
    initializeLevel,
    setSession,
    selectBar,
    incrementTimer,
    applyResult,
    setError,
    resetToInitialArray
  } = useSortingGameStore();

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
        console.debug("sorting_level_loaded", { levelId: loadedLevel.id });
        initializeLevel(loadedLevel);

        const session = await startLevelSession(loadedLevel.id, accessToken);
        if (!active) {
          return;
        }
        setSession({ sessionId: session.session_id, expiresIn: session.expires_in });
      } catch (err) {
        if (active) {
          setError(toActionableError(err, "Unable to load this sorting level right now. Check the API connection and try again."));
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

  const solvedLocally = useMemo(() => isSorted(workingArray), [workingArray]);
  const roundStats = useMemo(
    () => [
      { label: "Moves", value: moves.length },
      { label: "Timer", value: `${elapsedSeconds}s` },
      { label: "Session TTL", value: `${expiresIn}s` },
      { label: "Hints Used", value: hintsUsed },
      { label: "Sorted?", value: solvedLocally ? "Yes" : "No" }
    ],
    [elapsedSeconds, expiresIn, hintsUsed, moves.length, solvedLocally]
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
          moves,
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
      setError(toActionableError(err, "Unable to submit this sorting run right now. Try again in a moment."));
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
          moves
        },
        accessToken
      );
      setHintMessage(hint.message);
      setHintPreview(hint.preview_move);
      setHintsUsed(hint.hints_used_total ?? 0);
    } catch (err) {
      setError(toActionableError(err, "Hint service is temporarily unavailable for this sorting level."));
    } finally {
      setLoadingHint(false);
    }
  }

  function handleResetRound() {
    resetToInitialArray();
    setHintMessage("");
    setHintPreview(null);
    setHintsUsed(0);
  }

  if (loadingLevel) {
    return <PageFeedback panel>Loading sorting level...</PageFeedback>;
  }

  return (
    <section className="gameplay-shell sorting-mode">
      <GameModeHeader
        tag="Sorting Arena"
        title={level?.title ?? "Sorting Challenge"}
        subtitle="Swap bars to reconstruct sorted order, then submit the move log for server-side scoring and replay."
        modeLabel="Algorithm"
        modeValue={level?.config?.algorithm ?? "selection"}
      />

      <GameStatsGrid stats={roundStats} />

      <article className="gameplay-board-card">
        <SortingCanvas
          values={workingArray}
          selectedIndex={selectedIndex}
          hintIndices={hintPreview?.indices ?? []}
          onSelectBar={selectBar}
          disabled={status !== "playing"}
        />
      </article>

      <div className="gameplay-message-stack">
        <p className="muted-text gameplay-note">Select two bar positions to perform each swap in the arena controls.</p>
        {hintMessage ? <p className="muted-text hint-copy">{hintMessage}</p> : null}
        {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}
      </div>

      <div className="action-row gameplay-actions">
        <button type="button" className="ghost-btn" disabled={loadingHint || status !== "playing"} onClick={handleHint}>
          {loadingHint ? "Loading Hint..." : "Use Hint (-10)"}
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={submitting || status !== "playing" || !moves.length}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : "Submit Moves"}
        </button>
        <button type="button" className="ghost-btn" onClick={handleResetRound} disabled={status !== "playing"}>
          Reset Round
        </button>
      </div>

      <ResultOverlay result={result} replayHref={result?.submission_id ? `/replay/${result.submission_id}` : ""} />
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import PageFeedback from "../components/PageFeedback";
import ResultOverlay from "../components/ResultOverlay";
import SortingCanvas from "../components/SortingCanvas";
import { getLevelById, requestLevelHint, startLevelSession, submitMoves } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { useSortingGameStore } from "../store/useSortingGameStore";
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

  const solvedLocally = useMemo(() => isSorted(workingArray), [workingArray]);

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
          moves
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
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>{level?.title ?? "Sorting Challenge"}</h1>
          <p className="muted-text">
            Algorithm: <strong>{level?.config?.algorithm ?? "selection"}</strong>
          </p>
        </div>
        <Link className="ghost-btn" to="/levels">
          Back to Levels
        </Link>
      </div>

      <div className="score-strip">
        <div>
          <span className="label">Moves</span>
          <strong>{moves.length}</strong>
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
          <span className="label">Sorted?</span>
          <strong>{solvedLocally ? "Yes" : "No"}</strong>
        </div>
      </div>

      <SortingCanvas
        values={workingArray}
        selectedIndex={selectedIndex}
        hintIndices={hintPreview?.indices ?? []}
        onSelectBar={selectBar}
        disabled={status !== "playing"}
      />

      {hintMessage ? <p className="muted-text hint-copy">{hintMessage}</p> : null}
      {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

      <div className="action-row">
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

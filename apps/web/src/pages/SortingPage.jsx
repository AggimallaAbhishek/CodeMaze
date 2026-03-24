import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ResultOverlay from "../components/ResultOverlay";
import SortingCanvas from "../components/SortingCanvas";
import { getLevelById, startLevelSession, submitMoves } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { useSortingGameStore } from "../store/useSortingGameStore";
import { isSorted } from "../utils/sorting";

export default function SortingPage() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);

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
          hints_used: 0,
          time_elapsed: elapsedSeconds
        },
        accessToken
      );
      applyResult(submission);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingLevel) {
    return <section className="panel">Loading sorting level...</section>;
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
          <span className="label">Sorted?</span>
          <strong>{solvedLocally ? "Yes" : "No"}</strong>
        </div>
      </div>

      <SortingCanvas
        values={workingArray}
        selectedIndex={selectedIndex}
        onSelectBar={selectBar}
        disabled={status !== "playing"}
      />

      {error ? <p className="error-text">{error}</p> : null}

      <div className="action-row">
        <button
          type="button"
          className="primary-btn"
          disabled={submitting || status !== "playing" || !moves.length}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : "Submit Moves"}
        </button>
        <button type="button" className="ghost-btn" onClick={resetToInitialArray} disabled={status !== "playing"}>
          Reset Round
        </button>
      </div>

      <ResultOverlay result={result} />
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import GraphTraversalBoard from "../components/GraphTraversalBoard";
import PageFeedback from "../components/PageFeedback";
import ResultOverlay from "../components/ResultOverlay";
import { getLevelById, requestLevelHint, startLevelSession, submitMoves } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { useGraphTraversalGameStore } from "../store/useGraphTraversalGameStore";
import { buildGraphMoves, canonicalTraversal, traversalTeachingState } from "../utils/graph";

export default function GraphTraversalPage() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const mergeProgressionSnapshot = useAuthStore((state) => state.mergeProgressionSnapshot);

  const {
    level,
    sessionId,
    expiresIn,
    visitedNodes,
    redoNodes,
    elapsedSeconds,
    status,
    result,
    error,
    initializeLevel,
    setSession,
    visitNode,
    undoStep,
    redoStep,
    incrementTimer,
    applyResult,
    setError,
    resetTraversal
  } = useGraphTraversalGameStore();

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
        if (loadedLevel.game_type !== "graph_traversal") {
          setError("Selected level is not a graph traversal puzzle.");
          return;
        }
        console.debug("graph_level_loaded", { levelId: loadedLevel.id });
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

  const adjacency = useMemo(() => level?.config?.adjacency ?? {}, [level]);
  const mode = level?.config?.mode ?? "bfs";
  const startNode = level?.config?.start ?? "";
  const canonicalOrder = useMemo(() => canonicalTraversal(adjacency, startNode, mode), [adjacency, mode, startNode]);
  const teaching = useMemo(
    () => traversalTeachingState(adjacency, startNode, mode, visitedNodes.length),
    [adjacency, startNode, mode, visitedNodes.length]
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
          moves: buildGraphMoves(visitedNodes),
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
          moves: buildGraphMoves(visitedNodes)
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

  function handleResetTraversal() {
    resetTraversal();
    setHintMessage("");
    setHintPreview(null);
    setHintsUsed(0);
  }

  if (loadingLevel) {
    return <PageFeedback panel>Loading graph traversal level...</PageFeedback>;
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>{level?.title ?? "Graph Traversal Challenge"}</h1>
          <p className="muted-text">
            Mode: <strong>{mode.toUpperCase()}</strong>
          </p>
        </div>
        <Link className="ghost-btn" to="/levels">
          Back to Levels
        </Link>
      </div>

      <div className="score-strip">
        <div>
          <span className="label">Visited Nodes</span>
          <strong>{visitedNodes.length}</strong>
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
          <span className="label">Target Steps</span>
          <strong>{canonicalOrder.length}</strong>
        </div>
      </div>

      <div className="teaching-panel">
        <div>
          <span className="label">{teaching.containerType === "queue" ? "Queue Preview" : "Stack Preview"}</span>
          <p>{teaching.container.length ? teaching.container.join(" -> ") : "Empty"}</p>
        </div>
        <div>
          <span className="label">Next Expected Node</span>
          <p>{teaching.nextExpected ?? "Done"}</p>
        </div>
        <div>
          <span className="label">Traversal So Far</span>
          <p>{visitedNodes.join(" -> ")}</p>
        </div>
      </div>

      <GraphTraversalBoard
        adjacency={adjacency}
        positions={level?.config?.positions ?? {}}
        visitedNodes={visitedNodes}
        startNode={startNode}
        nextExpected={teaching.nextExpected}
        hintNode={hintPreview?.node ?? null}
        onVisitNode={visitNode}
        disabled={status !== "playing"}
      />

      {hintMessage ? <p className="muted-text hint-copy">{hintMessage}</p> : null}
      {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

      <div className="action-row">
        <button type="button" className="ghost-btn" onClick={undoStep} disabled={status !== "playing" || visitedNodes.length <= 1}>
          Undo
        </button>
        <button type="button" className="ghost-btn" onClick={redoStep} disabled={status !== "playing" || !redoNodes.length}>
          Redo
        </button>
        <button type="button" className="ghost-btn" onClick={handleResetTraversal} disabled={status !== "playing"}>
          Reset Traversal
        </button>
        <button type="button" className="ghost-btn" onClick={handleHint} disabled={loadingHint || status !== "playing"}>
          {loadingHint ? "Loading Hint..." : "Use Hint (-10)"}
        </button>
        <button type="button" className="primary-btn" disabled={submitting || status !== "playing" || visitedNodes.length <= 1} onClick={handleSubmit}>
          {submitting ? "Submitting..." : "Submit Traversal"}
        </button>
      </div>

      <ResultOverlay result={result} replayHref={result?.submission_id ? `/replay/${result.submission_id}` : ""} />
    </section>
  );
}

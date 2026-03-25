import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import GraphTraversalBoard from "../components/GraphTraversalBoard";
import ResultOverlay from "../components/ResultOverlay";
import { getLevelById, startLevelSession, submitMoves } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { useGraphTraversalGameStore } from "../store/useGraphTraversalGameStore";
import { buildGraphMoves, canonicalTraversal, traversalTeachingState } from "../utils/graph";

export default function GraphTraversalPage() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);

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
    return <section className="panel">Loading graph traversal level...</section>;
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
        onVisitNode={visitNode}
        disabled={status !== "playing"}
      />

      {error ? <p className="error-text">{error}</p> : null}

      <div className="action-row">
        <button type="button" className="ghost-btn" onClick={undoStep} disabled={status !== "playing" || visitedNodes.length <= 1}>
          Undo
        </button>
        <button type="button" className="ghost-btn" onClick={redoStep} disabled={status !== "playing" || !redoNodes.length}>
          Redo
        </button>
        <button type="button" className="ghost-btn" onClick={resetTraversal} disabled={status !== "playing"}>
          Reset Traversal
        </button>
        <button type="button" className="primary-btn" disabled={submitting || status !== "playing" || visitedNodes.length <= 1} onClick={handleSubmit}>
          {submitting ? "Submitting..." : "Submit Traversal"}
        </button>
      </div>

      <ResultOverlay result={result} />
    </section>
  );
}

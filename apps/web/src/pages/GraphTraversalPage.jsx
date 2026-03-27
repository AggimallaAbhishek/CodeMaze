import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import GameModeHeader from "../components/GameModeHeader";
import GameStatsGrid from "../components/GameStatsGrid";
import GraphTraversalBoard from "../components/GraphTraversalBoard";
import PageFeedback from "../components/PageFeedback";
import ResultOverlay from "../components/ResultOverlay";
import { getLevelById, requestLevelHint, startLevelSession, submitMoves } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { useGraphTraversalGameStore } from "../store/useGraphTraversalGameStore";
import { toActionableError } from "../utils/errors";
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
          setError(toActionableError(err, "Unable to load this graph puzzle right now. Check the API connection and try again."));
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
  const roundStats = useMemo(
    () => [
      { label: "Visited Nodes", value: visitedNodes.length },
      { label: "Timer", value: `${elapsedSeconds}s` },
      { label: "Session TTL", value: `${expiresIn}s` },
      { label: "Hints Used", value: hintsUsed },
      { label: "Target Steps", value: canonicalOrder.length }
    ],
    [canonicalOrder.length, elapsedSeconds, expiresIn, hintsUsed, visitedNodes.length]
  );
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
      setError(toActionableError(err, "Unable to submit this traversal right now. Try again in a moment."));
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
      setError(toActionableError(err, "Hint service is temporarily unavailable for this graph puzzle."));
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
    <section className="gameplay-shell graph-mode">
      <GameModeHeader
        tag="Traversal Lab"
        title={level?.title ?? "Graph Traversal Challenge"}
        subtitle="Follow canonical BFS or DFS visitation order while monitoring queue or stack behavior in real time."
        modeValue={mode.toUpperCase()}
      />

      <GameStatsGrid stats={roundStats} />

      <div className="teaching-panel gameplay-teaching-panel">
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

      <article className="gameplay-board-card">
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
      </article>

      <div className="gameplay-message-stack">
        <p className="muted-text gameplay-note">Follow the expected frontier order to maximize score and stars.</p>
        {hintMessage ? <p className="muted-text hint-copy">{hintMessage}</p> : null}
        {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}
      </div>

      <div className="action-row gameplay-actions">
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

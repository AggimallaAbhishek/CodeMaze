import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getSubmissionReplay } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { buildReplayRows } from "../utils/replay";

function gameTypeLabel(gameType) {
  if (gameType === "sorting") {
    return "Sorting";
  }
  if (gameType === "pathfinding") {
    return "Pathfinding";
  }
  if (gameType === "graph_traversal") {
    return "Graph Traversal";
  }
  return gameType;
}

export default function ReplayPage() {
  const { submissionId } = useParams();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReplay() {
      try {
        const payload = await getSubmissionReplay(submissionId, accessToken);
        if (!active) {
          return;
        }
        console.debug("replay_loaded", {
          submissionId: payload.id,
          moves: payload.moves?.length ?? 0
        });
        setReplay(payload);
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReplay();
    return () => {
      active = false;
    };
  }, [accessToken, submissionId]);

  const rows = useMemo(
    () => buildReplayRows(replay?.moves ?? [], replay?.optimal_moves ?? [], replay?.diff ?? []),
    [replay]
  );

  if (loading) {
    return <section className="panel">Loading replay...</section>;
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>{replay?.level?.title ?? "Submission Replay"}</h1>
          <p className="muted-text">
            Compare your move log against the canonical solution for{" "}
            <strong>{gameTypeLabel(replay?.level?.game_type)}</strong>.
          </p>
        </div>
        <div className="action-row">
          <Link className="ghost-btn" to="/profile">
            Profile
          </Link>
          <Link className="ghost-btn" to="/levels">
            Levels
          </Link>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {replay ? (
        <>
          <div className="score-strip">
            <div>
              <span className="label">Score</span>
              <strong>{replay.score}</strong>
            </div>
            <div>
              <span className="label">Stars</span>
              <strong>{replay.stars}</strong>
            </div>
            <div>
              <span className="label">Hints Used</span>
              <strong>{replay.hints_used}</strong>
            </div>
            <div>
              <span className="label">Time</span>
              <strong>{replay.time_elapsed}s</strong>
            </div>
          </div>

          <div className="table-shell replay-shell">
            <table>
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Your Move</th>
                  <th>Optimal Move</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`replay-step-${row.step}`} className={row.status === "match" ? "replay-match" : "replay-mismatch"}>
                    <td>{row.step}</td>
                    <td>{row.userLabel}</td>
                    <td>{row.optimalLabel}</td>
                    <td>{row.status === "match" ? "Aligned" : "Different"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

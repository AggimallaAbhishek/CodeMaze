import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";

export default function ResultOverlay({ result, replayHref }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!result) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, [result]);

  if (!result) {
    return null;
  }

  return (
    <section
      ref={panelRef}
      className="result-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <h2 id={titleId}>Round Result</h2>
      <div className="result-grid">
        <div>
          <span className="label">Score</span>
          <strong>{result.score}</strong>
        </div>
        <div>
          <span className="label">Stars</span>
          <strong>{result.stars}</strong>
        </div>
        <div>
          <span className="label">Your Steps</span>
          <strong>{result.user_steps}</strong>
        </div>
        <div>
          <span className="label">Optimal Steps</span>
          <strong>{result.optimal_steps}</strong>
        </div>
      </div>
      <p>
        XP Earned: <strong>{result.xp_earned}</strong>
      </p>
      <p>
        Hints Used: <strong>{result.hints_used ?? 0}</strong>
      </p>
      {result.score_breakdown ? (
        <div className="result-grid compact">
          <div>
            <span className="label">Base</span>
            <strong>{result.score_breakdown.base_score}</strong>
          </div>
          <div>
            <span className="label">Time Bonus</span>
            <strong>{result.score_breakdown.time_bonus}</strong>
          </div>
          <div>
            <span className="label">Hint Penalty</span>
            <strong>{result.score_breakdown.hint_penalty}</strong>
          </div>
          <div>
            <span className="label">Personal Best</span>
            <strong>{result.is_personal_best ? "Yes" : "No"}</strong>
          </div>
        </div>
      ) : null}
      {(result.awarded_badges ?? []).length ? (
        <div className="badge-row">
          {(result.awarded_badges ?? []).map((badge) => (
            <span key={badge.code} className="badge-pill">
              {badge.title}
            </span>
          ))}
        </div>
      ) : null}
      <div className="diff-list">
        {(result.diff ?? []).slice(0, 6).map((item) => (
          <div key={`diff-${item.step}`} className={item.correct ? "diff-row ok" : "diff-row warn"}>
            Step {item.step}: {item.correct ? "Matches optimal" : "Different from optimal"}
          </div>
        ))}
      </div>
      {replayHref ? (
        <div className="action-row">
          <Link className="ghost-btn" to={replayHref}>
            Review Replay
          </Link>
        </div>
      ) : null}
    </section>
  );
}

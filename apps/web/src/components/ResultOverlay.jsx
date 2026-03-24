export default function ResultOverlay({ result }) {
  if (!result) {
    return null;
  }

  return (
    <section className="result-panel" aria-live="polite">
      <h2>Round Result</h2>
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
      <div className="diff-list">
        {(result.diff ?? []).slice(0, 6).map((item) => (
          <div key={`diff-${item.step}`} className={item.correct ? "diff-row ok" : "diff-row warn"}>
            Step {item.step}: {item.correct ? "Matches optimal" : "Different from optimal"}
          </div>
        ))}
      </div>
    </section>
  );
}

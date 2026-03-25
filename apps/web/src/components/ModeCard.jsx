import { Link } from "react-router-dom";

const accentIcon = {
  sorting: "📊",
  pathfinding: "🗺️",
  graph: "🔗"
};

export default function ModeCard({
  accent = "sorting",
  badge,
  title,
  description,
  actionLabel,
  to,
  stats = [],
  icon
}) {
  return (
    <article className={`mode-card mode-card-${accent}`}>
      <div className="mode-card-top">
        <div className="mode-icon" aria-hidden="true">
          {icon ?? accentIcon[accent] ?? "⚙️"}
        </div>
        {badge ? <span className="mode-badge">{badge}</span> : null}
      </div>
      <div className="mode-card-body">
        <h3 className="mode-title">{title}</h3>
        <p className="mode-desc">{description}</p>
      </div>
      <div className="mode-stat-row">
        {stats.map((item) => (
          <span key={item} className="mode-stat-chip">
            {item}
          </span>
        ))}
      </div>
      <div className="mode-card-footer">
        <Link className="btn-play" to={to}>
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}

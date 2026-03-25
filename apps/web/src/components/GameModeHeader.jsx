import { Link } from "react-router-dom";

export default function GameModeHeader({
  tag,
  title,
  subtitle,
  modeLabel = "Mode",
  modeValue,
  backHref = "/levels",
  backLabel = "Back to Levels"
}) {
  return (
    <header className="gameplay-header-card">
      <div className="gameplay-tag-row">
        <span className="gameplay-tag">{tag}</span>
        <span className="gameplay-mode-chip">
          {modeLabel}: <strong>{modeValue}</strong>
        </span>
      </div>
      <div className="gameplay-title-row">
        <div className="section-stack">
          <h1 className="gameplay-title">{title}</h1>
          {subtitle ? <p className="gameplay-subtitle">{subtitle}</p> : null}
        </div>
        <Link className="ghost-btn gameplay-back-btn" to={backHref}>
          {backLabel}
        </Link>
      </div>
    </header>
  );
}

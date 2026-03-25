export default function GameStatsGrid({ stats }) {
  return (
    <div className="gameplay-stat-strip" aria-label="Game round stats">
      {stats.map((item) => (
        <article key={item.label} className="gameplay-stat-card">
          <span className="label">{item.label}</span>
          <strong>{item.value}</strong>
          {item.note ? <small>{item.note}</small> : null}
        </article>
      ))}
    </div>
  );
}

export default function AdminTrend({ rows, series, label }) {
  const max = Math.max(
    1,
    ...rows.flatMap((r) => series.map((s) => r[s.key] || 0)),
  );
  const x = (i) => 40 + (i * 600) / Math.max(1, rows.length - 1),
    y = (v) => 190 - (v / max) * 150;
  return (
    <div className="admin-trend">
      <svg viewBox="0 0 680 225" role="img" aria-label={label}>
        {[0, 0.5, 1].map((n) => (
          <g key={n}>
            <line
              x1="40"
              x2="650"
              y1={y(max * n)}
              y2={y(max * n)}
              stroke="currentColor"
              opacity=".12"
            />
            <text
              x="30"
              y={y(max * n) + 4}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
            >
              {Math.round(max * n)}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <polyline
            key={s.key}
            points={rows.map((r, i) => `${x(i)},${y(r[s.key] || 0)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        ))}
        {rows
          .filter(
            (r, i) =>
              i === 0 ||
              i === rows.length - 1 ||
              i === Math.floor(rows.length / 2),
          )
          .map((r) => (
            <text
              key={r.day}
              x={x(rows.indexOf(r))}
              y="215"
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
            >
              {r.day.slice(5)}
            </text>
          ))}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
export function calendarSeries(days, recorded) {
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(Date.now() - (days - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return { day, ...recorded.find((r) => r.day === day) };
  });
}

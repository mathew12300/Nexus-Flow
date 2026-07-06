import './flow-bar.css';

/**
 * The signature visual of NexusFlow: a segmented horizontal bar showing how
 * a set of items is distributed across labeled buckets — e.g. members by
 * role, or (later) issues by status. The widest/most-recent segment gets a
 * slow shimmer to suggest "this is where the current work is."
 *
 * segments: [{ label, value, color }]
 */
export default function FlowBar({ segments, height = 10 }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const activeIndex = segments.reduce(
    (best, s, i) => (s.value > segments[best].value ? i : best),
    0
  );

  return (
    <div className="flowbar" style={{ height }}>
      {segments.map((s, i) => {
        const pct = (s.value / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={s.label}
            className={i === activeIndex ? 'flowbar-seg flowbar-seg-active' : 'flowbar-seg'}
            style={{ width: `${pct}%`, background: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        );
      })}
    </div>
  );
}

export function FlowBarLegend({ segments }) {
  return (
    <div className="flowbar-legend">
      {segments.map((s) => (
        <div key={s.label} className="flowbar-legend-item">
          <span className="flowbar-dot" style={{ background: s.color }} />
          <span className="muted">{s.label}</span>
          <span className="mono">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

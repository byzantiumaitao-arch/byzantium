// Admin-only chart components. These show the qualified/total split LIVE — admins
// need the full picture to spot gaming. (The miner-facing dashboard never does.)

export function SplitBars({
  rows,
}: {
  rows: { label: string; total: number; qualified: number }[];
}) {
  if (!rows.length) return <div className="empty">No data yet.</div>;
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="chart">
      {rows.map((r) => (
        <div className="cbar" key={r.label}>
          <div className="clabel"><span className="mono">{r.label}</span></div>
          <div className="ctrack">
            <div className="cfill" style={{ width: `${(r.total / max) * 100}%` }} />
            <div className="cqual" style={{ width: `${(r.qualified / max) * 100}%` }} />
          </div>
          <div className="cval">
            <strong>{r.qualified.toLocaleString()}</strong> / {r.total.toLocaleString()}
          </div>
        </div>
      ))}
      <div className="tlegend">
        <span><span className="dot" style={{ background: "var(--gold)" }} />Qualified</span>
        <span><span className="dot" style={{ background: "rgba(201,168,74,0.28)" }} />Total</span>
      </div>
    </div>
  );
}

export function ActivityChart({
  daily,
}: {
  daily: { day: string; total: number; qualified: number }[];
}) {
  const max = Math.max(1, ...daily.map((d) => d.total));
  return (
    <>
      <div className="tchart">
        {daily.map((d) => {
          const qpct = d.total ? (d.qualified / d.total) * 100 : 0;
          return (
            <div className="tcol" key={d.day} title={`${d.day} — ${d.qualified}/${d.total} qualified`}>
              <div className="tbar" style={{ height: `${(d.total / max) * 100}%` }}>
                <div className="tq" style={{ height: `${qpct}%` }} />
                <div className="tf" style={{ height: `${100 - qpct}%` }} />
              </div>
              <div className="tlbl">{d.day.slice(5)}</div>
            </div>
          );
        })}
      </div>
      <div className="tlegend">
        <span><span className="dot" style={{ background: "var(--gold)" }} />Qualified</span>
        <span><span className="dot" style={{ background: "rgba(255,255,255,0.10)" }} />Filtered</span>
      </div>
    </>
  );
}

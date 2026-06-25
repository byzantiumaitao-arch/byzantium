import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { clicksForFingerprint } from "@/lib/clicks";
import { clickFlags, HARD_FLAGS } from "@/lib/signals";
import { Nav } from "../../../nav";

// Admin → one fingerprint's clicks, with the device signals and flags. This is
// the "view a fingerprint" drill-down.

export const dynamic = "force-dynamic";

export default async function FingerprintDetail({
  params,
}: {
  params: { fp: string };
}) {
  const session = getSession();
  if (session?.kind !== "admin") redirect(`/login?role=admin&next=/admin/fingerprints/${params.fp}`);

  const clicks = await clicksForFingerprint(params.fp);
  const miners = new Set(clicks.map((c) => c.miner));
  const ips = new Set(clicks.map((c) => c.ip).filter(Boolean));
  const sample = clicks.find((c) => c.signals) || clicks[0];

  return (
    <main className="wrap">
      <Nav active="fingerprints" session={session} />

      <h1 style={{ fontSize: 20 }}>
        <span className="mono">{params.fp}</span>
      </h1>
      <p className="sub">
        <a href="/admin/fingerprints">← All fingerprints</a>
      </p>

      <div className="grid">
        <div className="card stat"><div className="num">{clicks.length}</div><div className="lbl">Clicks</div></div>
        <div className="card stat">
          <div className={`num ${miners.size > 1 ? "" : ""}`} style={{ color: miners.size > 1 ? "var(--red)" : undefined }}>
            {miners.size}
          </div>
          <div className="lbl">Miners credited{miners.size > 1 ? " ⚠" : ""}</div>
        </div>
        <div className="card stat"><div className="num">{ips.size}</div><div className="lbl">IP addresses</div></div>
      </div>

      {miners.size > 1 && (
        <div className="card" style={{ marginTop: 14, color: "var(--red)" }}>
          This device credited <strong>{miners.size}</strong> different miners
          ({[...miners].join(", ")}) — a strong farming signal.
        </div>
      )}

      <h2>Clicks</h2>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Miner</th>
              <th>Campaign</th>
              <th>IP</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {clicks.map((k, i) => {
              const flags = clickFlags(k);
              return (
                <tr key={i}>
                  <td className="muted mono">{new Date(k.ts).toLocaleString()}</td>
                  <td className="mono">{k.miner}</td>
                  <td className="mono">/{k.campaign}</td>
                  <td className="muted mono">{k.ip || "—"}</td>
                  <td>
                    {flags.length === 0 ? (
                      <span className="flag ok">clean</span>
                    ) : (
                      flags.map((f) => (
                        <span key={f} className={`flag ${HARD_FLAGS.has(f) ? "" : "warn"}`}>{f}</span>
                      ))
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sample?.signals && (
        <>
          <h2>Raw signals (sample)</h2>
          <div className="card">
            <pre className="mono" style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "var(--muted)" }}>
              {JSON.stringify(sample.signals, null, 2)}
            </pre>
          </div>
        </>
      )}
    </main>
  );
}

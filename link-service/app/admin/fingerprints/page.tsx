import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listFingerprints } from "@/lib/clicks";
import { RULES } from "@/lib/signals";
import { Nav } from "../../nav";

// Admin → Fingerprints: the detection rules we apply, plus a browsable list of
// every collected device fingerprint (click through for its clicks).

export const dynamic = "force-dynamic";

export default async function FingerprintsPage() {
  const session = getSession();
  if (session?.kind !== "admin") redirect("/login?role=admin&next=/admin/fingerprints");

  const fps = await listFingerprints(200);

  return (
    <main className="wrap">
      <Nav active="fingerprints" session={session} />

      <h1>Fingerprints</h1>
      <p className="sub">
        Device fingerprints we&rsquo;ve collected, and the rules used to flag bots. A fingerprint
        seen across multiple miners or firing hard rules is the strongest farming signal.
      </p>

      <h2>Detection rules</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Severity</th>
              <th>What it means</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.flag}>
                <td>
                  <span className={`flag ${r.hard ? "" : "warn"}`}>{r.flag}</span>
                </td>
                <td>
                  {r.hard ? (
                    <span className="pill off" style={{ color: "var(--red)" }}>hard</span>
                  ) : (
                    <span className="pill">soft</span>
                  )}
                </td>
                <td className="muted">{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Collected fingerprints ({fps.length})</h2>
      <div className="card" style={{ padding: 0 }}>
        {fps.length === 0 ? (
          <div className="empty">No fingerprints collected yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fingerprint</th>
                <th className="right">Clicks</th>
                <th className="right">Miners</th>
                <th className="right">IPs</th>
                <th className="right">Campaigns</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {fps.map((f) => (
                <tr key={f.fingerprint}>
                  <td className="mono">
                    <a href={`/admin/fingerprints/${f.fingerprint}`}>
                      {f.fingerprint.slice(0, 16)}…
                    </a>
                  </td>
                  <td className="right"><strong>{f.clicks.toLocaleString()}</strong></td>
                  <td className="right">
                    {f.miners > 1 ? (
                      <span className="flag">{f.miners}</span>
                    ) : (
                      f.miners
                    )}
                  </td>
                  <td className="right">{f.ips}</td>
                  <td className="right">{f.campaigns}</td>
                  <td className="muted mono">{new Date(f.last).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="sub" style={{ marginTop: 14 }}>
        A red <span className="flag">miner count</span> means one device credited multiple miners
        &mdash; review it.
      </p>
    </main>
  );
}

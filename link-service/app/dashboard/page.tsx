import { getOverview } from "@/lib/stats";
import { getSession } from "@/lib/auth";
import { Nav } from "../nav";

// Public overall dashboard — campaign-level activity. No per-click detail and no
// miner PII here; that lives behind the gated miner/admin views.

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const o = await getOverview();
  const session = getSession();

  return (
    <main className="wrap">
      <Nav active="overview" session={session} />

      <h1>Campaign overview</h1>
      <p className="sub">Live click activity across all Byzantium campaigns.</p>

      <div className="grid">
        <div className="card stat">
          <div className="num gold">{o.totalClicks.toLocaleString()}</div>
          <div className="lbl">Total clicks</div>
        </div>
        <div className="card stat">
          <div className="num">{o.campaignCount}</div>
          <div className="lbl">Active campaigns</div>
        </div>
        <div className="card stat">
          <div className="num">{o.minerCount}</div>
          <div className="lbl">Active miners</div>
        </div>
      </div>

      <h2>Campaigns</h2>
      <div className="card" style={{ padding: 0 }}>
        {o.campaigns.length === 0 ? (
          <div className="empty">No campaigns yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Destination</th>
                <th>Status</th>
                <th className="right">Miners</th>
                <th className="right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {o.campaigns.map((c) => (
                <tr key={c.slug}>
                  <td>
                    <strong>{c.name}</strong>
                    <div className="muted mono">/{c.slug}</div>
                  </td>
                  <td className="mono muted">
                    {c.destination.replace(/^https?:\/\//, "")}
                  </td>
                  <td>
                    <span className={`pill ${c.active ? "on" : "off"}`}>
                      {c.active ? "active" : "paused"}
                    </span>
                  </td>
                  <td className="right">{c.miners}</td>
                  <td className="right">
                    <strong>{c.clicks.toLocaleString()}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="sub" style={{ marginTop: 28 }}>
        Counts reflect raw clicks. Authenticity scoring is handled separately.
      </p>
    </main>
  );
}

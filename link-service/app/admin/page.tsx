import { getOverview, getTopMiners } from "@/lib/stats";
import { getRecentClicks } from "@/lib/clicks";
import { Nav } from "../nav";

// Admin dashboard. Full visibility: every campaign, the miner leaderboard, and
// raw recent clicks (incl. IP/UA). Campaign editing comes once campaigns move to
// a DB.
//
// NOTE: the password gate is temporarily OFF — anyone can view this. Restore it
// by re-adding the getSession()/redirect check below.

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [o, topMiners, recent] = await Promise.all([
    getOverview(),
    getTopMiners(20),
    getRecentClicks({ limit: 100 }),
  ]);

  return (
    <main className="wrap">
      <Nav active="admin" />

      <h1>Admin</h1>
      <p className="sub">All campaigns, miners, and raw click activity.</p>

      <div className="grid">
        <div className="card stat">
          <div className="num gold">{o.totalClicks.toLocaleString()}</div>
          <div className="lbl">Total clicks</div>
        </div>
        <div className="card stat">
          <div className="num">{o.campaignCount}</div>
          <div className="lbl">Campaigns</div>
        </div>
        <div className="card stat">
          <div className="num">{o.minerCount}</div>
          <div className="lbl">Miners</div>
        </div>
      </div>

      <h2>Top miners</h2>
      <div className="card" style={{ padding: 0 }}>
        {topMiners.length === 0 ? (
          <div className="empty">No clicks yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Miner</th>
                <th className="right">Campaigns</th>
                <th className="right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {topMiners.map((m) => (
                <tr key={m.miner}>
                  <td className="mono">{m.miner}</td>
                  <td className="right">{m.campaigns}</td>
                  <td className="right">
                    <strong>{m.clicks.toLocaleString()}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Recent clicks (raw)</h2>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {recent.length === 0 ? (
          <div className="empty">No clicks yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Miner</th>
                <th>Campaign</th>
                <th>IP</th>
                <th>User agent</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((k, i) => (
                <tr key={i}>
                  <td className="muted mono">{new Date(k.ts).toLocaleString()}</td>
                  <td className="mono">{k.miner}</td>
                  <td className="mono">/{k.campaign}</td>
                  <td className="muted mono">{k.ip || "—"}</td>
                  <td
                    className="muted"
                    style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={k.ua || ""}
                  >
                    {k.ua || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

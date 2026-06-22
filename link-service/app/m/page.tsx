import { getMinerSummary } from "@/lib/stats";
import { listCampaigns } from "@/lib/campaigns";
import { Nav } from "../nav";
import { LinkBuilder } from "./LinkBuilder";

// Miner dashboard. Shows one miner's own clicks + a link builder.
//
// NOTE: the password gate is temporarily OFF. The miner is taken from the URL
// (?miner=alice); with no handle, we show a quick picker. To restore gating,
// re-add the getSession()/redirect check and read the handle from the session.

export const dynamic = "force-dynamic";

export default async function MinerPage({
  searchParams,
}: {
  searchParams: { miner?: string };
}) {
  const miner = (searchParams.miner || "").trim().toLowerCase();
  const campaigns = listCampaigns().map((c) => ({ slug: c.slug, name: c.name }));

  // No handle chosen yet — ask for one.
  if (!miner) {
    return (
      <main className="wrap">
        <Nav active="miner" />
        <h1>Miner dashboard</h1>
        <p className="sub">Enter a miner handle to view its clicks and links.</p>
        <form className="login card" method="get" style={{ margin: "0" }}>
          <div className="field">
            <label htmlFor="miner">Miner handle</label>
            <input className="input" id="miner" name="miner" placeholder="e.g. alice" required />
          </div>
          <button className="btn" type="submit">View dashboard</button>
        </form>
      </main>
    );
  }

  const m = await getMinerSummary(miner);

  return (
    <main className="wrap">
      <Nav active="miner" />

      <h1>
        {miner}
        <span className="muted" style={{ fontWeight: 400, fontSize: 16 }}>
          {" "}
          · dashboard <a href="/m" style={{ fontSize: 14 }}>(switch)</a>
        </span>
      </h1>
      <p className="sub">Clicks and links across campaigns.</p>

      <div className="grid">
        <div className="card stat">
          <div className="num gold">{m.totalClicks.toLocaleString()}</div>
          <div className="lbl">Your total clicks</div>
        </div>
        <div className="card stat">
          <div className="num">{m.perCampaign.length}</div>
          <div className="lbl">Campaigns you&rsquo;ve driven</div>
        </div>
      </div>

      <h2>Build a link</h2>
      <LinkBuilder miner={miner} campaigns={campaigns} />

      <h2>Clicks by campaign</h2>
      <div className="card" style={{ padding: 0 }}>
        {m.perCampaign.length === 0 ? (
          <div className="empty">No clicks yet — share a link to get started.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th className="right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {m.perCampaign.map((row) => (
                <tr key={row.campaign}>
                  <td className="mono">/{row.campaign}</td>
                  <td className="right">
                    <strong>{row.count.toLocaleString()}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Recent clicks</h2>
      <div className="card" style={{ padding: 0 }}>
        {m.recent.length === 0 ? (
          <div className="empty">No clicks yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Campaign</th>
                <th>Referer</th>
              </tr>
            </thead>
            <tbody>
              {m.recent.map((k, i) => (
                <tr key={i}>
                  <td className="muted mono">{new Date(k.ts).toLocaleString()}</td>
                  <td className="mono">/{k.campaign}</td>
                  <td className="muted">
                    {k.referer ? k.referer.replace(/^https?:\/\//, "") : "direct"}
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

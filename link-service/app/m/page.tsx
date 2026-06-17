import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMinerSummary } from "@/lib/stats";
import { listCampaigns } from "@/lib/campaigns";
import { Nav } from "../nav";
import { LinkBuilder } from "./LinkBuilder";

// Miner dashboard — gated. A signed-in miner sees only their own clicks, plus a
// builder for their personalised links.

export const dynamic = "force-dynamic";

export default function MinerPage() {
  const session = getSession();
  if (session?.role !== "miner" || !session.miner) {
    redirect("/login?role=miner&next=/m");
  }

  const m = getMinerSummary(session.miner);
  const campaigns = listCampaigns().map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <main className="wrap">
      <Nav active="miner" session={session} />

      <h1>
        {session.miner}
        <span className="muted" style={{ fontWeight: 400, fontSize: 16 }}>
          {" "}
          · my dashboard
        </span>
      </h1>
      <p className="sub">Your clicks and links across campaigns.</p>

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
      <LinkBuilder miner={session.miner} campaigns={campaigns} />

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

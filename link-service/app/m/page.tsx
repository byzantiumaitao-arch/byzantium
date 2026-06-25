import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMinerById, getSocials, type Social } from "@/lib/miners";
import { getMinerSummary } from "@/lib/stats";
import { listCampaigns } from "@/lib/campaigns";
import { Nav } from "../nav";
import { LinkBuilder } from "./LinkBuilder";

// Miner dashboard — for the logged-in miner account. Shows their clicks, a link
// builder, and their linked/verified social handles.

export const dynamic = "force-dynamic";

const PLATFORMS = [
  { key: "x", label: "X (Twitter)" },
  { key: "farcaster", label: "Farcaster" },
] as const;

function socialPill(s?: Social) {
  if (!s) return <span className="pill off">not linked</span>;
  if (s.status === "verified") return <span className="pill on">verified</span>;
  if (s.status === "pending") return <span className="pill">pending</span>;
  return <span className="pill off">rejected</span>;
}

export default async function MinerPage() {
  const session = getSession();
  if (session?.kind !== "miner") redirect("/login");

  const miner = await getMinerById(session.minerId);
  if (!miner) redirect("/logout");

  const [m, socials] = await Promise.all([
    getMinerSummary(miner.handle),
    getSocials(miner.id),
  ]);
  const byPlatform = new Map(socials.map((s) => [s.platform, s]));
  const campaigns = (await listCampaigns()).map((c) => ({ slug: c.slug, name: c.name }));

  // chart scales
  const maxCampaign = Math.max(1, ...m.perCampaign.map((r) => r.total));
  const maxDay = Math.max(1, ...m.daily.map((d) => d.total));

  return (
    <main className="wrap">
      <Nav active="miner" session={session} />

      <h1>
        {miner.display_name || miner.handle}
        <span className="muted" style={{ fontWeight: 400, fontSize: 16 }}>
          {" "}· @{miner.handle}
        </span>
      </h1>
      <p className="sub">Your clicks, links and verified socials.</p>

      <div className="grid">
        <div className="card stat">
          <div className="num">{m.totalClicks.toLocaleString()}</div>
          <div className="lbl">Total clicks</div>
        </div>
        <div className="card stat">
          <div className="num gold">{m.qualifiedClicks.toLocaleString()}</div>
          <div className="lbl">Qualified clicks</div>
        </div>
        <div className="card stat">
          <div className="num">{m.perCampaign.length}</div>
          <div className="lbl">Campaigns driven</div>
        </div>
        <div className="card stat">
          <div className="num">{socials.filter((s) => s.status === "verified").length}</div>
          <div className="lbl">Verified socials</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14, fontSize: 14, lineHeight: 1.65 }}>
        <strong>Total clicks</strong> = every visit to your links.{" "}
        <strong style={{ color: "var(--gold)" }}>Qualified clicks</strong> = visits that passed
        our automated bot &amp; device check — the visitor&rsquo;s real browser completed a quick
        verification, so it looks like a genuine person. Only qualified clicks count toward
        rewards, and final payouts apply a deeper authenticity check on top of this.
      </div>

      <h2>Linked socials</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Handle</th>
              <th>Status</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {PLATFORMS.map((p) => {
              const s = byPlatform.get(p.key);
              return (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td className="mono">{s ? `@${s.handle}` : "—"}</td>
                  <td>{socialPill(s)}</td>
                  <td className="right">
                    <a className="btn sm ghost" href={`/m/verify?platform=${p.key}`}>
                      {s?.status === "verified" ? "Re-link" : s ? "Continue" : "Connect"}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Build a link</h2>
      <LinkBuilder miner={miner.handle} campaigns={campaigns} />

      <h2>Clicks by campaign</h2>
      <div className="card chart">
        {m.perCampaign.length === 0 ? (
          <div className="empty">No clicks yet — share a link to get started.</div>
        ) : (
          <>
            {m.perCampaign.map((row) => (
              <div className="cbar" key={row.campaign}>
                <div className="clabel"><span className="mono">/{row.campaign}</span></div>
                <div className="ctrack">
                  <div className="cfill" style={{ width: `${(row.total / maxCampaign) * 100}%` }} />
                  <div className="cqual" style={{ width: `${(row.qualified / maxCampaign) * 100}%` }} />
                </div>
                <div className="cval">
                  <strong>{row.qualified.toLocaleString()}</strong> / {row.total.toLocaleString()}
                </div>
              </div>
            ))}
            <div className="tlegend">
              <span><span className="dot" style={{ background: "var(--gold)" }} />Qualified</span>
              <span><span className="dot" style={{ background: "rgba(201,168,74,0.28)" }} />Total</span>
            </div>
          </>
        )}
      </div>

      <h2>Activity (last 14 days)</h2>
      <div className="card">
        {m.totalClicks === 0 ? (
          <div className="empty">No clicks yet.</div>
        ) : (
          <>
            <div className="tchart">
              {m.daily.map((d) => {
                const qpct = d.total ? (d.qualified / d.total) * 100 : 0;
                return (
                  <div
                    className="tcol"
                    key={d.day}
                    title={`${d.day} — ${d.qualified}/${d.total} qualified`}
                  >
                    <div className="tbar" style={{ height: `${(d.total / maxDay) * 100}%` }}>
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

            <details className="sig" style={{ marginTop: 16 }}>
              <summary>Recent clicks (detail)</summary>
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>When</th><th>Campaign</th><th>Referer</th><th className="right">Counts?</th>
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
                      <td className="right">
                        {k.qualified ? (
                          <span className="pill on">qualified</span>
                        ) : (
                          <span className="pill off">filtered</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </div>
    </main>
  );
}

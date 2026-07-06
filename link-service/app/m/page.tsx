import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMinerById, getSocials, type Social } from "@/lib/miners";
import { getMinerSummary } from "@/lib/stats";
import { listCampaigns } from "@/lib/campaigns";
import { Nav } from "../nav";
import { LinkBuilder } from "./LinkBuilder";
import { updateHotkey } from "./actions";

// Miner dashboard — for the logged-in miner account. Shows their clicks, a link
// builder, their payout address, and their linked/verified social handles.

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

export default async function MinerPage({
  searchParams,
}: {
  searchParams: { error?: string; saved?: string };
}) {
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

      <div className="card" style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.65 }}>
        <strong>How your clicks count.</strong>{" "}
        <strong>Total clicks</strong> = every visit to your links, counted instantly.{" "}
        <strong style={{ color: "var(--gold)" }}>Qualified clicks</strong> = visits confirmed as
        genuine after our automated checks. To keep things fair, the qualified number updates on a{" "}
        <strong>delay (about {m.reviewHours} hours)</strong> and we never show which individual
        clicks passed or failed — this stops anyone from testing and gaming the system. Only
        qualified clicks count toward rewards.
      </div>

      <div className="grid">
        <div className="card stat">
          <div className="num">{m.totalClicks.toLocaleString()}</div>
          <div className="lbl">Total clicks</div>
        </div>
        <div className="card stat">
          <div className="num gold">{m.qualifiedClicks.toLocaleString()}</div>
          <div className="lbl">Qualified clicks · confirmed</div>
        </div>
        <div className="card stat">
          <div className="num">{m.inReview.toLocaleString()}</div>
          <div className="lbl">In review (last {m.reviewHours}h)</div>
        </div>
        <div className="card stat">
          <div className="num">{socials.filter((s) => s.status === "verified").length}</div>
          <div className="lbl">Verified socials</div>
        </div>
      </div>

      <h2>Payout address</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        {searchParams.saved && (
          <div className="pill on" style={{ marginBottom: 10 }}>Saved ✓</div>
        )}
        {searchParams.error && <div className="error">{searchParams.error}</div>}
        {miner.hotkey ? (
          <p style={{ marginTop: 0 }}>
            Rewards are paid to <span className="mono">{miner.hotkey}</span>.
          </p>
        ) : (
          <p style={{ marginTop: 0, color: "var(--gold)" }}>
            You haven’t set a payout address yet. You’ll still earn weight from your
            clicks — but until you add a hotkey, those rewards are sent to a soft-burn
            wallet (a Byzantium key that’s never sold), not paid to you or shared out to
            other miners. Add your Bittensor hotkey to start receiving them.
          </p>
        )}
        <form action={updateHotkey} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            className="input mono"
            name="hotkey"
            defaultValue={miner.hotkey ?? ""}
            placeholder="5F… your SN76 hotkey"
            pattern="5[1-9A-HJ-NP-Za-km-z]{46,48}"
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            required
            style={{ flex: 1 }}
          />
          <button className="btn sm" type="submit">{miner.hotkey ? "Update" : "Save"}</button>
        </form>
        <p className="sub" style={{ marginTop: 10, marginBottom: 0, fontSize: 12.5, lineHeight: 1.65 }}>
          Paste your hotkey from <span className="mono">btcli wallet list</span>. We check the
          format, not the chain — so make sure it’s the right key.
          <br />
          <strong>Don’t forget:</strong> register this hotkey on the Byzantium subnet too — run{" "}
          <span className="mono">btcli subnets register --netuid 76</span> — so rewards can reach it
          on-chain. Collect clicks now and set this up whenever you’re ready; whatever you earn before
          then is soft-burned (never sold), never handed to another miner.
        </p>
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

      <h2>Total clicks by campaign</h2>
      <div className="card chart">
        {m.perCampaign.length === 0 ? (
          <div className="empty">No clicks yet — share a link to get started.</div>
        ) : (
          m.perCampaign.map((row) => (
            <div className="cbar" key={row.campaign}>
              <div className="clabel"><span className="mono">/{row.campaign}</span></div>
              <div className="ctrack">
                <div className="cqual" style={{ width: `${(row.total / maxCampaign) * 100}%` }} />
              </div>
              <div className="cval"><strong>{row.total.toLocaleString()}</strong></div>
            </div>
          ))
        )}
      </div>

      <h2>Total clicks (last 14 days)</h2>
      <div className="card">
        {m.totalClicks === 0 ? (
          <div className="empty">No clicks yet.</div>
        ) : (
          <div className="tchart">
            {m.daily.map((d) => (
              <div className="tcol" key={d.day} title={`${d.day} — ${d.total} clicks`}>
                <div className="tbar" style={{ height: `${(d.total / maxDay) * 100}%` }}>
                  <div className="tq" style={{ height: "100%" }} />
                </div>
                <div className="tlbl">{d.day.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

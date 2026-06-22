import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOverview, getTopMiners } from "@/lib/stats";
import { getRecentClicks, fingerprintClusters, ipClusters, velocityFingerprints } from "@/lib/clicks";
import { getPendingSocials } from "@/lib/socials";
import { clickFlags, HARD_FLAGS } from "@/lib/signals";
import { Nav } from "../nav";
import { reviewSocial } from "./actions";

// Admin dashboard — gated by the admin session. Full visibility: pending social
// verifications to review, every campaign, the miner leaderboard, and raw recent
// clicks (incl. IP/UA).

export const dynamic = "force-dynamic";

// Expandable full breakdown of one click's collected signals. Uses native
// <details> so it works in this server-rendered page with no client JS.
function signalDetails(
  k: { ua: string | null; accept_lang: string | null; referer: string | null; in_app: boolean | null },
  sig: Record<string, any>
) {
  const s = sig || {};
  const screen = s.screen
    ? `${s.screen.w}×${s.screen.h}${s.screen.dpr ? ` @${s.screen.dpr}x` : ""}${s.screen.depth ? `, ${s.screen.depth}-bit` : ""}`
    : null;
  const hints = s.uaData
    ? `${s.uaData.platform || "?"}${s.uaData.mobile ? " · mobile" : " · desktop"}${
        Array.isArray(s.uaData.brands)
          ? " · " + s.uaData.brands.map((b: any) => `${b.brand} ${b.version}`).join(", ")
          : ""
      }`
    : null;

  // [label, value] pairs; only non-empty ones render.
  const rows: [string, any][] = [
    ["GPU", s.webgl ? `${s.webgl.vendor || "?"} — ${s.webgl.renderer || "?"}` : null],
    ["Screen", screen],
    ["Timezone", s.tz ? `${s.tz}${s.tzOffset != null ? ` (UTC offset ${-s.tzOffset / 60}h)` : ""}` : null],
    ["Languages (JS)", Array.isArray(s.langs) ? s.langs.join(", ") : null],
    ["Accept-Language", k.accept_lang],
    ["Platform", s.platform],
    ["Client hints", hints],
    ["CPU cores", s.cores],
    ["Device memory", s.memory != null ? `${s.memory} GB` : null],
    ["Touch points", s.touch],
    ["Canvas hash", s.canvas],
    ["Audio hash", s.audio],
    ["Fonts detected", s.fonts],
    ["WebGL extensions", s.webgl?.ext],
    ["webdriver", s.webdriver != null ? String(s.webdriver) : null],
    ["Automation globals", Array.isArray(s.automation) ? s.automation.join(", ") : null],
    ["Native tamper", s.tampered != null ? String(s.tampered) : null],
    ["Plugins", s.plugins],
    ["PDF viewer", s.pdfViewer != null ? String(s.pdfViewer) : null],
    ["Window outer", s.outer ? `${s.outer.w}×${s.outer.h}` : null],
    ["Window inner", s.inner ? `${s.inner.w}×${s.inner.h}` : null],
    ["Notification perm", s.notif],
    ["Connection", s.connection],
    ["Cookies", s.cookies != null ? String(s.cookies) : null],
    ["Do-not-track", s.dnt],
    ["In-app browser", k.in_app != null ? String(k.in_app) : null],
    ["Time on interstitial", s.ms != null ? `${s.ms} ms` : null],
    ["Interacted", s.interacted != null ? String(s.interacted) : null],
    ["Tab visibility", s.visible],
    ["Referer", k.referer],
    ["User agent", k.ua],
  ];
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");

  if (shown.length === 0) {
    return <span className="muted">no signals (JS didn’t run)</span>;
  }
  return (
    <details className="sig">
      <summary>view ({shown.length})</summary>
      <dl className="siggrid">
        {shown.map(([label, value]) => (
          <div key={label} style={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd className="mono">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

// Render a click's bot-tells as coloured pills (hard tells red, soft hints amber).
function flagPills(flags: string[]) {
  return flags.map((f) => (
    <span key={f} className={"flag" + (HARD_FLAGS.has(f) ? "" : " warn")}>
      {f}
    </span>
  ));
}

export default async function AdminPage() {
  const session = getSession();
  if (session?.kind !== "admin") redirect("/login?role=admin&next=/admin");

  const [o, topMiners, recent, pending, fpClusters, ipCl, velocity] = await Promise.all([
    getOverview(),
    getTopMiners(20),
    getRecentClicks({ limit: 100 }),
    getPendingSocials(),
    fingerprintClusters(50),
    ipClusters(50),
    velocityFingerprints(60, 5, 50),
  ]);

  // Fingerprints credited to more than one miner — the strongest farming tell.
  // Used to badge those rows in the raw feed too.
  const sharedFps = new Set(fpClusters.filter((c) => c.miners > 1).map((c) => c.fingerprint));
  // Fingerprints bursting clicks in the last hour.
  const burstFps = new Set(velocity.map((v) => v.fingerprint));

  return (
    <main className="wrap">
      <Nav active="admin" session={session} />

      <h1>Admin</h1>
      <p className="sub">Verifications, campaigns, miners, and raw click activity.</p>

      <h2>Pending verifications ({pending.length})</h2>
      <div className="card" style={{ padding: 0 }}>
        {pending.length === 0 ? (
          <div className="empty">Nothing to review.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Miner</th>
                <th>Platform</th>
                <th>Handle</th>
                <th>Post</th>
                <th className="right">Decision</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.miner_handle}</td>
                  <td>{p.platform === "x" ? "X" : "Farcaster"}</td>
                  <td className="mono">@{p.handle}</td>
                  <td>
                    <a href={p.post_url!} target="_blank" rel="noreferrer">view post ↗</a>
                  </td>
                  <td className="right">
                    <form action={reviewSocial} style={{ display: "inline-flex", gap: 8 }}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn sm" name="decision" value="approve" type="submit">
                        Approve
                      </button>
                      <button className="btn sm ghost" name="decision" value="reject" type="submit">
                        Reject
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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

      <h2>Fingerprint clusters</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Repeated or shared device fingerprints. A fingerprint crediting more than one
        miner (red) is the strongest farming signal.
      </p>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {fpClusters.length === 0 ? (
          <div className="empty">No repeated fingerprints.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fingerprint</th>
                <th className="right">Clicks</th>
                <th className="right">Miners</th>
                <th className="right">IPs</th>
                <th className="right">Campaigns</th>
                <th>First → last seen</th>
              </tr>
            </thead>
            <tbody>
              {fpClusters.map((c) => (
                <tr key={c.fingerprint}>
                  <td className="mono">{c.fingerprint.slice(0, 12)}</td>
                  <td className="right">{c.clicks}</td>
                  <td className="right">
                    {c.miners > 1 ? <span className="flag">{c.miners}</span> : c.miners}
                  </td>
                  <td className="right">{c.ips}</td>
                  <td className="right">{c.campaigns}</td>
                  <td className="muted mono">
                    {new Date(c.first).toLocaleString()} → {new Date(c.last).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>IP clusters</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Addresses with repeated activity. Many fingerprints or multiple miners behind
        one IP (red) suggests a farm or shared proxy.
      </p>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {ipCl.length === 0 ? (
          <div className="empty">No repeated IPs.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>IP</th>
                <th className="right">Clicks</th>
                <th className="right">Miners</th>
                <th className="right">Fingerprints</th>
                <th className="right">Campaigns</th>
                <th>First → last seen</th>
              </tr>
            </thead>
            <tbody>
              {ipCl.map((c) => (
                <tr key={c.ip}>
                  <td className="mono">{c.ip}</td>
                  <td className="right">{c.clicks}</td>
                  <td className="right">
                    {c.miners > 1 ? <span className="flag">{c.miners}</span> : c.miners}
                  </td>
                  <td className="right">{c.fingerprints}</td>
                  <td className="right">{c.campaigns}</td>
                  <td className="muted mono">
                    {new Date(c.first).toLocaleString()} → {new Date(c.last).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Velocity — bursts (last 60 min)</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Fingerprints with 5+ clicks in the last hour. A human doesn’t click the same
        link repeatedly — high rate/min (red) means scripted clicking.
      </p>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {velocity.length === 0 ? (
          <div className="empty">No bursts in the last hour.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fingerprint</th>
                <th className="right">Clicks (60m)</th>
                <th className="right">Rate / min</th>
                <th className="right">Miners</th>
                <th>First → last</th>
              </tr>
            </thead>
            <tbody>
              {velocity.map((v) => (
                <tr key={v.fingerprint}>
                  <td className="mono">{v.fingerprint.slice(0, 12)}</td>
                  <td className="right">{v.clicks}</td>
                  <td className="right">
                    {v.perMin >= 2 ? <span className="flag">{v.perMin}</span> : v.perMin}
                  </td>
                  <td className="right">
                    {v.miners > 1 ? <span className="flag">{v.miners}</span> : v.miners}
                  </td>
                  <td className="muted mono">
                    {new Date(v.first).toLocaleTimeString()} → {new Date(v.last).toLocaleTimeString()}
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
                <th>Device / flags</th>
                <th>Fingerprint</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((k, i) => {
                const sig = (k.signals ?? {}) as Record<string, any>;
                const flags = clickFlags(k);
                if (k.fingerprint && sharedFps.has(k.fingerprint)) flags.push("shared-fp");
                if (k.fingerprint && burstFps.has(k.fingerprint)) flags.push("burst");
                const gpu = sig.webgl?.renderer || null;
                return (
                  <tr key={i}>
                    <td className="muted mono">{new Date(k.ts).toLocaleString()}</td>
                    <td className="mono">{k.miner}</td>
                    <td className="mono">/{k.campaign}</td>
                    <td className="muted mono">{k.ip || "—"}</td>
                    <td className="muted" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={gpu || ""}>
                      {flagPills(flags)}
                      {gpu || (k.fingerprint ? "" : null)}
                    </td>
                    <td className="muted mono" title={k.fingerprint || ""}>
                      {k.fingerprint ? k.fingerprint.slice(0, 10) : "—"}
                    </td>
                    <td>{signalDetails(k, sig)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

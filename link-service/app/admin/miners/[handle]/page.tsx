import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMinerByHandle, getSocials, type Social } from "@/lib/miners";
import { getMinerSummary } from "@/lib/stats";
import { clickFlags, HARD_FLAGS } from "@/lib/signals";
import { Nav } from "../../../nav";

// Admin → one miner's full detail: account, linked socials, click quality.

export const dynamic = "force-dynamic";

function socialPill(s: Social) {
  if (s.status === "verified") return <span className="pill on">verified</span>;
  if (s.status === "pending") return <span className="pill">pending</span>;
  return <span className="pill off">rejected</span>;
}

export default async function MinerDetailPage({
  params,
}: {
  params: { handle: string };
}) {
  const session = getSession();
  if (session?.kind !== "admin") {
    redirect(`/login?role=admin&next=/admin/miners/${params.handle}`);
  }

  const miner = await getMinerByHandle(params.handle);
  if (!miner) notFound();

  const [socials, summary] = await Promise.all([
    getSocials(miner.id),
    getMinerSummary(miner.handle),
  ]);

  return (
    <main className="wrap">
      <Nav active="miners" session={session} />

      <h1>
        @{miner.handle}
        {miner.display_name && (
          <span className="muted" style={{ fontWeight: 400, fontSize: 16 }}>
            {" "}· {miner.display_name}
          </span>
        )}
      </h1>
      <p className="sub">
        <a href="/admin/miners">← All miners</a> · {miner.email} · joined{" "}
        {new Date(miner.created_at).toLocaleDateString()}
      </p>

      <div className="grid">
        <div className="card stat">
          <div className="num">{summary.totalClicks.toLocaleString()}</div>
          <div className="lbl">Total clicks</div>
        </div>
        <div className="card stat">
          <div className="num gold">{summary.qualifiedClicks.toLocaleString()}</div>
          <div className="lbl">Qualified clicks</div>
        </div>
        <div className="card stat">
          <div className="num">{socials.filter((s) => s.status === "verified").length}</div>
          <div className="lbl">Verified socials</div>
        </div>
      </div>

      <h2>Linked socials</h2>
      <div className="card" style={{ padding: 0 }}>
        {socials.length === 0 ? (
          <div className="empty">No socials linked.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Handle</th>
                <th>Status</th>
                <th>Proof post</th>
              </tr>
            </thead>
            <tbody>
              {socials.map((s) => (
                <tr key={s.id}>
                  <td>{s.platform === "x" ? "X (Twitter)" : "Farcaster"}</td>
                  <td className="mono">@{s.handle}</td>
                  <td>{socialPill(s)}</td>
                  <td>
                    {s.post_url ? (
                      <a href={s.post_url} target="_blank" rel="noreferrer">view ↗</a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Clicks by campaign</h2>
      <div className="card" style={{ padding: 0 }}>
        {summary.perCampaign.length === 0 ? (
          <div className="empty">No clicks yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th className="right">Total clicks</th>
              </tr>
            </thead>
            <tbody>
              {summary.perCampaign.map((row) => (
                <tr key={row.campaign}>
                  <td className="mono">/{row.campaign}</td>
                  <td className="right"><strong>{row.total.toLocaleString()}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Recent clicks</h2>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {summary.recent.length === 0 ? (
          <div className="empty">No clicks yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Campaign</th>
                <th>IP</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent.map((k, i) => {
                const flags = clickFlags(k);
                return (
                  <tr key={i}>
                    <td className="muted mono">{new Date(k.ts).toLocaleString()}</td>
                    <td className="mono">/{k.campaign}</td>
                    <td className="muted mono">{k.ip || "—"}</td>
                    <td>
                      {flags.length === 0 ? (
                        <span className="flag ok">clean</span>
                      ) : (
                        flags.map((f) => (
                          <span key={f} className={`flag ${HARD_FLAGS.has(f) ? "" : "warn"}`}>
                            {f}
                          </span>
                        ))
                      )}
                    </td>
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

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listMiners } from "@/lib/miners";
import { Nav } from "../../nav";

// Admin → registered miner accounts. Click a row for full detail.

export const dynamic = "force-dynamic";

export default async function MinersPage() {
  const session = getSession();
  if (session?.kind !== "admin") redirect("/login?role=admin&next=/admin/miners");

  const miners = await listMiners();

  return (
    <main className="wrap">
      <Nav active="miners" session={session} />

      <h1>Miners ({miners.length})</h1>
      <p className="sub">Registered miner accounts. Click a row for full detail.</p>

      <div className="card" style={{ padding: 0 }}>
        {miners.length === 0 ? (
          <div className="empty">No miners have signed up yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Handle</th>
                <th>Name</th>
                <th>Email</th>
                <th>Payout address</th>
                <th className="right">Verified socials</th>
                <th className="right">Clicks</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {miners.map((m) => (
                <tr key={m.id}>
                  <td className="mono">
                    <a href={`/admin/miners/${m.handle}`}>@{m.handle}</a>
                  </td>
                  <td>{m.display_name || <span className="muted">—</span>}</td>
                  <td className="muted">{m.email}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>
                    {m.hotkey ? (
                      <span title={m.hotkey}>
                        {m.hotkey.slice(0, 6)}…{m.hotkey.slice(-6)}
                      </span>
                    ) : (
                      <span className="muted">not set</span>
                    )}
                  </td>
                  <td className="right">
                    {m.verified_socials > 0 ? (
                      <span className="pill on">{m.verified_socials}</span>
                    ) : (
                      <span className="muted">0</span>
                    )}
                  </td>
                  <td className="right"><strong>{m.clicks.toLocaleString()}</strong></td>
                  <td className="muted mono">{new Date(m.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listAllCampaigns } from "@/lib/campaigns";
import { Nav } from "../../nav";
import { createCampaign, toggleCampaign } from "./actions";

// Admin → manage campaigns. Adding one makes it instantly available in every
// miner's link builder and as a working /<miner>/<slug> link.

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = getSession();
  if (session?.kind !== "admin") redirect("/login?role=admin&next=/admin/campaigns");

  const campaigns = await listAllCampaigns();

  return (
    <main className="wrap">
      <Nav active="campaigns" session={session} />

      <h1>Campaigns ({campaigns.length})</h1>
      <p className="sub">
        Add a campaign and it&rsquo;s instantly available to every miner&rsquo;s link builder.
      </p>

      <h2>Add a campaign</h2>
      <form className="card" action={createCampaign}>
        {searchParams.error && <div className="error">{searchParams.error}</div>}
        <div className="builder">
          <div className="field">
            <label htmlFor="slug">Slug (URL)</label>
            <input className="input" id="slug" name="slug" placeholder="e.g. buy" required />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="name">Name</label>
            <input className="input" id="name" name="name" placeholder="Buy ن on Taostats" required />
          </div>
          <div className="field" style={{ minWidth: 240 }}>
            <label htmlFor="destination">Destination URL</label>
            <input className="input" id="destination" name="destination" placeholder="https://taostats.io" required />
          </div>
          <button className="btn sm" type="submit">Add campaign</button>
        </div>
      </form>

      <h2>All campaigns</h2>
      <div className="card" style={{ padding: 0 }}>
        {campaigns.length === 0 ? (
          <div className="empty">No campaigns yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Name</th>
                <th>Destination</th>
                <th>Status</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.slug}>
                  <td className="mono">/{c.slug}</td>
                  <td>{c.name}</td>
                  <td className="mono muted">{c.destination.replace(/^https?:\/\//, "")}</td>
                  <td>
                    <span className={`pill ${c.active ? "on" : "off"}`}>
                      {c.active ? "active" : "paused"}
                    </span>
                  </td>
                  <td className="right">
                    <form action={toggleCampaign} style={{ display: "inline" }}>
                      <input type="hidden" name="slug" value={c.slug} />
                      <input type="hidden" name="active" value={(!c.active).toString()} />
                      <button className="btn sm ghost" type="submit">
                        {c.active ? "Pause" : "Resume"}
                      </button>
                    </form>
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

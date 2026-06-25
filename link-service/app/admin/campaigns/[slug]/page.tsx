import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listAllCampaigns } from "@/lib/campaigns";
import { getCampaignCharts } from "@/lib/stats";
import { Nav } from "../../../nav";
import { SplitBars, ActivityChart } from "../../charts";

// Admin → one campaign's performance: totals, activity over time, and which
// miners are driving it (with the qualified/total split shown live).

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = getSession();
  if (session?.kind !== "admin") {
    redirect(`/login?role=admin&next=/admin/campaigns/${params.slug}`);
  }

  const campaign = (await listAllCampaigns()).find((c) => c.slug === params.slug);
  if (!campaign) notFound();
  const charts = await getCampaignCharts(campaign.slug);

  return (
    <main className="wrap">
      <Nav active="campaigns" session={session} />

      <h1>
        {campaign.name}
        <span className="muted" style={{ fontWeight: 400, fontSize: 16 }}> · /{campaign.slug}</span>
      </h1>
      <p className="sub">
        <a href="/admin/campaigns">← All campaigns</a> ·{" "}
        <span className="mono">{campaign.destination.replace(/^https?:\/\//, "")}</span> ·{" "}
        <span className={`pill ${campaign.active ? "on" : "off"}`}>
          {campaign.active ? "active" : "paused"}
        </span>
      </p>

      <div className="grid">
        <div className="card stat">
          <div className="num">{charts.total.toLocaleString()}</div>
          <div className="lbl">Total clicks</div>
        </div>
        <div className="card stat">
          <div className="num gold">{charts.qualified.toLocaleString()}</div>
          <div className="lbl">Qualified (live)</div>
        </div>
        <div className="card stat">
          <div className="num">{charts.miners.toLocaleString()}</div>
          <div className="lbl">Miners driving it</div>
        </div>
      </div>

      <h2>Activity (last 14 days)</h2>
      <div className="card">
        {charts.total === 0 ? <div className="empty">No clicks yet.</div> : <ActivityChart daily={charts.daily} />}
      </div>

      <h2>Top miners</h2>
      <div className="card">
        <SplitBars
          rows={charts.topMiners.map((m) => ({ label: m.miner, total: m.total, qualified: m.qualified }))}
        />
      </div>
    </main>
  );
}

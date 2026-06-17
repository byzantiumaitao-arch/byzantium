"use client";

import { useState } from "react";

// Lets a miner pick a campaign and copy their personalised tracking link.
// Base URL prefers NEXT_PUBLIC_LINK_BASE (e.g. https://link.byzantiumai.net),
// falling back to the current origin so it also works in local dev.
export function LinkBuilder({
  miner,
  campaigns,
}: {
  miner: string;
  campaigns: { slug: string; name: string }[];
}) {
  const [slug, setSlug] = useState(campaigns[0]?.slug || "");
  const [copied, setCopied] = useState(false);

  const base =
    process.env.NEXT_PUBLIC_LINK_BASE ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const link = slug ? `${base}/${miner}/${slug}` : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card">
      <div className="builder">
        <div className="field">
          <label htmlFor="campaign">Campaign</label>
          <select
            id="campaign"
            className="input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          >
            {campaigns.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {link && (
        <div className="linkout">
          <span className="mono">{link}</span>
          <button className="btn sm" onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

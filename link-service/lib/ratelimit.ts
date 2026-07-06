// Per-IP flood backstop for the hot paths (redirect + collect).
//
// This is an IN-PROCESS sliding window: state lives in one warm serverless
// instance, not shared across instances. So it reliably stops a single source
// hammering a warm function (the common scraper/flood shape) and keeps that
// traffic off Neon — but it is NOT a distributed guarantee. For hard,
// cross-instance limits, put Vercel Firewall (WAF rate rules) or an Upstash
// Redis limiter in front; this is the free, zero-dependency first line.
//
// Tunable via env (defaults are generous — real human traffic to a single
// miner link never approaches them; a flood does):
//   RATE_LIMIT_MAX        requests per IP per window        (default 120)
//   RATE_LIMIT_WINDOW_MS  window length in ms               (default 60000)

const MAX = Number(process.env.RATE_LIMIT_MAX ?? 120);
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);

// ip -> timestamps of recent requests within the window
const hits = new Map<string, number[]>();

// Returns true if this IP is OVER its budget and should be shed. Fails open on a
// missing IP (better to serve than to wrongly block when we can't identify).
export function rateLimited(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const recent = (hits.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= MAX) {
    hits.set(ip, recent); // keep the trimmed window; don't record the shed hit
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map can't grow without bound under churn.
  if (hits.size > 20_000) {
    for (const [k, v] of hits) {
      if (!v.length || v[v.length - 1] < cutoff) hits.delete(k);
    }
  }
  return false;
}

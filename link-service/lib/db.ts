// Neon Postgres client (serverless HTTP driver).
//
// One shared `sql` tagged-template function for the whole app. The HTTP driver
// is a good fit for serverless: each query is a stateless fetch, no connection
// pool to manage. Set DATABASE_URL (Neon connection string) in .env.local
// locally and as a Vercel env var in production.
//
// The client is created lazily on first query so that merely importing this
// module never throws — the build can collect routes without DATABASE_URL set,
// and a missing var surfaces as a clear runtime error instead.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local (and Vercel).");
    // The driver issues queries over fetch; Next.js caches fetch by default,
    // which would freeze dashboard counts at their first value. no-store makes
    // every query hit the database live.
    client = neon(url, { fetchOptions: { cache: "no-store" } });
  }
  return client;
}

// Proxy so call sites can use `sql\`...\`` and `sql.query(...)` exactly as if it
// were the real client, while construction stays deferred until first use.
export const sql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_t, _this, args: any[]) {
      return (getClient() as any)(...args);
    },
    get(_t, prop) {
      return (getClient() as any)[prop];
    },
  }
);

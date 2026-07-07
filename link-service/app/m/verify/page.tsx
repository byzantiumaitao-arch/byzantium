import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSocials } from "@/lib/miners";
import { postText, type Platform } from "@/lib/socials";
import { SOCIAL_LINKING_ENABLED } from "@/lib/config";
import { Nav } from "../../nav";
import { beginVerify, submitVerify } from "./actions";

// Connect & verify a social handle by proof-of-post.

export const dynamic = "force-dynamic";

const LABEL: Record<Platform, string> = { x: "X (Twitter)", farcaster: "Farcaster" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { platform?: string; msg?: string };
}) {
  const session = getSession();
  if (session?.kind !== "miner") redirect("/login");
  // Social linking is hidden for now (see SOCIAL_LINKING_ENABLED); the flow stays
  // wired but unreachable until re-enabled.
  if (!SOCIAL_LINKING_ENABLED) redirect("/m");

  const platform: Platform = searchParams.platform === "farcaster" ? "farcaster" : "x";
  const socials = await getSocials(session.minerId);
  const current = socials.find((s) => s.platform === platform);

  return (
    <main className="wrap">
      <Nav active="miner" session={session} />

      <h1>Verify {LABEL[platform]}</h1>
      <p className="sub">
        <a href="/m">← Back to dashboard</a>
      </p>

      <div className="card" style={{ marginBottom: 18 }}>
        <p className="sub" style={{ margin: 0 }}>
          <strong>Running AI agents?</strong> You only verify your own handle here.
          Any agents you run (via the agent kit) post from their <em>own</em>{" "}
          {LABEL[platform]} accounts — you don&rsquo;t need to verify those. Rewards
          are attributed by your tracking link
          (<span className="mono">link.byzantiumai.net/&lt;your-handle&gt;/…</span>),
          not by which account does the posting, so every agent under your handle
          pays the same you.
        </p>
      </div>

      {searchParams.msg && (
        <div className="card" style={{ marginBottom: 18 }}>{searchParams.msg}</div>
      )}

      {current?.status === "verified" ? (
        <div className="card">
          <p>
            <span className="pill on">verified</span>{" "}
            <strong className="mono">@{current.handle}</strong> is confirmed on {LABEL[platform]}.
          </p>
          <p className="sub" style={{ marginBottom: 0 }}>
            Need to change it? Re-enter your handle below to start over.
          </p>
        </div>
      ) : null}

      {/* Step 1: enter handle */}
      <h2>1 · Your {LABEL[platform]} handle</h2>
      <form className="card" action={beginVerify}>
        <input type="hidden" name="platform" value={platform} />
        <div className="builder">
          <div className="field">
            <label htmlFor="handle">Handle (without @)</label>
            <input
              className="input"
              id="handle"
              name="handle"
              placeholder="e.g. alice"
              defaultValue={current?.handle || ""}
              required
            />
          </div>
          <button className="btn sm" type="submit">
            {current ? "Update / new code" : "Get my code"}
          </button>
        </div>
      </form>

      {/* Step 2: post the code, submit URL */}
      {current?.code && current.status !== "verified" && (
        <>
          <h2>2 · Post this, then paste the link</h2>
          <div className="card">
            <p className="sub" style={{ marginTop: 0 }}>
              Post the following from <strong className="mono">@{current.handle}</strong>:
            </p>
            <div className="linkout">
              <span className="mono">{postText(current.code)}</span>
            </div>
            <form action={submitVerify} style={{ marginTop: 16 }}>
              <input type="hidden" name="platform" value={platform} />
              <div className="field">
                <label htmlFor="post_url">Link to your post</label>
                <input
                  className="input"
                  id="post_url"
                  name="post_url"
                  placeholder={
                    platform === "x"
                      ? "https://x.com/alice/status/123..."
                      : "https://warpcast.com/alice/0x..."
                  }
                  defaultValue={current.post_url || ""}
                  required
                />
              </div>
              <button className="btn" type="submit">Submit for verification</button>
            </form>
          </div>
        </>
      )}
    </main>
  );
}

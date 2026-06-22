import { signup } from "../login/actions";

// Miner sign up. handle becomes the link slug (/<handle>/<campaign>).

export const dynamic = "force-dynamic";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="wrap">
      <form className="login card" action={signup}>
        <h1 style={{ marginBottom: 6 }}>Become a miner</h1>
        <p className="sub" style={{ marginBottom: 22 }}>
          Create an account to get your tracking links and verify your socials.
        </p>

        {searchParams.error && <div className="error">{searchParams.error}</div>}

        <div className="field">
          <label htmlFor="handle">Handle (your link slug)</label>
          <input
            className="input"
            id="handle"
            name="handle"
            placeholder="e.g. alice"
            pattern="[A-Za-z0-9_-]{2,32}"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="display_name">Display name (optional)</label>
          <input className="input" id="display_name" name="display_name" placeholder="Alice" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <button className="btn" type="submit">Create account</button>

        <p className="sub" style={{ marginTop: 18, marginBottom: 0, textAlign: "center" }}>
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </form>
    </main>
  );
}

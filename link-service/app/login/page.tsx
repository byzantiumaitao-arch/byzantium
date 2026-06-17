import { login } from "./actions";

// Shared login page for both roles. /login?role=admin or /login?role=miner.
// Miners also enter their handle so the session knows whose data to show.

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { role?: string; error?: string; next?: string };
}) {
  const role = searchParams.role === "admin" ? "admin" : "miner";
  const isAdmin = role === "admin";

  return (
    <main className="wrap">
      <form className="login card" action={login}>
        <h1 style={{ marginBottom: 6 }}>
          {isAdmin ? "Admin sign in" : "Miner sign in"}
        </h1>
        <p className="sub" style={{ marginBottom: 22 }}>
          {isAdmin
            ? "Manage campaigns and view all click activity."
            : "View clicks and links for your miner handle."}
        </p>

        {searchParams.error && (
          <div className="error">Incorrect details — try again.</div>
        )}

        <input type="hidden" name="role" value={role} />
        {searchParams.next && (
          <input type="hidden" name="next" value={searchParams.next} />
        )}

        {!isAdmin && (
          <div className="field">
            <label htmlFor="miner">Miner handle</label>
            <input
              className="input"
              id="miner"
              name="miner"
              placeholder="e.g. alice"
              autoComplete="username"
              required
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <button className="btn" type="submit">
          Sign in
        </button>

        <p className="sub" style={{ marginTop: 18, marginBottom: 0, textAlign: "center" }}>
          {isAdmin ? (
            <a href="/login?role=miner">Miner sign in →</a>
          ) : (
            <a href="/login?role=admin">Admin sign in →</a>
          )}
        </p>
      </form>
    </main>
  );
}

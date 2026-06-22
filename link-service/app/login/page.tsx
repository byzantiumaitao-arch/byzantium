import { minerLogin, adminLogin } from "./actions";

// Login. /login for miners (email/password), /login?role=admin for the operator.

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { role?: string; error?: string };
}) {
  const isAdmin = searchParams.role === "admin";

  return (
    <main className="wrap">
      <form className="login card" action={isAdmin ? adminLogin : minerLogin}>
        <h1 style={{ marginBottom: 6 }}>{isAdmin ? "Admin sign in" : "Miner sign in"}</h1>
        <p className="sub" style={{ marginBottom: 22 }}>
          {isAdmin ? "Operator access." : "Access your clicks, links and verification."}
        </p>

        {searchParams.error && <div className="error">{searchParams.error}</div>}

        {!isAdmin && (
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
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

        <button className="btn" type="submit">Sign in</button>

        <p className="sub" style={{ marginTop: 18, marginBottom: 0, textAlign: "center" }}>
          {isAdmin ? (
            <a href="/login">Miner sign in →</a>
          ) : (
            <>
              No account? <a href="/signup">Sign up</a> · <a href="/login?role=admin">Admin</a>
            </>
          )}
        </p>
      </form>
    </main>
  );
}

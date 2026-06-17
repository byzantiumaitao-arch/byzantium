import { type Session } from "@/lib/auth";

// Top navigation shared by all dashboards. Links shown depend on who's signed in.
export function Nav({
  active,
  session,
}: {
  active: "overview" | "miner" | "admin";
  session: Session | null;
}) {
  return (
    <nav className="nav">
      <span className="brand">Byzanti&#1606;m</span>
      <span className="links">
        <a href="/dashboard" className={active === "overview" ? "active" : ""}>
          Overview
        </a>
        {session?.role === "miner" && (
          <a href="/m" className={active === "miner" ? "active" : ""}>
            My dashboard
          </a>
        )}
        {session?.role === "admin" && (
          <a href="/admin" className={active === "admin" ? "active" : ""}>
            Admin
          </a>
        )}
        {session ? (
          <a href="/logout">Sign out</a>
        ) : (
          <a href="/login?role=miner">Sign in</a>
        )}
      </span>
    </nav>
  );
}

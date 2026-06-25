import { type Session } from "@/lib/auth";

// Top navigation shared by all dashboards. Links depend on who's signed in.
export function Nav({
  active,
  session,
}: {
  active: "overview" | "miner" | "admin" | "miners" | "campaigns";
  session?: Session | null;
}) {
  return (
    <nav className="nav">
      <span className="brand">Byzanti&#1606;m</span>
      <span className="links">
        <a href="/dashboard" className={active === "overview" ? "active" : ""}>
          Overview
        </a>
        {session?.kind === "miner" && (
          <a href="/m" className={active === "miner" ? "active" : ""}>
            My dashboard
          </a>
        )}
        {session?.kind === "admin" && (
          <>
            <a href="/admin" className={active === "admin" ? "active" : ""}>
              Admin
            </a>
            <a href="/admin/miners" className={active === "miners" ? "active" : ""}>
              Miners
            </a>
            <a href="/admin/campaigns" className={active === "campaigns" ? "active" : ""}>
              Campaigns
            </a>
          </>
        )}
        {session ? (
          <a href="/logout">Sign out</a>
        ) : (
          <>
            <a href="/login">Sign in</a>
            <a href="/signup">Sign up</a>
          </>
        )}
      </span>
    </nav>
  );
}

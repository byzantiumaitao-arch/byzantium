// Top navigation shared by all dashboards.
//
// NOTE: auth is temporarily disabled ("take out password for now"), so every
// link is shown and the sign-in/out items are gone. To restore gating, revert
// this file plus the auth checks in app/m/page.tsx and app/admin/page.tsx.
export function Nav({ active }: { active: "overview" | "miner" | "admin" }) {
  return (
    <nav className="nav">
      <span className="brand">Byzanti&#1606;m</span>
      <span className="links">
        <a href="/dashboard" className={active === "overview" ? "active" : ""}>
          Overview
        </a>
        <a href="/m" className={active === "miner" ? "active" : ""}>
          Miner
        </a>
        <a href="/admin" className={active === "admin" ? "active" : ""}>
          Admin
        </a>
      </span>
    </nav>
  );
}

// Bare-root landing. Nobody should normally hit link.byzantiumai.net directly —
// the value is in /<slug> — so this is a tiny placeholder, not a real page.

export default function Home() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 640,
        margin: "12vh auto",
        padding: "0 24px",
        color: "#e8e6f0",
        background: "transparent",
      }}
    >
      <h1 style={{ fontWeight: 600 }}>Byzanti&#1606;m link service</h1>
      <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
        This domain shortens and tracks miner links. There&rsquo;s nothing to see
        here directly &mdash; visit{" "}
        <a href="https://byzantiumai.net" style={{ color: "#c9a84a" }}>
          byzantiumai.net
        </a>{" "}
        to learn more.
      </p>
    </main>
  );
}

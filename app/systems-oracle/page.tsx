import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Systems Oracle · Kiduna Design" },
  description: "A symbolic operating manual for the systems humans build: 360 canonical artifacts, lineages, relationships, spreads, games, and an enamel visual system.",
  openGraph: {
    title: "Systems Oracle · Kiduna Design",
    description: "Structure becomes meaning. Explore 360 canonical systems artifacts and the relationships between them.",
    images: ["/systems-oracle-app/assets/references/reference-01.webp"],
  },
};

export default function SystemsOraclePage() {
  return (
    <main className="oracle-frame-shell">
      <nav className="system-strip oracle-system-strip" aria-label="Kiduna systems">
        <span className="system-strip-label">Kiduna systems</span>
        <a className="system-chip" href="/">Royals &amp; Rogues</a>
        <a className="system-chip active" href="/systems-oracle" aria-current="page">Systems Oracle <span aria-hidden="true">✦</span></a>
        <a className="oracle-open" href="/systems-oracle-app/index.html#home" target="_blank" rel="noreferrer">Open full canvas ↗</a>
      </nav>
      <iframe
        className="oracle-frame"
        src="/systems-oracle-app/index.html#home"
        title="Systems Oracle"
        allow="fullscreen"
      />
    </main>
  );
}

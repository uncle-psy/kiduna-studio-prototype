import type { Metadata } from "next";
import styles from "./oracle.module.css";

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
    <main className={styles.shell}>
      <nav className={styles.strip} aria-label="Kiduna systems">
        <a className={styles.brand} href="/">Kiduna Design</a>
        <span className={styles.label}>System 07</span>
        <a className={styles.chip} href="/">All systems</a>
        <a className={`${styles.chip} ${styles.active}`} href="/systems-oracle" aria-current="page">Systems Oracle <span aria-hidden="true">✦</span></a>
        <a className={styles.open} href="/systems-oracle-app/index.html#home" target="_blank" rel="noreferrer">Open full canvas ↗</a>
      </nav>
      <iframe
        className={styles.frame}
        src="/systems-oracle-app/index.html#home"
        title="Systems Oracle"
        allow="fullscreen"
      />
    </main>
  );
}

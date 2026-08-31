import type { Metadata } from "next";
import { HubHeader } from "../ui/HubHeader";
import styles from "./power-maps.module.css";

export const metadata: Metadata = {
  title: "Power Maps — Kiduna Design",
  description: "The current index of independently versioned Kiduna Power Maps, including The Living Mirror V0.04.",
};

const maps = [
  { name: "The Living Mirror", version: "V0.04", status: "Published · production complete", detail: "366 nodes · 962 typed edges · 68 native-2048 Cards · 298 fallback Icons", href: "/mapshifting/animal-deck", active: true },
  { name: "FORCES OF NATURE", version: "V1.0.0", status: "Published · production complete", detail: "589 nodes · 2,517 typed edges · 81 Cards · 589 Icons", href: "https://kiduna-ai-working-preview-0828.motodave.chatgpt.site/power-maps/forces-of-nature", active: true },
  { name: "It’s the Law", version: "V0.07", status: "Published · production complete", detail: "132 nodes · 310 typed edges · 132 finished Cards", href: "https://kiduna-ai-working-preview-0828.motodave.chatgpt.site/power-maps/the-law", active: true },
  { name: "Big Tech", version: "V0.02", status: "Visual library complete", detail: "360 artifacts · human blind review open", href: "/systems-oracle", active: true },
  { name: "Service, Force & Memory", version: "V0.02", status: "High-resolution master release", detail: "320 nodes · 425 local visual masters", href: "/military-systems", active: true },
  { name: "Civic Fury", version: "V0.01", status: "Complete validated release", detail: "1,168 nodes · political change and civic power", href: "/political-change", active: true },
  { name: "Ultimate Science Fiction & Disclosure Oracle", version: "V0.01", status: "Complete portable release", detail: "480 tiles · evidence-aware speculative inquiry", href: "/science-fiction-disclosure", active: true },
  { name: "Real Estate & Mortgage", version: "V0.01", status: "Complete validated release", detail: "659 nodes · land, shelter, ownership, debt, and capital", href: "/real-estate-mortgage", active: true },
  { name: "The Tao — Enamel Oracle", version: "V0.01", status: "Semantic and visual complete", detail: "75 nodes · source, polarity, transformation, and return", href: "/tao", active: true },
  { name: "Mapshifting Alchemy", version: "V0.01", status: "Visual complete · text partial", detail: "50 Cards · 100 visual expressions", href: "/mapshifting/alchemy-deck", active: true },
  { name: "Black Love", version: "V0.01", status: "Complete · print upgrade pending", detail: "252-node living cultural Power Map", active: false },
  { name: "The Solana Power Map", version: "V0.01", status: "Complete research release", detail: "105 nodes · technology, economy, institutions, and culture", active: false },
  { name: "The Living Measure", version: "V0.01", status: "Creative edition · cultural review pending", detail: "36-card sacred-geometry Power Map", active: false },
  { name: "Computing Power Map", version: "V0.01", status: "Registered seed", detail: "Source corpus not yet located", active: false },
];

export default function PowerMapsPage() {
  return <div className={styles.page}>
    <HubHeader />
    <main>
      <section className={styles.hero}>
        <div>
          <p>POWER MAPS · CURRENT INDEX · CANON V0.52</p>
          <h1>Living systems,<br /><span>made traversable.</span></h1>
          <div className={styles.metrics}><b>14 registered maps</b><b>Independently versioned</b><b>Cards + scalable Icons</b></div>
        </div>
        <p>A Power Map connects meanings, evidence, relationships, tensions, paths, practices, and expressions without pretending that a portable release is the living map itself.</p>
      </section>

      <section className={styles.feature}>
        <div className={styles.triptych} aria-label="Corrected Living Mirror card art">
          <img src="/mapshifting/animal/cards/007-american-bison.jpg" alt="A stately full-body American bison standing on a moonlit prairie" />
          <img src="/mapshifting/animal/cards/033-king-cobra.jpg" alt="A whole king cobra with one continuous coiled body and one tail" />
          <img src="/mapshifting/animal/cards/043-atlantic-salmon.jpg" alt="An Atlantic salmon leaping with a complete shallowly forked tail" />
        </div>
        <div className={styles.featureCopy}>
          <p>NEW PUBLISHED RELEASE · V0.04</p>
          <h2>The Living Mirror</h2>
          <span>Animals as living beings first and symbolic mirrors second. The completed release joins a 366-node typed graph to 68 native 2,048-pixel text-free Cards, a reversible Card back, and 298 SVG Icons.</span>
          <ul><li>Stately American Bison composition</li><li>Anatomically continuous King Cobra</li><li>Correct Atlantic Salmon caudal fin</li></ul>
          <a href="/mapshifting/animal-deck">Enter The Living Mirror <b>→</b></a>
        </div>
      </section>

      <section className={styles.index}>
        <header><p>REGISTERED RELEASES</p><h2>The current field</h2><span>Published routes open directly. Registered portable releases without a public surface remain visible with their honest status.</span></header>
        <div className={styles.grid}>{maps.map((map, index) => {
          const content = <><small>{String(index + 1).padStart(2, "0")} · {map.version}</small><h3>{map.name}</h3><b>{map.status}</b><p>{map.detail}</p><span>{map.active ? "Open release →" : "Registered portable release"}</span></>;
          return map.active && map.href ? <a className={styles.map} href={map.href} key={map.name}>{content}</a> : <article className={styles.map} key={map.name}>{content}</article>;
        })}</div>
      </section>
    </main>
    <footer className={styles.footer}><a href="/">← Kiduna Design</a><span>Power Maps Kit V0.14 · Canon V0.52</span></footer>
  </div>;
}

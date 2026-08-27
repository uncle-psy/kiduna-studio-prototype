import styles from "../hub.module.css";

const isometric = [
  ["Overview", "/isometric"],
  ["Visual DNA", "/isometric/visual-dna"],
  ["30° Isometric", "/isometric/isometric"],
  ["Light + materials", "/isometric/lighting-materials"],
  ["Components", "/isometric/components"],
  ["Entities + portals", "/isometric/entities-portals"],
  ["Animation", "/isometric/animation"],
  ["Composition", "/isometric/composition"],
  ["Reference scenes", "/isometric/scenes"],
  ["Schemas", "/isometric/schemas"],
  ["AI generation", "/isometric/ai-generation"],
  ["Validation", "/isometric/validation"],
  ["Downloads", "/isometric/downloads"],
];

const royals = [
  ["Royals & Rogues", "/royals-and-rogues"],
  ["How to play", "/royals-and-rogues/flow"],
  ["Rules", "/royals-and-rogues/rules"],
  ["Card library", "/royals-and-rogues/cards"],
  ["Original → final", "/royals-and-rogues/compare"],
  ["World art", "/royals-and-rogues/decorative"],
  ["Verification", "/royals-and-rogues/reports"],
  ["Developer kits", "/royals-and-rogues/downloads"],
];

export function HubHeader({ section }: { section?: "isometric" | "royals" }) {
  const items = section === "isometric" ? isometric : section === "royals" ? royals : [];
  return <>
    <header className={styles.header}>
      <a className={styles.logo} href="/" aria-label="Kiduna Design home">
        <img src="/assets/kiduna/mark.svg" alt="" />
        <span><strong>KIDUNA</strong><small>DESIGN</small></span>
      </a>
      <nav className={styles.primaryNav} aria-label="Primary">
        <a href="/">Home</a>
        <a href="/#mapshifting">Mapshifting</a>
        <details>
          <summary>Systems <span>⌄</span></summary>
          <div className={styles.menu}>
            <a href="/isometric"><small>01 · SPATIAL FOUNDATION</small><b>Isometric Scene System</b><span>Visual constitution, components, schemas, and downloads.</span></a>
            <a href="/royals-and-rogues"><small>02 · GAME LIBRARY</small><b>Royals &amp; Rogues</b><span>Rules, canonical cards, final art, evidence, and developer kits.</span></a>
            <a href="/coherence"><small>03 · ALIGNMENT SYSTEM</small><b>Kiduna Coherence</b><span>HEARTS translation, scales, measurement, governance, and the complete package.</span></a>
            <a href="/bellwether"><small>04 · REFERENCE IMPLEMENTATION</small><b>Bellwether</b><span>A complete Level 1 world, connected Scenes, Actors, quests, schemas, validation, and developer package.</span></a>
            <a href="/biology-deck"><small>05 · SYMBOLIC SYSTEM</small><b>Biology Deck</b><span>84 cards, living operations, relationships, spreads, research, and a complete manual.</span></a>
            <a href="/pop-culture-deck"><small>06 · CULTURAL SYSTEM</small><b>Pop Culture Deck</b><span>210 cards, cultural lineages, divination, games, provenance, and complete developer packages.</span></a>
            <a href="/systems-oracle"><small>07 · SYMBOLIC SYSTEM</small><b>Systems Oracle</b><span>360 human-made systems, relationships, spreads, games, provenance, and an enamel visual language.</span></a>
            <a href="/tao"><small>08 · ORACLE SYSTEM</small><b>The Tao</b><span>75 enamel tiles, five cosmological levels, 302 relationships, complete manual, and production grammar.</span></a>
            <a href="/political-change"><small>09 · LIVING SYMBOLIC SYSTEM</small><b>Political Change</b><span>1,168 core nodes, 2,287 typed relations, 160 mapshifts, provenance, games, and complete archive.</span></a>
            <a href="/science-fiction-disclosure"><small>10 · MAPSHIFTING SYSTEM</small><b>Science Fiction &amp; Disclosure</b><span>480 Tiles, 2,226 typed relations, evidence states, oracle, games, story lab, and complete archive.</span></a>
            <a href="/real-estate-mortgage"><small>11 · PROPERTY SYSTEM</small><b>Real Estate &amp; Mortgage</b><span>659 enamel tiles, 1,302 typed relationships, complete dossiers, graph, games, provenance, and portable system.</span></a>
            <a href="/military-systems"><small>12 · MAPSHIFTING SYSTEM</small><b>Military Systems</b><span>Power, sustainment, 73 Easting, Veterans, Gulf War illness, VA navigation, family care, crisis handoffs, and memory.</span></a>
          </div>
        </details>
      </nav>
      <p>CONCEPTUAL PROTOTYPES</p>
    </header>
    {items.length > 0 && <nav className={styles.subnav} aria-label={`${section} sections`}>
      <span>{section === "isometric" ? "ISOMETRIC SCENE SYSTEM" : "ROYALS & ROGUES"}</span>
      <div>{items.map(([label, href]) => <a href={href} key={href}>{label}</a>)}</div>
    </nav>}
  </>;
}

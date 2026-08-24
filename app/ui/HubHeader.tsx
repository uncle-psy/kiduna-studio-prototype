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

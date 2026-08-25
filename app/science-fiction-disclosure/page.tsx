import type { Metadata } from "next";
import Link from "next/link";
import { HubHeader } from "../ui/HubHeader";
import styles from "./science-fiction-disclosure.module.css";

export const metadata: Metadata = {
  title: "Science Fiction & Disclosure — Kiduna Design",
  description:
    "An evidence-aware Mapshifting system for exploring science fiction, disclosure narratives, starseed cosmologies, speculative technology, cultural myth, and symbolic meaning.",
};

const featuredTiles = [
  ["Disclosure", "events", "disclosure", "What changes when hidden knowledge becomes public?"],
  ["Starseed", "beings", "starseed", "Identity story, cosmic belonging, and symbolic vocation."],
  ["Secret Space Program", "programs", "secret-space-program", "A contested narrative of hidden capability and power."],
  ["Space Memory Network", "cosmologies", "space-memory-network", "The cosmos imagined as a field that remembers."],
  ["Structured Water", "technologies", "structured-water", "Established chemistry, active research, and amplified claims kept distinct."],
  ["Zero-Point Energy", "technologies", "zero-point-energy", "A scientific term moving through speculation and cultural imagination."],
  ["Near-Death Experience", "states", "near-death-experience", "Experience, interpretation, research, and meaning without forced synthesis."],
  ["Ontological Shock", "states", "ontological-shock", "The destabilization that follows a map-breaking encounter."],
] as const;

const lenses = [
  ["Documented", "Established science, documented history, and source-supported cultural facts."],
  ["Contested", "Claims with evidence, counterevidence, uncertainty, provenance, and review needs."],
  ["Fictional", "Worlds, technologies, beings, and story structures treated as fiction—not smuggled into fact."],
  ["Symbolic", "Archetypal and divinatory meaning offered as a lens for reflection, never as proof."],
] as const;

export default function ScienceFictionDisclosurePage() {
  return (
    <div className={styles.page}>
      <HubHeader />
      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>KIDUNA · MAPSHIFTING SYSTEM · VERSION 1.0.0</p>
            <h1>Science Fiction<br/><em>&amp; Disclosure.</em></h1>
            <p className={styles.dek}>A living inquiry instrument for the stories that rearrange reality: science fiction, starseed cosmologies, disclosure narratives, speculative technology, high strangeness, and the human need to make meaning.</p>
            <p className={styles.boundary}>It does not ask you to believe or disbelieve the whole field. It keeps evidence states visible, preserves contradiction, and lets documented, speculative, fictional, experiential, and symbolic layers remain different.</p>
            <div className={styles.actions}>
              <a className={styles.primaryButton} href="/science-fiction-disclosure/oracle/index.html#home">Open the interactive system</a>
              <a href="/downloads/Science-Fiction-Disclosure-System-Complete-v1.0.0.zip" download>Download complete system ↓</a>
            </div>
            <div className={styles.metrics} aria-label="System totals">
              <div><b>1,500</b><span>evaluated candidates</span></div>
              <div><b>480</b><span>canonical tiles</span></div>
              <div><b>2,226</b><span>typed relationships</span></div>
              <div><b>102</b><span>registered sources</span></div>
            </div>
          </div>
          <figure className={styles.heroArt}>
            <span className={styles.orbit} aria-hidden="true" />
            <img src="/science-fiction-disclosure/featured-enamel-network.png" alt="Five illuminated brass and enamel inquiry tiles joined by fine relationship lines on black obsidian" width={1792} height={1024}/>
            <figcaption><b>Five maps. One field of inquiry.</b><span>Physical enamel instruments connect Disclosure, Starseed, hidden programs, cosmic memory, and living systems without collapsing their claim types.</span></figcaption>
          </figure>
        </section>

        <section className={styles.thesis}>
          <div><p className={styles.eyebrow}>THE MAPSHIFT</p><h2>From a battle over belief<br/><em>to a practice of discernment.</em></h2></div>
          <div className={styles.shiftPair}>
            <article><small>DEFAULT MAP</small><p>Either every extraordinary claim is true, or the entire field is meaningless.</p></article>
            <i>↓ change the map</i>
            <article><small>CHANGED MAP</small><p>A claim can be historically influential, psychologically revealing, symbolically useful, experientially real, or fictionally generative without being established fact.</p></article>
          </div>
        </section>

        <section className={styles.lenses}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>EPISTEMIC ARCHITECTURE</p><h2>Different kinds of truth<br/>keep different names.</h2><p>Every Tile carries source references, epistemic layers, safety notes, relationships, polarities, divination prompts, grounded questions, and integration actions. Contradictory evidence remains visible instead of being harmonized into a hidden synthesis.</p></div>
          <div className={styles.lensGrid}>{lenses.map(([name, copy], index) => <article key={name}><span>0{index + 1}</span><h3>{name}</h3><p>{copy}</p></article>)}</div>
        </section>

        <section className={styles.tiles}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>FEATURED REFERENCE TILES</p><h2>A field wider than<br/>one explanation.</h2><p>These 58 reference artworks anchor a reproducible visual grammar across the 480-Tile core. Enter the interactive system to search classes, inquiry domains, evidence states, graph relations, lineages, divination, games, and story generation.</p></div>
          <div className={styles.tileGrid}>{featuredTiles.map(([title, family, slug, copy], index) => <a href={`/science-fiction-disclosure/oracle/index.html#tiles`} className={styles.tile} key={slug}><img src={`/science-fiction-disclosure/oracle/assets/reference-tiles/sfoc-${family}-${slug}.svg`} alt=""/><span>{String(index + 1).padStart(2, "0")} · {family}</span><h3>{title}</h3><p>{copy}</p></a>)}</div>
          <a className={styles.explore} href="/science-fiction-disclosure/oracle/index.html#tiles">Explore all 480 Tiles <b>→</b></a>
        </section>

        <section className={styles.instruments}>
          <div><p className={styles.eyebrow}>ONE SYSTEM · MANY INSTRUMENTS</p><h2>Explore it as an atlas,<br/>oracle, graph, or story lab.</h2></div>
          <div className={styles.instrumentGrid}>
            <a href="/science-fiction-disclosure/oracle/index.html#graph"><small>RELATIONSHIP ATLAS</small><h3>Typed graph</h3><p>2,226 relationships across causation, analogy, contrast, ancestry, cultural transmission, and symbolic resonance.</p><b>Open graph →</b></a>
            <a href="/science-fiction-disclosure/oracle/index.html#divination"><small>REFLECTIVE PRACTICE</small><h3>Oracle + spreads</h3><p>Twelve spreads with evidence-first reading controls, alternate lenses, decision-bearing questions, and grounded action.</p><b>Draw a reading →</b></a>
            <a href="/science-fiction-disclosure/oracle/index.html#games"><small>PLAYABLE SYSTEM</small><h3>Games + lineages</h3><p>Twelve games and fourteen lineages turn the archive into collaborative inquiry, pattern recognition, and worldbuilding.</p><b>Explore play →</b></a>
            <a href="/science-fiction-disclosure/oracle/index.html#story"><small>GENERATIVE ENGINE</small><h3>Story laboratory</h3><p>Six generators compose characters, worlds, factions, quests, cosmologies, and stories without erasing provenance.</p><b>Enter story lab →</b></a>
          </div>
        </section>

        <section className={styles.safety}>
          <div><p className={styles.eyebrow}>INQUIRY WITHOUT CAPTURE</p><h2>Meaning stays possible.<br/><em>Agency stays yours.</em></h2></div>
          <p>Health Tiles do not diagnose or market miracle repair. Experiential Tiles do not certify frightening external causes. Political and conspiracy Tiles reject collective guilt, racialized tropes, self-sealing enemy models, and allegations about living people. A reading stops when it increases compulsion, fear, persecutory certainty, dangerous investigation, or dependence on the system.</p>
        </section>

        <section className={styles.complete}>
          <div><p className={styles.eyebrow}>THE COMPLETE EDITION</p><h2>Keep the whole field<br/>inspectable.</h2><p>The validated archive contains 480 full Tile dossiers, the 1,500-candidate ledger, relationship graph, schemas, 28 manual chapters, 14 lineages, 12 spreads, 12 games, six generators, 102-source registry, visual constitution, 58 reference Tiles at multiple resolutions, research notes, static application, validation scripts, and results.</p></div>
          <a className={styles.downloadCard} href="/downloads/Science-Fiction-Disclosure-System-Complete-v1.0.0.zip" download><small>VERSION 1.0.0 · 84 CHECKS PASSED</small><h3>Science Fiction &amp; Disclosure</h3><p>480 Tiles · 2,226 relations · 14 lineages · 12 spreads · 12 games · 6 generators · 102 sources</p><b>Download complete ZIP ↓</b></a>
        </section>
      </main>
      <footer className={styles.footer}><img src="/assets/kiduna/mark.svg" alt="" width={28} height={28}/><p>A provenance-aware instrument for reality-bending stories.</p><Link href="/">Kiduna.design →</Link></footer>
    </div>
  );
}

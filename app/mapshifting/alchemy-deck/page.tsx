import type { Metadata } from "next";
import Link from "next/link";
import AlchemyCardLibrary from "./AlchemyCardLibrary";

export const metadata: Metadata = {
  title: "Mapshifting Alchemy Deck · Complete Card Library",
  description:
    "All 50 source-backed Alchemy card dossiers with gifts, wounds, correspondences, narratives, descriptions, and 100 finished compositions.",
};

export default function AlchemyDeckPage() {
  return (
    <div className="deck-site alchemy-deck">
      <header className="deck-header">
        <Link className="deck-brand" href="/">
          <img src="/assets/kiduna/mark.svg" alt="" width={32} height={32} />
          <span><b>Kiduna</b><small>Mapshifting Decks</small></span>
        </Link>
        <nav aria-label="Deck navigation">
          <a href="#gallery">Complete gallery</a>
          <a href="#contact-sheets">Contact sheets</a>
          <a href="#downloads">Download</a>
        </nav>
        <Link className="deck-back" href="/#mapshifting">All decks ←</Link>
      </header>

      <main>
        <section className="deck-hero alchemy-hero">
          <div className="deck-hero-copy">
            <p className="deck-eyebrow">THE BOOK OF ALCHEMY</p>
            <span className="deck-status">Complete card library · 2026 web edition</span>
            <h1>Mapshifting<em>Alchemy Deck</em></h1>
            <p>
              Fifty alchemical identities, each interpreted twice: a portrait card and an independently composed
              landscape field. Together they form one jewel-toned enamel system of transformation, relationship,
              protection, vitality, wealth, and power.
            </p>
            <div className="deck-actions">
              <a className="deck-button primary" href="#gallery">Enter the gallery</a>
              <a className="deck-button" href="#downloads">Download the web art ↓</a>
            </div>
            <div className="deck-metrics">
              <div><b>50</b><span>card identities</span></div>
              <div><b>100</b><span>finished compositions</span></div>
              <div><b>6</b><span>visual families</span></div>
            </div>
          </div>

          <div className="alchemy-hero-gallery" aria-label="Selected finished Alchemy artwork">
            <figure className="alchemy-hero-landscape">
              <img src="/mapshifting/alchemy/cards/card-050-master-landscape-w960.webp" alt="Master, landscape composition" width={960} height={540} />
            </figure>
            <figure className="alchemy-hero-portrait">
              <img src="/mapshifting/alchemy/cards/card-001-examine-portrait-w540.webp" alt="Examine, portrait composition" width={540} height={960} />
            </figure>
            <span className="alchemy-orbit one" />
            <span className="alchemy-orbit two" />
          </div>
        </section>

        <section className="deck-principles" aria-label="Art library principles">
          <article><small>01 · TWO VIEWS</small><h2>Composed twice.</h2><p>Portrait and landscape are distinct artworks, not automated crops. Every card can become an object or a field.</p></article>
          <article><small>02 · ONE SYSTEM</small><h2>Alchemy in enamel.</h2><p>Midnight depth, warm brass, orbital geometry, and jewel-tone color hold the complete suite together.</p></article>
          <article><small>03 · SOURCE FIDELITY</small><h2>Countable details endure.</h2><p>Figures, vessels, creatures, correspondences, and relationships were checked across the full visual suite.</p></article>
        </section>

        <section className="alchemy-gallery" id="gallery">
          <div className="deck-section-heading">
            <div><p className="deck-eyebrow">COMPLETE ART LIBRARY</p><h2>Fifty cards. One hundred finished works.</h2></div>
            <p>
              The card order is preserved across five nine-card suits and five Wild Cards. Open either artwork at
              web resolution, or choose “Read the complete card” for its gifts, wounds, narrative, description, and correspondences.
            </p>
          </div>

          <AlchemyCardLibrary />
        </section>

        <section className="alchemy-contact-section" id="contact-sheets">
          <div className="deck-section-heading">
            <div><p className="deck-eyebrow">THE COMPLETE WALL</p><h2>See the system as a whole.</h2></div>
            <p>The contact sheets make pacing, color families, recurring geometry, and variation visible at a glance.</p>
          </div>
          <div className="alchemy-contact-grid">
            <a href="/mapshifting/alchemy/contact-sheets/mapshifting-alchemy-portrait-contact-sheet.jpg" target="_blank" rel="noreferrer">
              <img src="/mapshifting/alchemy/contact-sheets/mapshifting-alchemy-portrait-contact-sheet.jpg" alt="Contact sheet of all 50 portrait Alchemy artworks" width={2560} height={9520} loading="lazy" />
              <span><b>Portrait contact sheet</b><small>50 compositions · Open full size ↗</small></span>
            </a>
            <a href="/mapshifting/alchemy/contact-sheets/mapshifting-alchemy-landscape-contact-sheet.jpg" target="_blank" rel="noreferrer">
              <img src="/mapshifting/alchemy/contact-sheets/mapshifting-alchemy-landscape-contact-sheet.jpg" alt="Contact sheet of all 50 landscape Alchemy artworks" width={2560} height={3300} loading="lazy" />
              <span><b>Landscape contact sheet</b><small>50 compositions · Open full size ↗</small></span>
            </a>
          </div>
        </section>

        <section className="alchemy-production">
          <div><p className="deck-eyebrow">COMPLETE CARD RELEASE</p><h2>Art and recovered meaning, together.</h2><p>The site carries all 100 approved compositions plus a source-backed dossier for every card. Each dossier brings together gifts, wounds, correspondences, the recovered narrative, and the complete visual description while keeping unresolved source gaps visible.</p></div>
          <ol><li><span>01</span><p>50 portrait masters reviewed as full compositions.</p></li><li><span>02</span><p>50 landscape masters reviewed independently—not cropped from portrait.</p></li><li><span>03</span><p>Each card opens into one scrollable information dossier.</p></li><li><span>04</span><p>Unrecovered information is identified explicitly rather than silently reconstructed.</p></li></ol>
        </section>

        <section className="deck-downloads" id="downloads">
          <div><p className="deck-eyebrow">DOWNLOADS</p><h2>Carry the complete web art library.</h2><p>The web edition includes every finished portrait and landscape composition used on this page, plus both contact sheets and its card index. The earlier source-recovery package remains available as historical working material.</p></div>
          <div>
            <a href="/downloads/Mapshifting-Alchemy-Deck-Finished-Art-Web.zip" download><span>COMPLETE WEB EDITION</span><h3>100 finished Alchemy artworks</h3><p>All 50 portrait and 50 landscape WebP compositions, card index, visual QA record, provenance note, and contact sheets.</p><b>↓</b></a>
            <a href="/downloads/Mapshifting-Alchemy-Deck-Working-Library.zip" download><span>HISTORICAL WORKING LIBRARY</span><h3>Source-recovery notes</h3><p>The previously published transfer notes, corrections, design directions, and recovery status record.</p><b>↓</b></a>
          </div>
        </section>
      </main>

      <footer className="deck-footer">
        <img src="/assets/kiduna/mark.svg" alt="" width={26} height={26} />
        <p>All 100 orientation-specific compositions and all currently recovered card readings are published here.</p>
        <Link href="/">Kiduna.design →</Link>
      </footer>
    </div>
  );
}

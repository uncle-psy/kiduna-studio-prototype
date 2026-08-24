import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mapshifting Alchemy Deck",
  description: "The preserved working library and source-recovery status for the Mapshifting Alchemy Deck.",
};

export default function AlchemyDeckPage() {
  return <div className="deck-site alchemy-deck">
    <header className="deck-header"><Link className="deck-brand" href="/"><img src="/assets/kiduna/mark.svg" alt="" width={32} height={32}/><span><b>Kiduna</b><small>Mapshifting Decks</small></span></Link><nav aria-label="Deck navigation"><a href="#preserved">Preserved</a><a href="#recovery">Recovery</a><a href="#downloads">Download</a></nav><Link className="deck-back" href="/#mapshifting">All decks ←</Link></header>
    <main>
      <section className="deck-hero alchemy-hero">
        <div className="deck-hero-copy"><p className="deck-eyebrow">THE BOOK OF ALCHEMY</p><span className="deck-status">Source recovery · Final card index not yet publishable</span><h1>Mapshifting<em>Alchemy Deck</em></h1><p>The working library preserves substantial readings and design notes across suits, grades, keywords, Gifts, imbalances, imagery, planetary balances, stones, layouts, corrections, and wild-card instructions. The original readings still need a source-faithful card-by-card export.</p><div className="deck-actions"><a className="deck-button primary" href="#preserved">See what is preserved</a><a className="deck-button" href="#downloads">Download the library ↓</a></div><div className="deck-metrics"><div><b>5</b><span>Egg corrections</span></div><div><b>1</b><span>confirmed Subdue pairing</span></div><div><b>Open</b><span>source recovery</span></div></div></div>
        <div className="alchemy-vessel" aria-label="Abstract alchemical vessel with four surrounding elements"><i/><i/><i/><i/><span className="alchemy-ring one"/><span className="alchemy-ring two"/><div><b>◆</b><small>THOUGHT</small><small>WORD</small><small>ACTION</small></div></div>
      </section>

      <section className="alchemy-preserved" id="preserved"><div className="deck-section-heading"><div><p className="deck-eyebrow">PRESERVED WORK</p><h2>A working map—not a reconstructed fiction.</h2></div><p>The archive records the shape of the deck and the next authoring work. It does not contain the complete word-for-word readings as individual card files, so this section does not invent them.</p></div><div className="alchemy-ledger"><article><small>STRUCTURE</small><h3>Suits, grades, and layouts</h3><p>Cross-card relationships, keywords, planetary balances, stones, visual instructions, and layout behavior are documented in the transfer notes.</p></article><article><small>CORRECTIONS</small><h3>The five Eggs</h3><p>Egg One—Protect · Egg Two—Secrete · Egg Three—Guard · Egg Four—Shelter · Egg Five—Fortify.</p></article><article><small>CONFIRMED DETAIL</small><h3>Subdue</h3><p>Mars–Uranus with bloodstone is preserved. Its final suit and card number must be reconciled against the source transcription.</p></article><article><small>MAPSHIFTING BRIDGE</small><h3>Inner and outer change</h3><p>The practice aligns thought, word, and action so transformation includes the participant, their circumstances, and the wider world.</p></article></div></section>

      <section className="alchemy-recovery" id="recovery"><div><p className="deck-eyebrow">RECOVERY SEQUENCE</p><h2>What happens next.</h2><p>The release gate is fidelity: preserve what was actually read, keep interpretation separate, and build indexes only after the source is complete.</p></div><ol><li><span>01</span><p>Locate or export the complete source readings.</p></li><li><span>02</span><p>Create one Markdown file per card, with the source reading clearly separated from concise interpretation.</p></li><li><span>03</span><p>Reconcile corrections, especially Subdue’s suit and number.</p></li><li><span>04</span><p>Build suit and master indexes by keyword, grade, stone, planet, and theme.</p></li></ol></section>

      <section className="deck-downloads" id="downloads"><div><p className="deck-eyebrow">WORKING LIBRARY</p><h2>Continue from the evidence.</h2><p>The download preserves the transfer notes and status record. It is a continuation package, not a complete deck release.</p></div><div><a href="/downloads/Mapshifting-Alchemy-Deck-Working-Library.zip" download><span>DOWNLOAD</span><h3>Alchemy Deck working library</h3><p>Preserved notes, corrections, design directions, and the card-reading status record.</p><b>↓</b></a></div></section>
    </main>
    <footer className="deck-footer"><img src="/assets/kiduna/mark.svg" alt="" width={26} height={26}/><p>Source readings stay separate from interpretation. Unverified card details remain visibly unresolved.</p><Link href="/">Kiduna.design →</Link></footer>
  </div>;
}

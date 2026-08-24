import Link from "next/link";
import type { ReactNode } from "react";

type Card = { src: string; name: string; number?: string };
type LinkItem = { href: string; label: string; detail: string };

type DeckShellProps = {
  deckClass: string;
  eyebrow: string;
  status: string;
  title: string;
  subtitle: string;
  lede: string;
  heroImage: string;
  heroAlt: string;
  metrics: Array<[string, string]>;
  principles: Array<[string, string]>;
  cards: Card[];
  galleryTitle: string;
  galleryNote: string;
  galleryEyebrow?: string;
  galleryContent?: ReactNode;
  contactSheet?: string;
  contactAlt?: string;
  integrityTitle: string;
  integrityCopy: string;
  integrityPoints: string[];
  downloads: LinkItem[];
};

export default function DeckShell(props: DeckShellProps) {
  return <div className={`deck-site ${props.deckClass}`}>
    <header className="deck-header">
      <Link className="deck-brand" href="/"><img src="/assets/kiduna/mark.svg" alt="" width={32} height={32}/><span><b>Kiduna</b><small>Mapshifting Decks</small></span></Link>
      <nav aria-label="Deck navigation"><a href="#gallery">Cards</a><a href="#method">Method</a><a href="#downloads">Downloads</a></nav>
      <Link className="deck-back" href="/#mapshifting">All decks ←</Link>
    </header>

    <main>
      <section className="deck-hero">
        <div className="deck-hero-copy">
          <p className="deck-eyebrow">{props.eyebrow}</p>
          <span className="deck-status">{props.status}</span>
          <h1>{props.title}<em>{props.subtitle}</em></h1>
          <p>{props.lede}</p>
          <div className="deck-actions"><a className="deck-button primary" href="#gallery">Explore the deck</a><a className="deck-button" href="#downloads">Open the library ↓</a></div>
          <div className="deck-metrics">{props.metrics.map(([value,label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div>
        </div>
        <div className="deck-hero-card"><span/><img src={props.heroImage} alt={props.heroAlt} width={760} height={760}/></div>
      </section>

      <section className="deck-principles" aria-label="Deck principles">
        {props.principles.map(([title,copy], index) => <article key={title}><small>{String(index + 1).padStart(2,"0")}</small><h2>{title}</h2><p>{copy}</p></article>)}
      </section>

      <section className="deck-gallery" id="gallery">
        <div className="deck-section-heading"><div><p className="deck-eyebrow">{props.galleryEyebrow ?? "VISUAL INDEX"}</p><h2>{props.galleryTitle}</h2></div><p>{props.galleryNote}</p></div>
        {props.galleryContent ?? <><div className="deck-card-grid">{props.cards.map((card) => <figure key={card.name}><div><img src={card.src} alt={`${card.name} card`} width={720} height={720}/></div><figcaption><span>{card.number}</span><b>{card.name}</b></figcaption></figure>)}</div>
        {props.contactSheet && <a className="deck-contact-sheet" href={props.contactSheet}><img src={props.contactSheet} alt={props.contactAlt ?? "Deck contact sheet"} width={1600} height={1600}/><span>Open the complete visual index ↗</span></a>}</>}
      </section>

      <section className="deck-method" id="method">
        <div><p className="deck-eyebrow">METHOD + INTEGRITY</p><h2>{props.integrityTitle}</h2><p>{props.integrityCopy}</p></div>
        <ol>{props.integrityPoints.map((point,index) => <li key={point}><span>{String(index + 1).padStart(2,"0")}</span><p>{point}</p></li>)}</ol>
      </section>

      <section className="deck-downloads" id="downloads">
        <div><p className="deck-eyebrow">WORKING LIBRARY</p><h2>Continue the work.</h2><p>Download the preserved source material. Status notes travel with the files so future work can resume without losing provenance or overstating completion.</p></div>
        <div>{props.downloads.map((item) => <a href={item.href} download key={item.href}><span>DOWNLOAD</span><h3>{item.label}</h3><p>{item.detail}</p><b>↓</b></a>)}</div>
      </section>
    </main>

    <footer className="deck-footer"><img src="/assets/kiduna/mark.svg" alt="" width={26} height={26}/><p>Mapshifting supports reflection and agency. It does not declare fate, diagnose, or replace professional care.</p><Link href="/">Kiduna.design →</Link></footer>
  </div>;
}

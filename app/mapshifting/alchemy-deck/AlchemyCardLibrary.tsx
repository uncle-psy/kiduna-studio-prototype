"use client";

import { useEffect, useRef, useState } from "react";
import cards from "./alchemy-cards.generated.json";

const suits = [
  { key: "alembic", name: "Alembic", meaning: "Love", ruler: "Venus", mark: "Ⅰ" },
  { key: "tree", name: "Tree", meaning: "Health", ruler: "Sun", mark: "Ⅱ" },
  { key: "retort", name: "Retort", meaning: "Wealth", ruler: "Jupiter", mark: "Ⅲ" },
  { key: "egg", name: "Egg", meaning: "Protection", ruler: "Moon", mark: "Ⅳ" },
  { key: "athanor", name: "Athanor", meaning: "Power", ruler: "Mars", mark: "Ⅴ" },
  { key: "wild", name: "Wild Cards", meaning: "Supplemental force", ruler: "Mercury", mark: "✦" },
] as const;

type Card = (typeof cards)[number];

function assetPath(card: Card, orientation: "landscape" | "portrait") {
  const width = orientation === "landscape" ? 960 : 540;
  const slug = card.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `/mapshifting/alchemy/cards/${card.id}-${slug}-${orientation}-w${width}.webp`;
}

function TextList({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <p className="alchemy-dossier-empty">{empty}</p>;
  return <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul>;
}

export default function AlchemyCardLibrary() {
  const [selected, setSelected] = useState<Card | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  function openCard(card: Card, trigger: HTMLButtonElement) {
    lastTriggerRef.current = trigger;
    setSelected(card);
  }

  function closeCard() {
    setSelected(null);
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!selected) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  return (
    <>
      <nav className="alchemy-suit-index" aria-label="Alchemy suits">
        {suits.map((suit) => (
          <a key={suit.key} href={`#${suit.key}`} data-suit={suit.key}>
            <span>{suit.mark}</span><b>{suit.name}</b><small>{suit.meaning}</small>
          </a>
        ))}
      </nav>

      <div className="alchemy-suits">
        {suits.map((suit) => {
          const suitCards = cards.filter((card) => card.suitKey === suit.key);
          return (
            <section className="alchemy-suit" id={suit.key} key={suit.key} data-suit={suit.key}>
              <header>
                <span>{suit.mark}</span>
                <div><p className="deck-eyebrow">{suit.meaning} · Ruled by {suit.ruler}</p><h3>{suit.name}</h3></div>
                <small>{suitCards.length} cards · {suitCards.length * 2} works</small>
              </header>
              <div className="alchemy-card-grid">
                {suitCards.map((card) => {
                  const landscape = assetPath(card, "landscape");
                  const portrait = assetPath(card, "portrait");
                  return (
                    <article className="alchemy-art-card" id={card.id} key={card.id}>
                      <a className="alchemy-landscape-art" href={landscape} target="_blank" rel="noreferrer" aria-label={`Open ${card.name} landscape artwork`}>
                        <img src={landscape} alt={`${card.name} — landscape composition from the ${card.suit} suit`} width={960} height={540} loading="lazy" decoding="async" />
                        <span>Landscape</span>
                      </a>
                      <div className="alchemy-card-lower">
                        <a className="alchemy-portrait-art" href={portrait} target="_blank" rel="noreferrer" aria-label={`Open ${card.name} portrait artwork`}>
                          <img src={portrait} alt={`${card.name} — portrait composition from the ${card.suit} suit`} width={540} height={960} loading="lazy" decoding="async" />
                          <span>Portrait</span>
                        </a>
                        <div className="alchemy-card-copy">
                          <small>{card.id.replace("card-", "")} · {card.grade}</small>
                          <h4>{card.name}</h4>
                          <dl>
                            <div><dt>Suit</dt><dd>{card.suit}</dd></div>
                            <div><dt>Current</dt><dd>{card.suitMeaning}</dd></div>
                            <div><dt>Ruler</dt><dd>{card.suitRuler}</dd></div>
                          </dl>
                          <button className="alchemy-card-cta" type="button" aria-haspopup="dialog" onClick={(event) => openCard(card, event.currentTarget)}>
                            Read the complete card <span aria-hidden="true">↗</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {selected ? (
        <div className="alchemy-dossier-backdrop" data-suit={selected.suitKey} onMouseDown={(event) => { if (event.target === event.currentTarget) closeCard(); }}>
          <section className="alchemy-dossier" role="dialog" aria-modal="true" aria-labelledby={`${selected.id}-dossier-title`}>
            <header className="alchemy-dossier-header">
              <div><small>{selected.id.replace("card-", "")} · {selected.suit} · {selected.grade}</small><strong>Complete card dossier</strong></div>
              <button ref={closeRef} type="button" onClick={closeCard} aria-label={`Close ${selected.name} card dossier`}>Close <span aria-hidden="true">×</span></button>
            </header>
            <div className="alchemy-dossier-scroll">
              <aside className="alchemy-dossier-card">
                <img src={assetPath(selected, "portrait")} alt={`${selected.name} portrait card`} width={540} height={960} />
                <div><span>{selected.keyword}</span><small>{selected.suitMeaning} · {selected.suitRuler}</small></div>
              </aside>
              <article className="alchemy-dossier-content">
                <p className="deck-eyebrow">{selected.suit} · {selected.suitMeaning}</p>
                <h2 id={`${selected.id}-dossier-title`}>{selected.name}</h2>
                {selected.missing.length ? <div className="alchemy-source-gap"><b>Source recovery note</b>{selected.missing.map((note) => <p key={note}>{note}</p>)}</div> : null}

                <div className="alchemy-dossier-dual">
                  <section><h3>Gifts</h3><TextList values={selected.gifts} empty="No gifts were recovered in the current source." /></section>
                  <section><h3>Wounds</h3><TextList values={selected.wounds} empty="No wounds were recovered in the current source." /></section>
                </div>

                <section className="alchemy-dossier-section">
                  <h3>The complete recovered narrative</h3>
                  {selected.narrative ? selected.narrative.split("\n\n").map((paragraph) => <p key={paragraph.slice(0, 90)}>{paragraph}</p>) : <p className="alchemy-dossier-empty">No extended narrative was recovered for this card.</p>}
                </section>

                <section className="alchemy-dossier-section">
                  <h3>Card description</h3>
                  <p>{selected.description}</p>
                </section>

                <section className="alchemy-dossier-section">
                  <h3>Correspondences</h3>
                  <dl className="alchemy-dossier-facts">
                    <div><dt>Keyword</dt><dd>{selected.keyword}</dd></div>
                    <div><dt>Grade</dt><dd>{selected.grade}</dd></div>
                    <div><dt>Suit</dt><dd>{selected.suit}</dd></div>
                    <div><dt>Current</dt><dd>{selected.suitMeaning}</dd></div>
                    <div><dt>Ruler</dt><dd>{selected.suitRuler}</dd></div>
                    {selected.astrologicalBalance ? <div><dt>Astrological balance</dt><dd>{selected.astrologicalBalance}</dd></div> : null}
                    {selected.stone ? <div><dt>Stone of Destiny</dt><dd>{selected.stone}</dd></div> : null}
                    {selected.element ? <div><dt>Element</dt><dd>{selected.element}</dd></div> : null}
                    {selected.numbersAndElements.length ? <div><dt>Numbers &amp; elements</dt><dd>{selected.numbersAndElements.join(" · ")}</dd></div> : null}
                  </dl>
                </section>
                <p className="alchemy-dossier-provenance">Source-backed from the maintained Mapshifting Alchemy transcription and photographed-guidebook evidence. Dictation and OCR wording is preserved where no reconciled editorial text exists.</p>
              </article>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

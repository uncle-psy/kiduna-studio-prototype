"use client";

import { useState } from "react";
import type { AssetRecord } from "../lib/catalog";

type Mode = "art" | "text" | "original" | "compare";

export function CardViewer({ record }: { record: AssetRecord }) {
  const finalPreview = record.finalArtwork ? record.thumbnail : null;
  const legacyPreview = record.originalCrop ? `/assets/library/legacy-thumbs/${record.id}.webp` : null;
  const available: Mode[] = [record.finalArtwork ? "art" : "text", "text"];
  if (record.originalCrop) available.push("original");
  if (record.finalArtwork && record.originalCrop) available.push("compare");
  const modes = [...new Set(available)];
  const [mode, setMode] = useState<Mode>(modes[0]);

  return (
    <section className="viewer" aria-label={`${record.name} views`}>
      <div className="mode-tabs" role="tablist" aria-label="Card view">
        {modes.map((item) => <button key={item} aria-selected={mode === item} onClick={() => setMode(item)}>{item === "art" ? "ART" : item === "text" ? "CARD TEXT" : item === "original" ? "ORIGINAL CARD" : "COMPARE"}</button>)}
      </div>
      {mode === "art" && finalPreview && <figure className="single-card"><img src={finalPreview} alt={`Final quiet-enamel art for ${record.name}`} /><figcaption>Final artwork · web preview; original included in the downloadable kit</figcaption></figure>}
      {mode === "original" && legacyPreview && <figure className="single-card"><img src={legacyPreview} alt={`Original playable card for ${record.originalName}`} /><figcaption>Original playable face · authoritative legacy evidence</figcaption></figure>}
      {mode === "compare" && <div className="viewer-compare">
        <figure>{legacyPreview && <img src={legacyPreview} alt={`Original ${record.originalName} card`} />}<figcaption>Original card</figcaption></figure>
        <figure>{finalPreview && <img src={finalPreview} alt={`Final ${record.name} artwork`} />}<figcaption>Final art</figcaption></figure>
      </div>}
      {mode === "text" && <article className="digital-card-text">
        <p className="eyebrow">DIGITAL CARD FACE</p>
        <h2>{record.digitalCopy.name}</h2>
        <p className="card-type">{record.digitalCopy.type || "Game component"}</p>
        {record.digitalCopy.keywords.length > 0 && <div className="tag-row">{record.digitalCopy.keywords.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        <div className="effect-copy">{record.digitalCopy.effect.length ? record.digitalCopy.effect.map((line, index) => <p key={`${line}-${index}`}>{line}</p>) : <p>This component is identified visually; no separate rule effect is attached.</p>}</div>
        {record.requiresHumanCopyReview && <aside className="review-note"><strong>Editorial review required.</strong> This transcription is traceable to the original face but has not been approved as final digital copy.</aside>}
      </article>}
    </section>
  );
}

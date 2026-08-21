import type { Metadata } from "next";
import { PageHero } from "../../components/PageHero";
import { Footer } from "../../components/Footer";
import { confirmedPairs, displayFamily } from "../../lib/catalog";

export const metadata: Metadata = { title: "Original to final", description: "Confirmed old-to-new mappings for the Royals & Rogues digital art migration." };

export default function ComparePage() {
  return <main><PageHero eyebrow="180 CONFIRMED PAIRS" title="The old game and the new art, connected." intro="Every original playable component remains available as evidence beside its final digital replacement. No text is burned into the new artwork." />
    <section className="pair-grid shell">{confirmedPairs.map((record) => <a className="pair-card" href={`/cards/${record.id}`} key={record.id}><div className="pair-images"><img src={`/assets/library/legacy-thumbs/${record.id}.webp`} alt={`Original ${record.originalName}`} /><img src={record.thumbnail} alt={`Final ${record.name}`} /></div><div><p>{displayFamily(record.family)} · {record.category.replaceAll("-", " ")}</p><h2>{record.name}</h2>{record.originalName !== record.name && <span>Originally {record.originalName}</span>}</div></a>)}</section><Footer /></main>;
}

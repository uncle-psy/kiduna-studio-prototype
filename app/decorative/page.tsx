import type { Metadata } from "next";
import { PageHero } from "../../components/PageHero";
import { Footer } from "../../components/Footer";
import { decorative } from "../../lib/catalog";

export const metadata: Metadata = { title: "World and decorative art", description: "Final Royals & Rogues world art separated from gameplay components." };

export default function DecorativePage() { return <main><PageHero eyebrow="WORLD ART" title="The world around the game" intro="Marketing, title, and atmosphere art can support the product without being mistaken for a playable card or component." /><section className="art-gallery shell">{decorative.map((record, index) => <a href={`/cards/${record.id}`} className={index === 0 ? "wide" : ""} key={record.id}><img src={record.thumbnail} alt={record.name} /><div><p className="eyebrow">DECORATIVE · NOT GAMEPLAY</p><h2>{record.name}</h2></div></a>)}</section><Footer /></main>; }

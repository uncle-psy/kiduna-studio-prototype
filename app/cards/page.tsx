import type { Metadata } from "next";
import { PageHero } from "../../components/PageHero";
import { CardCatalog } from "../../components/CardCatalog";
import { Footer } from "../../components/Footer";
import { catalog } from "../../lib/catalog";

export const metadata: Metadata = { title: "Canonical card library", description: "Search every playable Royals & Rogues card, identity, item, token, status, and reference." };

export default function CardsPage() { return <main><PageHero eyebrow="196 CANONICAL RECORDS" title="The complete game library" intro="Every record keeps final art, original evidence, separate digital copy, status, dimensions, checksums, and provenance together." /><section className="catalog-section shell"><CardCatalog records={catalog} /></section><Footer /></main>; }


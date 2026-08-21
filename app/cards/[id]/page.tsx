import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "../../../components/Header";
import { Footer } from "../../../components/Footer";
import { CardViewer } from "../../../components/CardViewer";
import { byId, catalog, displayCategory, displayFamily } from "../../../lib/catalog";

export function generateStaticParams() { return catalog.map((record) => ({ id: record.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> { const { id } = await params; const record = byId.get(id); return record ? { title: record.name, description: `${displayCategory(record.category)} · ${displayFamily(record.family)} · ${record.mappingStatus}`, openGraph: { images: [record.thumbnail] } } : {}; }

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const record = byId.get(id); if (!record) notFound();
  return <main><Header /><div className="record-shell shell"><a className="back-link" href="/cards">← Back to the library</a><div className="record-grid"><CardViewer record={record} /><section className="record-info"><p className="eyebrow">{displayCategory(record.category)} · {displayFamily(record.family)}</p><h1>{record.name}</h1>{record.originalName !== record.name && <p className="original-name">Originally: {record.originalName}</p>}<p className="record-intro">The final artwork and original playable component are linked here without baking rules text into the new art.</p>
  <dl className="record-facts"><div><dt>Stable ID</dt><dd>{record.id}</dd></div><div><dt>Type</dt><dd>{record.type || "—"}</dd></div><div><dt>Mapping</dt><dd>{record.mappingStatus}</dd></div><div><dt>Confidence</dt><dd>{record.mappingConfidence}</dd></div><div><dt>Digital copy</dt><dd>{record.copyStatus}</dd></div></dl>
  {record.conflicts.length > 0 && <aside className="review-note"><strong>Conflict recorded</strong>{record.conflicts.map((conflict, index) => <p key={index}>{typeof conflict === "string" ? conflict : JSON.stringify(conflict)}</p>)}</aside>}
  <details><summary>Provenance and file evidence</summary><dl className="provenance-list"><div><dt>Legacy source</dt><dd>{record.provenance.legacySource || "Not applicable"}</dd></div><div><dt>Final source</dt><dd>{record.provenance.finalSource || "Not applicable"}</dd></div><div><dt>Structured source</dt><dd>{record.provenance.structuredSource || "Not applicable"}</dd></div>{record.legacy && <div><dt>Legacy SHA-256</dt><dd>{record.legacy.sha256}</dd></div>}{record.final && <div><dt>Final SHA-256</dt><dd>{record.final.sha256}</dd></div>}</dl></details></section></div></div><Footer /></main>;
}

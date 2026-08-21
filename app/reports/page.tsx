import type { Metadata } from "next";
import { PageHero } from "../../components/PageHero";
import { Footer } from "../../components/Footer";
import { counts } from "../../lib/catalog";

export const metadata: Metadata = { title: "Verification reports", description: "Counts, source inventory, conflicts, provenance, checksums, and validation evidence." };

const reports = [["Source inventory", "Every file, archive, internal path, size, dimensions, hash, purpose, and inclusion decision.", "/downloads/source-inventory.md"], ["Provenance", "The evidence chain behind every legacy and final asset.", "/downloads/provenance.md"], ["Content conflicts", "Later changes and source disagreements that still need a product ruling.", "/downloads/content-conflicts.md"], ["Missing or ambiguous", "Confirmed gaps, ambiguous mappings, and intentionally excluded intermediate files.", "/downloads/missing-or-ambiguous-assets.md"], ["Checksums", "SHA-256 checksums for every generated data and document artifact.", "/downloads/checksums.sha256"], ["Canonical JSON", "The machine-readable catalog used to render this Site.", "/data/card-catalog.json"]];

export default function ReportsPage() { return <main><PageHero eyebrow="AUDITABLE BY DESIGN" title="Nothing is hidden in the handoff" intro="The library records what was found, what was included, what was excluded, what changed, and what still needs a human decision." /><section className="report-stats shell"><div><strong>{counts.sourceFiles}</strong><span>source files inventoried</span></div><div><strong>{counts.allRecords}</strong><span>canonical records</span></div><div><strong>{counts.verificationPassed}</strong><span>pixel checks passed</span></div><div><strong>{counts.intermediateExcludedFiles}</strong><span>intermediate renders excluded</span></div></section><section className="report-list shell">{reports.map(([title, copy, href]) => <a href={href} key={title}><div><h2>{title}</h2><p>{copy}</p></div><span>Open ↗</span></a>)}</section><Footer /></main>; }


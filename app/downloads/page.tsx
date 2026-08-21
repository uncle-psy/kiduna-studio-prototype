import type { Metadata } from "next";
import { PageHero } from "../../components/PageHero";
import { Footer } from "../../components/Footer";

export const metadata: Metadata = { title: "Developer kits", description: "Download complete and section-specific Royals & Rogues engineering packages." };

const release = "https://github.com/uncle-psy/kiduna-studio-prototype/releases/download/royals-and-rogues-v3.0.0";
const kits = [
  ["Royals & Rogues Master Kit", "Every canonical source, final asset, original reference, digital copy, report, checksum, and the complete Site.", `${release}/Royals-and-Rogues-Game-Library-Master-v3.0.0.zip`],
  ["Rules Kit", "Original rulebook, accessible rules, flow, defined terms, conflicts, and implementation notes.", `${release}/Royals-and-Rogues-Rules-Kit-v3.0.0.zip`],
  ["Power Cards Kit", "105 final Power faces, Power back, 106 original references, digital copy, pair map, and checksums.", `${release}/Royals-and-Rogues-Power-Cards-Kit-v3.0.0.zip`],
  ["Classes & Courts Kit", "Four Class identities, four Court identities, deck direction evidence, and structured data.", `${release}/Royals-and-Rogues-Classes-and-Courts-Kit-v3.0.0.zip`],
  ["Items & Tokens Kit", "Ten final Items, six final Tokens, original references, structured copy, and mappings.", `${release}/Royals-and-Rogues-Items-and-Tokens-Kit-v3.0.0.zip`],
  ["Poker Deck Kit", "The complete original 54-asset poker deck set and independently verified reference copies.", `${release}/Royals-and-Rogues-Poker-Deck-Kit-v3.0.0.zip`],
  ["Reference Kit", "Four original reference cards, final state markers, provenance, and editorial notes.", `${release}/Royals-and-Rogues-Reference-Kit-v3.0.0.zip`],
  ["Decorative Art Kit", "Final world, title, logo, and marketing art clearly separated from gameplay assets.", `${release}/Royals-and-Rogues-Decorative-Art-Kit-v3.0.0.zip`],
];

export default function DownloadsPage() { return <main><PageHero eyebrow="VERSIONED HANDOFF" title="Everything needed to build the game" intro="Download the complete verified library or take only the section you are implementing. Every kit includes its own manifest and checksums." /><section className="kit-grid shell">{kits.map(([title, copy, href], index) => <article className={index === 0 ? "featured" : ""} key={title}><p className="eyebrow">{index === 0 ? "COMPLETE PACKAGE" : "SECTION KIT"}</p><h2>{title}</h2><p>{copy}</p><a className="button primary" href={href} download>Download ZIP</a></article>)}</section><section className="document-list shell"><div><p className="eyebrow">HUMAN-READABLE</p><h2>Working documents</h2></div><div><a href="/downloads/game-overview.md" download>Game overview.md</a><a href="/downloads/game-flow.md" download>Game flow.md</a><a href="/downloads/complete-rules.md" download>Complete rules.md</a><a href="/downloads/card-catalog.md" download>Card catalog.md</a><a href="/downloads/old-to-new-card-map.md" download>Old-to-new map.md</a><a href="/downloads/developer-implementation-guide.md" download>Developer guide.md</a></div></section><Footer /></main>; }

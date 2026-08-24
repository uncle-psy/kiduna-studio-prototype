import type { ReactNode } from "react";
import cardData from "./animal-cards.generated.json";

type AnimalCard = {
  card_number: number;
  number_label: string;
  animal: string;
  slug: string;
  scientific_name: string;
  alternate_names: string[];
  taxonomic_group: string;
  habitats: string[];
  geographic_range: string[];
  activity_cycle: string;
  social_pattern: string;
  core_archetype: string;
  primary_gifts: string[];
  primary_wounds: string[];
  elemental_associations: string[];
  seasonal_associations: string[];
  provenance_labels: string[];
  confidence: string;
  status: string;
  image: string;
  manual_markdown: string;
};

type MarkdownBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

const cards = cardData as AnimalCard[];

function tableCells(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }

    if (line.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, text: line.slice(4) });
      index += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", level: 2, text: line.slice(3) });
      index += 1;
      continue;
    }
    if (line.startsWith("|") && /^\|?[\s|:-]+\|?$/.test((lines[index + 1] ?? "").trim())) {
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }
    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^-\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(## |### |\|)|^-\s+|^\d+\.\s+/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function linkHref(href: string) {
  const cardMatch = href.match(/(?:^|\/)(\d{3})-[^)]+\.md$/);
  if (cardMatch) return `#animal-${cardMatch[1]}`;
  return href.startsWith("http://") || href.startsWith("https://") ? href : "/downloads/Mapshifting-Animal-Deck-Manual.zip";
}

function InlineText({ text }: { text: string }) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={`${match.index}-em`}>{token.slice(1, -1)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const href = linkHref(link[2]);
        const external = href.startsWith("http");
        nodes.push(<a key={`${match.index}-link`} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{link[1]}</a>);
      }
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function ManualContent({ markdown }: { markdown: string }) {
  return <div className="animal-manual-copy">
    {parseMarkdown(markdown).map((block, index) => {
      if (block.type === "heading") return block.level === 2
        ? <h3 key={index}>{block.text}</h3>
        : <h4 key={index}>{block.text}</h4>;
      if (block.type === "paragraph") return <p key={index}><InlineText text={block.text}/></p>;
      if (block.type === "list") {
        const List = block.ordered ? "ol" : "ul";
        return <List key={index}>{block.items.map((item) => <li key={item}><InlineText text={item}/></li>)}</List>;
      }
      return <div className="animal-table-wrap" key={index}><table><thead><tr>{block.headers.map((header) => <th key={header}><InlineText text={header}/></th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><InlineText text={cell}/></td>)}</tr>)}</tbody></table></div>;
    })}
  </div>;
}

function MetaRow({ label, value }: { label: string; value: string | string[] }) {
  return <div><dt>{label}</dt><dd>{Array.isArray(value) ? value.join(" · ") : value}</dd></div>;
}

export default function AnimalManualLibrary() {
  return <>
    <aside className="animal-source-note">
      <b>Research-draft source note</b>
      <p>These entries use verified natural history and transparent deck synthesis. The full requested editions of Ted Andrews’ <em>Animal-Speak</em> and Kim Krans’ deck were not supplied or lawfully accessible, so no animal-specific wording or page references from those works are claimed. Those comparisons remain pending.</p>
    </aside>

    <nav className="animal-index" aria-label="Animal card index">
      {cards.map((card) => <a key={card.card_number} href={`#animal-${card.number_label}`}><span>{card.number_label}</span>{card.animal}</a>)}
    </nav>

    <div className="animal-manual-list">
      {cards.map((card) => <article className="animal-manual-card" id={`animal-${card.number_label}`} key={card.card_number}>
        <header className="animal-card-header">
          <figure><img src={card.image} alt={`${card.animal} card artwork`} width={900} height={900} loading={card.card_number === 1 ? "eager" : "lazy"}/><figcaption>Card {card.number_label} · {card.taxonomic_group}</figcaption></figure>
          <div className="animal-card-intro">
            <p className="deck-eyebrow">THE LIVING MIRROR · {card.number_label}</p>
            <h2>{card.animal}</h2>
            <p className="animal-scientific"><em>{card.scientific_name}</em>{card.alternate_names.length ? ` · ${card.alternate_names.join(", ")}` : ""}</p>
            <p className="animal-archetype">{card.core_archetype}</p>
            <div className="animal-polarities"><section><small>GIFTS</small>{card.primary_gifts.map((gift) => <span key={gift}>{gift}</span>)}</section><section><small>WOUNDS</small>{card.primary_wounds.map((wound) => <span key={wound}>{wound}</span>)}</section></div>
            <dl className="animal-meta">
              <MetaRow label="Habitat" value={card.habitats}/><MetaRow label="Range" value={card.geographic_range}/><MetaRow label="Activity" value={card.activity_cycle}/><MetaRow label="Social pattern" value={card.social_pattern}/><MetaRow label="Elements" value={card.elemental_associations}/><MetaRow label="Season" value={card.seasonal_associations}/><MetaRow label="Provenance" value={card.provenance_labels}/><MetaRow label="Record" value={`${card.status} · ${card.confidence} confidence`}/>
            </dl>
          </div>
        </header>
        <details open className="animal-full-entry"><summary><span>Complete manual entry</span><small>Collapse / expand</small></summary><ManualContent markdown={card.manual_markdown}/></details>
        <a className="animal-return" href="#gallery">Return to animal index ↑</a>
      </article>)}
    </div>
  </>;
}

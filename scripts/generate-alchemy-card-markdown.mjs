import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(root, "..", "mapshifting-alchemy-card-kit");
const cards = JSON.parse(await readFile(join(root, "app", "mapshifting", "alchemy-deck", "alchemy-cards.generated.json"), "utf8"));
const destinations = [
  join(root, "docs", "alchemy-card-dossiers"),
  join(sourceRoot, "sources", "editorial-card-dossiers"),
];

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cell(value) {
  return String(value ?? "Not assigned").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function list(values) {
  return values.length ? values.join(" · ") : "Not assigned";
}

function dossier(card) {
  return `---
card_id: ${card.id}
card_number: ${card.number}
name: ${card.name}
suit: ${card.suit}
current: ${card.suitMeaning}
grade: ${card.grade}
content_status: ${card.contentStatus}
---

# ${card.name}

## Card summary

| Field | Reading |
|---|---|
| Suit | ${cell(card.suit)} |
| Current | ${cell(card.suitMeaning)} |
| Gifts | ${cell(list(card.gifts))} |
| Challenges | ${cell(list(card.challenges))} |
| Wounds | ${cell(list(card.wounds))} |
| Stone | ${cell(card.stone)} |
| Planetary conjunction | ${cell(card.planetaryConjunction)} |

## Complete narrative

${card.narrativeParagraphs.join("\n\n")}

## Card description

${card.description}

## Additional correspondences

- Keyword: ${card.keyword}
- Grade: ${card.grade}
${card.element ? `- Element: ${card.element}\n` : ""}${card.numbersAndElements.length ? `- Numbers and elements: ${card.numbersAndElements.join(" · ")}\n` : ""}
## Provenance

- Source status: ${card.sourceStatus}
- Evidence record: ${card.sourceEvidenceFile ? `\`${card.sourceEvidenceFile}\`` : "Not recorded"}
${card.visualSourcePages.map((path) => `- Source photograph: \`${path}\``).join("\n")}

The narrative is editorially clarified for readability. Source meaning, correspondences, and symbolic relationships are preserved.
`;
}

const readme = `# Mapshifting Alchemy Editorial Card Dossiers

These 50 Markdown files are the maintained readable counterpart to the public card library. Regenerate them only after updating the source kit and running the content generator.

Every dossier follows the required order: Suit, Current, Gifts, Challenges, Wounds, Stone, Planetary conjunction. Challenges and Wounds intentionally mirror one source list until a distinct Wounds layer is approved. Wild Cards show **Not assigned** for unsupported Stone and Planetary conjunction values.
`;

for (const destination of destinations) {
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "README.md"), readme);
  for (const card of cards) {
    await writeFile(join(destination, `${card.id}-${slug(card.name)}.md`), dossier(card));
  }
}

console.log(`Generated ${cards.length} editorial card dossiers in the website and source kit.`);

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(root, "..", "mapshifting-alchemy-card-kit");
const metadata = JSON.parse(await readFile(join(sourceRoot, "metadata", "cards.json"), "utf8"));

const narrativeBlocks = {
  "card-001": [0], "card-002": [0, 1], "card-003": [0, 1], "card-004": [0],
  "card-005": [0, 1], "card-006": [0, 1], "card-007": [], "card-008": [0, 1],
  "card-009": [0], "card-010": [0], "card-011": [0, 1], "card-012": [0],
  "card-013": [0, 1], "card-014": [0, 1, 2], "card-015": [0, 1], "card-016": [0, 1],
  "card-017": [0, 1], "card-018": [0, 1], "card-019": [2, 3], "card-020": [1, 2, 3],
  "card-021": [0, 1], "card-022": [0], "card-023": [1, 2], "card-024": [2, 3],
  "card-025": [0], "card-026": [1, 2, 4, 5], "card-028": [0, 1, 2],
  "card-032": [0, 2], "card-033": [0], "card-034": [0], "card-038": [0, 1],
  "card-039": [0], "card-040": [0, 1], "card-044": [3, 4], "card-045": [0, 1],
  "card-047": [0], "card-048": [0], "card-049": [0], "card-050": [0],
};

const photographed = new Set(["card-027", "card-029", "card-030", "card-031", "card-035", "card-036", "card-041", "card-042", "card-043"]);

const fieldOverrides = {
  "card-009": { gifts: ["Adaptability", "Diplomacy", "Equanimity"] },
  "card-012": { astrologicalBalance: "Sun–Neptune" },
  "card-013": { astrologicalBalance: "Sun–Saturn" },
  "card-014": { astrologicalBalance: "Sun–Jupiter" },
  "card-015": { astrologicalBalance: "Sun–Mars" },
  "card-016": { astrologicalBalance: "Sun–Venus" },
  "card-020": { gifts: ["Analytical mind", "Good memory", "Teaching skills"] },
  "card-021": { astrologicalBalance: "Jupiter–Neptune", stone: "Jade" },
  "card-032": { astrologicalBalance: "Moon–Jupiter" },
  "card-050": { gifts: ["Leadership", "Ability to see both sides of a problem", "Management", "Delegation of duties"] },
};

const partial = {
  "card-007": ["No card-specific extended narrative, gifts, or wounds were recovered."],
  "card-037": ["Gifts and wounds were not recovered."],
  "card-039": ["The narrative ends mid-reading; astrological balance and Stone of Destiny were not recovered."],
};

function clean(value) {
  return value
    .replace(/-\s*\n\s*(?=[a-z])/g, "")
    .replace(/\[(?:gasp|sigh|sniff|breath)[^\]]*\]/gi, "")
    .replace(/\b(?:I'm going to|I’m going to|I'm gonna|I’m gonna) pause[^.]*\.?/gi, "")
    .replace(/\bAnd after you record this,? pause[^.]*\.?/gi, "")
    .replace(/\bPause (?:again )?(?:for|here for)[^.]*\.?/gi, "")
    .replace(/\bLet me know when[^.]*\.?/gi, "")
    .replace(/^…/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeBlocks(blocks) {
  return blocks.reduce((merged, block) => {
    if (!merged) return block;
    const probe = block.slice(0, 90);
    const overlap = merged.lastIndexOf(probe);
    return overlap >= 0 ? `${merged.slice(0, overlap)}${block}` : `${merged}\n\n${block}`;
  }, "");
}

function splitBlocks(evidence) {
  return evidence.split(/^===== .* =====$/m).slice(1).map(clean);
}

function titleCase(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/[.]+$/, "");
}

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map(titleCase);
}

async function recoveredNarrative(card, evidence) {
  const blocks = splitBlocks(evidence);
  if (photographed.has(card.card_id)) return mergeBlocks(blocks);
  if (card.card_id === "card-037") {
    const page = await readFile(join(sourceRoot, "sources", "original-transcriptions", "thread-pages", "page-011.txt"), "utf8");
    const match = page.match(/<transcript_delta>(…ustration is from- no, forget that\.[\s\S]*?Grade\. This card is in the Puffer grade)/);
    return match ? clean(match[1]) : "";
  }
  if (card.card_id === "card-046") {
    const recovered = await readFile(join(sourceRoot, "sources", "original-transcriptions", "recovered-user-inputs.txt"), "utf8");
    const line = recovered.split("\n").find((entry) => entry.includes("The first wild card is Execute."));
    return line ? clean(line) : "";
  }
  return mergeBlocks((narrativeBlocks[card.card_id] ?? []).map((index) => blocks[index]).filter(Boolean));
}

const output = [];
for (const card of metadata) {
  const evidenceName = `${card.card_id}-${card.canonical_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
  const evidencePath = join(sourceRoot, "sources", "card-transcript-evidence", evidenceName);
  const evidence = await readFile(evidencePath, "utf8");
  const override = fieldOverrides[card.card_id] ?? {};
  const element = card.element ?? (card.suit_key === "wild" ? card.elements_or_numbers?.[0] ?? null : null);
  output.push({
    id: card.card_id,
    number: card.card_number,
    name: card.canonical_name,
    keyword: card.keyword,
    suit: card.suit,
    suitKey: card.suit_key,
    suitMeaning: card.suit_meaning,
    suitRuler: card.suit_ruler,
    grade: card.grade,
    gifts: override.gifts ?? cleanList(card.gifts),
    wounds: cleanList(card.wounds).map((item) => item.replace(/\s+The main$/i, "")),
    astrologicalBalance: override.astrologicalBalance ?? card.astrological_balance ?? null,
    stone: override.stone ?? (card.suit_key === "wild" ? null : card.stone_of_destiny ?? null),
    element,
    numbersAndElements: card.elements_or_numbers ?? [],
    description: clean(card.visual_description_raw ?? ""),
    narrative: await recoveredNarrative(card, evidence),
    sourceStatus: card.source_status,
    contentStatus: partial[card.card_id] ? "incomplete-source" : "source-backed",
    missing: partial[card.card_id] ?? [],
  });
}

const serialized = `${JSON.stringify(output, null, 2)}\n`;
await Promise.all([
  writeFile(join(root, "app", "mapshifting", "alchemy-deck", "alchemy-cards.generated.json"), serialized),
  writeFile(join(root, "public", "mapshifting", "alchemy", "cards.json"), serialized),
]);

console.log(`Generated complete public card records for ${output.length} cards; ${output.filter((card) => card.contentStatus !== "source-backed").length} retain explicit source gaps.`);

import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const oracle = join(root, "public", "systems-oracle-app");
const alchemy = join(root, "public", "mapshifting", "alchemy");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const exists = async (...parts) => access(join(...parts)).then(() => true).catch(() => false);
const load = async (name) => JSON.parse(await readFile(join(oracle, "data", `${name}.json`), "utf8"));

for (const file of ["index.html", "app.js", "styles.css", "overrides.css", "downloads/README.md"]) {
  check(await exists(oracle, file), `Missing Systems Oracle file: ${file}`);
}

const [artifacts, longlist, relationships, lineages, spreads, games, references] = await Promise.all(
  ["artifacts", "longlist", "relationships", "lineages", "spreads", "games", "references"].map(load),
);

check(artifacts.length === 360, `Expected 360 canonical artifacts; found ${artifacts.length}`);
check(longlist.length === 1080, `Expected 1,080 evaluated candidates; found ${longlist.length}`);
check(relationships.length === 1601, `Expected 1,601 relationships; found ${relationships.length}`);
check(lineages.length === 12, `Expected 12 lineages; found ${lineages.length}`);
check(spreads.length === 12, `Expected 12 spreads; found ${spreads.length}`);
check(games.length === 4, `Expected four games; found ${games.length}`);
check(references.length === 40, `Expected 40 reference artworks; found ${references.length}`);

for (let index = 1; index <= 40; index += 1) {
  const name = `reference-${String(index).padStart(2, "0")}.webp`;
  const path = join(oracle, "assets", "references", name);
  check(await exists(path), `Missing optimized reference artwork: ${name}`);
  if (await exists(path)) check((await stat(path)).size > 20_000, `Reference artwork is unexpectedly small: ${name}`);
}

const app = await readFile(join(oracle, "app.js"), "utf8");
const header = await readFile(join(root, "components", "Header.tsx"), "utf8");
const route = await readFile(join(root, "app", "systems-oracle", "page.tsx"), "utf8");
check(app.includes(".webp"), "Systems Oracle does not point to optimized web artwork");
check(header.includes('href="/systems-oracle"'), "Kiduna Systems navigation does not link to Systems Oracle");
check(route.includes('/systems-oracle-app/index.html#home'), "Systems Oracle route does not load the reference application");

const alchemyCards = JSON.parse(await readFile(join(alchemy, "cards.json"), "utf8"));
check(alchemyCards.length === 50, `Expected 50 Alchemy cards; found ${alchemyCards.length}`);
for (const card of alchemyCards) {
  check(Array.isArray(card.gifts), `Alchemy card lacks a gifts list: ${card.id}`);
  check(card.gifts.length > 0, `Alchemy card has no gifts: ${card.id}`);
  check(Array.isArray(card.challenges) && card.challenges.length > 0, `Alchemy card has no challenges: ${card.id}`);
  check(Array.isArray(card.wounds), `Alchemy card lacks a wounds list: ${card.id}`);
  check(JSON.stringify(card.challenges) === JSON.stringify(card.wounds), `Alchemy Challenges and Wounds have drifted: ${card.id}`);
  check(typeof card.description === "string" && card.description.length > 20, `Alchemy card lacks its complete description: ${card.id}`);
  check(typeof card.narrative === "string" && card.narrative.length > 80, `Alchemy card lacks a narrative field: ${card.id}`);
  check(Array.isArray(card.narrativeParagraphs) && card.narrativeParagraphs.length > 0, `Alchemy card lacks structured narrative paragraphs: ${card.id}`);
  if (card.suitKey !== "wild") {
    check(typeof card.stone === "string" && card.stone.length > 0, `Alchemy card lacks its stone: ${card.id}`);
    check(typeof card.planetaryConjunction === "string" && card.planetaryConjunction.length > 0, `Alchemy card lacks its planetary conjunction: ${card.id}`);
  }
  check(["source-backed", "incomplete-source"].includes(card.contentStatus), `Alchemy card lacks an explicit content status: ${card.id}`);
  const slug = card.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  for (const [orientation, width] of [["landscape", 960], ["portrait", 540]]) {
    const name = `${card.id}-${slug}-${orientation}-w${width}.webp`;
    const path = join(alchemy, "cards", name);
    check(await exists(path), `Missing Alchemy artwork: ${name}`);
    if (await exists(path)) check((await stat(path)).size > 40_000, `Alchemy artwork is unexpectedly small: ${name}`);
  }
}
check(alchemyCards.filter((card) => card.contentStatus === "incomplete-source").length === 0, "Expected zero incomplete Alchemy source records");
const alchemyLibrary = await readFile(join(root, "app", "mapshifting", "alchemy-deck", "AlchemyCardLibrary.tsx"), "utf8");
check(alchemyLibrary.includes("Read the complete card"), "Alchemy cards do not expose the complete-card call to action");
check(alchemyLibrary.includes('role="dialog"'), "Alchemy complete-card experience is not exposed as an accessible dialog");
for (const name of ["mapshifting-alchemy-landscape-contact-sheet.jpg", "mapshifting-alchemy-portrait-contact-sheet.jpg"]) {
  check(await exists(alchemy, "contact-sheets", name), `Missing Alchemy contact sheet: ${name}`);
}
const alchemyDownload = join(root, "public", "downloads", "Mapshifting-Alchemy-Deck-Finished-Art-Web.zip");
check(await exists(alchemyDownload), "Missing complete Alchemy web-edition download");
if (await exists(alchemyDownload)) check((await stat(alchemyDownload)).size > 30_000_000, "Alchemy web-edition download is unexpectedly small");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Validated Kiduna Design: Systems Oracle has ${artifacts.length} artifacts and ${references.length} reference artworks; Alchemy has ${alchemyCards.length} cards and ${alchemyCards.length * 2} finished compositions.`);

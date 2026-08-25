import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const oracle = join(root, "public", "systems-oracle-app");
const alchemy = join(root, "public", "mapshifting", "alchemy");
const tao = join(root, "public", "tao");
const realEstate = join(root, "public", "real-estate-mortgage");
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

const taoCards = JSON.parse(await readFile(join(root, "app", "tao", "tao-cards.generated.json"), "utf8"));
const taoGraph = JSON.parse(await readFile(join(tao, "data", "graph.json"), "utf8"));
check(taoCards.length === 75, `Expected 75 Tao tiles; found ${taoCards.length}`);
check(taoGraph.nodes.length === 75, `Expected 75 Tao graph nodes; found ${taoGraph.nodes.length}`);
check(taoGraph.edges.length === 302, `Expected 302 Tao graph edges; found ${taoGraph.edges.length}`);
check(taoCards.filter((card) => card.phase.length).length === 5, "Expected five Tao phase tiles with full correspondences");
check(taoCards.filter((card) => card.trigram.length).length === 8, "Expected eight Tao trigram tiles with full correspondences");
check(taoCards.every((card) => card.essence && card.image && card.movement && card.gift && card.shadow && card.excess && card.deficiency && card.return && card.divination && card.question && card.action), "A Tao tile lacks a required meaning field");
check(taoCards.every((card) => card.relations.length >= 4), "A Tao tile has fewer than four authored relations");
for (const card of taoCards) {
  const number = card.id.slice(-3);
  const name = `${number}-${card.slug}.webp`;
  const path = join(tao, "tiles", "art", name);
  check(await exists(path), `Missing finished Tao tile artwork: ${name}`);
  if (await exists(path)) check((await stat(path)).size > 50_000, `Tao tile artwork is unexpectedly small: ${name}`);
}
check(await exists(tao, "tao-75-enamel-contact-sheet.webp"), "Missing complete 75-tile Tao contact sheet");
const taoProof = join(tao, "tao-enamel-proof-sheet.png");
check(await exists(taoProof), "Missing Tao enamel proof sheet");
if (await exists(taoProof)) check((await stat(taoProof)).size > 1_000_000, "Tao proof sheet is unexpectedly small");
check(await exists(tao, "TAO-ENAMEL-ORACLE-MANUAL.md"), "Missing Tao complete manual");
const taoDownload = join(root, "public", "downloads", "Tao-Enamel-Oracle-Complete-v1.1.0.zip");
check(await exists(taoDownload), "Missing complete Tao system download");
if (await exists(taoDownload)) check((await stat(taoDownload)).size > 15_000_000, "Tao complete-system download is unexpectedly small");
const taoPage = await readFile(join(root, "app", "tao", "page.tsx"), "utf8");
check(taoPage.includes("TaoCardLibrary"), "Tao route does not expose the complete tile library");
check(taoPage.includes("Tao-Enamel-Oracle-Complete-v1.1.0.zip"), "Tao route does not expose its complete archive");

const realEstateCards = JSON.parse(await readFile(join(root, "app", "real-estate-mortgage", "cards.generated.json"), "utf8"));
const realEstateEdges = JSON.parse(await readFile(join(realEstate, "data", "relationships.json"), "utf8"));
const realEstateManifest = JSON.parse(await readFile(join(realEstate, "tiles", "manifest.json"), "utf8"));
check(realEstateCards.length === 659, `Expected 659 Real Estate & Mortgage tiles; found ${realEstateCards.length}`);
check(realEstateEdges.length === 1302, `Expected 1,302 Real Estate & Mortgage relationships; found ${realEstateEdges.length}`);
check(realEstateManifest.length === 659, `Expected 659 Real Estate & Mortgage artwork records; found ${realEstateManifest.length}`);
check(realEstateCards.filter((card) => card.tone === "life-light").length > 590, "Expected life-light to be the default emotional register");
check(realEstateCards.filter((card) => card.tone === "warning").length > 0, "Expected a preserved warning register");
check(realEstateCards.every((card) => card.what_it_is && card.what_it_actually_does && card.gift && card.wound_shadow && card.divination && card.question && card.guidance), "A Real Estate & Mortgage tile lacks a required meaning field");
for (const card of realEstateManifest) {
  const path = join(root, "public", card.artwork);
  check(await exists(path), `Missing Real Estate & Mortgage enamel tile: ${card.artwork}`);
  if (await exists(path)) check((await stat(path)).size > 4_000, `Real Estate & Mortgage enamel tile is unexpectedly small: ${card.artwork}`);
}
const realEstateAnchor = join(realEstate, "tiles", "featured", "thirty-year-fixed-mortgage.png");
check(await exists(realEstateAnchor), "Missing Thirty-Year Fixed Mortgage quality-anchor artwork");
if (await exists(realEstateAnchor)) check((await stat(realEstateAnchor)).size > 1_000_000, "Thirty-Year Fixed Mortgage anchor artwork is unexpectedly small");
const realEstateDownload = join(root, "public", "downloads", "Real-Estate-Mortgage-System-Complete-v1.0.0.zip");
check(await exists(realEstateDownload), "Missing complete Real Estate & Mortgage system download");
if (await exists(realEstateDownload)) check((await stat(realEstateDownload)).size > 5_000_000, "Real Estate & Mortgage complete-system download is unexpectedly small");
const realEstatePage = await readFile(join(root, "app", "real-estate-mortgage", "page.tsx"), "utf8");
check(realEstatePage.includes("RealEstateLibrary"), "Real Estate & Mortgage route does not expose the complete tile library");
check(realEstatePage.includes("Real-Estate-Mortgage-System-Complete-v1.0.0.zip"), "Real Estate & Mortgage route does not expose its complete archive");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Validated Kiduna Design: Systems Oracle has ${artifacts.length} artifacts and ${references.length} reference artworks; Alchemy has ${alchemyCards.length} cards and ${alchemyCards.length * 2} finished compositions; Tao has ${taoCards.length} tiles and ${taoGraph.edges.length} typed relations; Real Estate & Mortgage has ${realEstateCards.length} tiles and ${realEstateEdges.length} typed relations.`);

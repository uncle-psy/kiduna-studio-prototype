import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const oracle = join(root, "public", "systems-oracle-app");
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

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Validated Kiduna Design with Systems Oracle: ${artifacts.length} artifacts, ${relationships.length} relationships, ${references.length} optimized reference artworks.`);

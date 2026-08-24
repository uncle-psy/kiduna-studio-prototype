import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceFlag = process.argv.indexOf("--source");
const source = sourceFlag >= 0 ? path.resolve(process.argv[sourceFlag + 1]) : null;

if (!source) {
  throw new Error("Usage: node scripts/import-tao-oracle.mjs --source /absolute/path/to/tao-enamel-oracle");
}

const cardsSource = path.join(source, "cards");
const cardFiles = (await readdir(cardsSource)).filter((name) => name.endsWith(".md")).sort();

function section(markdown, name) {
  const marker = `## ${name}\n\n`;
  const start = markdown.indexOf(marker);
  if (start < 0) return "";
  const content = markdown.slice(start + marker.length);
  const next = content.indexOf("\n## ");
  return (next < 0 ? content : content.slice(0, next)).trim();
}

function frontmatter(markdown, field) {
  const match = markdown.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match?.[1]?.replace(/^"|"$/g, "").trim() ?? "";
}

function list(markdown, name) {
  return section(markdown, name)
    .split("\n")
    .filter((line) => line.startsWith("- **"))
    .map((line) => {
      const match = line.match(/^- \*\*(.+?):\*\* (.+)$/);
      return match ? { label: match[1], value: match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") } : null;
    })
    .filter(Boolean);
}

const cards = [];
for (const file of cardFiles) {
  const markdown = await readFile(path.join(cardsSource, file), "utf8");
  const familyLine = markdown.match(/^families:\s*\[(.+)\]$/m)?.[1] ?? "";
  const families = [...familyLine.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  cards.push({
    number: frontmatter(markdown, "number"),
    id: frontmatter(markdown, "id"),
    name: frontmatter(markdown, "name"),
    slug: frontmatter(markdown, "slug"),
    families,
    essence: section(markdown, "Essence"),
    image: section(markdown, "Image"),
    movement: section(markdown, "Movement"),
    gift: section(markdown, "Gift"),
    shadow: section(markdown, "Shadow"),
    excess: section(markdown, "Excess"),
    deficiency: section(markdown, "Deficiency"),
    return: section(markdown, "Return"),
    divination: section(markdown, "Divination"),
    question: section(markdown, "Question"),
    action: section(markdown, "Action"),
    phase: list(markdown, "Five Phase correspondences"),
    trigram: list(markdown, "Trigram correspondences"),
    relations: list(markdown, "Relations"),
    enamel: list(markdown, "Enamel direction"),
  });
}

if (cards.length !== 75) throw new Error(`Expected 75 Tao cards; found ${cards.length}`);
const invalidCards = cards.filter((card) => !card.essence || !card.image || !card.action || card.relations.length < 4);
if (invalidCards.length) {
  throw new Error(`Tao card import failed required-field validation: ${invalidCards.map((card) => `${card.number}:${card.slug}:relations=${card.relations.length}`).join(", ")}`);
}

await mkdir(path.join(root, "app", "tao"), { recursive: true });
await mkdir(path.join(root, "public", "tao", "data"), { recursive: true });
await mkdir(path.join(root, "public", "downloads"), { recursive: true });
await writeFile(path.join(root, "app", "tao", "tao-cards.generated.json"), `${JSON.stringify(cards, null, 2)}\n`);
for (const file of ["graph.json", "nodes.json", "edges.json", "graph.dot"]) {
  await copyFile(path.join(source, "data", file), path.join(root, "public", "tao", "data", file));
}
await copyFile(path.join(source, "assets", "tao-enamel-proof-sheet.png"), path.join(root, "public", "tao", "tao-enamel-proof-sheet.png"));
await copyFile(path.join(source, "MANUAL.md"), path.join(root, "public", "tao", "TAO-ENAMEL-ORACLE-MANUAL.md"));

console.log(`Imported ${cards.length} Tao tiles and graph data from ${source}`);

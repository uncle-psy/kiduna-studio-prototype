import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const records = JSON.parse(await fs.readFile(path.join(root, "public/data/card-catalog.json"), "utf8"));
const out = path.join(root, "public/assets/library/legacy-thumbs");
await fs.mkdir(out, { recursive: true });

for (const record of records) {
  if (!record.legacy?.publicPath) continue;
  const source = path.join(root, "public", record.legacy.publicPath.replace(/^\//, ""));
  const destination = path.join(out, `${record.id}.webp`);
  await sharp(source).resize({ width: 560, height: 760, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toFile(destination);
}

console.log(`Prepared ${records.filter((record) => record.legacy?.publicPath).length} legacy web previews.`);

import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const DIMENSIONS = 1536;
const CORPUS = "ki-genesis-v2.5";
const sourcePath = path.join(process.cwd(), "content/ki/wisdom/KI-GENESIS-ALLY-COMPLETE-KNOWLEDGE-v2.5.md");

function tokenHash(token, seed) {
  let hash = seed >>> 0;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function embed(text) {
  const vector = new Array(DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    vector[tokenHash(token, 2166136261) % DIMENSIONS] += 1;
    vector[tokenHash(token, 2246822519) % DIMENSIONS] += .5;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return `[${vector.map((value) => Number((value / magnitude).toFixed(7))).join(",")}]`;
}

function splitLongSection(text, target = 5400, overlap = 650) {
  if (text.length <= target) return [text];
  const parts = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + target, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf("\n\n", end), text.lastIndexOf(". ", end));
      if (boundary > start + target * .65) end = boundary + 1;
    }
    parts.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return parts;
}

function chunkMarkdown(markdown) {
  const lines = markdown.split("\n");
  const headingPath = [];
  let sourceFile = "KI-GENESIS-ALLY-COMPLETE-KNOWLEDGE-v2.5.md";
  let sourceStatus = "CONSOLIDATED OPERATING CORPUS";
  let current = { title: "Ki — Genesis Ally Complete Operating Knowledge", headingPath: ["Corpus"], sourceFile, sourceStatus, lines: [] };
  const sections = [];

  const flush = () => {
    const content = current.lines.join("\n").trim();
    if (content.length >= 180) sections.push({ ...current, content });
  };

  for (const line of lines) {
    const sourceMatch = line.match(/^SOURCE_FILE:\s*`?([^`]+)`?\s*$/);
    const statusMatch = line.match(/^SOURCE_STATUS:\s*(.+)$/);
    if (sourceMatch) sourceFile = sourceMatch[1].trim();
    if (statusMatch) sourceStatus = statusMatch[1].replace(/\*\*/g, "").trim();

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      headingPath.splice(level - 1);
      headingPath[level - 1] = heading[2].trim();
      current = {
        title: heading[2].replace(/[*_`]/g, "").trim(),
        headingPath: headingPath.filter(Boolean),
        sourceFile,
        sourceStatus,
        lines: [line],
      };
    } else {
      current.sourceFile = sourceFile;
      current.sourceStatus = sourceStatus;
      current.lines.push(line);
    }
  }
  flush();

  return sections.flatMap((section) => splitLongSection(section.content).map((content, index, all) => ({
    ...section,
    title: all.length > 1 ? `${section.title} · ${index + 1}/${all.length}` : section.title,
    content,
  })));
}

const markdown = await readFile(sourcePath, "utf8");
const chunks = chunkMarkdown(markdown);
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });

try {
  await sql.begin(async (tx) => {
    await tx`delete from studio_prototype_wisdom where provenance->>'corpus' = ${CORPUS}`;
    for (const [index, chunk] of chunks.entries()) {
      const provenance = {
        corpus: CORPUS,
        artifactVersion: "2.5-consolidated-2026-07-15",
        sourceFile: chunk.sourceFile,
        sourceStatus: chunk.sourceStatus,
        headingPath: chunk.headingPath,
        chunkIndex: index,
        embeddingModel: "prototype-hash-v1",
      };
      const accessScope = { visibility: "public", ecosystemId: "kiduna" };
      const vector = embed(`${chunk.title}\n${chunk.content}`);
      await tx`
        insert into studio_prototype_wisdom
          (container_type, container_id, kind, title, content, provenance, access_scope, embedding)
        values
          ('ecosystem', 'kiduna', 'wisdom', ${chunk.title}, ${chunk.content}, ${tx.json(provenance)}, ${tx.json(accessScope)}, ${vector}::vector)
      `;
    }
  });
  console.log(JSON.stringify({ ingested: true, corpus: CORPUS, chunks: chunks.length, embeddingModel: "prototype-hash-v1" }, null, 2));
} finally {
  await sql.end();
}

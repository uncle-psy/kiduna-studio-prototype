import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

async function walk(directory) {
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const apiFiles = await walk(join(root, "app", "api"));
if (apiFiles.some((file) => /route\.(ts|tsx|js|mjs)$/.test(file))) {
  failures.push("The design lab still exposes an application API route.");
}

const runtimeFiles = [
  join(root, "app", "page.tsx"),
  join(root, "app", "StudioV0.tsx"),
  join(root, "lib", "v0-model.ts"),
];
const forbiddenRuntimePatterns = [
  ["network request", /\bfetch\s*\(|XMLHttpRequest|WebSocket\s*\(/],
  ["server secret or environment access", /process\.env|DATABASE_URL|RESEND_API_KEY|AUTH_SECRET/],
  ["database runtime", /from\s+["'](?:drizzle-orm|postgres)["']/],
  ["live payment or wallet client", /stripe|coinbase|walletconnect|ethers|viem/i],
];

for (const file of runtimeFiles) {
  const source = await readFile(file, "utf8");
  for (const [label, pattern] of forbiddenRuntimePatterns) {
    if (pattern.test(source)) failures.push(`${file.replace(`${root}/`, "")} contains ${label}.`);
  }
}

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const packages = { ...packageJson.dependencies, ...packageJson.devDependencies };
for (const dependency of ["drizzle-orm", "drizzle-kit", "postgres", "resend", "stripe", "ethers", "viem"]) {
  if (packages[dependency]) failures.push(`package.json still includes ${dependency}.`);
}

const capabilities = JSON.parse(await readFile(join(root, "lib", "capabilities.json"), "utf8"));
if (capabilities.length !== 282) failures.push(`Capability Atlas has ${capabilities.length} rows, expected 282.`);
if (new Set(capabilities.map((row) => row.id)).size !== 282) failures.push("Capability Atlas IDs are not unique.");
if (capabilities.some((row) => !["demonstrated", "represented", "catalog-only"].includes(row.v0Coverage))) failures.push("Capability Atlas contains an invalid V0 coverage label.");

if (failures.length) {
  console.error("V0 isolation audit failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("V0 isolation audit passed: no app API routes, network clients, production secret access, database runtime, payment/wallet client, or missing capability rows detected.");

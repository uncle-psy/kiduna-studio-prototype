import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const candidatePath = path.join(root, "data", "published-systems.json");
const publicPath = path.join(root, "public", "published-systems.json");
const nextConfigPath = path.join(root, "next.config.ts");
const homePath = path.join(root, "app", "page.tsx");
const menuPath = path.join(root, "app", "ui", "HubHeader.tsx");

function fail(message) {
  console.error(`published-systems audit failed: ${message}`);
  process.exitCode = 1;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function loadJson(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source, { redirect: "follow" });
    if (!response.ok) throw new Error(`${source} returned HTTP ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(path.resolve(root, source), "utf8"));
}

function assertLedger(ledger, name) {
  if (!ledger || ledger.version !== 1 || !Array.isArray(ledger.systems)) {
    fail(`${name} must be a version 1 ledger with a systems array`);
    return [];
  }

  const ids = new Set();
  const routes = new Set();
  const orders = new Set();
  for (const entry of ledger.systems) {
    for (const field of ["id", "label", "kind", "route", "firstPublishedAt", "surface", "status", "order"]) {
      if (entry[field] === undefined || entry[field] === "") fail(`${name} entry is missing ${field}: ${JSON.stringify(entry)}`);
    }
    if (ids.has(entry.id)) fail(`${name} reuses id ${entry.id}`);
    if (routes.has(entry.route)) fail(`${name} reuses route ${entry.route}`);
    if (orders.has(entry.order)) fail(`${name} reuses order ${entry.order}`);
    if (!entry.route.startsWith("/")) fail(`${entry.id} has a non-public route: ${entry.route}`);
    if (!['system', 'system-family', 'deck'].includes(entry.kind)) fail(`${entry.id} has unsupported kind ${entry.kind}`);
    if (!['external-rewrite', 'local-page', 'local-anchor'].includes(entry.surface)) fail(`${entry.id} has unsupported surface ${entry.surface}`);
    if (entry.status !== "active") fail(`${entry.id} changed from the protected active state`);
    ids.add(entry.id);
    routes.add(entry.route);
    orders.add(entry.order);
  }
  return ledger.systems;
}

function compareBaseline(baselineEntries, candidateEntries, name) {
  const candidateById = new Map(candidateEntries.map((entry) => [entry.id, entry]));
  const immutable = ["id", "route", "kind", "firstPublishedAt", "status"];
  for (const published of baselineEntries) {
    const candidate = candidateById.get(published.id);
    if (!candidate) {
      fail(`${name} system ${published.id} is missing from the candidate release`);
      continue;
    }
    for (const field of immutable) {
      if (candidate[field] !== published[field]) {
        fail(`${name} system ${published.id} changed immutable ${field} from ${published[field]} to ${candidate[field]}`);
      }
    }
  }
}

async function routeExists(entry, nextConfig) {
  const route = entry.route.split("#", 1)[0];
  if (entry.surface === "external-rewrite") {
    return nextConfig.includes(`source: "${route}"`) && nextConfig.includes(`source: "${route}/:path*"`);
  }
  const file = route === "/" ? homePath : path.join(root, "app", route.slice(1), "page.tsx");
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

const candidate = await loadJson(candidatePath);
const publicLedger = await loadJson(publicPath);
const entries = assertLedger(candidate, "candidate");
assertLedger(publicLedger, "public");

if (JSON.stringify(candidate) !== JSON.stringify(publicLedger)) {
  fail("data/published-systems.json and public/published-systems.json are not identical");
}

const [nextConfig, home, menu] = await Promise.all([
  readFile(nextConfigPath, "utf8"),
  readFile(homePath, "utf8"),
  readFile(menuPath, "utf8"),
]);

for (const entry of entries) {
  if (!(await routeExists(entry, nextConfig))) fail(`${entry.id} has no matching page or external rewrite for ${entry.route}`);
  if (entry.listedOnHome) {
    const marker = entry.surface === "local-anchor" ? `id="${entry.route.split("#")[1]}"` : entry.route;
    if (!home.includes(marker)) fail(`${entry.id} is absent from the homepage`);
  }
  if (entry.listedInSystemsMenu && !menu.includes(entry.route)) fail(`${entry.id} is absent from the Systems menu`);
}

const baseline = argument("--baseline");
if (baseline) {
  try {
    const baselineLedger = await loadJson(baseline);
    const baselineEntries = assertLedger(baselineLedger, "baseline");
    compareBaseline(baselineEntries, entries, "published");
  } catch (error) {
    fail(`could not load baseline ${baseline}: ${error.message}`);
  }
}

if (!process.exitCode) {
  console.log(`published-systems audit passed: ${entries.length} protected entries`);
}

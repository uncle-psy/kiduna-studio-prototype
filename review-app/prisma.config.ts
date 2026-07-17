/**
 * Prisma 7 configuration.
 *
 * In Prisma 7 the datasource `url` moved out of schema.prisma and into
 * this config file. The CLI (generate, migrate, db push) reads the URL
 * from here. The PrismaClient runtime reads it from the constructor
 * (see server/prisma.ts).
 *
 * Set DATABASE_URL in your .env or .env.local file:
 *   DATABASE_URL="postgresql://user:password@localhost:5432/kinship_markets"
 */
import path from "node:path";
import fs from "node:fs"; 
import { defineConfig } from "prisma/config";

/**
 * Load environment variables from .env files.
 *
 * Prisma 7 CLI does NOT auto-load .env like Next.js does. We parse it
 * manually. Tries multiple files in priority order (same as Next.js):
 *   1. .env.local       — local overrides (gitignored)
 *   2. .env             — default values (committed)
 *
 * Logs clearly so `npx prisma db push` output shows what's happening.
 */
function loadEnv() {
  const root = __dirname;
  const candidates = [
    path.join(root, ".env.local"),
    path.join(root, ".env"),
  ];

  let loaded = false;

  for (const envPath of candidates) {
    try {
      if (!fs.existsSync(envPath)) continue;

      const content = fs.readFileSync(envPath, "utf-8");
      let count = 0;

      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // Strip surrounding quotes
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
          count++;
        }
      }

      const relPath = path.relative(root, envPath);
      console.log(`[prisma.config] Loaded ${count} vars from ${relPath}`);
      loaded = true;
    } catch (err) {
      const relPath = path.relative(root, envPath);
      console.warn(`[prisma.config] Failed to read ${relPath}:`, (err as Error).message);
    }
  }

  if (!loaded) {
    console.warn(
      "[prisma.config] No .env or .env.local file found at project root.\n" +
      `  Looked in: ${root}\n` +
      "  DATABASE_URL must be set in the environment."
    );
  }
}

loadEnv();

// ── Resolve database URL ──────────────────────────────────────────────

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "\n" +
    "╔═══════════════════════════════════════════════════════════════╗\n" +
    "║  ERROR: DATABASE_URL is not set.                            ║\n" +
    "║                                                             ║\n" +
    "║  Add it to your .env file:                                  ║\n" +
    '║    DATABASE_URL="postgresql://user:pw@host:5432/dbname"     ║\n' +
    "║                                                             ║\n" +
    "║  Or set it in the environment:                              ║\n" +
    "║    DATABASE_URL=... npx prisma db push                      ║\n" +
    "╚═══════════════════════════════════════════════════════════════╝\n"
  );
  process.exit(1);
}

// Log the connection target (masked for security)
const masked = databaseUrl.replace(
  /\/\/([^:]+):([^@]+)@/,
  (_, user) => `//${user}:****@`,
);
console.log(`[prisma.config] Using database: ${masked}`);

// ── Export config ─────────────────────────────────────────────────────

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),

  datasource: {
    url: databaseUrl,
  },
});
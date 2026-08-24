<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kiduna Design preservation rules

This repository publishes the additive Kiduna Design systems hub at `kiduna.design`. New systems extend the hub; they do not replace previously published systems.

- Read `docs/PUBLISHED-SYSTEMS.md` before changing routes, navigation, the homepage, rewrites, or deployment configuration.
- Treat `data/published-systems.json` as an append-only ledger. Never delete or reuse an existing system ID or public route.
- Keep `public/published-systems.json` byte-matched with the source ledger.
- Preserve existing URLs with redirects or compatibility routes when implementation ownership changes.
- Run `npm run audit:published-systems` and `npm run check` before publishing.
- A system may be removed, retired, or reassigned only under David’s explicit instruction and a separately reviewed migration.

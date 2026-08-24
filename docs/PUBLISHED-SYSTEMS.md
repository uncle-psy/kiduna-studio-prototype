# Published systems ledger

`data/published-systems.json` is the append-only source of truth for every system or deck published through `kiduna.design`. The byte-matched public copy at `/published-systems.json` lets the publishing workflow compare the next release with the current production release.

## Preservation law

- Add new entries; do not delete or reuse an existing `id`.
- Preserve an existing entry’s `route`, `kind`, `firstPublishedAt`, and `status`.
- Preserve old public URLs when a system moves. Add a redirect or compatibility route before adding its new route.
- Run `npm run audit:published-systems` before every preview or production deployment.
- The publishing skill compares this candidate ledger with the production ledger. A release fails if a published entry disappears or its identity is reassigned.
- Retirement or removal requires David’s explicit instruction and a separately reviewed migration; it is never inferred from a new system’s source tree.

## Adding a system

1. Add its page or external rewrite without replacing an existing system.
2. Add a new unique entry to both copies of the ledger.
3. Add it to the homepage and, when appropriate, the Systems menu.
4. Run the local audit, full test suite, and build.
5. Compare against production before publishing.

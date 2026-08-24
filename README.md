# Kiduna Design systems hub

The production source for the additive systems library at [kiduna.design](https://www.kiduna.design).

The hub preserves the Isometric Scene System, Royals & Rogues, Kiduna Coherence, Bellwether, Biology Deck, Pop Culture Deck, Systems Oracle, and the Mapshifting Animal, Nature, and Alchemy decks. Some systems are served as local pages and others through stable Vercel rewrites to their dedicated sites.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run check
```

## System preservation

`data/published-systems.json` is the append-only source ledger. Its public mirror allows every future release to prove that it retains all systems already published in production. See `docs/PUBLISHED-SYSTEMS.md`.

Large Royals & Rogues kits remain on the `royals-and-rogues-v3.0.0` GitHub release. The deployable hub keeps web assets, structured records, Mapshifting packages, and the Systems Oracle application in this repository.

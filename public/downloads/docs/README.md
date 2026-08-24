# Kiduna Studio Complete UI Plan

Status: implementation-facing conceptual prototype  
Prepared: 2026-08-21 EDT  
Canonical taxonomy: Kiduna Taxonomy Canon V0.36, validated SHA-256 `df2ead9b000482057b4f2ed909d1242e0cdfd32d0e8c3027807e309856a2a17c`

This package specifies a continuous Kiduna Studio experience for three nested Realms:

1. Kinship Duna
2. Fellowship of Play, inside Kinship Duna
3. Royals & Rogues, inside Fellowship of Play

The interactive Site is the fastest way to understand the plan. The Markdown and JSON files are the durable handoff. The prototype demonstrates behavior and hierarchy; it is not the production system and does not prescribe an application framework.

## Start here

- Product/design: `UI-PLAN.md`
- Engineering: `ROUTE-MANIFEST.md`, `STATE-MODEL.md`, `ACTION-PERMISSION-MATRIX.md`, and `data/*.json`
- Design systems: `DESIGN-SYSTEM.md`
- QA/accessibility: `ACCESSIBILITY.md`
- Delivery planning: `IMPLEMENTATION-SEQUENCE.md`
- Existing development board: `RAPID-BOARD-CROSSWALK.md`
- Evidence and unresolved choices: `EVIDENCE-INVENTORY.md` and `ASSUMPTIONS-AND-OPEN-DECISIONS.md`

## Package structure

```text
app/                 Interactive UI plan source
public/assets/       Curated Kiduna and Royals & Rogues assets
docs/                Human-readable specifications
data/                Framework-neutral contracts
evidence/            Supplied-source inventory and traceability
public/downloads/    Downloadable bundles exposed by the Site
```

## Run the Site

Use a current Node.js release, install the package dependencies, and run the development command declared in `package.json`. The production build command generates the deployable Site. No database, secrets, or paid service is required for this specification.

## Interpretation rule

When sources conflict, use this order:

1. Current user-authored goal and corrections
2. Kiduna Taxonomy Canon V0.36 for vocabulary and entity boundaries
3. Current Kiduna Brand and Design System
4. Royals & Rogues Core Kit, only inside the Royals & Rogues Realm
5. Meeting UI-state frames as evidence of intent
6. Older prototype conventions

Never infer access from Realm nesting. Never merge Wisdom, Presence, and Connections into one generic data object. Never make Ki a navigation menu or duplicate the active text input.

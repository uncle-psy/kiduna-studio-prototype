# Validation Report

System: Mapshifting Military Systems
Version: 1.1.0
Validation date: 2026-08-27
Research snapshot: 2026-08-27

## Outcome

**PASS — Engine 1.3 System extension and paired raster card release.**

The release is internally consistent, machine-readable, valid against the Mapshifting Systems Engine 1.3 validator, and complete against the inherited artifact groups plus the new paired-card, Veteran/VA/Gulf War, suicide-prevention, family, and 73 Easting extension. Content coverage is a substantial seed with documented gaps; it is not represented as an exhaustive military encyclopedia.

## Reproducible checks

Run from the package root:

```text
<bundled-python> scripts/generate_card_assets.py
python3 scripts/generate_map_timeline_svgs.py
python3 scripts/build_claim_ledger.py
python3 ../mapshifting-systems-engine-v1.3.0/scripts/validate_project.py data/engine-project-v1.3.json
python3 scripts/validate_package.py
python3 -m unittest discover -s tests -v
```

Release result before packaging:

```text
rendered 8 paired cards, 98 generated assets plus 8 preserved source scenes
generated claims=36
Engine project valid: true, errors: []
OK nodes=12 edges=10 claims=2 domain_records=67 domain_relations=61 spatiotemporal_assertions=7 registered_predicates=168
Ran 34 tests
OK
```

## Validation coverage

- required-file and version agreement;
- JSON and SVG parseability;
- namespaced ID uniqueness;
- source, claim, node, relation, provenance, expression, manual, Realm, chronology, and bridge references;
- registered node types, predicates, edge families, modules, perspectives, claim layers, and confidence values;
- prohibition of stable empty relatedness;
- no orphan comparative or historical records;
- longitude/latitude order, geometry role, accuracy, time, and reference-point guard;
- rank/grade/appointment/precedence and authority non-equivalence;
- staff notional status and staff-versus-command boundary;
- negotiated multinational logistics and intermodal Berlin Airlift structure;
- Midway intelligence-to-decision and repair-to-readiness mechanisms;
- historical event/artifact/claim and outcome-layer separation;
- all twenty module depth contracts;
- all eleven specialist schema/fixture pairs;
- thirteen moving-toward/moving-away archetypal capacities;
- nineteen bounded cross-System bridges;
- four grounded serious-to-absurd profiles and twelve transformation operators;
- eight required Realm bindings and Sentinel context handoffs;
- ten expression/manual pairs, all four core forms, ten face SVGs, and ten sigil SVGs;
- two map/schematic views and one categorical chronology view with scale warnings;
- twelve expert-pressure query contracts with honest demonstrated/partial/schema-ready status;
- reversible prototype migration without invented `related_to` edges;
- consolidated claim ledger fidelity;
- cryptographic version-manifest fidelity;
- unfinished scaffold marker scan.
- Engine 1.3 transport compatibility with `schema_version: "1.0"`;
- twenty-node/nineteen-edge extension graph and four-stage node capabilities;
- explicit 2d ACR, Battle of 73 Easting, Gulf War Veteran, Gulf War illness, VA, registry, crisis, and family nodes;
- two Sentinel handoffs covering health/benefits and acute crisis boundaries;
- eight mandatory vertical/horizontal card pairs;
- exact 2048×3072 and 3072×2048 master dimensions;
- 98 generated card-asset hash records plus eight original source scenes;
- current crisis handoff presence in the manual.

## Visual QA

Rendered and inspected at high resolution:

- whole-field circle;
- rounded-square logistics tile;
- vertical command card;
- horizontal Yorktown repair-to-readiness card;
- whole-System module map;
- Berlin Airlift relational schematic;
- global chronology overview.
- all eight new vertical card faces;
- all eight new horizontal card faces;
- both deck contact sheets;
- the revised text-free Gulf War illness source scene.

The horizontal contact-sheet heading overflow and faint pseudo-lettering in the Gulf War illness source were found during review and corrected before packaging. The card deck passed paired-form, focal-survival, dignity, safety, typography, and source-art checks. Map and chronology views retain their non-coordinate or non-proportional-scale warnings.

## Required-deliverable acceptance

| # | Deliverable | Result | Primary files |
|---:|---|---|---|
| 1 | Registry and version manifest | PASS | `registry/system.json`, `VERSION`, `VERSION-MANIFEST.json` |
| 2 | Architecture and domain boundary | PASS | `docs/ARCHITECTURE.md`, README |
| 3 | Ontology, namespacing, edge registry, graph schema | PASS | `data/ontology.json`, `schemas/seed-graph.schema.json` |
| 4 | Module map and cross-System bridges | PASS | module map SVG, module specifications, bridge registry |
| 5 | Coverage matrix and gap report | PASS | `data/coverage-matrix.json`, `docs/GAP-REPORT.md` |
| 6 | Source/claim ledgers, evidence, citation, provenance | PASS | source ledger, claim ledger, source policy, citation guide |
| 7 | Comparative terminology/distinctions | PASS | `docs/DISTINCTIONS.md`, comparative datasets |
| 8 | Global chronology and geospatial anchors | PASS | chronology data/SVG and geospatial-temporal contract |
| 9 | Eleven specialist domain schemas | PASS | `schemas/` |
| 10 | Fixture for every specialist schema | PASS | `data/fixtures/domain-schema-fixtures.json` |
| 11 | Archetype/direction/question/practice/manual schemas | PASS | archetype and manual schemas/data |
| 12 | Form resolver and expression plan | PASS | resolver and expression plan |
| 13 | Finished expression set | PASS | eight paired raster cards; inherited SVGs retained as construction lineage |
| 14 | Full manual and complete entries | PASS | `manual/MANUAL.md`, `manual/CARD-DECK.md`, representative entries |
| 15 | Serious-to-absurd profiles | PASS | `data/generative-profiles.json` |
| 16 | Required Realm bindings | PASS | `data/realm-bindings.json` |
| 17 | Tests, validation, expert review, limitations | PASS | tests, this report, expert checklist, limitations |
| 18 | Extension/migration/localization/contributor guides | PASS | dedicated guides and migration fixture |
| 19 | Rights, attribution, freshness, release boundary | PASS | dedicated rights/freshness docs and source ledger |
| 20 | Changelog, roadmap, complete ZIP | PASS on archive verification | changelog, roadmap, manifest, versioned ZIP |

## Expert-pressure result

Of twelve governing expert questions, two have current instance-level demonstrations, five are queryable with partial instance coverage, and five have complete schema/path support but require additional sourced cases. The package does not relabel schema readiness as historical proof. Each query records the exact next deepening work.

## Residual limitations

Formal named external review has not yet been completed across all thirteen specialist lenses. Current content remains English- and official-institution-heavy. The 73 Easting case is intentionally marked as official-U.S.-source heavy; Iraqi, regional, civilian, family, clinical, environmental, and independent perspectives remain priority debt. Casualty data is deliberately sparse, and law, medicine, crisis, and benefits use remains orientation and handoff rather than authority. See `docs/KNOWN-LIMITATIONS.md` and `docs/GAP-REPORT.md`.

These limitations constrain claims of coverage; they do not represent missing release architecture or missing required artifacts.

# Source-Art Audit — First Field Card Deck

Audit date: 2026-08-27
Release: Mapshifting Military Systems 1.1.0
Engine baseline: Mapshifting Systems Engine 1.3.0

## Decision

All eight finished card pairs originate in eight newly generated, semantically distinct raster scenes. None is a reframed vector sigil, duplicated image, stock photograph, official unit image, insignia, or image copied from a source page. The inherited 1.0.0 SVG expressions remain available as construction lineage, but they are not classified as finished Engine 1.3 publication art.

## Shared final prompt contract

Each scene was generated with the OpenAI built-in image-generation tool as a square, text-free narrative illustration. The shared visual direction was archival cinematic realism with restrained painterly texture and museum-exhibition depth; midnight teal and graphite balanced by warm amber, desert sand, and occasional violet signal lines. Prompts required the essential semantic mechanism to remain in the central 65 percent for vertical and horizontal adaptation. Prompts prohibited borders, card frames, typography, logos, flags, government seals, watermarks, gore, propaganda, and reductive heroic or trauma clichés.

## Scene-level prompts and outputs

| Card | Final semantic prompt | Original source-art output |
|---|---|---|
| The Whole Field | A circular field connecting political purpose, force, command, sustainment, consequence, landscapes, bodies, families, institutions, and memory without presenting battle as the whole System. | `assets/cards/source-art/whole-field-source-v1.1.png` |
| The Hidden Chain | A visible capability resting on distributed maintenance, transport, energy, information, timing, labor, terrain, and trust; a landscape-scale chain whose failure is systemic rather than individual. | `assets/cards/source-art/hidden-chain-source-v1.1.png` |
| 73 Easting | A non-triumphal historical interpretation of the 26 February 1991 armored battle: sandstorm, grid line, fast tactical movement, command, logistics, opposing force, and aftermath; no real-person likeness, gore, flags, or victory-poster framing. | `assets/cards/source-art/73-easting-source-v1.1.png` |
| Service Continues | A Veteran crossing an institutional gate into home, work, clinical care, records, peer life, family, and remembrance; uniform stored at the edge while skills and relationships continue. | `assets/cards/source-art/service-continues-source-v1.1.png` |
| Gulf War Illness | A dignified Veteran at a home-to-clinic threshold with translucent threads connecting desert-service memory, multiple symptom domains, medical records, work, family, clinicians, and research; the pattern matters but does not define the person. | `assets/cards/source-art/gulf-war-illness-source-v1.1.png` |
| Different Doors | A Veteran and trusted guide at a civic care gateway with distinct unlabeled pathways for assessment, clinical care, specialist consultation, benefits evidence, advocacy, counseling, and urgent support; a human handoff makes the system navigable. | `assets/cards/source-art/va-navigation-source-v1.1.png` |
| Connection Creates Time | A safe, non-sensational night-to-dawn scene: a Veteran phones a qualified responder while a trusted person stays nearby; connection creates time and distance from danger. No methods, weapons, attempt, injury, memorial imagery, or hotline text in the source art. | `assets/cards/source-art/connection-creates-time-source-v1.1.png` |
| Sustainment Is Shared Work | A multigenerational family and chosen network sharing meals, rides, listening, records, childcare, rest, gardening, and repair with mutuality and boundaries; the Veteran contributes and belongs. | `assets/cards/source-art/family-sustainment-source-v1.1.png` |

## Production transformations

- The square generated scenes remain preserved unchanged in `assets/cards/source-art/`.
- Text-free vertical masters are 2048×3072 PNG; horizontal masters are 3072×2048 PNG.
- The complete square scene is retained at the center of each master over a softened, color-adjusted environmental extension. No semantic object is added by the renderer.
- Live-text presentation renders are separated from the text-free masters.
- PNG and WebP derivatives are generated at 1024 and 512 pixels on the long edge.
- File size and SHA-256 records are in `assets/cards/asset-manifest.json`.

## Visual review criteria

Review checks include paired-form presence, exact master dimensions, central focal survival, readable presentation text, no accidental logos or official insignia, dignified representation, and crisis-scene safety. Manual review status is recorded in `validation/card-visual-qa.json`.

## Rights

The scenes are original generated project artwork. They remain all rights reserved unless a later explicit project license says otherwise. Third-party source pages informed factual content but supplied no visual material to these card masters.

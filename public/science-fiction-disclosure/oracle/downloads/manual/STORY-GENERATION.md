# Story Generation

## Composition Model

A story begins from one seed Tile and fills declared roles such as Character, World, Faction, Technology, Artifact, System, Event, or State. Adjacent graph nodes supply coherent options. One distant surprise is permitted only when the output exposes the bridge connecting it to the seed. Every premise includes a contradiction so that the setting generates choices rather than static lore.

## Method

1. Choose a generator and seed. The same seed and data version must return the same structured result.
2. Draw the anchor Tile, then fill required roles using class and domain constraints.
3. Prefer graph neighbors whose typed verbs explain their dramatic function: “governs,” “enables,” “opposes,” “conceals,” and “precipitates” produce different stories.
4. Add one polarity that cannot be solved by eliminating one side.
5. Add a cost, dependency, or excluded voice from the Shadow meanings.
6. Add one source- or evidence-aware boundary when the premise touches living communities, current politics, health, conspiracy claims, or franchise material.
7. Emit both readable prose and a recipe containing seed, card IDs, edge IDs, pinned slots, fallback reasons, and checksum.

## Example Pattern

Seed a World, follow “governed-by” to a Faction, “enabled-by” to a Technology, and “precipitated-by” to an Event. Add a State for the protagonist and an Artifact that can reveal or distort the conflict. The premise should name why these pieces belong together: “On an orbital habitat whose water is governed as a monopoly, a maintenance worker finds a custody record that could expose the system just as a contact event disrupts supply.”

## Revision and Safety

Users may pin any slot and reroll the rest. Rerolls never erase provenance. Franchise-derived Tiles support criticism and abstraction, not copied characters, logos, dialogue, or plot. Conspiracy and spiritual material must remain labeled by mode and evidence state; story utility is not factual endorsement. See [Graph](GRAPH.md), [Game Systems](GAME-SYSTEMS.md), and [Science Fiction](SCIENCE-FICTION.md).

# Graph

## Purpose

The graph stores cards, claim layers, sources, and playable systems as distinct records. Card-to-card edges use registered verbs; **related_to is forbidden** because it hides the actual basis of connection. Historical influence, source context, fictionalization, symbolic resemblance, opposition, containment, transformation, and governance are different relationships and must remain queryable.

## Edge Contract

Every edge records an ID, type, family, directionality, source card, target card, readable label, rationale, basis, confidence, and provenance object. A sourced edge may cite only an external source registered on both endpoint cards. Original synthesis uses the explicit “original-synthesis” source and never impersonates an outside authority. Symmetric edges are normalized deterministically; directed edges preserve source and target.

Every core Tile must have at least four neighbors, at least three edge families, a cross-Domain bridge, and an original-synthesis edge. Sourced edges are used when an external source materially supports the relationship; they are not manufactured merely to give every Tile one. Validation rejects orphans, unknown cards, unregistered verbs, generic related-to edges, missing provenance, and any sourced-edge citation that is not registered on both endpoints.

## Reading an Edge

Read the verb before the two titles. **Monolith catalyzes Evolution** is a claim about a fictional lineage, bounded by its source. **Wormhole enables Stargate** is an editorial/scientific metaphor about mechanism, not a claim that either technology exists. Open the rationale and provenance whenever the distinction matters.

## Lineages and Generation

A lineage is an ordered path with card IDs and edge IDs. Forward reading asks what each threshold makes possible; reverse reading identifies enabling assumptions; diagnostic reading stops at the first implausible transition. Generators may traverse registered edges and must record fallback whenever class fit substitutes for graph adjacency.

## Registered Families

taxonomic, interpretive, dialectical, evidentiary, exploratory, symbolic, historical, spatial, causal, systemic, institutional, epistemic, narrative, experiential, lineage, comparative, structural, technological.

Machine-readable relationships live in `data/relationships.json`; lineages live in `data/lineages.json`; edge definitions are in `data/edge-types.json`.

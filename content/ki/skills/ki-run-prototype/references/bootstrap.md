# Ki prototype bootstrap

## Load order

1. Load `KI-SYSTEM-PROMPT-FUNCTIONAL-PROTOTYPE-v1.0.md` section “System prompt” as the immutable runtime prompt.
2. Bind native tool definitions; do not paste tool schemas into conversational context.
3. Inject the trusted runtime envelope from `runtime-contract.md`.
4. Expose `ki-run-prototype` and the routed domain skills.
5. Bind the permission-scoped vector index built from `KI-GENESIS-ALLY-COMPLETE-KNOWLEDGE-v2.5.md`.
6. Resolve current context, capability modes, and active Actions.
7. Trigger Ki's startup greeting appropriate to Visitor, Guest, or Member state.

## Vector metadata

Preserve `SOURCE_FILE`, `SOURCE_STATUS`, heading path, access level, WisdomDrop/Item IDs, Organization, Project, purpose, version, and supersession. Chunk by headings at roughly 800–1,500 tokens with 100–200 token overlap.

## Prototype fixtures

Create fixtures only through `seed_demo_world`. Include explicit tenant and Organization ownership, stable IDs, a demo clock, and `execution_mode=simulated`. Keep connected accounts absent by default. Seed enough state to demonstrate invitation, onboarding, Ally rename, Organization, Project, Actor work, Forum, Wisdom, Compute, Action receipts, and Field rendering.

## Readiness check

Before greeting, verify that context resolution, Wisdom search, Action preview/status, prototype state commit, handle registry, artifact store, and Record/Vigil reads respond. Mark unavailable capability modes honestly and continue with the remaining prototype.

# Prototype world model

## Execution modes

- `connected`: a real tool or service is configured; its response controls status.
- `sandbox`: a provider-owned test environment produces real test responses with no production effect.
- `simulated`: Kiduna's local state machine creates plausible outcomes and receipts without external effect.
- `preview`: parameters and consequences are rendered; no command commits.
- `disabled`: policy or implementation blocks the capability.

Never upgrade a mode from prose. Capability discovery and feature gates set it.

## Simulation rules

Simulated behavior must be deterministic enough to inspect:

1. Create stable IDs and timestamps through the prototype state service.
2. Validate the same schemas, authority, confirmation, idempotency, and state transitions used for connected Actions.
3. Create a `prototype_record` with `execution_mode=simulated` and no fabricated provider receipt.
4. Give external operations a `sim:` namespace and never a real provider ID.
5. Preserve balances in a clearly simulated ledger partition.
6. Allow reset, seed, replay, and demo clocks only through authorized prototype commands.
7. Never use simulation to bypass a hard denial or legal/financial gate.

## Realistic seeded state

Seed only through tools. Useful fixtures include Personas, Ally identities, Organizations, Memberships, Relationships, Projects, Forums, WisdomDrops, Actor manifests, Actions, Records, and simulated Compute accounts. Label fixtures `demo`, keep them tenant-scoped, and prevent them from reaching connected rails.

## Member-facing language

Within an obviously marked demo environment, speak naturally: “The Project is ready” or “Your proposal is open.” For boundary-crossing effects say “The prototype recorded the payment as settled; no real funds moved.” Do not clutter every harmless local operation with simulation disclaimers.


---
name: ki-run-actions
description: Convert intent into typed, authorized, confirmed, executed, and receipted Kiduna Actions. Use whenever Ki may change state, communicate externally, publish, transact, vote, alter permissions, create membership, delete, invoke an Actor, or report the status of an ongoing Action or external operation.
---

# Run Actions

Read [references/action-lifecycle.md](references/action-lifecycle.md) for state and receipt rules.

## Procedure

1. Resolve Source, requester, Organization, Project, target, purpose, mode, and session assurance.
2. Discover a registered `ActionDefinition`; never invent one or issue generic CRUD.
3. Validate parameters and expected versions. Create an idempotency key from caller, definition version, and canonical payload.
4. Create the `ActionRequest` and accept only the deterministic authorization result.
5. If confirmation is required, render the machine preview and obtain exactly the required proof.
6. Execute the registered Command. Never retry an uncertain write before checking status.
7. Inspect local commit and external operation independently.
8. Report exact state with Action/Record/external IDs.

## Preview requirements

Show acting agent, Source or Policy, Organization, target, consequence, external system, material parameters, cost, audience, privacy change, reversibility, execution mode, and confirmation mode.

Do not bundle distinct consequential acts into vague consent. “Allow every time” creates a narrow, versioned policy; it never disables authorization.

## Denial and failure

Never route around denial. State the safe missing requirement without disclosing protected facts. For timeouts, query by Action ID or idempotency key. Use only registered retry, reconciliation, compensation, cancellation, or human-review paths.


# Prototype tool contracts

Tool names may differ, but preserve these semantic boundaries. Reads never mutate. Writes always return structured state.

## Context and discovery

- `resolve_current_context()` → principal, Source classification, Ally, Organization, Project, human state, roles, grants, conflicts, mode.
- `list_available_actions(object_id)` → definitions, modes, missing requirements, confirmation.
- `get_capability_status(key)` → connected/sandbox/simulated/preview/disabled plus feature gate.

## Wisdom and state

- `search_wisdom(query,purpose,organization_id,project_id)` → authorized chunks with source metadata.
- `get_wisdom_provenance(item_id)` and `explain_why_context_was_used(record_id)`.
- Named reads for Organization, Project, work, Forum, Relationship, invitation, Compute, ledger summary, Ally identity, Actor run, and Action status.

## Actions

- `create_action_request(definition_key,parameters,context,idempotency_key)`.
- `preview_action(action_request_id)` → machine receipt and required proof.
- `confirm_action(action_request_id,proof_reference)`.
- `defer_or_cancel_action(action_request_id)`.
- `get_action_status(action_request_id)` → local and external states separately.

## Prototype state

- `seed_demo_world(fixture_manifest)`; `reset_demo_scope(scope_id)`; `advance_demo_clock(duration)`.
- `commit_simulated_command(action_request_id)` → simulated state versions and prototype Record.
- `get_simulated_ledger(account_id)` → double-entry demo partition only.

These commands require prototype-admin authority and must never target connected resources.

## Identity, Actors, and artifacts

- Check/reserve/release handle; create or update Ally identity without changing stable ID.
- Discover Actor manifests; start, inspect, stop, accept, or quarantine an Actor run.
- Ingest, scan, version, retrieve, permission, and verify artifact/package manifest.

## Connections and external operations

- Discover connection reference/scopes without returning credentials.
- Invoke registered external operation through an Action.
- Inspect, reconcile, safely retry, compensate, or route to human review.

## Return minimum for writes

Return `action_request_id`, definition/version, mode, authorization result, confirmation requirement, status, state versions, `record_id` when committed, `external_operation_id` when applicable, and a safe reason code when blocked. Do not return free-form success without these fields.

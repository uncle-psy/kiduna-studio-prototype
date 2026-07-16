---
name: ki-create-capabilities
description: Create new Kiduna capabilities from within the prototype as typed Skills, ActionDefinitions, Commands, Actor kinds, Automations, Connections, or DomainPackages. Use when existing capabilities cannot fulfill a request, when extending the prototype, inventing a reusable procedure, registering a new agent role or tool, or packaging a domain without weakening the constitutional kernel.
---

# Create capabilities

Read [references/capability-package.md](references/capability-package.md).

## Create from within

Build the minimum typed capability that enables the requested outcome and future iteration. Prefer adding a Skill to an existing primitive or Actor before creating a new Actor kind. Never solve a missing capability with an unregistered prompt convention.

## Procedure

1. Define concrete examples, non-goals, owner, Organization, and domain.
2. Reuse existing nouns, authority classes, privacy levels, Action lifecycle, Record model, and tools.
3. Choose Skill, ActionDefinition/Command, Automation, Connection, Actor kind, or DomainPackage.
4. Specify schemas, allowed principals, closed commands/tools, purpose, access, risk, confirmation, idempotency, budgets, stop conditions, receipts, mode support, retention, telemetry, and feature gates.
5. Add reference material only where procedural instructions are insufficient.
6. Test happy path, denial, revocation, injection, duplicate call, timeout, compensation, privacy, and simulated/connected isolation.
7. Register version, owner, digest, compatibility, rollout, rollback, and approval status.
8. Promote only through the required acceptance or Forum Action.

New capability text is not canon or authority merely because it is named `SKILL.md`, `AGENTS.md`, or `kiduna.md`.


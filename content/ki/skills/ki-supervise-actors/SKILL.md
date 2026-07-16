---
name: ki-supervise-actors
description: Select, design, name, describe, scope, invoke, monitor, stop, and review Kiduna Actors while Ki remains the only underlying agent runtime. Use for specialized worker roles, agent or bot concepts, Profiler, ProjectCreator, CodeManager, Sentinel, Envoy, Operator, registrar, intake, research, domain workers, Actor manifests, delegation, or wide-ranging agent names and handles.
---

# Supervise Actors

Read [references/actor-design.md](references/actor-design.md).

## Choose or design

Prefer an existing typed Actor kind and Skill over creating agent sprawl. Create a new domain Actor only when the work has a durable role, distinct closed command set, accountable owner, and repeatable operating package.

Generate identity after function: kind, purpose, owner, Organization, audience, tools, commands, data, budget, deadline, escalation, and review. Then produce a clear name, unique handle candidate, short description, fuller description, and member-facing role expression.

## Delegate

1. Resolve Source intent and Organization.
2. Select immutable Actor manifest and version.
3. Issue a short-lived capability with exact reads, tools, commands, targets, budget, deadline, and stop conditions.
4. Supply permission-filtered context only.
5. Re-authorize every tool call.
6. Inspect progress through structured events, not invented narration.
7. Quarantine output outside manifest.
8. Require review/signature before consequential output becomes authoritative state.

In the prototype, Ki may perform all Actor roles serially behind different scoped presences. Never let those presences become independent Sources or share unauthorized context.


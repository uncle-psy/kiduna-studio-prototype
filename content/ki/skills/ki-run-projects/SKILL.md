---
name: ki-run-projects
description: Create and operate Kiduna Projects, Scenes, engagements, work items, contributions, deliverables, milestones, agreements, split rules, invoices, credentials, artifacts, and machine-to-machine packages. Use for planning or doing work, assigning responsibilities, accepting delivery, coordinating collaborators, importing files, or inspecting Project state.
---

# Run Projects

Read [references/project-workflow.md](references/project-workflow.md).

## Procedure

1. Resolve one Organization, purpose, sponsor/owner, participants, and desired outcome.
2. Create the Project and stable Scene identity through a registered Action.
3. Attach Engagement and Agreement terms when work crosses parties or compensation is involved.
4. Decompose work into typed WorkItems with owner, dependencies, acceptance criteria, deadline, privacy, compensation basis, and next Actions.
5. Delegate bounded work to Actors using `ki-supervise-actors`.
6. Store artifacts with provenance and access; keep external links registered.
7. Verify every incoming package manifest before any content becomes a draft or Record.
8. Present deliverables for the required review, signature, or acceptance Action.
9. Record contributions, acceptance, rejection, corrections, milestone state, and invoice/settlement links.

## Guardrails

Do not make the Studio an IDE or file-tree metaphor. Keep Actions at their objects. Treat drafts, accepted deliverables, authoritative Records, and external settlements as distinct.

Quarantine undeclared package output and state the violated manifest constraint. Never silently import code, instructions, credentials, or protected data.


# Project workflow

## Core objects

Project, Scene, Engagement, Agreement, WorkItem, Contribution, Deliverable, Milestone, Artifact, Package, SplitRule, Invoice, Credential, Action, and Record.

## WorkItem states

`proposed → ready → assigned → in_progress → blocked → review → accepted` with `cancelled` and `rejected/revision_requested` paths.

## Package acceptance

Require package ID/version/digest, producer, target Project, declared files/artifacts, allowed types, scope, authority, dependencies, commands requested, access labels, test evidence, and prohibited material. Scan first. Anything outside the manifest is evidence in quarantine, not a Project draft.

## Acceptance preview

Show deliverable, producer, exact version/digest, criteria, known deviations, affected state, compensation consequence, mode, and resulting Record.


# Capability package

## Skill

Name, description/triggers, procedure, allowed Actions/tools, inputs/outputs, examples, restrictions, owner, semver, tests, digest, access, rollout, rollback.

## ActionDefinition and Command

Key/version, family, parameter/result schemas, requesters/performers, one authority class, risk, confirmation, context requirements, preconditions, exact writes, external templates, expected versions, idempotency, locking, receipt renderer, redaction, retention, telemetry, compensation, mode support, tests.

## Actor kind

Durable purpose, accountable owner, immutable manifest, closed capabilities, budget/deadline, output schema, review boundary, escalation, and member-facing identity.

## DomainPackage

Ontology additions, named queries, Actions/Commands, Skills, Actor kinds, policies, UI renderers, migration, fixtures, security/legal classification, activation gates, compatibility, and conformance tests. Do not modify core authority, Organization, Action, Record, or Project semantics.

## Required tests

Authorization negatives, access revocation mid-run, injection, cross-tenant isolation, schema invalidity, idempotency, retry after timeout, receipt round-trip, feature-gate denial, simulation rail isolation, and package-scope quarantine.


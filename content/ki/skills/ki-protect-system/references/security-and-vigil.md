# Security and Vigil

## Core threats

Non-Source injection; secret-existence inference; cross-Persona/Organization leakage; Actor escalation; stale grants; duplicate external effects; forged or replayed events; false registration-as-trust; malicious packages; credential exfiltration; compromised keys; spam; unauthorized profiling; and simulated state reaching connected rails.

## Access rules

Public, private, secret, and personal are independent of trust and authority. Personal is never grantable. Secret existence is protected. Registration is provenance, not permission or trust.

## Safe denial

State the denied Action and a generic basis such as missing authority, conflict, context, credential, confirmation, feature gate, or resource state. Do not reveal which secret role, grant, item, or person caused denial unless separately authorized.

## Incident record

Capture safe event ID, time, principal, Organization, affected capability, detection basis, containment, evidence references, notifications, recovery owner, and status. Never copy secrets into telemetry.


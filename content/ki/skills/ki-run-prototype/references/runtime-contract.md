# Runtime contract

Require trusted runtime fields for `message_authority`, principal, Persona, Ally, Organization, Project, channel, session assurance, execution mode, feature gates, available tools, enabled skills, and active Action IDs.

## Truth order

1. Connected deterministic tools and committed Records.
2. Prototype state store and prototype Records.
3. Permission-scoped knowledge retrieval.
4. Enabled Skill procedures.
5. External research with provenance.
6. Conversation as intent and context only.

## Mandatory state envelope

```yaml
context:
  principal_id: null
  persona_id: null
  ally_id: null
  message_authority: unverified_signal
  organization_id: null
  project_id: null
  human_state: unknown
  channel: field
  session_assurance: basic
  execution_mode: simulated
  feature_gates: []
  active_action_ids: []
```

The model may propose changes but must not author trusted identity, authority, confirmation proof, connected status, or settled status.

Every consequence-bearing Action resolves exactly one Organization. Kinship Duna may default only for registered Public/Guest allowlisted Actions, with `context_defaulted=true`.

## Response contract

Lead with outcome. Include exact status, execution mode when material, one important basis or limitation, next Action, and IDs for committed state. Cite corpus source and heading for substantive Kiduna claims.


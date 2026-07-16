# Actor design

## Manifest

```yaml
actor:
  kind: "registered type"
  name: "member-facing"
  handle: "unique candidate"
  owner_principal_id: "required"
  organization_id: "required"
  purpose: "bounded"
  allowed_reads: []
  allowed_tools: []
  allowed_commands: []
  denied_domains: []
  budget: {}
  deadline: null
  stop_conditions: []
  escalation: null
  output_schema: {}
  review_mode: "required|conditional|none"
  version: "semver"
```

## Naming

Use function-led names for accountability, warm names for member-facing service, and evocative names only when the role remains obvious. Avoid titles implying human credentials, sovereignty, legal office, trust, or independent authority. Validate handle availability before claiming it.

Description formula: `[Name] is a [kind] Actor commissioned by [owner] to [outcome], using [capabilities] within [limits], escalating [boundary] to [human/role].`

## Common kinds

Profiler, ProjectCreator/project_steward, CodeManager, Sentinel, Envoy, Operator, registrar, intake, researcher, and registered domain kinds. Schedulers, queues, indexers, and reconcilers are services, not Actors.


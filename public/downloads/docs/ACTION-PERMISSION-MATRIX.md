# Action and Permission Matrix

Every implementation action must define: actor, scope, preconditions, permission, confirmation, visibility, data written, event emitted, failure, recovery, audit, and risk. “Ki can do it” is not a permission model.

| Action | Actor | Scope | Preconditions and permission | Confirmation | Visibility | Outcome and event | Failure/recovery | Risk |
|---|---|---|---|---|---|---|---|---|
| Create child Realm | member with parent permission | parent Realm | authenticated Source; valid purpose; permission to propose or create | review parent, purpose, participants, access, stewards | draft author; then invited participants | Realm, parent relationship, lineage event | retain draft; never leave partial Realm | High |
| Invite person | member | relationship / Realm | recipient intent, trust context, code policy, privacy choices | recipient, purpose, code use/expiry, disclosed context | inviter and explicitly authorized stewards | Kinship Code, private perspective, invitation event | revoke, expire, or issue again | High |
| Accept invitation | recipient Source | relationship / Realm | matching code and Private Handshake; code active and unused if single-use | preview host, Realm, disclosed context, consequences | inviter and authorized Realm participants after acceptance | relationship lineage and membership/request | explain invalid/used/expired without leaking data | High |
| Bring Ally | Source or host with permission | Scene / gathering | Ally owner, purpose, capability, data access, duration | all participants can see Ally and scope | current gathering | scoped Presence and audit event | remove immediately; text fallback | High |
| Add Actor | authorized steward | Realm | owner, capabilities, input data, actions, expiry, audit | explicit capability grant | Realm participants and affected Sources | Actor grant and event | deny missing permission; revoke | Critical |
| Start voice | participant | gathering | supported client; participant consent; clear recording state | consent when session or recording begins | active gathering | voice session event | text fallback; preserve typed draft | High |
| Create Cell | Fellowship member | Royals & Rogues | purpose, seats, access, matching, duration | review summary | eligible participants | Cell, seat policy, creation event | retain draft | Medium |
| Join Cell | eligible participant | Cell | seat open; access satisfied; any table requirements accepted | show players, voice, rules, stakes, recording | Cell participants | membership and Presence event | waiting list or alternative Cell | Medium |
| Create Alliance | authorized Realm stewards | two or more Realms | parties, purpose, terms, access, review, revocation | confirmation from every required Realm | named participants / declared public scope | Alliance relationship and signed lineage events | pending until all approvals; expire proposal | Critical |
| Share Wisdom | Source or authorized contributor | chosen audience | provenance and visibility defined | show audience and whether a copy is created | exact selected audience | Wisdom version and access event | keep draft; undo grant when allowed | High |
| Change trust | relationship owner | relationship perspective | requester owns the perspective | show operational consequences | perspective owner unless explicitly shared | new trust assertion; prior value retained in history | restore prior assertion | High |
| Run automation | declared automation owner | declared Realm/object | trigger, capability grant, limits, expiry | pre-authorized policy; confirm new high-risk consequence | affected Sources and owners | action event referencing automation and trigger | pause, retry rule, manual remedy | Critical |
| Move resources | wallet holder | Kiduna Web | wallet unlocked; amount, asset, destination, fee available | explicit final review | wallet holder | signed transfer and receipt | never silently retry; provide traceable failure | Critical |

## Required event envelope

Every consequential event includes:

- unique event ID
- occurred-at time and recorded-at time
- initiating Source, Avatar, Ally, Actor, automation, or system process
- action type and schema version
- Realm and object scope
- permission decision and policy version
- human-readable summary
- input references, not unnecessary copies of private content
- output references
- relationship or invitation lineage where relevant
- result: pending, succeeded, failed, partially completed, reversed, or expired
- predecessor/correlation event IDs

## Permission denial

A denial states what was attempted, why it is unavailable, which rule applies, and a safe next step. It must not reveal the existence or contents of private Wisdom or a private Realm.

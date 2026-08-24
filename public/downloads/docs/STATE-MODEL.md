# State Model

## Persistent Studio state

The following state survives normal navigation between nested Realms and Scenes:

- authenticated Source
- active Avatar
- current Realm and ancestry path
- current Scene or activity
- roles and effective permissions
- selected object or focus
- Ki conversation ID and input draft
- active gathering and participant states
- voice session state
- pending confirmations
- return location and scroll/focus restoration target

Private content is not copied into inherited Realm context. Persist references and permission decisions, not unnecessary payloads.

## Realm transition

```text
current Realm
  → request child/parent/peer Realm
  → resolve visibility and access
  → load public/discoverable summary
  → evaluate requested Scene
  → preserve Ki thread and draft
  → render new Realm in same Studio shell
  → announce new location and restore meaningful focus
```

Denied transitions remain in the current Realm and explain the rule without revealing private metadata.

## Gameplay state machine

| # | State | Entry | Primary decision | Exit | Recovery |
|---|---|---|---|---|---|
| 01 | Invitation received | active invitation | preview or decline | preview / closed | request new invite |
| 02 | Realm preview | discoverable invite context | continue or leave | handshake / closed | return to invite |
| 03 | Handshake | code + private phrase | confirm relationship | Great Hall | clarify invalid, used, expired |
| 04 | Great Hall | membership or guest access | join, match, create, inspect | preferences / Cell | preserve arrival state |
| 05 | Match preferences | matching requested | set/refine preferences | proposal | save draft locally/account-side |
| 06 | Match proposed | candidates available | accept, refine, decline | Cell gathering | explain why; alternative proposal |
| 07 | Cell gathering | accepted seat | ready, invite Ally, voice, leave | setup | reopen seat without penalty |
| 08 | Table setup | required players ready | accept rules/options | deal | resolve disagreement or leave |
| 09 | Deal | setup complete | inspect private cards | powers | reconnect to same private state |
| 10 | Setup powers | hand dealt | ready powers/discard | round | preserve selections |
| 11 | Round | turn or response due | legal game action | next turn/counter/showdown | timer and reconnection policy |
| 12 | Counter | eligible response window | counter or pass | resumed resolution | visible timeout consequence |
| 13 | Showdown | betting complete | resolve/reveal | award | deterministic replay from events |
| 14 | After the hand | award complete | continue, pause, reflect, leave | next setup / return | save table state |
| 15 | Realm return | table exit | explore, connect, leave Realm | Great Hall / parent Realm | restore prior focus |

## Voice substate

`unavailable → available → consent-needed → connecting → listening/speaking/muted → reconnecting → ended`

Recording is an orthogonal state with its own consent and visible indicator. Provider failure must not block text or gameplay state.

## Ki input ownership

`docked → moving → panel` and `panel → moving → docked` transfer the same draft, selection, and conversation. At no point may two editable copies exist.

## Async action state

`draft → validating → confirmation → pending → succeeded | failed | partially-completed → retry | remedy | reversed`

High-risk actions never auto-retry after an ambiguous response.

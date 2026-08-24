# Route and Anchor Manifest

Every URL is a durable design reference. Query parameters may select a persona or test fixture later, but the path and documented anchors must remain stable.

| Route | Purpose | Required anchors |
|---|---|---|
| `/` | System overview and nested Realm model | `#realm-model`, `#principles` |
| `/standard-chrome` | Standard Studio frame | shell areas are visible together |
| `/kinship-duna` | Duna administration and flows | `#mage-boundary` |
| `/fellowship-of-play` | Fellowship and child Realm layout | child Realm list |
| `/royals-and-rogues` | R&R Realm boundary and Great Hall | `#design-system`, `#matching`, `#create-cell`, `#create-alliance`, `#invite`, `#resources` |
| `/gameplay` | Fifteen-state demonstration | `#state-01` through `#state-15`, `#rules`, `#table-economy`, `#tournaments` |
| `/ki-allies-actors` | Ki and capability scenarios | `#bring-ally`, `#gameplay`, `#voice`, `#actors` |
| `/actions-permissions` | Action contracts | `#automations`, `#constraints`, `#resources`, plus normalized action slugs |
| `/components-states` | Component inventory | component names rendered as cards |
| `/implementation` | Framework-neutral build sequence | `#delivery` |
| `/rapid-board` | Reconstructed Rapid Board and crosswalk | card IDs in visible labels |
| `/downloads` | Complete developer handoff | `#rapid-board` |

## Deep-link behavior

- Loading an anchor must scroll it below the fixed header.
- Gameplay state anchors should also select the corresponding state when state persistence is implemented.
- A story link must land on the smallest view that fully answers the story.
- If a linked capability is not in the first implementation tranche, the target still documents its data, permission, and failure boundaries.
- Renamed routes require redirects and manifest history; do not silently break design-review links.

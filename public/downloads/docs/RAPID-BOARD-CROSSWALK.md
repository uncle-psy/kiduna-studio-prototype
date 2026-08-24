# Rapid Board Reconstruction and Crosswalk

Source: supplied Rapid Board JSON export. Board workflow and card IDs are preserved. The “Design answer” column is added by this package so the board becomes an executable design index, not a competing specification.

## Ready

| ID | Story | Design answer |
|---|---|---|
| 13 | Change out the Art | `/royals-and-rogues#design-system` |
| 14 | Integrate Ki | `/ki-allies-actors#gameplay` |
| 15 | Integrate automations | `/actions-permissions#automations` |
| 16 | Set up matching system | `/royals-and-rogues#matching` |
| 17 | Character creation — Create Ally | `/ki-allies-actors#bring-ally` |
| 18 | Create Cell | `/royals-and-rogues#create-cell` |
| 19 | Create Alliance | `/royals-and-rogues#create-alliance` |
| 21 | Buying KIDUNA — Tokenomics | `/actions-permissions#resources` |
| 22 | Acquiring free Chips | `/gameplay#table-economy` |
| 23 | Create tournaments and leaderboard | `/gameplay#tournaments` |
| 24 | Voice chat through Gemini Voice API | `/ki-allies-actors#voice` |
| 25 | Coherence/alignment | `/actions-permissions#constraints` |
| 28 | Mage in the world | `/kinship-duna#mage-boundary` |

## In Progress

| ID | Story | Design answer |
|---|---|---|
| 7 | Implement the highest-priority feature | `/implementation#delivery` |
| 8 | Fix the most visible bug | `/implementation#delivery` |
| 9 | Update tests and clean up edge cases | `/implementation#delivery` |
| 20 | Invite & Onboarding | `/royals-and-rogues#invite` |
| 26 | Desktop version | `/standard-chrome` |

Cards 7–9 are generic board workflow templates rather than Kiduna feature definitions. They point to the delivery and verification model.

## Review & Done

| ID | Story | Design answer |
|---|---|---|
| 10 | Review pull request | `/implementation#delivery` |
| 11 | Verify in staging | `/implementation#delivery` |
| 12 | Ship and archive | `/downloads` |

## Resources

| ID | Story | Design answer |
|---|---|---|
| 27 | Royals & Rogues Rules (Formerly Medieval Poker) | `/gameplay#rules` |

The rules card remains in Resources exactly as exported. It is referenced by Ready stories, but it is not duplicated into Ready.

## Development usage

1. Open the card on `/rapid-board`.
2. Follow the design-answer link.
3. Exercise the interactive state.
4. Read the applicable action, component, and state contract.
5. Implement against normalized JSON, not text scraped from the prototype.
6. Add acceptance evidence to the story before moving it to Review & Done.

## Definition of design-ready

A card is design-ready when its target defines entry, actor, permission, primary action, visible state, confirmation, output, event, failure, recovery, responsive behavior, and keyboard/screen-reader expectations—or explicitly marks those aspects out of scope.

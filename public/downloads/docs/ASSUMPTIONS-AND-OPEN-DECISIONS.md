# Assumptions and Open Decisions

These items are deliberately not disguised as settled product canon.

## Assumptions used in the prototype

- Kinship Duna is represented as the parent Realm in this demonstration.
- Fellowship of Play is a child Realm within Kinship Duna.
- Royals & Rogues is a child Realm within the Fellowship.
- Alice, Bob, Carol, Danny/Moto, and Mara are demonstration fixtures only.
- The R&R Core Kit is authoritative for the demonstration's game rules and visual expression.
- Studio can display resource context read-only; money movement and core identity changes remain on Kiduna Web.
- A Mage is modeled as a bounded Realm capability, never as an automatic privacy exception.
- Matching uses declared preference and contextual fit, not an opaque reputation score.

## Decisions still needed

1. **Canonical Realm kind for Royals & Rogues.** The prototype labels it an Experience. Confirm whether that is the canonical Realm subtype or a product-facing descriptor.
2. **Cell taxonomy.** Confirm whether a game Cell is a Realm subtype, a Scene/gathering, or a named game-domain object with a Realm relationship.
3. **Alliance taxonomy.** Confirm whether Alliance is solely a relationship, may also be a Realm presentation, or varies by context.
4. **Mage ownership.** Define whether a Duna collectively owns its Mage, a steward administers it, or a separate governance grant applies.
5. **Invitation disclosure.** Define the minimum information a recipient may see before accepting without exposing private Realm membership.
6. **Private Handshake channel.** Specify whether handshake is always out-of-band and how channel risk is explained.
7. **Voice retention defaults.** Decide transcript, recording, model-processing, and retention defaults per Realm and Scene.
8. **Actor identity assurance.** Define how Actor owner, code/version, provider, and capability manifest are verified.
9. **Matching transparency.** Define what explanation is mandatory and whether participants can exclude specific factors.
10. **Game economy.** Define whether Chips are entirely ephemeral game state or can have persistent, non-monetary progression.
11. **Tournament governance.** Define eligible creators, scoring appeals, public standings, privacy, and moderation.
12. **Cross-Surface continuity.** Define the exact handoff contract among Studio, Live, Express, TV, and Kiduna Web.

## Explicitly outside this prototype

- production cryptography and key management
- a real voice provider integration
- real wallet or token transactions
- final game balance and complete card library
- production matchmaking models
- final governance law or legal interpretation
- final framework or rendering technology

The UI and contracts must make these replaceable implementation choices visible without pretending they are already decided.

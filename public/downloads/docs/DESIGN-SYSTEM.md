# Design System Application

## Kiduna base system

Studio and all contexts outside the Royals & Rogues content boundary use the current Kiduna brand system.

### Color

| Token | Value | Use |
|---|---|---|
| Studio ground | `#0A0604` | primary dark Field |
| Espresso | `#1C140D` | panels and warm depth |
| Cream white | `#FFFFE6` | primary text; never pure white |
| Moon cream | `#FFF6D5` | soft contrast |
| Sun gold | `#EAAA00` | major meaning, figures, primary actions |
| Sky blue | `#03CCD9` | information, focus, Ki, active system state |
| Mint | `#8FE6C6` | present/success with text label |
| Camel | `#C19A6B` | secondary warm metadata |
| Chocolate | `#6F4A2E` | structure and quiet lines |

### Typography

- Goudy Heavyface: major headlines and figures; upright
- Avenir: body, labels, controls, and navigation
- IBM Plex Sans: quotes and selected call-outs when available
- Do not add a fourth primary typeface.

### Material and shape

- warm, solid, restrained, and alive
- one Kiduna mark per surface-level composition
- slight button radius, quiet card radius, pill only for tags/status
- thin warm or sky-blue lines
- avoid glassmorphism, cold grey dashboards, and decorative gradients
- environmental glow is restrained and communicates state

## Royals & Rogues scoped system

Only content inside the R&R Realm boundary uses:

- void `#05080D`
- navy `#071A2D`
- light navy `#0D2B47`
- antique gold `#F2B84B`
- brass `#A66A21`
- parchment `#F5E4BC`
- red `#A4212C`
- emerald `#139A79`
- violet `#6C3BA5`

The visual language is quiet enamel: fine antique-gold cloisonné, recessed dark enamel, parchment text, and at most one restrained glow. No glass haze, lens flare, or artwork with embedded interface text.

Studio header, hierarchy, context inspector, Ki shell, and system confirmations remain Kiduna even while the R&R Field uses its own identity.

## Hierarchy expression

Realm hierarchy uses:

1. explicit path
2. Realm kind and name
3. containment
4. stable ordering
5. parent/child relationship text
6. consistent transition

Distance, orbit, or decorative size alone must never encode hierarchy.

## Motion

Motion supports orientation: panel transfer, Realm transition, selection, state progression, and confirmation. Respect reduced-motion settings. Do not animate background decoration in a way that competes with Ki, participants, game turns, or permission decisions.

## Asset handling

The curated assets package contains only assets required to reproduce this specification: Kiduna marks/action icons/fonts and R&R core identity images. Keep asset provenance in the package manifest; do not re-create supplied logos with generative tools.

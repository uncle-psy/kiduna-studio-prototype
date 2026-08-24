# Kiduna Design system restoration — 2026-08-24

## Recorded sources

- Historical production deployment `dpl_CLGRnXQaBeKoby9WMp2jipYZtD6h` (`kiduna-studio-prototype-qqrwizrj6-motocoasters-projects.vercel.app`), created 2026-08-24 00:52 MDT.
- Preserved hub source commit `233f134` in `uncle-psy/kiduna-design-hub`.
- Current production GitHub commit `f1bcab0` in `uncle-psy/kiduna-studio-prototype`, including the Royals & Rogues library and Systems Oracle.
- Current production deployment `dpl_7GcpdVucAAzHinR8bnMREbWpvfSq`, created 2026-08-24 06:34 MDT, retained as the pre-restoration rollback point.

## Restored union

The release restores the historical systems hub and keeps the systems present in current production. It includes:

1. Isometric Scene System
2. Royals & Rogues
3. Kiduna Coherence
4. Bellwether Reference Implementation
5. Biology Deck
6. Pop Culture Deck
7. Systems Oracle
8. Mapshifting family
9. Mapshifting Animal Deck
10. Mapshifting Nature Deck
11. Mapshifting Alchemy Deck

The earlier Royals & Rogues root URLs (`/cards`, `/rules`, `/flow`, `/compare`, `/decorative`, `/reports`, and `/downloads`) remain valid through compatibility redirects.

## Preservation control

The union is recorded in `data/published-systems.json` and exposed at `/published-systems.json`. Local validation checks the ledger, homepage, Systems menu, local pages, and external rewrites. The publishing skill compares every future candidate with the production ledger and blocks deletion or reassignment of a published ID or route.

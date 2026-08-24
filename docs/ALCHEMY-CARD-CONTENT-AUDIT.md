# Alchemy Card Content Audit

Date: 2026-08-24  
Scope: 50-card Mapshifting Alchemy public library

## Result

- 50 of 50 cards have a public card dossier.
- 50 of 50 include a portrait thumbnail and complete recovered visual description.
- 50 of 50 explicitly represent Gifts and Wounds, including an unrecovered-state message where evidence is absent.
- 50 of 50 include all currently recovered correspondences.
- 47 of 50 have no known source-field gap.
- 3 of 50 retain explicit source gaps and are labeled in both the public data and the dossier interface.

## Incomplete source records

### Card 007 · Unite

- Missing: card-specific extended narrative.
- Missing: Gifts.
- Missing: Wounds.
- Available: identity, suit, grade, keyword, astrological balance, Stone of Destiny, full recovered visual description, and finished art.

### Card 037 · Mature

- Missing: Gifts.
- Missing: Wounds.
- Available: extended narrative, identity, suit, grade, keyword, astrological balance, Stone of Destiny, numbers, full recovered visual description, and finished art.

### Card 039 · Diversify

- Missing: latter portion of the extended narrative; the retained dictation ends mid-reading.
- Missing: astrological balance.
- Missing: Stone of Destiny.
- Available: Gifts, Wounds, identity, suit, grade, keyword, numbers, full recovered visual description, and finished art.

## Publication rule

No missing field is inferred. Every missing source is disclosed in the relevant card dossier with a source-recovery note. When better evidence is supplied, update the maintained Alchemy source kit first and regenerate the public records with `scripts/generate-alchemy-card-content.mjs`.

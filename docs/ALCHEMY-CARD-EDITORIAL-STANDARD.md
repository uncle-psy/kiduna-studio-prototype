# Alchemy Card Content and Editorial Standard

Every compact card and complete-card dossier uses the same public summary order:

1. Suit
2. Current
3. Gifts
4. Challenges / Wounds
5. Stone
6. Planetary Conjunction

Do not display **Ruler** in place of **Planetary Conjunction**. The suit ruler remains internal system metadata. A Wild Card without a source-assigned stone or conjunction displays **Not assigned**; no correspondence may be invented.

The guidebook's **Challenges** are the present source for Mapshifting **Wounds**. Both labels are retained, and the values mirror one another until a distinct Wounds layer is approved.

## Narrative rules

- Lead with the card's practical invitation or tension.
- Separate meaning, symbolic construction, cautions, conjunction, stone, and grade into readable paragraphs.
- Correct transcription errors, false starts, repeated words, punctuation, and obvious OCR mistakes without changing source meaning.
- Explain specialist alchemical terms when they first appear.
- Keep the card description distinct from the interpretive narrative.
- Never add a symbol, correspondence, or claim that is absent from the evidence.

## Regeneration

Update the maintained Mapshifting Alchemy source kit first. Then run `npm run alchemy:content` in this project. That command regenerates the public JSON and the 50 Markdown dossiers in `docs/alchemy-card-dossiers/` and in the source kit.

The site validator fails if any card lacks Gifts, Challenges / Wounds, a narrative, a visual description, or—except for Wild Cards—a Stone or Planetary Conjunction.

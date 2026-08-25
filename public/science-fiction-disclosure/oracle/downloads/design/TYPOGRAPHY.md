# Typography

## Purpose

Typography communicates title, evidence, rules, and provenance outside the artwork with warmth and high legibility.

## Invariants

- No words are baked into Tile art.
- Use a warm display serif for names and a legible humanist sans for evidence, controls, rules, and navigation.
- Minimum interface body is 16 px; minimum metadata is 12 px with sufficient contrast and line height.
- Evidence state, safety, and source status are never encoded through type color alone.

## Production Rules

- Keep titles as live text with responsive wrapping and a stable accessible name.
- Use sentence case for explanatory text and consistent casing for taxonomy labels.
- Reserve display face for short names; never use it for dense rules or source notes.
- Test long names, diacritics, screen zoom, and localized expansion before release.

## States, Scale, and Accessibility

- Meaning and class remain legible at 96, 256, 512, 1024, and 2048 pixels.
- Selected, hover, focus, disabled, and high-attention states add interface contours outside the master art; they never destructively recolor the source.
- No state, class, claim, or evidence condition depends on color alone; accessible live text supplies title, class, evidence, and safety information.

## Quality Gate

- [ ] 200% zoom and keyboard focus preserve reading order.
- [ ] Long titles do not collide with art or badges.
- [ ] Font licenses and fallback stacks are documented.
- [ ] Dynamic text meets contrast and minimum-size rules.
- [ ] Screen-reader labels expose title, class, evidence state, and action.

## Rights and Provenance

Every asset must be original or used under documented permission. Record card ID, prompt or source file, creator/tool, model version where relevant, date, dimensions, color profile, source references, rights status, and checksum. Franchise-derived entries use critical symbolic abstraction and may not reproduce protected logos, characters, costumes, frames, screenshots, or production art. Sacred and community-held imagery requires context and authority; do not turn it into generic decoration.

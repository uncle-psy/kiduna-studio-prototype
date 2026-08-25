# Enamel Specification

## Purpose

Enamel gives the Tiles depth, warmth, and material continuity without sacrificing small-scale clarity.

## Invariants

- Void and midnight enamel are dark, subtly varied surfaces—not pure flat black and not noisy star fields.
- Cloisons are continuous, optically corrected, and thick enough to remain visible at 96 pixels.
- Enamel cells use restrained value variation; highlights describe fired glass, not glossy plastic.
- Texture never crosses metal boundaries or creates false edges.

## Production Rules

- Construct metal cloisons first, then fill enamel cells beneath them.
- Use a shared upper-left light and narrow lower-right reflected edge.
- At 2048, keep structural cloisons at least 12 pixels unless an optical test proves a thinner line survives all exports.
- Avoid diffusion dithering; use clean gradients and low-amplitude material texture.

## States, Scale, and Accessibility

- Meaning and class remain legible at 96, 256, 512, 1024, and 2048 pixels.
- Selected, hover, focus, disabled, and high-attention states add interface contours outside the master art; they never destructively recolor the source.
- No state, class, claim, or evidence condition depends on color alone; accessible live text supplies title, class, evidence, and safety information.

## Quality Gate

- [ ] No pinholes, color leakage, broken cloisons, banding, or muddy noise.
- [ ] Enamel depth survives grayscale.
- [ ] Highlights remain inside material boundaries.
- [ ] 96-pixel export preserves cell separation.
- [ ] Material provenance and any texture licenses are recorded.

## Rights and Provenance

Every asset must be original or used under documented permission. Record card ID, prompt or source file, creator/tool, model version where relevant, date, dimensions, color profile, source references, rights status, and checksum. Franchise-derived entries use critical symbolic abstraction and may not reproduce protected logos, characters, costumes, frames, screenshots, or production art. Sacred and community-held imagery requires context and authority; do not turn it into generic decoration.

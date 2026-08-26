# Tile System

## Purpose

This specification makes every Tile interchangeable across print, web, desktop, and game surfaces while preserving one coherent visual family.

## Invariants

- Canonical raster master is 2048 × 2048 RGBA in sRGB; SVG is preferred when the image is truly vector-native.
- Outer corner radius is 12% of width; safe area is 8%; the central symbol occupies 48–64%; cardinal studs register at the same optical positions.
- Outer silhouette, border grammar, central mechanism, and accent hierarchy remain separable layers.
- Derived files are generated from the master, never upscaled from a smaller export.

## Production Rules

- Deliver 2048, 1024, 512, and 256 PNG; include SVG only when paths are clean and no raster texture is embedded deceptively.
- Use deterministic filenames: card ID, version, size, and variant. Preserve alpha and do not bake a checkerboard into the image.
- Keep master art free of hover glows, focus rings, labels, badges, and evidence chips; those are interface layers.
- Validate optical centering rather than relying only on geometric centering.

## States, Scale, and Accessibility

- Meaning and class remain legible at 96, 256, 512, 1024, and 2048 pixels.
- Selected, hover, focus, disabled, and high-attention states add interface contours outside the master art; they never destructively recolor the source.
- No state, class, claim, or evidence condition depends on color alone; accessible live text supplies title, class, evidence, and safety information.

## Quality Gate

- [ ] Pixel dimensions, alpha, color profile, and filename contract pass.
- [ ] Corner mask and 8% safe area pass.
- [ ] Central symbol remains 48–64% and is not cropped by border grammar.
- [ ] Exports match the 2048 master at each scale with no resampling halos.
- [ ] Metadata and checksum are attached.

## Rights and Provenance

Every asset must be original or used under documented permission. Record card ID, prompt or source file, creator/tool, model version where relevant, date, dimensions, color profile, source references, rights status, and checksum. Franchise-derived entries use critical symbolic abstraction and may not reproduce protected logos, characters, costumes, frames, screenshots, or production art. Sacred and community-held imagery requires context and authority; do not turn it into generic decoration.

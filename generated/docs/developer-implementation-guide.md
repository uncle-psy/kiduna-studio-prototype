# Developer implementation guide

## Load order

1. Load `card-catalog.json` and index records by stable `id`.
2. Use `finalArtwork` for the card's default image view.
3. Render `digitalCopy` as semantic interface text; never bake it into the final art.
4. Offer `originalCrop` as the legacy evidence view.
5. Respect `copyStatus`, `requiresHumanCopyReview`, and `conflicts` in editorial tools.
6. Keep gameplay and decorative records separate.

## Card views

- **ART** — final text-free artwork.
- **CARD TEXT** — name, timing, keywords, and effect from structured data.
- **ORIGINAL CARD** — authoritative legacy face.
- **COMPARE** — final and original side by side.

## Replacement rule

Find the old runtime asset through the record's legacy filename or provenance path, replace its visual layer with `finalArtwork`, and bind the software text layer to `digitalCopy`. Do not infer filenames at runtime; use the supplied manifest.

## State model

Model Setup, Round, Showdown, and Counter as explicit legal timing windows. Resolve Counter chains newest-first. Keep the ordinary Power discard and One Shot discard distinct. Treat Heating Up and Tilted as explicit logged state.

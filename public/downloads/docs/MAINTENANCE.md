# How to Change and Maintain This Plan

## Change a screen

1. Find the route in `docs/ROUTE-MANIFEST.md`.
2. Edit its page content in `app/ui/PlanPage.tsx`.
3. Edit shared navigation, board mapping, game states, or action fixtures in `app/ui/data.ts`.
4. Change global tokens/layout in `app/globals.css`; change the R&R/gameplay and delivery families in `app/rest.css` and `app/rest2.css`.
5. If product behavior changed, update the matching Markdown and JSON contract in the same change.
6. Build the Site and exercise the affected route at desktop and narrow width.
7. Rebuild downloads and checksums before publishing.

## Add a view

1. Add a `PageKey`, navigation record, and page metadata in `app/ui/data.ts`.
2. Add the view component and rendering entry in `app/ui/PlanPage.tsx`.
3. Add `app/<route>/page.tsx` that renders the correct `PlanPage` key.
4. Add the path and stable anchors to `data/routes.json` and `docs/ROUTE-MANIFEST.md`.
5. Link relevant Rapid Board stories to the narrowest useful anchor.

## Change a Rapid Board story mapping

The source export is evidence; do not edit it. Change the crosswalk in `scripts/normalize-board.mjs`, regenerate `data/rapid-board.json` from the new source export, and update the Site fixture in `app/ui/data.ts`. Preserve the original list, ID, title, description, URL, position, and closed state.

## Change terminology

Check the current validated Kiduna Taxonomy Canon first. A product label may clarify canonical vocabulary, but must not silently redefine it. Canon changes use the canon's own versioned approval workflow; this Site then updates its copied reference and SHA.

## Change design assets

- Kiduna source assets belong in `public/assets/kiduna` and fonts in `public/fonts`.
- R&R assets belong in `public/assets/royals` and remain scoped to that Realm.
- Update `docs/ASSET-MANIFEST.md` with source and use.
- Do not regenerate supplied logos or marks.
- Generate at most one social card for the Site unless the product actually needs additional original raster art.

## Package

Run `scripts/package-release.sh`. It creates five bundles in `public/downloads`:

- complete package
- Site source
- specifications
- data contracts
- curated assets

It also writes `CHECKSUMS-SHA256.txt`. Copy the complete package to the project output folder for archival handoff.

## Publish

1. Produce a clean production build.
2. Verify all 12 routes return a successful response.
3. Verify Rapid Board cards land on their documented route/anchor.
4. Verify every download exists and its checksum matches.
5. Publish through the Site's hosting configuration.
6. Record the deployment URL and date in the release notes; do not embed environment-specific URLs in the contracts.

## Release checklist

- [ ] canonical version and SHA current
- [ ] evidence inventory current
- [ ] no unresolved framework-specific implementation requirements
- [ ] routes and anchors stable
- [ ] no dead prototype controls
- [ ] no duplicated Ki input
- [ ] permissions, failures, and recovery documented
- [ ] desktop and narrow layouts checked
- [ ] keyboard focus visible
- [ ] docs and JSON copied to `public/downloads`
- [ ] ZIPs rebuilt
- [ ] checksums verified
- [ ] production build passes

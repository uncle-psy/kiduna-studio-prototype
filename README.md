# Kiduna Studio Prototype

A persistent, interactive prototype of the Kiduna Studio Field.

Live prototype: [kiduna-studio-prototype.vercel.app](https://kiduna-studio-prototype.vercel.app)

The first scenario follows one fixed member identity through a continuous collaborative arc inside Kinship Duna:

1. Enter as David, Jeya, or Aashik for the browser session.
2. Bring Jeya and Aashik into context.
3. Form the private Studio Makers community.
4. Start Studio Field Prototype inside that community.
5. Bring three private source artifacts into the project.
6. Invoke Mapper with project-scoped, read-only access.
7. Work through the brief in a focused surface while the Field remains present.
8. Review a cited proposed change.
9. Approve version 0.2 and retain a receipt.

## Architecture

- Next.js App Router and React
- Neon/Postgres through Drizzle ORM
- One persistent workspace projection for the current Field state
- An append-only event table for action receipts
- Vercel deployment connected to GitHub

The prototype uses namespaced database tables (`studio_prototype_*`) so it can safely share the current development database while the product model is still changing.

## Local development

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

`DATABASE_URL` must point to a Postgres-compatible database.

## Current prototype boundaries

- One shared workspace rather than authenticated, per-member projections
- Prototype identity is fixed per browser session; there is no in-Field account switcher
- Simulated invitation acceptance rather than live delivery
- One project and one community
- No artifact upload/blob storage yet
- No real-time presence or concurrent conflict handling yet
- No agent runtime; Mapper activity is represented as typed persisted actions
- No organization policy editor or contextual grant negotiation yet

These are deliberate boundaries for the first functional loop and the next areas to test.

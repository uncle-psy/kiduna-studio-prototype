# Kiduna Studio Prototype

A persistent, interactive prototype of the Kiduna Studio Field.

Live prototype: [kiduna-studio-prototype.vercel.app](https://kiduna-studio-prototype.vercel.app)

The current scenario begins with a real prototype account and follows an invitation into a continuous collaborative arc inside Kinship Duna:

1. Log in outside the Field or sign up with a handle, Kinship Code, and verified email.
2. Arrive at the durable Personal Web page at `kinship.design/{handle}`.
3. Choose among Studio, TV, Express, and Live; device context recommends the primary Surface.
4. Enter Studio as one of the signed-in account's Personas.
5. Ask Ki to invite any person or create an open invitation through a one-question-at-a-time conversation.
6. Set directional trust, use count, time boundary, privacy, and relationship context.
7. Redeem the Code as a second account and preserve its invitation lineage.
8. Keep the inviter's belief and the invitee's self-shared Wisdom as distinct perspectives.
9. Continue into Organizations, communities, Projects, artifacts, and Actors from the same Field.

## Architecture

- Next.js App Router and React
- PostgreSQL through Drizzle ORM and the portable Postgres.js driver
- pgvector for scoped Wisdom embeddings and semantic retrieval
- Apache AGE for the organization, community, project, member, agent, and artifact relationship graph
- Authenticated accounts, Personas, server-side sessions, and email verification
- Atomic Kinship Code issuance/redemption with trust, lineage, and use limits
- Perspective-preserving Relationship Wisdom namespaces
- Handle-based Personal Web pages with device-aware Surface discovery
- Prototype wallet and compute conventions that remain outside device Surfaces
- An append-only event table for action receipts
- Vercel deployment connected to GitHub

The prototype uses namespaced database tables (`studio_prototype_*`) so it can safely share the current development database while the product model is still changing.

## Local development

```bash
npm install
cp .env.example .env.local
npm run db:up
npm run db:migrate
npm run db:check
npm run db:seed
npm run db:seed:owner # requires DAVID_PASSWORD in the environment
npm run dev
```

The included PostgreSQL 16 image builds pgvector 0.8.2 and Apache AGE 1.6.0, creates the `kiduna` graph, and initializes the project Wisdom vector table. It listens on port `55432` so it does not collide with a conventional local PostgreSQL installation.

`DATABASE_URL` can also point to a hosted PostgreSQL server, but that server must permit both extensions for the complete stack. The database capability endpoint is available at `/api/system/database`.

Useful commands:

```bash
npm run db:up       # build and start PostgreSQL
npm run db:check    # test PostgreSQL, vector distance, AGE, and the Kiduna graph
npm run db:seed     # seed the Studio domain graph and one project Wisdom record
npm run db:down     # stop the local database without deleting its volume
```

## Current prototype boundaries

- Authentication and multi-user invitation redemption are real prototype state
- Persona may switch within an authenticated account; account switching requires logout
- Email verification uses real delivery when configured and a clearly labeled local fallback otherwise
- Prototype Codes are unsigned human-readable credentials, not production cryptographic tokens
- One project and one community
- No artifact upload/blob storage yet
- No real-time presence or concurrent conflict handling yet
- No agent runtime; Mapper activity is represented as typed persisted actions
- No organization policy editor or contextual grant negotiation yet

These are deliberate boundaries for the first functional loop and the next areas to test.

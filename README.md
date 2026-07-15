# Kiduna Studio UX Prototype

A high-fidelity, persistent prototype for learning what Kiduna Studio should become. The prototype is intentionally optimized for believable interaction, fast iteration, and domain-model discovery—not for production readiness.

- Live Studio: [kiduna-studio-prototype.vercel.app](https://kiduna-studio-prototype.vercel.app)
- UX specification and iteration history: [/iterations](https://kiduna-studio-prototype.vercel.app/iterations)
- Prototype gap backlog: [GitHub issue #1](https://github.com/uncle-psy/kiduna-studio-prototype/issues/1)

## Current scenario

1. Sign in locally as David, Jeya, or Aashik. Each browser keeps its own selected identity.
2. David asks Lumen, his Ally, to bring Jeya and Aashik together.
3. Their acceptance activates the secret Studio Makers community and its Envoy.
4. A member starts the Studio Field Prototype as a project inside the community.
5. Sources become project Wisdom; Mapper reads only the project's shared scope.
6. The Allies and Envoys surface a contextual direction instead of creating a group-chat transcript.
7. A member approves direction 0.2 and the Field retains a receipt.

The Field is always present. Chat and detailed information appear as a nearly opaque HUD, preserving spatial context without competing with focused work.

## Domain vocabulary under test

- **Member** — a person with a private Ally.
- **Ally** — the member's continuous, personal agent relationship.
- **Community** — a living relationship among members, represented by an Envoy.
- **Envoy** — the agent-facing presence of a non-member container such as a community or project.
- **Wisdom** — a scoped, provenance-aware knowledge namespace available to a person, community, project, or Envoy.
- **Project** — purposeful work that can contain people, Envoys, actors, sources, direction, and receipts.
- **Actor** — an invoked capability, such as Mapper, with explicit purpose and scope.

## Architecture

- Next.js App Router and React
- Neon/Postgres through Drizzle ORM
- Persisted workspace projection plus append-only action receipts
- OpenAI Responses API integration with a deterministic prototype fallback
- Vercel deployment connected to GitHub

The database tables use the `studio_prototype_*` namespace so the model can evolve safely during UX exploration.

## Local development

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Required environment:

- `DATABASE_URL` — a Postgres-compatible database.
- `OPENAI_API_KEY` — optional; enables generative Ally responses. Never commit or paste this value into prompts or source control.
- `OPENAI_MODEL` — optional; defaults to `gpt-5.4-mini`.

Without an OpenAI key, the Ally remains fully usable through deterministic, scenario-aware responses.

## Prototype boundaries

- Account selection is local browser identity switching, not authentication.
- Invitation delivery, external Slack/Telegram connections, and concurrent work are simulated.
- The current scenario contains one community, one project, and one actor so interaction quality can be evaluated before testing density.
- Wisdom sources are represented, but upload, provenance inspection, and granular sharing controls remain prototype gaps.
- Envoy Stance, Connections, Skills, and Automations are represented conceptually and need dedicated edit flows.

See the in-product specification and GitHub backlog for the use cases and questions driving the next iteration.

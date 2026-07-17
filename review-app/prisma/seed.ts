/**
 * Prisma seed.
 *
 * Seeds:
 *   - One dev Market keyed by `sponsorWallet` (matches the external
 *     login API's user.wallet field) and `platformId` (the agent
 *     service platform)
 *   - All four Objective templates applied to that Market, each with
 *     its Dimensions
 *
 * Idempotent: re-running upserts everything. Safe to run on a populated
 * DB without losing user-generated data.
 *
 * Run with:
 *   npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import {
  OBJECTIVE_TEMPLATES,
  validateObjectiveTemplates,
} from "./seed-data/objective-templates";

const prisma = new PrismaClient();

// Match what the external services use. Override via env if needed.
const DEV_SPONSOR_WALLET =
  process.env.SEED_SPONSOR_WALLET ??
  "G59xXK8jizj8DUv9k1sDgMQyMzVdJNe2xhJUSjeHvMpG";
const DEV_PLATFORM_ID =
  process.env.SEED_PLATFORM_ID ?? "3364ecd9-7a91-4755-af96-a7476deded02";

async function main() {
  console.log("[seed] Validating objective templates…");
  validateObjectiveTemplates();

  console.log("[seed] Upserting dev Market…");
  const market = await prisma.market.upsert({
    where: { slug: "acme" },
    update: {},
    create: {
      slug: "acme",
      name: "Acme Strategy DAO",
      description:
        "Development Market with all Objective templates applied.",
      tokenTicker: "ACME",
      platformId: DEV_PLATFORM_ID,
      sponsorWallet: DEV_SPONSOR_WALLET,
    },
  });
  console.log(`  → ${market.name} (${market.id})`);

  console.log("[seed] Applying objective templates…");
  for (const t of OBJECTIVE_TEMPLATES) {
    const objective = await prisma.objective.upsert({
      where: {
        uq_objective_slug_per_market: { marketId: market.id, slug: t.slug },
      },
      update: {
        icon: t.icon,
        name: t.name,
        description: t.description,
        allowedProposalKinds: t.allowedProposalKinds,
      },
      create: {
        marketId: market.id,
        sponsorWallet: DEV_SPONSOR_WALLET,
        slug: t.slug,
        icon: t.icon,
        name: t.name,
        description: t.description,
        allowedProposalKinds: t.allowedProposalKinds,
      },
    });
    console.log(`  → ${objective.icon} ${objective.name}`);

    for (const [position, d] of t.dimensions.entries()) {
      await prisma.dimension.upsert({
        where: {
          uq_dimension_slug_per_objective: {
            objectiveId: objective.id,
            slug: d.slug,
          },
        },
        update: {
          name: d.name,
          description: d.description,
          weightPct: d.weightPct,
          position,
        },
        create: {
          objectiveId: objective.id,
          slug: d.slug,
          name: d.name,
          description: d.description,
          weightPct: d.weightPct,
          position,
        },
      });
    }
  }

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error("[seed] Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
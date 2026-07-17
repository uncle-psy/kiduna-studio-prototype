/**
 * Shared logic for creating a Proposal across all six kinds.
 *
 * Validates context, builds the parent Proposal row + impact claims +
 * the initial status event, and returns the new proposal id. The
 * kind-specific 1:1 payload is the caller's responsibility — pass a
 * `payloadCreator` that takes the new proposal id.
 *
 * Default resolution order (first defined wins):
 *   1. ctx.body.twapWindowHours / passMarginPct  — per-proposal override
 *   2. market.proposalClassDefaults[kind]         — market-level settings page
 *   fallback: DAO defaults (72h / 3%)
 *
 * Note: on-chain, trading window and pass threshold are DAO-level
 * parameters (dao.seconds_per_proposal, dao.pass_threshold_bps).
 * These DB values are for display/recording only.
 */
import { prisma } from "@/server/prisma";
import { ApiError } from "@/server/errors";
import { isSponsor } from "@/server/permissions";
import type { AuthContext } from "@/server/auth";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert the "3d" / "1d" / "7d" trading-window string stored in
 * proposalClassDefaults into hours so it matches twapWindowHours.
 */
function tradingWindowToHours(tw: string): number {
  switch (tw) {
    case "1d": return 24;
    case "7d": return 168;
    default:   return 72; // "3d"
  }
}

/**
 * Convert "3%" / "5%" pass-threshold string into the integer pct the
 * Proposal row expects (matches passMarginPct on Objective).
 */
function passThresholdToPct(pt: string): number {
  return parseInt(pt, 10); // "3%" → 3, "5%" → 5
}

// ── Shape of one entry inside market.proposalClassDefaults ───────────────────

interface ClassDefault {
  tradingWindow: "1d" | "3d" | "7d";
  passThreshold: "3%" | "5%";
  vaultLiquidityUsd: number;
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface CreateProposalContext {
  marketSlug: string;
  auth: AuthContext;
  kind: "spend" | "param" | "mint" | "metadata" | "liquidity" | "perf";
  body: {
    objectiveId: string;
    operatorId?: string | null;
    title: string;
    rationale: string;
    impactClaims: Array<{ dimensionId: string; claim: number }>;
    // Optional per-proposal overrides (tier 1). When absent, market
    // defaults (tier 2) or objective defaults (tier 3) fill in.
    twapWindowHours?: number;
    passMarginPct?: number;
    // Client-generated idempotency key for dedup
    idempotencyKey?: string;
  };
  /**
   * Creates the kind-specific 1:1 payload row inside the same transaction.
   * The new proposal id is passed in.
   */
  createPayload: (tx: any, proposalId: string) => Promise<void>;
  /** Optional treasury balance to snapshot at creation time. */
  treasuryBalanceUsd?: number;
}

export interface CreateProposalResult {
  id: string;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Run the proposal-creation flow. Throws ApiError for validation
 * failures; the caller's route handler wraps in `toErrorResponse`.
 */
export async function createProposal(
  ctx: CreateProposalContext,
): Promise<CreateProposalResult> {
  // Permission: caller must be sponsor of the Market.
  const market = await prisma.market.findUnique({
    where: { slug: ctx.marketSlug, deactivatedAt: null },
    select: {
      id: true,
      sponsorWallet: true,
      proposalClassDefaults: true,
    },
  });
  if (!market) {
    throw new ApiError("NOT_FOUND", `Market "${ctx.marketSlug}" not found`);
  }
  if (!isSponsor(ctx.auth)) {
    throw new ApiError(
      "FORBIDDEN",
      "Sponsor tier or above required to author proposals",
    );
  }

  // ── Active proposal check ───────────────────────────────────────────────
  // The DAO's pool supports one proposal at a time. A new proposal cannot
  // be launched while another is using the pool's liquidity. Check early
  // to avoid wasting gas on wallet signing that will fail on-chain.
  const activeProposal = await prisma.proposal.findFirst({
    where: {
      marketId: market.id,
      status: { in: ["submitted", "live"] },
    },
    select: { id: true, title: true, status: true },
  });
  if (activeProposal) {
    throw new ApiError(
      "CONFLICT",
      `This market already has an active proposal: "${activeProposal.title}" (${activeProposal.status}). Wait for it to be finalized before creating a new one.`,
    );
  }

  // ── Idempotency dedup check ─────────────────────────────────────────────
  // Prevents duplicate proposals from double-clicks or network retries.
  // Strategy: if a proposal with the same title + kind + author exists for
  // this market and was created within the last 60 seconds, return it.
  const sixtySecondsAgo = new Date(Date.now() - 60_000);
  const recentDuplicate = await prisma.proposal.findFirst({
    where: {
      marketId: market.id,
      kind: ctx.kind,
      title: ctx.body.title,
      authorWallet: ctx.auth.wallet,
      createdAt: { gte: sixtySecondsAgo },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (recentDuplicate) {
    return { id: recentDuplicate.id };
  }

  // Objective must exist and allow this proposal kind.
  // If not yet linked to this market, auto-link it.
  const objective = await prisma.objective.findFirst({
    where: {
      id: ctx.body.objectiveId,
      deactivatedAt: null,
    },
    include: { dimensions: { select: { id: true } } },
  });

  if (!objective) {
    throw new ApiError(
      "BAD_REQUEST",
      "Objective not found",
    );
  }

  // Auto-link to this market if standalone or linked elsewhere
  if (objective.marketId !== market.id) {
    await prisma.objective.update({
      where: { id: objective.id },
      data: { marketId: market.id },
    });
  }
  if (!objective.allowedProposalKinds.includes(ctx.kind)) {
    throw new ApiError(
      "BAD_REQUEST",
      `Objective "${objective.slug}" does not allow ${ctx.kind} proposals`,
    );
  }

  // Operator must belong to this Market and this Objective.
  if (ctx.body.operatorId) {
    const op = await prisma.operator.findFirst({
      where: {
        id: ctx.body.operatorId,
        marketId: market.id,
        objectiveId: objective.id,
        deactivatedAt: null,
      },
      select: { id: true },
    });
    if (!op) {
      throw new ApiError(
        "BAD_REQUEST",
        "Operator not found, or not bound to this Objective",
      );
    }
  }

  // Every impactClaim must point at a Dimension belonging to this Objective.
  const validDimensionIds = new Set(
    objective.dimensions.map((d: { id: string }) => d.id),
  );
  for (const c of ctx.body.impactClaims) {
    if (!validDimensionIds.has(c.dimensionId)) {
      throw new ApiError(
        "BAD_REQUEST",
        `Dimension "${c.dimensionId}" is not part of this Objective`,
      );
    }
  }

  // ── 3-tier default resolution ─────────────────────────────────────────────
  //
  //   Tier 1: per-proposal override from the request body (ctx.body.*)
  //   Tier 2: market-level defaults saved on the settings page
  //           (market.proposalClassDefaults[kind])
  //
  // Note: on-chain, trading window and pass threshold are DAO-level
  // parameters (dao.seconds_per_proposal, dao.pass_threshold_bps).
  // These DB values are for display/recording only.
  //
  // proposalClassDefaults is a JSONB blob. Cast it so TS knows the shape.
  const marketDefaults = (
    (market.proposalClassDefaults as Record<string, ClassDefault> | null) ?? {}
  )[ctx.kind];

  const twapWindowHours =
    ctx.body.twapWindowHours                              // tier 1 — explicit override
    ?? (marketDefaults
        ? tradingWindowToHours(marketDefaults.tradingWindow) // tier 2 — market setting
        : undefined)
    ?? 72;                                                // fallback — 3 days (DAO default)

  const passMarginPct =
    ctx.body.passMarginPct                                // tier 1 — explicit override
    ?? (marketDefaults
        ? passThresholdToPct(marketDefaults.passThreshold)  // tier 2 — market setting
        : undefined)
    ?? 3;                                                 // fallback — 3% (DAO default)

  // ── Write ─────────────────────────────────────────────────────────────────

  const created = await prisma.$transaction(async (tx: any) => {
    const proposal = await tx.proposal.create({
      data: {
        marketId: market.id,
        objectiveId: objective.id,
        operatorId: ctx.body.operatorId ?? null,
        authorWallet: ctx.auth.wallet,
        title: ctx.body.title,
        rationale: ctx.body.rationale,
        kind: ctx.kind,
        status: "draft",
        twapWindowHours,  // resolved value stored here — advance route reads this
        passMarginPct,    // resolved value stored here
        // Treasury balance snapshot at creation time — helps detect stale proposals
        launchContext: ctx.treasuryBalanceUsd != null
          ? { treasurySnapshotUsd: ctx.treasuryBalanceUsd, snapshotAt: new Date().toISOString() }
          : undefined,
        impactClaims: {
          create: ctx.body.impactClaims.map((c) => ({
            dimensionId: c.dimensionId,
            claim: c.claim,
          })),
        },
        statusEvents: {
          create: {
            fromStatus: null,
            toStatus: "draft",
            at: new Date(),
            actorWallet: ctx.auth.wallet,
            note: "Created",
          },
        },
      },
      select: { id: true },
    });

    // Kind-specific payload.
    await ctx.createPayload(tx, proposal.id);

    return proposal;
  });

  return { id: created.id };
}
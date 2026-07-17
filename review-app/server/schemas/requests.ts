/**
 * Request body schemas for write endpoints.
 *
 * Each schema is the exact body shape the route handler expects.
 * They're also the source for OpenAPI requestBody schemas (kept in sync
 * with the YAML manually for now).
 */
import { z } from "zod";
import { ProposalKindSchema, TradeSideSchema } from "./index";

// ─── Markets ────────────────────────────────────────────────────────

export const CreateMarketSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "lowercase letters, digits, hyphens"),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
  platformId: z.string().min(1).optional(),
  tokenTicker: z.string().min(1).max(10),
  // Full token launch config from wizard (stored as JSON)
  tokenConfig: z.object({
    mode: z.enum(["new", "existing"]),
    tokenName: z.string(),
    ticker: z.string(),
    description: z.string().optional(),
    decimals: z.number(),
    totalSupply: z.number(),
    metadataUri: z.string().optional(),
    existingMint: z.string().optional(),
    minRaise: z.number(),
    maxRaise: z.number(),
    launchPeriodDays: z.number(),
    teamAllocPct: z.number(),
    treasuryReservePct: z.number(),
    poolPct: z.number(),
    futarchyPct: z.number(),
    usdcPoolPct: z.number(),
    usdcTreasuryPct: z.number(),
    usdcFutarchyPct: z.number(),
    monthlyLimitUsdc: z.number(),
    cooldownHours: z.number(),
    lockupMonths: z.number(),
    vestingStyle: z.string(),
    recipients: z.array(z.object({ id: z.string(), wallet: z.string(), pct: z.number() })),
    enableBidWall: z.boolean(),
    // ── ICO Launchpad fields (new token mode) ──
    icoDurationDays: z.number().optional(),
    monthlyBudgetUsdc: z.number().optional(),
    perfPackageTokens: z.number().optional(),
    perfPackageGrantee: z.string().optional(),
    perfMinUnlockMonths: z.number().optional(),
    additionalTokensAmount: z.number().optional(),
    additionalTokensRecipient: z.string().optional(),
    hasBidWall: z.boolean().optional(),
    secondsPerProposal: z.number().optional(),
  }).optional().nullable(),
  // Objective to link to this market (selected in wizard Step 4)
  objectiveId: z.string().min(1).optional().nullable(),
  // Operator chosen in wizard Step 1 — persisted as Market.primaryOperatorId so
  // a resumed draft can restore it (previously lost once sessionStorage cleared).
  operatorId: z.string().min(1).optional().nullable(),
  // ── ICO fields (top-level, extracted from tokenConfig by review page) ──
  launchMode: z.enum(["ico", "sponsor"]).optional(),
  minRaise: z.number().optional(),
  icoDurationSeconds: z.number().optional(),
  monthlyBudgetUsdc: z.number().optional(),
  hasBidWall: z.boolean().optional(),
  perfPackageTokens: z.number().optional(),
  perfPackageGrantee: z.string().optional().nullable(),
  perfMinUnlockMonths: z.number().optional(),
  additionalTokensAmount: z.number().optional(),
  additionalTokensRecipient: z.string().optional().nullable(),
  teamAddress: z.string().optional().nullable(),
});

export const UpdateMarketSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
  tokenTicker: z.string().min(1).max(10).nullable().optional(),
  // Token launch config from wizard (same shape as CreateMarketSchema.tokenConfig)
  tokenConfig: z.object({
    mode: z.enum(["new", "existing"]),
    tokenName: z.string(),
    ticker: z.string(),
    description: z.string().optional(),
    decimals: z.number(),
    totalSupply: z.number(),
    metadataUri: z.string().optional(),
    existingMint: z.string().optional(),
    minRaise: z.number(),
    maxRaise: z.number(),
    launchPeriodDays: z.number(),
    teamAllocPct: z.number(),
    treasuryReservePct: z.number(),
    poolPct: z.number(),
    futarchyPct: z.number(),
    usdcPoolPct: z.number(),
    usdcTreasuryPct: z.number(),
    usdcFutarchyPct: z.number(),
    monthlyLimitUsdc: z.number(),
    cooldownHours: z.number(),
    lockupMonths: z.number(),
    vestingStyle: z.string(),
    recipients: z.array(z.object({ id: z.string(), wallet: z.string(), pct: z.number() })),
    enableBidWall: z.boolean(),
  }).optional().nullable(),
});

export const LaunchMarketSchema = z.object({
  // Optional — sponsor can override the operator chosen at create.
  primaryOperatorId: z.string().optional(),
});

// ─── Membership ─────────────────────────────────────────────────────

export const RemoveMemberSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

// ─── Dimensions (used inside Objective) ─────────────────────────────

export const DimensionInputSchema = z.object({
  // For existing dimensions, include id so we know to update vs create
  id: z.string().optional(),
  slug: z.string().min(1).max(60),
  name: z.string().min(1).max(100),
  description: z.string().max(300).nullable().optional(),
  weightPct: z.number().int().min(0).max(100),
});

// ─── Objectives ─────────────────────────────────────────────────────

export const CreateObjectiveSchema = z
  .object({
    // Either provide a template slug to clone, or provide the full
    // shape inline. Server validates exactly one is set.
    fromTemplate: z.string().optional(),
    slug: z.string().min(2).max(60).optional(),
    icon: z.string().max(10).optional().nullable(),
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(500).optional().nullable(),
    allowedProposalKinds: z.array(ProposalKindSchema).optional(),
    dimensions: z.array(DimensionInputSchema).optional(),
  })
  .refine(
    (val) => Boolean(val.fromTemplate) !== Boolean(val.slug && val.name && val.dimensions),
    {
      message:
        "Provide either fromTemplate, or the full set: slug, name, dimensions",
    },
  );

export const UpdateObjectiveSchema = z
  .object({
    icon: z.string().max(10).nullable().optional(),
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(500).nullable().optional(),
    allowedProposalKinds: z.array(ProposalKindSchema).optional(),
    // Full dimensions array. REPLACE semantics — any existing dimension
    // not in the array is deleted. Weights must sum to 100.
    dimensions: z.array(DimensionInputSchema).optional(),
  })
  .refine(
    (val) => {
      if (!val.dimensions) return true;
      const sum = val.dimensions.reduce((s, d) => s + d.weightPct, 0);
      return sum === 100;
    },
    { message: "Dimension weights must sum to 100" },
  );

// ─── Operators ──────────────────────────────────────────────────────

export const CreateOperatorSchema = z.object({
  // External agent service id (agent_*)
  agentId: z.string().min(1),
  objectiveId: z.string().min(1),
});

// ─── Proposals: shared parts ────────────────────────────────────────

const ProposalBaseSchema = z.object({
  objectiveId: z.string().min(1),
  operatorId: z.string().min(1).optional().nullable(),
  title: z.string().min(1).max(200),
  rationale: z.string().max(5000),
  // Operator's claimed impact per dimension, range [-1, 1]
  impactClaims: z.array(
    z.object({
      dimensionId: z.string().min(1),
      claim: z.number().min(-1).max(1),
    }),
  ),
  // Optional overrides on the per-Objective defaults
  twapWindowHours: z.number().int().min(1).max(168).optional(),
  passMarginPct: z.number().int().min(1).max(20).optional(),
  // Client-generated idempotency key — prevents duplicate proposals from double-clicks
  idempotencyKey: z.string().max(300).optional(),
});

// ─── Proposals: six kind-specific bodies ────────────────────────────

export const CreateSpendProposalSchema = ProposalBaseSchema.extend({
  recipientName: z.string().min(1).max(200),
  recipientAddress: z.string().min(32).max(44),
  amountUsd: z.number().positive(),
  asset: z.enum(["usdc", "token"]).default("usdc"),
  mintAddress: z.string().min(32).max(44).optional().nullable(),
});

export const CreateParamProposalSchema = ProposalBaseSchema.extend({
  parameterPath: z.string().min(1).max(500),
  valueBefore: z.string().max(2000),
  valueAfter: z.string().max(2000),
});

export const CreateMintProposalSchema = ProposalBaseSchema.extend({
  amount: z.number().positive(),
  ticker: z.string().min(1).max(10),
  distribution: z
    .array(
      z.object({
        recipient: z.string().min(1),
        pct: z.number().min(0).max(100),
      }),
    )
    .min(1)
    .refine(
      (rows) => Math.abs(rows.reduce((s, r) => s + r.pct, 0) - 100) < 0.01,
      { message: "Distribution must sum to 100%" },
    ),
});

export const CreateMetadataProposalSchema = ProposalBaseSchema.extend({
  fieldsBefore: z.record(z.string(), z.string()),
  fieldsAfter: z.record(z.string(), z.string()),
  newMetadataUri: z.string().url().optional().nullable(),
});

export const CreateLiquidityProposalSchema = ProposalBaseSchema.extend({
  direction: z.enum(["provide", "withdraw"]),
  amountUsd: z.number().positive(),
  poolName: z.string().min(1).max(120),
});

export const CreatePerfProposalSchema = ProposalBaseSchema.extend({
  recipientName: z.string().min(1).max(200),
  recipientWallet: z.string().min(32).max(44),
  rewardAmount: z.number().positive(),
  rewardTicker: z.string().min(1).max(10),
  rewardMintAddress: z.string().min(32).max(44).optional().nullable(),
  unlockConditions: z
    .array(z.object({ description: z.string().min(1).max(500) }))
    .min(1),
  // Price tranches: each tranche unlocks tokenAmount when TWAP exceeds priceThreshold
  tranches: z
    .array(z.object({
      priceThreshold: z.number().positive(),
      tokenAmount: z.number().positive(),
    }))
    .min(1),
  // Minimum timestamp before any unlock (ISO string)
  minUnlockTimestamp: z.string().datetime(),
  // TWAP window in hours (converted to seconds in the instruction builder)
  twapWindowHours: z.number().int().min(1).max(8760).default(24),
  // Program version
  programVersion: z.enum(["v0.6", "v0.7"]).default("v0.7"),
});

// ─── Proposal lifecycle ─────────────────────────────────────────────

/**
 * Lifecycle transitions a sponsor can request manually:
 *   submitted  — draft → submitted (kicks off phase-1 multisig tx)
 *   live       — submitted → live   (kicks off phase-2/3 futarchy tx)
 *   cancelled  — terminal cancel from draft or submitted
 *
 * resolved/executed/measured are system-only (auto runs); they aren't
 * valid targets for this endpoint.
 */
export const AdvanceProposalSchema = z.object({
  to: z.enum(["submitted", "live", "resolving", "resolved", "executed", "cancelled"]),
  note: z.string().max(500).optional(),
  /** On-chain outcome from finalize — required when advancing to "resolved". */
  outcome: z.enum(["passed", "failed"]).optional(),
  /** On-chain tx signature — optional metadata for the status event. */
  txSignature: z.string().max(120).optional(),
});

// ════════════════════════════════════════════════════════════════════════
//   Batch 3 — Electors, funding, intents, settings
// ════════════════════════════════════════════════════════════════════════

// ─── Electors ──────────────────────────────────────────────────────

/**
 * Per-Elector dimension weights. Must sum to 100 across all of the
 * Objective's dimensions. Citizens override the Objective defaults.
 */
export const ElectorWeightInputSchema = z.object({
  dimensionId: z.string().min(1),
  weightPct: z.number().int().min(0).max(100),
});

export const UpsertElectorSchema = z
  .object({
    /** Reference to the agent created by the client in agent service. */
    agentId: z.string().min(1),
    displayName: z.string().min(1).max(80),
    isAutonomous: z.boolean().default(true),
    /** Optional citizen system prompt overrides. */
    systemPrompt: z.string().max(5000).optional().nullable(),
    /** REQUIRED on first create; optional on subsequent upserts (keeps existing). */
    weights: z.array(ElectorWeightInputSchema).optional(),
  })
  .refine(
    (val) => {
      if (!val.weights) return true;
      const sum = val.weights.reduce((s, w) => s + w.weightPct, 0);
      return sum === 100;
    },
    { message: "Elector weights must sum to 100" },
  );

export const UpdateElectorSchema = z
  .object({
    displayName: z.string().min(1).max(80).optional(),
    isAutonomous: z.boolean().optional(),
    systemPrompt: z.string().max(5000).nullable().optional(),
    weights: z.array(ElectorWeightInputSchema).optional(),
  })
  .refine(
    (val) => {
      if (!val.weights) return true;
      const sum = val.weights.reduce((s, w) => s + w.weightPct, 0);
      return sum === 100;
    },
    { message: "Elector weights must sum to 100" },
  );

// ─── Elector funding ───────────────────────────────────────────────

export const FundElectorSchema = z.object({
  amountUsd: z.number().positive().max(1_000_000),
});

export const WithdrawElectorSchema = z.object({
  /** Use 'all' to withdraw the whole available balance. */
  amountUsd: z.union([z.number().positive(), z.literal("all")]),
});

// ─── Intents (the 30-min override window) ───────────────────────────

export const OverrideIntentSchema = z.object({
  side: TradeSideSchema,
  stakeUsd: z.number().positive(),
  note: z.string().max(500).optional(),
});

// ─── Settings ─────────────────────────────────────────────────────

export const UpdateIdentitySettingsSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
});

const TradingWindowSchema = z.enum(["1d", "3d", "7d"]);
const PassThresholdSchema = z.enum(["3%", "5%"]);

const ProposalClassDefaultsSchema = z.object({
  tradingWindow: TradingWindowSchema,
  passThreshold: PassThresholdSchema,
  vaultLiquidityUsd: z.number().nonnegative(),
});

export const UpdateMechanismSettingsSchema = z.object({
  /**
   * Per-proposal-class defaults. Keys: spend, param, mint, metadata,
   * liquidity, perf. Only the kinds actually being updated need to
   * appear — others keep their current values.
   */
  classDefaults: z
    .record(ProposalKindSchema, ProposalClassDefaultsSchema)
    .optional(),
});

/**
 * Dimension settings — Markets can edit the per-Market default
 * Dimensions (used as defaults when Objectives are created). The
 * Objective-level edit endpoint is the per-Objective overrides; this
 * is the Market-wide template.
 *
 * For v1 we read-only this from the existing Objectives; the PATCH
 * endpoint is a stub that fans out to per-Objective updates if needed.
 */
export const UpdateDimensionsSettingsSchema = z.object({
  // Currently no Market-level dimension data — this PATCH endpoint
  // exists for symmetry but is a no-op stub. Editing dimensions happens
  // on Objectives via PATCH /v1/objectives/{id}.
});
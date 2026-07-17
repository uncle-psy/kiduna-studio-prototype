/**
 * Shared Zod schemas for response shapes.
 *
 * Source of truth for runtime validation in route handlers. The
 * OpenAPI YAML mirrors these shapes by hand — keep them in sync when
 * you change either side.
 */
import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────────────

export const ProposalKindSchema = z.enum([
  "spend",
  "param",
  "mint",
  "metadata",
  "liquidity",
  "perf",
]);
export const ProposalStatusSchema = z.enum([
  "draft",
  "submitted",
  "live",
  "resolving",
  "resolved",
  "executed",
  "measured",
  "cancelled",
]);
export const ProposalPhaseSchema = z.enum([
  "active",
  "completed",
  "upcoming",
  "cancelled",
]);
export const TradeSideSchema = z.enum(["pass", "fail"]);

// ─── Market ─────────────────────────────────────────────────────────

export const MarketSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  tokenTicker: z.string().nullable(),
  launchStatus: z.enum(["draft", "initialized", "fundraising", "closed", "settling", "launching", "live", "refunding", "failed", "cancelled"]),
  memberCount: z.number().int(),
  openProposalsCount: z.number().int(),
  treasuryUsd: z.number().nullable(),
  createdAt: z.string(),
});

export const MyMembershipSchema = z.object({
  joinedAt: z.string(),
  role: z.enum(["sponsor", "citizen"]),
  removedAt: z.string().nullable(),
});

export const MarketDetailSchema = MarketSummarySchema.extend({
  multisigAddress: z.string().nullable(),
  tokenMintAddress: z.string().nullable(),
  daoAddress: z.string().nullable(),
  daoNonce: z.string().nullable(),
  squadsVault: z.string().nullable(),
  quoteMint: z.string().nullable(),
  poolAddress: z.string().nullable(),
  joinPolicy: z.enum(["public"]),
  myMembership: MyMembershipSchema.nullable(),
});

// ─── Dimension + Objective ──────────────────────────────────────────

export const DimensionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  weightPct: z.number().int(),
  position: z.number().int(),
});

export const ObjectiveSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  allowedProposalKinds: z.array(ProposalKindSchema),
  dimensions: z.array(DimensionSchema),
});

export const ObjectiveTemplateSchema = z.object({
  slug: z.string(),
  icon: z.string(),
  name: z.string(),
  description: z.string(),
  allowedProposalKinds: z.array(ProposalKindSchema),
  dimensions: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      description: z.string(),
      weightPct: z.number().int(),
    }),
  ),
});

// ─── Proposal (summary + detail) ────────────────────────────────────

export const ProposalSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: ProposalKindSchema,
  status: ProposalStatusSchema,
  objectiveId: z.string(),
  objectiveName: z.string(),
  operatorId: z.string().nullable(),
  openedAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  twapWindowHours: z.number().int(),
  passTwap: z.number().nullable(),
  failTwap: z.number().nullable(),
  activeElectors: z.number().int(),
  tradeCount: z.number().int(),
  volumeUsd: z.number(),
});

export const ImpactClaimSchema = z.object({
  dimensionId: z.string(),
  dimensionName: z.string(),
  claim: z.number(),
  measured: z.number().nullable(),
  measurementSource: z.string().nullable(),
});

// Kind-specific payloads — discriminated union for the detail response
export const ProposalSpendPayloadSchema = z.object({
  recipientName: z.string(),
  recipientAddress: z.string(),
  amountUsd: z.number(),
  treasuryBeforeUsd: z.number(),
  treasuryAfterUsd: z.number(),
  priorProposalsCount: z.number().int(),
  txSignature: z.string().nullable(),
});

export const ProposalParamPayloadSchema = z.object({
  parameterPath: z.string(),
  valueBefore: z.string(),
  valueAfter: z.string(),
  proposalsSinceChange: z.number().int().nullable(),
  effectiveSlot: z.number().int().nullable(),
});

export const ProposalMintPayloadSchema = z.object({
  amount: z.number(),
  ticker: z.string(),
  supplyBefore: z.number(),
  supplyAfter: z.number(),
  distribution: z.array(
    z.object({ recipient: z.string(), pct: z.number() }),
  ),
  txSignature: z.string().nullable(),
});

export const ProposalMetadataPayloadSchema = z.object({
  fieldsBefore: z.record(z.string(), z.string()),
  fieldsAfter: z.record(z.string(), z.string()),
  newMetadataUri: z.string().nullable(),
  txSignature: z.string().nullable(),
});

export const ProposalLiquidityPayloadSchema = z.object({
  direction: z.enum(["provide", "withdraw"]),
  amountUsd: z.number(),
  poolName: z.string(),
  poolDepthBeforeUsd: z.number(),
  poolDepthAfterUsd: z.number(),
  priceImpactBeforeBps: z.number().int(),
  priceImpactAfterBps: z.number().int(),
  txSignature: z.string().nullable(),
});

export const ProposalPerfPayloadSchema = z.object({
  recipientName: z.string(),
  rewardAmount: z.number(),
  rewardTicker: z.string(),
  unlockConditions: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      status: z.enum(["waiting", "met", "failed"]),
      progress: z.string().optional(),
    }),
  ),
  escrowAddress: z.string().nullable(),
});

export const ProposalDetailSchema = ProposalSummarySchema.extend({
  rationale: z.string(),
  passMarginPct: z.number().int(),
  executedAt: z.string().nullable(),
  measuredAt: z.string().nullable(),
  authorWallet: z.string(),
  impactClaims: z.array(ImpactClaimSchema),
  // Exactly one of these is non-null based on kind.
  spend: ProposalSpendPayloadSchema.nullable(),
  param: ProposalParamPayloadSchema.nullable(),
  mint: ProposalMintPayloadSchema.nullable(),
  metadata: ProposalMetadataPayloadSchema.nullable(),
  liquidity: ProposalLiquidityPayloadSchema.nullable(),
  perf: ProposalPerfPayloadSchema.nullable(),
});

// ─── Activity feeds ────────────────────────────────────────────────

export const TradeSchema = z.object({
  id: z.string(),
  electorId: z.string(),
  electorName: z.string(),
  side: TradeSideSchema,
  stakeUsd: z.number(),
  qty: z.number(),
  price: z.number(),
  at: z.string(),
});

export const SettlementSchema = z.object({
  id: z.string(),
  electorId: z.string(),
  electorName: z.string(),
  side: TradeSideSchema,
  amountUsd: z.number(),
  settledAt: z.string(),
});

export const StatusEventSchema = z.object({
  id: z.string(),
  fromStatus: ProposalStatusSchema.nullable(),
  toStatus: ProposalStatusSchema,
  at: z.string(),
  actorWallet: z.string().nullable(),
  note: z.string().nullable(),
});

export const ElectorActivitySchema = z.object({
  participation: z.object({
    active: z.number().int(),
    total: z.number().int(),
  }),
  stakeBySide: z.object({
    pass: z.number(),
    fail: z.number(),
  }),
  dimensionSplits: z.array(
    z.object({
      dimensionId: z.string(),
      dimensionName: z.string(),
      passWeightedPct: z.number(),
      failWeightedPct: z.number(),
      electorsHeavilyWeighting: z.number().int(),
    }),
  ),
});

// ─── Member ─────────────────────────────────────────────────────────

export const MemberSchema = z.object({
  wallet: z.string(),
  joinedAt: z.string(),
  isSponsor: z.boolean(),
});

// ════════════════════════════════════════════════════════════════════════
//   Batch 3 — Electors, intents, treasury, tokens, settings, glossary
// ════════════════════════════════════════════════════════════════════════

// ─── Elector ────────────────────────────────────────────────────────

export const ElectorWeightSchema = z.object({
  dimensionId: z.string(),
  dimensionName: z.string(),
  weightPct: z.number().int(),
});

export const ElectorSchema = z.object({
  id: z.string(),
  agentId: z.string().nullable(),
  marketId: z.string(),
  objectiveId: z.string(),
  objectiveName: z.string(),
  wallet: z.string(),
  displayName: z.string(),
  isAutonomous: z.boolean(),
  systemPrompt: z.string().nullable(),
  signerPubkey: z.string().nullable(),
  weights: z.array(ElectorWeightSchema),
  deactivatedAt: z.string().nullable(),
  createdAt: z.string(),
});

// ─── Elector balance ────────────────────────────────────────────────

export const ElectorBalanceSchema = z.object({
  electorId: z.string(),
  signerPubkey: z.string().nullable(),
  availableUsd: z.number(),
  reservedUsd: z.number(),
  pendingDepositsUsd: z.number(),
  indexerStatus: z.enum(["live", "pending", "error"]),
});

// ─── Unsigned tx envelope ───────────────────────────────────────────

export const UnsignedTxEnvelopeSchema = z.object({
  /** Base64-encoded unsigned Solana transaction. */
  txBase64: z.string(),
  /** What this transaction does, for client to confirm before signing. */
  description: z.string(),
  /** Expected effects, so the client UI can show a summary. */
  effects: z.object({
    fromAddress: z.string(),
    toAddress: z.string(),
    amountUsd: z.number(),
    mint: z.string(),
  }),
  /** Seconds until the blockhash inside the tx expires. */
  expiresInSec: z.number().int(),
});

// ─── Intent ─────────────────────────────────────────────────────────

export const ElectorIntentStatusSchema = z.enum([
  "pending",
  "fired",
  "cancelled",
  "failed",
]);

export const IntentSchema = z.object({
  id: z.string(),
  proposalId: z.string(),
  electorId: z.string(),
  electorName: z.string(),
  side: TradeSideSchema,
  stakeUsd: z.number(),
  source: z.enum(["recommendation", "override"]),
  status: ElectorIntentStatusSchema,
  autoFireAt: z.string(),
  firedAt: z.string().nullable(),
  resultingTradeId: z.string().nullable(),
  rationale: z.string().nullable(),
  note: z.string().nullable(),
  /** Seconds remaining in the override window (0 if window closed). */
  overrideSecondsRemaining: z.number().int(),
});

export const MyIntentResponseSchema = z.object({
  /** One intent per Elector the caller has on this Objective. */
  intents: z.array(IntentSchema),
});

// ─── Treasury ──────────────────────────────────────────────────────

export const TreasuryBalanceSchema = z.object({
  multisigAddress: z.string().nullable(),
  availableUsd: z.number(),
  reservedUsd: z.number(),
  totalUsd: z.number(),
  solBalance: z.number().nullable(),
  monthlyBudgetUsdc: z.number().nullable(),
  spendingLimitConfigured: z.boolean(),
  spendingLimitTotal: z.number().nullable(),
  spendingLimitRemaining: z.number().nullable(),
  indexerStatus: z.enum(["live", "pending", "error"]),
});

export const TreasuryMovementSchema = z.object({
  id: z.string(),
  kind: z.string(),
  label: z.string(),
  amountUsd: z.number(),
  /** signed: positive = inflow, negative = outflow */
  direction: z.enum(["in", "out"]),
  txSignature: z.string().nullable(),
  proposalId: z.string().nullable(),
  at: z.string(),
});

// ─── Tokens ────────────────────────────────────────────────────────

export const TokenSummarySchema = z.object({
  mintAddress: z.string().nullable(),
  ticker: z.string(),
  totalSupply: z.number(),
  circulatingSupply: z.number(),
  distribution: z.array(
    z.object({
      label: z.string(),
      address: z.string().nullable(),
      amount: z.number(),
      pct: z.number(),
      vesting: z
        .object({
          cliffDate: z.string().nullable(),
          unlockedPct: z.number(),
        })
        .nullable(),
    }),
  ),
});

// ─── Settings ──────────────────────────────────────────────────────

export const IdentitySettingsSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
});

export const MechanismSettingsSchema = z.object({
  locked: z.object({
    visibility: z.string(),
    ledger: z.string(),
    economicModel: z.string(),
    rewardUnit: z.string(),
  }),
  classDefaults: z.record(
    ProposalKindSchema,
    z.object({
      tradingWindow: z.enum(["1d", "3d", "7d"]),
      passThreshold: z.enum(["3%", "5%"]),
      vaultLiquidityUsd: z.number(),
    }),
  ),
});

export const DimensionsSettingsSchema = z.object({
  /** Read-only summary — actual editing happens per-Objective. */
  objectives: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      dimensionCount: z.number().int(),
    }),
  ),
});

// ─── Glossary ───────────────────────────────────────────────────────

export const GlossaryTermSchema = z.object({
  slug: z.string(),
  term: z.string(),
  definition: z.string(),
});
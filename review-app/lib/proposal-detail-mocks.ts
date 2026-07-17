import type { ProposalKind } from "./proposal-types";

export type ProposalStatus = "live" | "resolved";

export interface ImpactClaim {
  /** Matches Objective dimension id. */
  dimensionId: string;
  /** Operator's signed-impact claim (-1 to +1). */
  claim: number;
  /** Measured outcome, if available. */
  measured?: number;
  /** Brief explanation of how the measurement was taken. */
  measurementSource?: string;
}

export interface SettlementRow {
  side: "pass" | "fail";
  electors: number;
  /** USDC amount paid out or lost. */
  amount: number;
}

interface BaseProposal {
  id: string;
  kind: ProposalKind;
  title: string;
  objectiveId: string;
  operatorId: string;
  /** Free-form rationale from the operator/sponsor. */
  rationale: string;
  /** Per-dimension impact claims the proposal makes. */
  impactClaims: ImpactClaim[];

  /** When the market opened. */
  openedAt: string; // ISO
  /** When the market closes (or closed). */
  closesAt: string; // ISO
  /** How long the TWAP averaging window is (hours back from close). */
  twapWindowHours: number;
  /** Threshold the Pass TWAP must clear over Fail to pass. */
  passMarginPct: number;

  status: ProposalStatus;
  passTwap: number;
  failTwap: number;

  activeElectors: number;
  totalElectors: number;
  trades: number;
  volumeUsd: number;

  /** Post-resolution settlement (only present when status === 'resolved'). */
  settlement?: SettlementRow[];
  /** When the action actually executed on-chain. */
  executedAt?: string;
  /** When the impact was last measured. */
  measuredAt?: string;
}

interface SpendProposal extends BaseProposal {
  kind: "spend";
  spend: {
    recipientName: string;
    recipientAddress: string;
    amountUsd: number;
    /** Treasury balance before / after, for the impact view. */
    treasuryBeforeUsd: number;
    treasuryAfterUsd: number;
    /** Prior proposals to this same recipient, for trust signals. */
    priorProposalsCount: number;
    /** Tx signature once executed. */
    txSignature?: string;
  };
}

interface ParamProposal extends BaseProposal {
  kind: "param";
  param: {
    parameterPath: string;
    valueBefore: string;
    valueAfter: string;
    /** How many proposals have used this parameter since switch. */
    proposalsSinceChange?: number;
    /** Block height at which the change took effect. */
    effectiveSlot?: number;
  };
}

interface MintProposal extends BaseProposal {
  kind: "mint";
  mint: {
    amount: number;
    ticker: string;
    supplyBefore: number;
    supplyAfter: number;
    /** Where the new tokens go. */
    distribution: Array<{ recipient: string; pct: number }>;
    txSignature?: string;
  };
}

interface MetadataProposal extends BaseProposal {
  kind: "metadata";
  metadata: {
    fieldsBefore: Record<string, string>;
    fieldsAfter: Record<string, string>;
    newMetadataUri?: string;
    txSignature?: string;
  };
}

interface LiquidityProposal extends BaseProposal {
  kind: "liquidity";
  liquidity: {
    direction: "provide" | "withdraw";
    amountUsd: number;
    poolName: string;
    /** Pool depth in USDC equivalent. */
    poolDepthBeforeUsd: number;
    poolDepthAfterUsd: number;
    /** Estimated price impact on a $10k trade. */
    priceImpactBeforeBps: number;
    priceImpactAfterBps: number;
    txSignature?: string;
  };
}

interface PerfProposal extends BaseProposal {
  kind: "perf";
  perf: {
    recipientName: string;
    recipientWallet?: string;
    rewardAmount: number;
    rewardTicker: string;
    rewardMintAddress?: string;
    /** Price tranches: each unlocks tokenAmount when TWAP >= priceThreshold. */
    tranches?: Array<{ priceThreshold: number; tokenAmount: number }>;
    /** TWAP window in hours. */
    twapWindowHours?: number;
    /** Earliest unlock timestamp (ISO string). */
    minUnlockTimestamp?: string;
    /** Predicates that need to be met for the recipient to claim. */
    unlockConditions: Array<{
      id: string;
      description: string;
      status: "waiting" | "met" | "failed";
      progress?: string;
    }>;
    /** Escrow PDA address once created. */
    escrowAddress?: string;
    /** Program version: "v0.6" or "v0.7". */
    programVersion?: string;
  };
}

export type Proposal =
  | SpendProposal
  | ParamProposal
  | MintProposal
  | MetadataProposal
  | LiquidityProposal
  | PerfProposal;

// ════════════════════════════════════════════════════════════════════════
// Mock proposals — one of each kind plus a resolved historical example.
// ════════════════════════════════════════════════════════════════════════

const now = () => new Date();
const hours = (h: number) => h * 3600 * 1000;
const days = (d: number) => d * 24 * 3600 * 1000;

/** Compute a future / past time relative to now. */
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: "p-spend-rao",
    kind: "spend",
    title: "Pay Rao & Associates — Q2 legal retainer",
    objectiveId: "operations",
    operatorId: "ops-operator-v1",
    rationale:
      "Standard quarterly retainer for our outside counsel. Covers contract review, IP, and the standing employment matters. Below the discretionary spend ceiling but worth voting on for visibility.",
    impactClaims: [
      { dimensionId: "cost", claim: -0.12 },
      { dimensionId: "reliability", claim: 0.18 },
      { dimensionId: "morale", claim: 0.04 },
      { dimensionId: "speed", claim: 0.08 },
    ],
    openedAt: ago(days(2)),
    closesAt: ahead(hours(28)),
    twapWindowHours: 18,
    passMarginPct: 3,
    status: "live",
    passTwap: 0.82,
    failTwap: 0.19,
    activeElectors: 52,
    totalElectors: 147,
    trades: 78,
    volumeUsd: 2380,
    spend: {
      recipientName: "Rao & Associates LLP",
      recipientAddress: "acct_1R0AP4eSLuxMqyTaH",
      amountUsd: 12500,
      treasuryBeforeUsd: 48210,
      treasuryAfterUsd: 35710,
      priorProposalsCount: 3,
    },
  },
  {
    id: "p-perf-eng",
    kind: "perf",
    title: "Engineering performance package — 2026 cohort",
    objectiveId: "strategy",
    operatorId: "strategy-operator-v1",
    rationale:
      "Performance-locked grant for the eight-person engineering team. Unlocks against shipped milestones rather than calendar time. Aligns retention with delivery.",
    impactClaims: [
      { dimensionId: "long-term", claim: 0.38 },
      { dimensionId: "optionality", claim: 0.22 },
      { dimensionId: "brand", claim: 0.05 },
      { dimensionId: "risk", claim: 0.12 },
    ],
    openedAt: ago(days(2)),
    closesAt: ahead(days(5)),
    twapWindowHours: 36,
    passMarginPct: 5,
    status: "live",
    passTwap: 0.66,
    failTwap: 0.34,
    activeElectors: 88,
    totalElectors: 147,
    trades: 134,
    volumeUsd: 11420,
    perf: {
      recipientName: "engineering-team-multisig",
      recipientWallet: "Eng1neEr1ngTeamMu1t1s1gAddr3ssXXXXXXXXXXX",
      rewardAmount: 500000,
      rewardTicker: "ACME",
      tranches: [
        { priceThreshold: 0.05, tokenAmount: 100000 },
        { priceThreshold: 0.10, tokenAmount: 150000 },
        { priceThreshold: 0.25, tokenAmount: 250000 },
      ],
      twapWindowHours: 24,
      minUnlockTimestamp: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      programVersion: "v0.7",
      unlockConditions: [
        {
          id: "u1",
          description: "Token TWAP exceeds $0.05 for 24h",
          status: "met",
          progress: "Current TWAP: $0.072",
        },
        {
          id: "u2",
          description: "Token TWAP exceeds $0.10 for 24h",
          status: "waiting",
          progress: "$0.072 / $0.10",
        },
        {
          id: "u3",
          description: "Token TWAP exceeds $0.25 for 24h",
          status: "waiting",
        },
      ],
    },
  },
  {
    id: "p-param-twap",
    kind: "param",
    title: "Raise TWAP averaging window for Strategy proposals",
    objectiveId: "strategy",
    operatorId: "strategy-operator-v1",
    rationale:
      "Strategy proposals deserve longer pricing. Last quarter we had two strategic decisions resolve before liquidity meaningfully arrived. Moving Strategy from 24h to 36h TWAP gives the market time to price properly.",
    impactClaims: [
      { dimensionId: "long-term", claim: 0.18 },
      { dimensionId: "optionality", claim: 0.1 },
      { dimensionId: "brand", claim: 0 },
      { dimensionId: "risk", claim: -0.08 },
    ],
    openedAt: ago(days(8)),
    closesAt: ago(days(1)),
    twapWindowHours: 24,
    passMarginPct: 3,
    status: "resolved",
    passTwap: 0.61,
    failTwap: 0.39,
    activeElectors: 102,
    totalElectors: 147,
    trades: 213,
    volumeUsd: 18450,
    executedAt: ago(hours(20)),
    settlement: [
      { side: "pass", electors: 64, amount: 1840 },
      { side: "fail", electors: 38, amount: -1840 },
    ],
    param: {
      parameterPath: "objectives.strategy.twapWindowHours",
      valueBefore: "24",
      valueAfter: "36",
      proposalsSinceChange: 2,
      effectiveSlot: 247_318_402,
    },
  },
  {
    id: "p-mint-liquidity",
    kind: "mint",
    title: "Mint 500K ACME for DAMM v2 liquidity",
    objectiveId: "strategy",
    operatorId: "strategy-operator-v1",
    rationale:
      "Refill the DAMM v2 pool. Pool depth has been under target for six weeks and price impact on $10k trades is 1.4%. New mint goes directly to the pool, not to any individual or treasury.",
    impactClaims: [
      { dimensionId: "long-term", claim: 0.08 },
      { dimensionId: "optionality", claim: 0.28 },
      { dimensionId: "brand", claim: 0.04 },
      { dimensionId: "risk", claim: 0.16 },
    ],
    openedAt: ago(days(5)),
    closesAt: ago(days(3)),
    twapWindowHours: 36,
    passMarginPct: 5,
    status: "resolved",
    passTwap: 0.74,
    failTwap: 0.26,
    activeElectors: 91,
    totalElectors: 147,
    trades: 168,
    volumeUsd: 9210,
    executedAt: ago(days(3) - hours(2)),
    measuredAt: ago(days(1)),
    settlement: [
      { side: "pass", electors: 67, amount: 920 },
      { side: "fail", electors: 24, amount: -920 },
    ],
    mint: {
      amount: 500_000,
      ticker: "ACME",
      supplyBefore: 10_200_000,
      supplyAfter: 10_700_000,
      distribution: [{ recipient: "DAMM v2 pool", pct: 100 }],
      txSignature: "5Yt9...mintTx",
    },
  },
  {
    id: "p-metadata-rebrand",
    kind: "metadata",
    title: "Update token metadata — rebrand image & description",
    objectiveId: "growth",
    operatorId: "growth-operator-v1",
    rationale:
      "Roll out the refreshed brand. New logo, updated description matching the 2026 positioning, new external URL pointing at the docs portal instead of the marketing site.",
    impactClaims: [
      { dimensionId: "revenue", claim: 0.04 },
      { dimensionId: "user-love", claim: 0.18 },
      { dimensionId: "speed", claim: 0 },
      { dimensionId: "runway", claim: -0.02 },
    ],
    openedAt: ago(hours(36)),
    closesAt: ahead(hours(12)),
    twapWindowHours: 18,
    passMarginPct: 3,
    status: "live",
    passTwap: 0.71,
    failTwap: 0.28,
    activeElectors: 41,
    totalElectors: 147,
    trades: 62,
    volumeUsd: 1980,
    metadata: {
      fieldsBefore: {
        name: "Acme",
        symbol: "ACME",
        uri: "https://acme.io/token-v1.json",
        image: "https://acme.io/old-logo.png",
        description: "Acme's governance token.",
      },
      fieldsAfter: {
        name: "Acme",
        symbol: "ACME",
        uri: "https://acme.io/token-v2.json",
        image: "https://acme.io/new-logo.png",
        description:
          "Coordination capital for the Acme Strategy DAO. Used to govern, signal, and execute.",
      },
    },
  },
  {
    id: "p-liquidity-add",
    kind: "liquidity",
    title: "Add $50K to ACME/USDC pool",
    objectiveId: "operations",
    operatorId: "ops-operator-v1",
    rationale:
      "Deepen the pool ahead of the Q2 announcement. Cuts price impact on typical trades roughly in half and gives the market more headroom for the launch-week activity.",
    impactClaims: [
      { dimensionId: "cost", claim: -0.04 },
      { dimensionId: "reliability", claim: 0.32 },
      { dimensionId: "morale", claim: 0.02 },
      { dimensionId: "speed", claim: 0.06 },
    ],
    openedAt: ago(hours(20)),
    closesAt: ahead(hours(4)),
    twapWindowHours: 12,
    passMarginPct: 3,
    status: "live",
    passTwap: 0.78,
    failTwap: 0.21,
    activeElectors: 33,
    totalElectors: 147,
    trades: 47,
    volumeUsd: 1240,
    liquidity: {
      direction: "provide",
      amountUsd: 50_000,
      poolName: "ACME/USDC (DAMM v2)",
      poolDepthBeforeUsd: 320_000,
      poolDepthAfterUsd: 370_000,
      priceImpactBeforeBps: 140,
      priceImpactAfterBps: 110,
    },
  },
];

/** Look up a proposal by id. */
export function findProposal(id: string): Proposal | undefined {
  return MOCK_PROPOSALS.find((p) => p.id === id);
}

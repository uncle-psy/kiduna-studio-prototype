/**
 * launchpad-api-types.ts
 *
 * TypeScript types shared between launchpad API routes and frontend.
 *
 * Place at: lib/launchpad-api-types.ts
 */

// ── Campaign Listing ────────────────────────────────────────────────

export interface LaunchpadCampaign {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  tokenTicker: string | null;
  tokenName: string | null;

  // ICO config
  launchMode: "ico" | "sponsor";
  launchStatus: string;
  minRaise: number | null;
  icoDurationSeconds: number | null;
  hasBidWall: boolean;
  fundraiseDeadline: string | null; // ISO date

  // Live state
  totalCommitted: number;
  totalApproved: number;
  contributorCount: number;
  icoPrice: number | null;

  // Calculated
  percentRaised: number; // 0-100
  timeRemainingSeconds: number | null;
  isActive: boolean;

  // Sponsor
  sponsorWallet: string;

  createdAt: string;
}

// ── Campaign Detail ─────────────────────────────────────────────────

export interface CampaignDetail extends LaunchpadCampaign {
  // On-chain addresses
  launchAddress: string | null;
  launchSignerAddress: string | null;
  tokenMintAddress: string | null;
  daoAddress: string | null;
  poolAddress: string | null;
  squadsVault: string | null;

  // ICO config details
  monthlyBudgetUsdc: number | null;
  teamAddress: string | null;
  perfPackageTokens: number | null;
  perfPackageGrantee: string | null;
  perfMinUnlockMonths: number | null;
  additionalTokensAmount: number | null;
  additionalTokensRecipient: string | null;

  // Refund tracking (populated when launchStatus is "refunding" or "failed")
  refundedCount: number;
  closeTxSignature: string | null;
  refundCompletedAt: string | null; // ISO date

  // Recent contributions
  recentContributions: ContributionSummary[];
}

// ── Contribution ────────────────────────────────────────────────────

export interface ContributionSummary {
  id: string;
  wallet: string;
  amountCommitted: number;
  amountApproved: number | null;
  status: string;
  tokensClaimed: number | null;
  usdcRefunded: number | null;
  createdAt: string;
}

export interface MyContribution extends ContributionSummary {
  fundingRecordAddress: string | null;
  txSignature: string;
  claimTx: string | null;
  estimatedTokens: number | null;
}

// ── API Request/Response Types ──────────────────────────────────────

export interface BuildTxResponse {
  serializedTransaction: string;
  description: string;
  addresses: Record<string, string>;
  generatedKeypairs?: Record<string, string>;
}

export interface SubmitTxRequest {
  signedTransaction: string;
}

export interface SubmitTxResponse {
  txSignature: string;
  addresses?: Record<string, string>;
}

// ── ICO-specific request types ──────────────────────────────────────

export interface FundBuildRequest {
  wallet: string;
  amountUsdc: number;
}

export interface ApproveBuildRequest {
  funderWallet: string;
  approvedAmountUsdc: number;
}

export interface BatchApproveBuildRequest {
  approvals: Array<{
    funderWallet: string;
    approvedAmountUsdc: number;
  }>;
}

export interface ClaimBuildRequest {
  wallet: string;
}

export interface ExtendBuildRequest {
  additionalDays: number;
}

// ── Launchpad page query params ─────────────────────────────────────

export type CampaignFilter = "active" | "completed" | "failed" | "all";

/**
 * Possible launchStatus values:
 *   "draft"             — ICO created in DB, not yet on-chain
 *   "initialized"       — On-chain launch created, waiting for sponsor to start
 *   "fundraising"       — ICO is live, accepting contributions
 *   "closed"            — Timer ended + target met, sponsor reviewing
 *   "settling"          — Sponsor is settling (creating DAO)
 *   "live"              — DAO created, market operational
 *   "refunding"         — Target not met, contributors claiming refunds
 *   "failed"            — All refunds complete OR campaign cancelled (terminal)
 */

export interface LaunchpadListQuery {
  filter?: CampaignFilter;
  page?: number;
  pageSize?: number;
}
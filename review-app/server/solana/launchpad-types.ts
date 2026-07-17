/**
 * launchpad-types.ts
 *
 * TypeScript types for MetaDAO Launchpad v0.7 program.
 * Derived from @metadaoproject/futarchy SDK v0.7.
 *
 * Place at: server/solana/launchpad-types.ts
 */

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ── Program ID ──────────────────────────────────────────────────────
export const LAUNCHPAD_PROGRAM_ID = new PublicKey(
  "moontUzsdepotRGe5xsfip7vLPTJnVuafqdUWexVnPM",
);

// ── Constants (from lib.rs) ─────────────────────────────────────────
export const TOKEN_SCALE = 1_000_000; // 6 decimals
export const TOKENS_TO_PARTICIPANTS = 10_000_000 * TOKEN_SCALE; // 10M tokens
export const TOKENS_TO_FUTARCHY_LIQUIDITY = 2_000_000 * TOKEN_SCALE; // 2M tokens
export const TOKENS_TO_DAMM_V2_LIQUIDITY = 900_000 * TOKEN_SCALE; // 0.9M tokens
export const PROPOSAL_MIN_STAKE_TOKENS = 1_500_000 * TOKEN_SCALE; // 1.5M tokens

export const PP_NUM_TRANCHES = 5;
export const PP_PRICE_MULTIPLIERS = [2, 4, 8, 16, 32];
export const PP_TWAP_MIN_DURATION = 3 * 30 * 24 * 60 * 60; // 3 months in seconds

export const MAINNET_USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const DEVNET_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// ── Validation Constants ────────────────────────────────────────────
export const MAX_ICO_DURATION_SECONDS = 14 * 24 * 60 * 60; // 14 days
export const MIN_UNLOCK_MONTHS = 12;
export const MIN_PERF_PACKAGE_TOKENS = 10;
export const MAX_SPENDING_LIMIT_MEMBERS = 10;
export const REQUIRED_TOKEN_DECIMALS = 6;

// ── Launch State (from state/launch.rs) ─────────────────────────────
export enum LaunchStateEnum {
  Initialized = "Initialized",
  Live = "Live",
  Closed = "Closed",
  Complete = "Complete",
  Refunding = "Refunding",
}

// ── On-Chain Account Types ──────────────────────────────────────────

export interface LaunchAccount {
  pdaBump: number;
  minimumRaiseAmount: BN;
  monthlySpendingLimitAmount: BN;
  monthlySpendingLimitMembers: PublicKey[];
  launchAuthority: PublicKey;
  launchSigner: PublicKey;
  launchSignerPdaBump: number;
  launchQuoteVault: PublicKey;
  launchBaseVault: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  unixTimestampStarted: BN | null;
  unixTimestampClosed: BN | null;
  totalCommittedAmount: BN;
  state: { [key: string]: Record<string, never> }; // Anchor enum
  seqNum: BN;
  secondsForLaunch: number;
  dao: PublicKey | null;
  daoVault: PublicKey | null;
  performancePackageGrantee: PublicKey;
  performancePackageTokenAmount: BN;
  monthsUntilInsidersCanUnlock: number;
  teamAddress: PublicKey;
  totalApprovedAmount: BN;
  additionalTokensAmount: BN;
  additionalTokensRecipient: PublicKey | null;
  additionalTokensClaimed: boolean;
  unixTimestampCompleted: BN | null;
  isFinalized: boolean;
  accumulatorActivationDelaySeconds: number;
  hasBidWall: boolean;
}

export interface FundingRecordAccount {
  pdaBump: number;
  funder: PublicKey;
  launch: PublicKey;
  committedAmount: BN;
  isTokensClaimed: boolean;
  isUsdcRefunded: boolean;
  approvedAmount: BN;
  committedAmountAccumulator: BN;
  lastAccumulatorUpdate: BN;
}

// ── Instruction Args ────────────────────────────────────────────────

export interface InitializeLaunchArgs {
  minimumRaiseAmount: BN;
  monthlySpendingLimitAmount: BN;
  monthlySpendingLimitMembers: PublicKey[];
  secondsForLaunch: number;
  tokenName: string;
  tokenSymbol: string;
  tokenUri: string;
  performancePackageGrantee: PublicKey;
  performancePackageTokenAmount: BN;
  monthsUntilInsidersCanUnlock: number;
  teamAddress: PublicKey;
  additionalTokensAmount: BN;
  accumulatorActivationDelaySeconds: number;
  hasBidWall: boolean;
}

export interface ExtendLaunchArgs {
  additionalSeconds: number;
}

// ── PDA Derivation Helpers ──────────────────────────────────────────

export function findLaunchPda(baseMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("launch"), baseMint.toBuffer()],
    LAUNCHPAD_PROGRAM_ID,
  );
}

export function findLaunchSignerPda(launch: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("launch_signer"), launch.toBuffer()],
    LAUNCHPAD_PROGRAM_ID,
  );
}

export function findFundingRecordPda(
  launch: PublicKey,
  funder: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("funding_record"), launch.toBuffer(), funder.toBuffer()],
    LAUNCHPAD_PROGRAM_ID,
  );
}

export function findPositionNftMintPda(baseMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position_nft_mint"), baseMint.toBuffer()],
    LAUNCHPAD_PROGRAM_ID,
  );
}

export function findPoolCreatorAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("damm_pool_creator_authority")],
    LAUNCHPAD_PROGRAM_ID,
  );
}

// ── Wizard Config Types (Frontend ↔ Backend) ────────────────────────

export interface IcoWizardConfig {
  // Card 1: Token Identity
  tokenName: string;
  tokenSymbol: string;
  tokenUri: string;

  // Card 2: ICO Configuration
  minimumRaiseUsdc: number; // Whole USDC units (e.g., 50000)
  icoDurationDays: number; // 1-14
  monthlyBudgetUsdc: number; // Whole USDC units
  spendingLimitWallets: string[]; // Base58 wallet addresses (1-10)
  teamAddress: string; // Base58

  // Card 4: Additional Tokens
  additionalTokensAmount: number; // 0 = disabled
  additionalTokensRecipient: string | null; // Base58

  // Card 5: Performance Package
  perfPackageTokenAmount: number; // Min 10 (in TOKEN_SCALE units)
  perfPackageGrantee: string; // Base58
  perfMinUnlockMonths: number; // Min 12

  // Card 6: Bid Wall
  hasBidWall: boolean;

  // Advanced
  accumulatorActivationDelaySeconds: number; // Default 0
}

/** Convert wizard config to on-chain instruction args */
export function wizardToInitArgs(config: IcoWizardConfig): InitializeLaunchArgs {
  return {
    minimumRaiseAmount: new BN(config.minimumRaiseUsdc).mul(new BN(TOKEN_SCALE)),
    monthlySpendingLimitAmount: new BN(config.monthlyBudgetUsdc).mul(new BN(TOKEN_SCALE)),
    monthlySpendingLimitMembers: config.spendingLimitWallets.map((w) => new PublicKey(w)),
    secondsForLaunch: config.icoDurationDays * 24 * 60 * 60,
    tokenName: config.tokenName,
    tokenSymbol: config.tokenSymbol,
    tokenUri: config.tokenUri,
    performancePackageGrantee: new PublicKey(config.perfPackageGrantee),
    performancePackageTokenAmount: new BN(config.perfPackageTokenAmount).mul(new BN(TOKEN_SCALE)),
    monthsUntilInsidersCanUnlock: config.perfMinUnlockMonths,
    teamAddress: new PublicKey(config.teamAddress),
    additionalTokensAmount: new BN(config.additionalTokensAmount).mul(new BN(TOKEN_SCALE)),
    accumulatorActivationDelaySeconds: config.accumulatorActivationDelaySeconds,
    hasBidWall: config.hasBidWall,
  };
}

/** Validate wizard config before on-chain submission */
export function validateIcoConfig(config: IcoWizardConfig): string[] {
  const errors: string[] = [];

  if (!config.tokenName.trim()) errors.push("Token name is required.");
  if (!config.tokenSymbol.trim()) errors.push("Token symbol is required.");
  if (config.minimumRaiseUsdc <= 0) errors.push("Minimum raise must be > 0.");
  if (config.monthlyBudgetUsdc <= 0) errors.push("Monthly budget must be > 0.");
  if (config.monthlyBudgetUsdc * 6 > config.minimumRaiseUsdc) {
    errors.push(`Monthly budget (${config.monthlyBudgetUsdc}) × 6 exceeds min raise (${config.minimumRaiseUsdc}). On-chain program requires budget ≤ minRaise ÷ 6.`);
  }
  const durationSeconds = config.icoDurationDays * 86400;
  if (durationSeconds < 60 || config.icoDurationDays > 14) {
    errors.push("ICO duration must be at least 1 minute and at most 14 days.");
  }
  if (config.spendingLimitWallets.length === 0) {
    errors.push("At least one spending limit wallet is required.");
  }
  if (config.spendingLimitWallets.length > MAX_SPENDING_LIMIT_MEMBERS) {
    errors.push(`Max ${MAX_SPENDING_LIMIT_MEMBERS} spending limit wallets.`);
  }
  // Check for duplicate wallets
  const uniqueWallets = new Set(config.spendingLimitWallets);
  if (uniqueWallets.size !== config.spendingLimitWallets.length) {
    errors.push("Spending limit wallets must be unique.");
  }
  if (config.perfMinUnlockMonths < MIN_UNLOCK_MONTHS) {
    errors.push(`Min unlock period must be ≥ ${MIN_UNLOCK_MONTHS} months.`);
  }
  if (config.perfPackageTokenAmount < MIN_PERF_PACKAGE_TOKENS) {
    errors.push(`Performance package must be ≥ ${MIN_PERF_PACKAGE_TOKENS} tokens.`);
  }
  if (config.additionalTokensAmount > 0 && !config.additionalTokensRecipient) {
    errors.push("Additional tokens recipient is required when amount > 0.");
  }
  if (config.accumulatorActivationDelaySeconds >= config.icoDurationDays * 86400) {
    errors.push("Accumulator delay must be < ICO duration.");
  }

  return errors;
} 
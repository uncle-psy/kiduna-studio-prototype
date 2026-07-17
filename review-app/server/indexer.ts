/**
 * Treasury balance indexer.
 *
 * Resolves USDC + SOL balance for a Market's Squads vault by reading
 * on-chain state via solana-web3.js.
 *
 * The vault is the Squads multisig PDA vault (index 0). USDC balance
 * is read from the vault's associated token account for the quote mint.
 * SOL balance is the native lamport balance of the vault PDA itself.
 *
 * `reservedUsd` comes from the caller — it's the sum of stakeUsd on
 * live/resolving proposals, already computed by the route handler.
 */

import { ApiError } from "./errors";
import {
  getVaultUsdcBalance,
  getVaultSolBalance,
} from "./solana/connection";

const USDC_MINT = process.env.USDC_MINT ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export interface TreasuryBalance {
  multisigAddress: string | null;
  availableUsd: number;
  reservedUsd: number;
  totalUsd: number;
  solBalance: number | null;
  monthlyBudgetUsdc: number | null;
  spendingLimitConfigured: boolean;
  spendingLimitTotal: number | null;
  spendingLimitRemaining: number | null;
  indexerStatus: "live" | "pending" | "error";
}

/**
 * Look up USDC + SOL balance for the Market's Squads vault and compute
 * available balance after subtracting reserved stakes.
 *
 * @param multisigAddress  Squads multisig PDA (display only — not used for balance lookup)
 * @param squadsVault      Squads vault PDA (index 0) — the actual token holder
 * @param quoteMint        USDC SPL mint address for the vault's ATA derivation
 * @param monthlyBudgetUsdc  Monthly spending limit from the Market row (nullable)
 * @param reservedFromLiveProposalsUsd  Sum of stakes on live proposals (from caller)
 */
export async function getTreasuryBalance(
  multisigAddress: string | null,
  squadsVault: string | null,
  quoteMint: string | null,
  monthlyBudgetUsdc: number | null,
  spendingLimitConfigured: boolean,
  spendingLimitTotal: number | null,
  spendingLimitRemaining: number | null,
  reservedFromLiveProposalsUsd = 0,
): Promise<TreasuryBalance> {
  // Market not yet launched — no on-chain accounts exist
  if (!squadsVault) {
    return {
      multisigAddress,
      availableUsd: 0,
      reservedUsd: 0,
      totalUsd: 0,
      solBalance: null,
      monthlyBudgetUsdc,
      spendingLimitConfigured,
      spendingLimitTotal: null,
      spendingLimitRemaining: null,
      indexerStatus: "pending",
    };
  }

  // Fetch USDC + SOL in parallel
  let onChainUsd: number | null = null;
  let solBalance: number | null = null;
  let indexerStatus: "live" | "pending" | "error" = "live";

  try {
    [onChainUsd, solBalance] = await Promise.all([
      getVaultUsdcBalance(squadsVault, quoteMint),
      getVaultSolBalance(squadsVault),
    ]);
  } catch (err) {
    console.error("[indexer] Failed to fetch on-chain balances:", err);
    indexerStatus = "error";
  }

  // If RPC returned null (account not found), treat as 0
  const totalUsd = onChainUsd ?? 0;
  const availableUsd = Math.max(0, totalUsd - reservedFromLiveProposalsUsd);

  return {
    multisigAddress,
    availableUsd,
    reservedUsd: reservedFromLiveProposalsUsd,
    totalUsd,
    solBalance,
    monthlyBudgetUsdc,
    spendingLimitConfigured,
    spendingLimitTotal,
    spendingLimitRemaining,
    indexerStatus,
  };
}

/**
 * USDC balance for any pubkey (used for Elector balances).
 * Same stub shape as treasury.
 */
export async function getUsdcBalance(
  pubkey: string,
): Promise<{ availableUsd: number; indexerStatus: "live" | "pending" | "error" }> {
  if (!pubkey) {
    throw new ApiError("BAD_REQUEST", "pubkey required");
  }
  return {
    availableUsd: 0,
    indexerStatus: "pending",
  };
}

export const TREASURY_MINT = USDC_MINT;
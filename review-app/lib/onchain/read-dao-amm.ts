/**
 * read-dao-amm.ts — Reads the embedded FutarchyAmm from a DAO account.
 *
 * The futarchy v0.6 program stores a 3-pool AMM directly inside the DAO
 * account (not in separate pool accounts). When a proposal is live the
 * state is PoolState::Futarchy { spot, pass, fail }. Each Pool struct
 * contains reserves and a TwapOracle.
 *
 * This module:
 *   1. Reads and parses the DAO's AMM state via FutarchyClient.getDao()
 *   2. Extracts spot prices from pool reserves
 *   3. Computes TWAP values using the exact same formula as the on-chain
 *      Pool::get_twap() function (see futarchy/src/state/futarchy_amm.rs)
 *   4. Predicts finalize outcome using the DAO's threshold config
 *
 * Place at: lib/onchain/read-dao-amm.ts
 */

import { type Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { FutarchyClient } from "@metadaoproject/futarchy/v0.6";
import BN from "bn.js";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Parsed state of a single AMM pool (pass or fail). */
export interface PoolSnapshot {
  baseReserves: number;
  quoteReserves: number;
  /** Spot price: quoteReserves / baseReserves. 0 if baseReserves is 0. */
  spotPrice: number;
  /** TWAP value (same scale as spotPrice). null if TWAP is not yet valid. */
  twap: number | null;
  /** Raw oracle data for debugging / display. */
  oracle: {
    aggregator: string;
    lastObservation: string;
    lastUpdatedTimestamp: number;
    createdAtTimestamp: number;
    startDelaySeconds: number;
  };
}

/** Result of reading the DAO's AMM state. */
export interface DaoAmmState {
  /** True when the AMM is in Futarchy mode (proposal is live). */
  isFutarchy: boolean;
  /** Spot pool (always present). */
  spot: PoolSnapshot;
  /** Pass conditional pool (only present in Futarchy mode). */
  pass: PoolSnapshot | null;
  /** Fail conditional pool (only present in Futarchy mode). */
  fail: PoolSnapshot | null;
  /** Normalized pass probability: passSpot / (passSpot + failSpot). */
  passPrice: number;
  /** Normalized fail probability: failSpot / (passSpot + failSpot). */
  failPrice: number;
  /** Normalized pass TWAP probability (null if TWAP not valid yet). */
  passTwapNorm: number | null;
  /** Normalized fail TWAP probability (null if TWAP not valid yet). */
  failTwapNorm: number | null;
  /** Pass threshold from DAO config (basis points, unsigned). */
  passThresholdBps: number;
  /** Team-sponsored pass threshold (basis points, signed — can be negative). */
  teamSponsoredPassThresholdBps: number;
  /**
   * Predicted outcome if finalize were called right now.
   * Uses the TWAP-based comparison matching the on-chain logic.
   * "unknown" if TWAP is not yet valid.
   */
  twapPrediction: "pass" | "fail" | "unknown";
}

// ═══════════════════════════════════════════════════════════════════════
// TWAP calculation — mirrors futarchy/src/state/futarchy_amm.rs
// ═══════════════════════════════════════════════════════════════════════

/**
 * PRICE_SCALE from the futarchy program. Prices stored on-chain are
 * quote_units / base_units * 1e12.
 */
const PRICE_SCALE = 1_000_000_000_000;

/** MAX_BPS from the futarchy program. */
const MAX_BPS = 10_000;

/**
 * Wrapping operations for u128 arithmetic. The on-chain program uses
 * Rust's wrapping_mul / wrapping_add which wrap at 2^128. In practice
 * overflow is astronomically unlikely for real-world prices, but we
 * match the on-chain behavior exactly for correctness.
 */
const U128_MOD = new BN(1).shln(128);

function wrappingMul(a: BN, b: BN): BN {
  return a.mul(b).umod(U128_MOD);
}

function wrappingAdd(a: BN, b: BN): BN {
  return a.add(b).umod(U128_MOD);
}

/**
 * Compute TWAP for a pool, matching the on-chain Pool::get_twap() exactly.
 *
 * Formula from futarchy_amm.rs:
 *   start_timestamp = created_at + start_delay_seconds
 *   seconds_passed  = current_timestamp - start_timestamp
 *   final_interval  = current_timestamp - last_updated_timestamp
 *   final_contribution = last_observation.wrapping_mul(final_interval)
 *   total_aggregator   = aggregator.wrapping_add(final_contribution)
 *   twap = total_aggregator / seconds_passed
 *
 * Returns null if TWAP is not yet valid (start delay not elapsed, or
 * oracle never updated after the delay, or zero seconds passed).
 */
function computeTwap(oracle: {
  aggregator: BN;
  lastObservation: BN;
  lastUpdatedTimestamp: BN;
  createdAtTimestamp: BN;
  startDelaySeconds: number;
}, currentTimestamp: number): BN | null {
  const createdAt = oracle.createdAtTimestamp.toNumber();
  const startTimestamp = createdAt + oracle.startDelaySeconds;
  const lastUpdated = oracle.lastUpdatedTimestamp.toNumber();

  // On-chain requires: last_updated > start_timestamp
  if (lastUpdated <= startTimestamp) {
    return null;
  }

  const secondsPassed = currentTimestamp - startTimestamp;
  if (secondsPassed <= 0) {
    return null;
  }

  // On-chain requires: aggregator != 0
  if (oracle.aggregator.isZero()) {
    return null;
  }

  const finalInterval = new BN(Math.max(0, currentTimestamp - lastUpdated));
  const finalContribution = wrappingMul(oracle.lastObservation, finalInterval);
  const totalAggregator = wrappingAdd(oracle.aggregator, finalContribution);

  const twap = totalAggregator.div(new BN(secondsPassed));
  return twap;
}

// ═══════════════════════════════════════════════════════════════════════
// Pool parsing helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parse a deserialized Pool object from the Anchor SDK into a PoolSnapshot.
 * Anchor converts Rust snake_case to JS camelCase.
 */
function parsePool(pool: any, chainTimestamp: number): PoolSnapshot {
  const baseReserves = toBnNumber(pool.baseReserves);
  const quoteReserves = toBnNumber(pool.quoteReserves);

  const spotPrice = baseReserves > 0 ? quoteReserves / baseReserves : 0;

  // Extract oracle fields (BN values from Anchor deserialization)
  const oracle = pool.oracle;
  const aggregator = toBn(oracle.aggregator);
  const lastObservation = toBn(oracle.lastObservation);
  const lastUpdatedTimestamp = toBn(oracle.lastUpdatedTimestamp);
  const createdAtTimestamp = toBn(oracle.createdAtTimestamp);
  const startDelaySeconds =
    typeof oracle.startDelaySeconds === "number"
      ? oracle.startDelaySeconds
      : toBn(oracle.startDelaySeconds).toNumber();

  // Compute TWAP
  const twapBn = computeTwap(
    { aggregator, lastObservation, lastUpdatedTimestamp, createdAtTimestamp, startDelaySeconds },
    chainTimestamp,
  );

  // Convert TWAP to the same scale as spotPrice (quote/base in human units).
  // On-chain TWAP is in PRICE_SCALE (quote_units / base_units * 1e12).
  // spotPrice is quoteReserves / baseReserves (raw token units).
  // These are the same scale because the on-chain price formula is:
  //   price = (quote_reserves * PRICE_SCALE) / base_reserves
  // So twap / PRICE_SCALE = quote_reserves / base_reserves in the same
  // ratio as spotPrice. We convert to a float for display.
  let twap: number | null = null;
  if (twapBn) {
    // twapBn is in PRICE_SCALE units. Convert to float.
    // For very large BN values, use string conversion to avoid precision loss.
    twap = parseFloat(twapBn.toString()) / PRICE_SCALE;
  }

  return {
    baseReserves,
    quoteReserves,
    spotPrice,
    twap,
    oracle: {
      aggregator: aggregator.toString(),
      lastObservation: lastObservation.toString(),
      lastUpdatedTimestamp: lastUpdatedTimestamp.toNumber(),
      createdAtTimestamp: createdAtTimestamp.toNumber(),
      startDelaySeconds,
    },
  };
}

/** Safely convert an Anchor-deserialized value to a BN. */
function toBn(val: any): BN {
  if (BN.isBN(val)) return val;
  if (typeof val === "number") return new BN(val);
  if (typeof val === "string") return new BN(val);
  if (typeof val === "bigint") return new BN(val.toString());
  // Anchor sometimes returns { low, high } for u128
  if (val && typeof val === "object" && "toString" in val) {
    return new BN(val.toString());
  }
  return new BN(0);
}

/** Convert a BN or number to a JS number (safe for u64 token amounts). */
function toBnNumber(val: any): number {
  if (typeof val === "number") return val;
  if (BN.isBN(val)) return val.toNumber();
  if (typeof val === "string") return parseInt(val, 10);
  if (typeof val === "bigint") return Number(val);
  if (val && typeof val === "object" && "toNumber" in val) return val.toNumber();
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════
// Main reader
// ═══════════════════════════════════════════════════════════════════════

/**
 * Read the DAO account and extract the embedded AMM state.
 *
 * @param connection  Solana RPC connection
 * @param daoAddress  The DAO PDA address
 * @param isTeamSponsored  Whether the current proposal is team-sponsored
 *                         (affects which threshold is used for prediction)
 * @returns DaoAmmState or null if the DAO cannot be read
 */
export async function readDaoAmmState(
  connection: Connection,
  daoAddress: PublicKey,
  isTeamSponsored: boolean = false,
): Promise<DaoAmmState | null> {
  try {
    // Create a read-only FutarchyClient (no signing needed)
    const dummyWallet = {
      publicKey: PublicKey.default,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any) => txs,
    };
    const provider = new AnchorProvider(connection, dummyWallet as any, {
      commitment: "confirmed",
    });
    const futarchy = FutarchyClient.createClient({ provider });

    const dao = await futarchy.getDao(daoAddress);
    if (!dao) return null;

    // Get current chain time for TWAP computation
    const slot = await connection.getSlot("confirmed");
    const blockTime = await connection.getBlockTime(slot);
    const chainTimestamp = blockTime ?? Math.floor(Date.now() / 1000);

    // Extract threshold config
    const passThresholdBps =
      typeof dao.passThresholdBps === "number"
        ? dao.passThresholdBps
        : toBnNumber(dao.passThresholdBps);
    const teamSponsoredPassThresholdBps =
      typeof dao.teamSponsoredPassThresholdBps === "number"
        ? dao.teamSponsoredPassThresholdBps
        : toBnNumber(dao.teamSponsoredPassThresholdBps);

    // Parse the AMM state
    const ammState = dao.amm?.state;
    if (!ammState) return null;

    // Determine which variant of PoolState we have.
    // Anchor deserializes Rust enums as { variantName: { ...fields } }.
    const isFutarchy = "futarchy" in ammState;
    const isSpot = "spot" in ammState && !isFutarchy;

    if (isSpot) {
      // PoolState::Spot { spot }
      const spotData = (ammState as any).spot.spot ?? (ammState as any).spot;
      const spot = parsePool(spotData, chainTimestamp);

      return {
        isFutarchy: false,
        spot,
        pass: null,
        fail: null,
        passPrice: 0.5,
        failPrice: 0.5,
        passTwapNorm: null,
        failTwapNorm: null,
        passThresholdBps,
        teamSponsoredPassThresholdBps,
        twapPrediction: "unknown",
      };
    }

    if (isFutarchy) {
      // PoolState::Futarchy { spot, pass, fail }
      const futarchyData = (ammState as any).futarchy;
      const spot = parsePool(futarchyData.spot, chainTimestamp);
      const pass = parsePool(futarchyData.pass, chainTimestamp);
      const fail = parsePool(futarchyData.fail, chainTimestamp);

      // Normalize spot prices to probabilities
      const totalSpot = pass.spotPrice + fail.spotPrice;
      const passPrice = totalSpot > 0 ? pass.spotPrice / totalSpot : 0.5;
      const failPrice = totalSpot > 0 ? fail.spotPrice / totalSpot : 0.5;

      // Normalize TWAP values to probabilities
      let passTwapNorm: number | null = null;
      let failTwapNorm: number | null = null;
      if (pass.twap !== null && fail.twap !== null) {
        const totalTwap = pass.twap + fail.twap;
        passTwapNorm = totalTwap > 0 ? pass.twap / totalTwap : 0.5;
        failTwapNorm = totalTwap > 0 ? fail.twap / totalTwap : 0.5;
      }

      // Predict finalize outcome using the on-chain formula:
      //   threshold = fail_twap * (MAX_BPS + threshold_bps) / MAX_BPS
      //   pass if: pass_twap > threshold
      let twapPrediction: "pass" | "fail" | "unknown" = "unknown";
      if (pass.twap !== null && fail.twap !== null) {
        const thresholdBps = isTeamSponsored
          ? teamSponsoredPassThresholdBps
          : passThresholdBps;

        // Match the on-chain comparison exactly (using raw TWAP values, not normalized)
        const threshold = fail.twap * (MAX_BPS + thresholdBps) / MAX_BPS;
        twapPrediction = pass.twap > threshold ? "pass" : "fail";
      }

      return {
        isFutarchy: true,
        spot,
        pass,
        fail,
        passPrice,
        failPrice,
        passTwapNorm,
        failTwapNorm,
        passThresholdBps,
        teamSponsoredPassThresholdBps,
        twapPrediction,
      };
    }

    // Unknown AMM state variant
    return null;
  } catch (err) {
    console.error("[readDaoAmmState] Failed to read DAO AMM state:", err);
    return null;
  }
}

/**
 * Shared on-chain constants used across all transaction builders.
 *
 * Centralizing these prevents the inconsistency where proposal-phases.ts
 * used 50,000, build-launch-tx.ts used 1, and proposal-trading.ts used 0.
 *
 * Place at: lib/onchain/constants.ts
 */

// Priority fee is no longer a hardcoded constant — every tx builder now uses
// the dynamic Helius fee from lib/priority-fee.ts (getPriorityFee /
// getPriorityFeeForIxs), clamped to an env-tunable [floor, cap].

/**
 * Default slippage tolerance for voting swaps (2%).
 * The minimum output will be 98% of the simulated output.
 */
export const DEFAULT_SLIPPAGE_BPS = 200;

/**
 * PRICE_SCALE from the futarchy program.
 * Prices are stored on-chain as (quote_units / base_units) * 1e12.
 */
export const PRICE_SCALE = 1_000_000_000_000;

/**
 * MAX_BPS from the futarchy program.
 */
export const MAX_BPS = 10_000;

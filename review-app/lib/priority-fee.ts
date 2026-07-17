/**
 * priority-fee.ts  (isomorphic — server & client)
 *
 * Dynamic priority fee via Helius `getPriorityFeeEstimate`. Every transaction
 * builder (launchpad, proposal, trading, treasury) uses this instead of a
 * hardcoded fee.
 *
 * When the configured RPC is Helius, ask it for a network-aware priority fee
 * (micro-lamports/CU) at the requested level, scoped to the tx's writable
 * accounts, then clamp to [FLOOR, CAP]. For a non-Helius RPC — or on any
 * error/timeout — fall back to the static FLOOR. The CAP guarantees a spiking
 * estimate can never produce a surprise huge fee.
 *
 * Reads NEXT_PUBLIC_SOLANA_RPC_URL so it works in the browser too. Tune with
 * NEXT_PUBLIC_PRIORITY_FEE_MICRO_LAMPORTS (floor) and
 * NEXT_PUBLIC_PRIORITY_FEE_CAP_MICRO_LAMPORTS (cap); the non-public
 * LAUNCHPAD_* names are also honored server-side for backward compatibility.
 */
import type { TransactionInstruction } from "@solana/web3.js";

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function floorFee(): number {
  return num(
    process.env.NEXT_PUBLIC_PRIORITY_FEE_MICRO_LAMPORTS ??
      process.env.LAUNCHPAD_PRIORITY_FEE_MICRO_LAMPORTS,
    50_000,
  );
}

function capFee(): number {
  return num(
    process.env.NEXT_PUBLIC_PRIORITY_FEE_CAP_MICRO_LAMPORTS ??
      process.env.LAUNCHPAD_PRIORITY_FEE_CAP_MICRO_LAMPORTS,
    2_000_000,
  );
}

function rpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? process.env.SOLANA_RPC_URL ?? "";
}

/**
 * Network-aware priority fee (µLamports/CU) for setComputeUnitPrice.
 *
 * @param accountKeys writable accounts the tx touches (scopes the estimate)
 * @param priorityLevel Helius level — "VeryHigh" for heavy/critical txs
 */
export async function getPriorityFee(
  accountKeys: string[] = [],
  priorityLevel: "Medium" | "High" | "VeryHigh" = "High",
): Promise<number> {
  const FLOOR = floorFee();
  const CAP = capFee();
  const url = rpcUrl();

  // Only Helius exposes getPriorityFeeEstimate; otherwise use the static floor.
  if (!/helius/i.test(url) || accountKeys.length === 0) return FLOOR;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "priority-fee",
        method: "getPriorityFeeEstimate",
        params: [{ accountKeys, options: { priorityLevel, evaluateEmptySlotAsZero: true } }],
      }),
    });
    const json = await res.json();
    const est = json?.result?.priorityFeeEstimate;
    if (typeof est !== "number" || !Number.isFinite(est)) return FLOOR;
    return Math.min(Math.max(Math.ceil(est), FLOOR), CAP);
  } catch {
    return FLOOR;
  }
}

/**
 * Convenience: derive the fee from the writable accounts of the given
 * instruction(s). Use this when building a tx so the estimate is scoped to
 * exactly what the tx touches.
 */
export async function getPriorityFeeForIxs(
  ixs: TransactionInstruction[],
  priorityLevel: "Medium" | "High" | "VeryHigh" = "High",
): Promise<number> {
  const keys = Array.from(
    new Set(
      ixs
        .flatMap((i) => i.keys)
        .filter((k) => k.isWritable)
        .map((k) => k.pubkey.toBase58()),
    ),
  );
  return getPriorityFee(keys, priorityLevel);
}

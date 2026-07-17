/**
 * Solana transaction builder for Elector fund/withdraw flows.
 *
 * TODO: replace stub with real @solana/web3.js / @solana/spl-token
 * implementation. The interface is final; only the body is stubbed.
 *
 * Real impl signature:
 *   1. Resolve USDC mint for the network (mainnet/devnet)
 *   2. Resolve associated token accounts for sender + recipient
 *   3. Build createAssociatedTokenAccountIdempotent + transferChecked
 *   4. Fetch a recent blockhash
 *   5. Serialize unsigned tx to base64
 */

import { ApiError } from "./errors";

// Resolved at deploy time per network. Stub address.
const USDC_MINT = process.env.USDC_MINT ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BLOCKHASH_VALIDITY_SEC = 60;

export interface BuildTransferTxInput {
  fromAddress: string;
  toAddress: string;
  amountUsd: number;
  description: string;
}

export interface UnsignedTxEnvelope {
  txBase64: string;
  description: string;
  effects: {
    fromAddress: string;
    toAddress: string;
    amountUsd: number;
    mint: string;
  };
  expiresInSec: number;
}

/**
 * Build an unsigned USDC transfer transaction and return it base64-
 * encoded so the client can deserialize, sign in the user's wallet,
 * and submit.
 */
export async function buildTransferTx(
  input: BuildTransferTxInput,
): Promise<UnsignedTxEnvelope> {
  // Validate addresses look like base58 Solana pubkeys (~32-44 chars).
  if (!isLikelyPubkey(input.fromAddress)) {
    throw new ApiError("BAD_REQUEST", "fromAddress is not a valid Solana pubkey");
  }
  if (!isLikelyPubkey(input.toAddress)) {
    throw new ApiError("BAD_REQUEST", "toAddress is not a valid Solana pubkey");
  }
  if (input.amountUsd <= 0) {
    throw new ApiError("BAD_REQUEST", "amountUsd must be positive");
  }

  // STUB: real impl assembles instructions and serializes. The base64
  // string here is a placeholder marker — clients calling this against
  // the stub will fail to deserialize, which is intentional until the
  // real builder lands.
  const stubPayload = JSON.stringify({
    type: "stub-unsigned-tx",
    from: input.fromAddress,
    to: input.toAddress,
    amountUsd: input.amountUsd,
    mint: USDC_MINT,
    builtAt: new Date().toISOString(),
  });
  const txBase64 = Buffer.from(stubPayload).toString("base64");

  return {
    txBase64,
    description: input.description,
    effects: {
      fromAddress: input.fromAddress,
      toAddress: input.toAddress,
      amountUsd: input.amountUsd,
      mint: USDC_MINT,
    },
    expiresInSec: BLOCKHASH_VALIDITY_SEC,
  };
}

function isLikelyPubkey(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

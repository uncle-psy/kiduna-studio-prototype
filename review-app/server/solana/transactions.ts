/**
 * Transaction utilities for the Option A signing flow.
 *
 * Flow:
 *   1. Server builds an unsigned Transaction
 *   2. serializeUnsignedTx() → base64 string sent to browser
 *   3. Browser deserializes, signs with Phantom, sends back base64
 *   4. deserializeSignedTx() → Transaction object
 *   5. submitSignedTx() → sends to Solana, waits for confirmation
 *
 * All transactions use "confirmed" commitment for the balance
 * between speed and reliability.
 */
import {
  Transaction,
  SendTransactionError,
} from "@solana/web3.js";
import { getConnection } from "./connection";

/* ── Serialize (server → browser) ───────────────────────────────────── */

/**
 * Serialize an unsigned transaction to base64.
 * The transaction must have recentBlockhash and feePayer set.
 * Sent to the browser for Phantom signing.
 */
export function serializeUnsignedTx(tx: Transaction): string {
  if (!tx.recentBlockhash) {
    throw new Error("Transaction missing recentBlockhash. Call setRecentBlockhash() first.");
  }
  if (!tx.feePayer) {
    throw new Error("Transaction missing feePayer.");
  }

  // serialize({ requireAllSignatures: false }) allows unsigned serialization
  const buffer = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return buffer.toString("base64");
}

/* ── Deserialize (browser → server) ─────────────────────────────────── */

/**
 * Deserialize a signed transaction from the browser (base64 string).
 * Returns a Transaction object ready for submission.
 */
export function deserializeSignedTx(base64: string): Transaction {
  const buffer = Buffer.from(base64, "base64");

  // Try legacy Transaction first, then VersionedTransaction
  try {
    return Transaction.from(buffer);
  } catch {
    throw new Error("Failed to deserialize transaction. Invalid format.");
  }
}

/* ── Blockhash ──────────────────────────────────────────────────────── */

/**
 * Fetch a recent blockhash for building transactions.
 * Returns the blockhash + lastValidBlockHeight for expiry checks.
 */
export async function getRecentBlockhash(): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const connection = getConnection();
  return connection.getLatestBlockhash("confirmed");
}

/**
 * Apply a recent blockhash to a transaction.
 * Convenience wrapper that sets both blockhash and lastValidBlockHeight.
 */
export async function setRecentBlockhash(tx: Transaction): Promise<void> {
  const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
}

/* ── Submit ─────────────────────────────────────────────────────────── */

/** Max time (ms) to poll for confirmation before giving up. The heavy settle
 * (completeLaunch) tx can take a while to land on mainnet, so give it headroom.
 * Light txs return as soon as they confirm and don't wait the full window. */
const CONFIRM_TIMEOUT_MS = 120_000;
/** How often (ms) to poll getSignatureStatuses. */
const CONFIRM_POLL_MS = 2_000;

/**
 * Submit a signed transaction to Solana and wait for confirmation.
 *
 * Uses polling-based confirmation (getSignatureStatuses) instead of
 * blockhash-based confirmTransaction. This is critical for the
 * build→sign→submit flow where the browser wallet introduces a
 * multi-second delay between blockhash fetch and submission:
 *
 *   1. /build fetches blockhash at slot N, serializes unsigned tx
 *   2. Browser receives tx, Phantom wallet popup (10–30s user delay)
 *   3. /submit receives signed tx — but blockhash from slot N may
 *      already be expired (local validators advance slots quickly)
 *
 * The old blockhash-based confirmTransaction would wait until the
 * (already-expired) blockhash's lastValidBlockHeight is exceeded,
 * then throw TransactionExpiredBlockheightExceeded. Polling avoids
 * this entirely by checking the signature status directly.
 *
 * Returns the transaction signature on success.
 * Throws with a descriptive error message on failure.
 */
export async function submitSignedTx(signedTxBase64: string): Promise<string> {
  const connection = getConnection();
  const rawBytes = Buffer.from(signedTxBase64, "base64");

  try {
    // Skip preflight simulation — the tx was already simulated during
    // the /build step. Skipping saves one RPC round trip and avoids
    // the preflight itself failing on an aged blockhash.
    const signature = await connection.sendRawTransaction(rawBytes, {
      skipPreflight: true,
      maxRetries: 5,
    });

    console.log(`[submitSignedTx] sent ${signature.slice(0, 16)}… — polling for confirmation`);

    // Poll signature status until confirmed/finalized or timeout.
    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(CONFIRM_POLL_MS);

      const { value: statuses } = await connection.getSignatureStatuses([signature]);
      const status = statuses?.[0];

      if (!status) {
        // Not yet seen by the cluster — keep polling.
        continue;
      }

      // Transaction landed but failed on-chain (e.g. program error).
      if (status.err) {
        throw new Error(
          `Transaction confirmed but failed: ${JSON.stringify(status.err)}`,
        );
      }

      // Transaction confirmed or finalized — success!
      if (
        status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized"
      ) {
        console.log(`[submitSignedTx] confirmed (${status.confirmationStatus})`);
        return signature;
      }

      // "processed" — keep polling until it reaches "confirmed".
    }

    // Timeout — but the tx might still land. Return the signature
    // so the caller can check later, rather than throwing a confusing
    // blockhash error.
    console.warn(
      `[submitSignedTx] ${CONFIRM_TIMEOUT_MS / 1000}s timeout — tx may still confirm. Signature: ${signature}`,
    );
    throw new Error(
      `Transaction confirmation timed out after ${CONFIRM_TIMEOUT_MS / 1000}s. ` +
      `The transaction may still land — check signature: ${signature}`,
    );
  } catch (err) {
    if (err instanceof SendTransactionError) {
      const logs = await err.getLogs(connection).catch(() => null);
      const logStr = logs ? `\nProgram logs:\n${logs.join("\n")}` : "";
      throw new Error(`Transaction failed: ${err.message}${logStr}`);
    }
    throw err;
  }
} 

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ── Utilities ──────────────────────────────────────────────────────── */

/**
 * Check if a transaction signature has been confirmed on-chain.
 */
export async function isConfirmed(signature: string): Promise<boolean> {
  const connection = getConnection();
  const status = await connection.getSignatureStatus(signature);
  return status?.value?.confirmationStatus === "confirmed" ||
    status?.value?.confirmationStatus === "finalized";
}
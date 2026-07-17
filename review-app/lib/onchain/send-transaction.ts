/**
 * Robust transaction send + confirm for remote Solana validators.
 *
 * Anchor's sendAndConfirm relies on WebSocket subscriptions which
 * timeout after 30 seconds on remote connections (GCS, AWS, etc.).
 * This module uses HTTP polling (getSignatureStatuses) which works
 * reliably over standard RPC.
 *
 * Place at: lib/onchain/send-transaction.ts
 */

import { type Connection, Transaction } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";

const CONFIRM_POLL_INTERVAL_MS = 2_000;
const CONFIRM_TIMEOUT_MS = 90_000;

/**
 * Sign, send, and confirm a transaction using HTTP polling.
 *
 * @param provider  AnchorProvider with wallet (for signing via Phantom)
 * @param connection  Solana RPC connection
 * @param tx  Transaction with recentBlockhash and feePayer already set
 * @returns Transaction signature
 */
export async function sendAndConfirmRobust(
  provider: AnchorProvider,
  connection: Connection,
  tx: Transaction,
): Promise<string> {
  // Sign via wallet (Phantom popup)
  const signed = await provider.wallet.signTransaction(tx);

  // Send with preflight validation
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });

  // Poll for confirmation instead of relying on WebSocket
  const start = Date.now();
  while (Date.now() - start < CONFIRM_TIMEOUT_MS) {
    await sleep(CONFIRM_POLL_INTERVAL_MS);

    const resp = await connection.getSignatureStatuses([sig]);
    const status = resp?.value?.[0];

    if (status) {
      if (status.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(status.err)}`,
        );
      }
      if (
        status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized"
      ) {
        return sig;
      }
    }

    // Check blockhash expiry
    if (tx.lastValidBlockHeight) {
      const currentHeight = await connection.getBlockHeight("confirmed");
      if (currentHeight > tx.lastValidBlockHeight) {
        throw new Error(
          "Transaction expired: block height exceeded. Please retry.",
        );
      }
    }
  }

  throw new Error(
    `Transaction sent but not confirmed in ${CONFIRM_TIMEOUT_MS / 1000}s. ` +
    `Signature: ${sig} — check Solana Explorer to verify.`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

"use client";

/**
 * LifecycleActions — Finalize and Execute buttons on the proposal detail page.
 *
 * Displays the appropriate action based on on-chain proposal state:
 *   - Trading still open → nothing (VotingPanel handles this)
 *   - Trading closed, pending → "Finalize Proposal" button
 *   - Passed → "Execute Proposal" button
 *   - Failed → outcome badge, no action
 *   - Already executed (DB) → "Executed" badge with timestamp
 *
 * IMPORTANT: No early returns before hooks. All visibility is handled
 * in the JSX via the `shouldShow` flag.
 */

import { useState, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { Icon } from "@iconify/react";
import { useSponsorPubkey, useFrostSignTransaction } from "@/lib/onchain/useAnchorProvider";
import { useFutarchy } from "@/lib/onchain/useFutarchy";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import {
  finalizeProposal,
  executeProposal,
} from "@/lib/onchain/proposal-lifecycle";
import { getToken, getSessionToken } from "@/lib/auth";
import type { OnchainProposalState } from "@/lib/onchain/read-proposal-state";

interface LifecycleActionsProps {
  proposalId: string;
  futarchyProposalAddress: string | null;
  squadsProposalAddress: string | null;
  dbStatus: string;
  onchainState: OnchainProposalState & { refresh: () => void };
  squadsTransactionIndex: string | null;
}

function authHeaders(): Record<string, string> {
  const token = getToken() || getSessionToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function advanceProposal(
  proposalId: string,
  to: string,
  extra?: { outcome?: string; txSignature?: string; note?: string },
) {
  const res = await fetch(`/api/v1/proposals/${proposalId}/advance`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ to, ...extra }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.warn(`[LifecycleActions] Advance to "${to}" failed:`, body);
  }
}

export function LifecycleActions({
  proposalId,
  futarchyProposalAddress,
  squadsProposalAddress,
  dbStatus,
  onchainState,
  squadsTransactionIndex,
}: LifecycleActionsProps) {
  // ── ALL hooks called unconditionally at the top ───────────────
  const { connection } = useConnection();
  const publicKey = useSponsorPubkey();
  const signTransaction = useFrostSignTransaction();
  const connected = !!publicKey;
  const futarchy = useFutarchy();
  const daoCtx = useDaoContext();

  const [processing, setProcessing] = useState(false);
  const [action, setAction] = useState<"finalize" | "execute" | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    txSignature?: string;
  } | null>(null);
  const [localOutcome, setLocalOutcome] = useState<"passed" | "failed" | null>(null);

  // ── Finalize handler ──────────────────────────────────────────
  const handleFinalize = useCallback(async () => {
    if (!connected || !publicKey) {
      setResult({ success: false, message: "Please sign in to finalize." });
      return;
    }
    if (!futarchy) {
      setResult({ success: false, message: "Futarchy client not ready. Reconnect your wallet." });
      console.warn("[Finalize] futarchy is null — wallet may not support signing");
      return;
    }
    if (!daoCtx.ok || !daoCtx.ctx) {
      setResult({ success: false, message: `DAO context not loaded. Missing: ${daoCtx.missing?.join(", ") || "unknown"}` });
      console.warn("[Finalize] daoCtx not ready:", daoCtx);
      return;
    }
    if (!futarchyProposalAddress) {
      setResult({ success: false, message: "Futarchy proposal address not found in database." });
      console.warn("[Finalize] futarchyProposalAddress is null");
      return;
    }
    if (!daoCtx.ctx.baseMint) {
      setResult({ success: false, message: "Base token mint not available for this market." });
      console.warn("[Finalize] daoCtx.ctx.baseMint is null");
      return;
    }

    console.log("[Finalize] All guards passed, starting finalize…");
    console.log("[Finalize] DAO:", daoCtx.ctx.dao.toBase58());
    console.log("[Finalize] baseMint:", daoCtx.ctx.baseMint.toBase58());
    console.log("[Finalize] quoteMint:", daoCtx.ctx.usdcMint.toBase58());
    console.log("[Finalize] squadsProposal:", squadsProposalAddress ?? "(will read from on-chain)");
    console.log("[Finalize] futarchyProposal:", futarchyProposalAddress);

    setProcessing(true);
    setAction("finalize");
    setResult(null);

    try {
      const res = await finalizeProposal({
        futarchy,
        dao: daoCtx.ctx.dao,
        baseMint: daoCtx.ctx.baseMint,
        quoteMint: daoCtx.ctx.usdcMint,
        squadsProposalAddress: squadsProposalAddress ? new PublicKey(squadsProposalAddress) : null,
        futarchyProposalAddress: new PublicKey(futarchyProposalAddress),
      });

      setLocalOutcome(res.outcome);
      setResult({
        success: true,
        message: res.outcome === "passed"
          ? "Proposal passed! You can now execute the treasury action."
          : "Proposal did not pass. The market decided against it.",
        txSignature: res.signature || undefined,
      });

      advanceProposal(proposalId, "resolved", {
        outcome: res.outcome,
        txSignature: res.signature || undefined,
        note: `Finalized: ${res.outcome}`,
      });

      onchainState.refresh();
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Finalize failed",
      });
    } finally {
      setProcessing(false);
      setAction(null);
    }
  }, [
    connected, publicKey, futarchy, daoCtx,
    futarchyProposalAddress, squadsProposalAddress,
    proposalId, onchainState,
  ]);

  // ── Execute handler ───────────────────────────────────────────
  const handleExecute = useCallback(async () => {
    if (!connected || !publicKey || !signTransaction) {
      setResult({ success: false, message: "Please sign in to execute." });
      return;
    }
    if (!futarchy || !daoCtx.ok || !daoCtx.ctx) {
      setResult({ success: false, message: `DAO context not loaded. Missing: ${daoCtx.missing?.join(", ") || "unknown"}` });
      console.warn("[Execute] daoCtx not ready:", daoCtx);
      return;
    }
    if (!futarchyProposalAddress) {
      setResult({ success: false, message: "Futarchy proposal address not found." });
      return;
    }

    let txIndex: bigint;
    if (squadsTransactionIndex) {
      txIndex = BigInt(squadsTransactionIndex);
    } else {
      try {
        const ms = await import("@sqds/multisig");
        const msAccount = await ms.accounts.Multisig.fromAccountAddress(
          connection,
          daoCtx.ctx.multisigPda,
        );
        txIndex = BigInt(msAccount.transactionIndex.toString());
      } catch {
        setResult({
          success: false,
          message: "Could not determine Squads transaction index. Try again.",
        });
        return;
      }
    }

    setProcessing(true);
    setAction("execute");
    setResult(null);

    try {
      const res = await executeProposal({
        connection,
        multisigPda: daoCtx.ctx.multisigPda,
        transactionIndex: txIndex,
        futarchyProposalAddress: new PublicKey(futarchyProposalAddress),
        futarchy,
        sponsorPubkey: publicKey,
        signTransaction,
      });

      setResult({
        success: true,
        message: "Proposal executed! The treasury action has been completed.",
        txSignature: res.signature,
      });

      advanceProposal(proposalId, "executed", {
        txSignature: res.signature,
        note: "Vault transaction executed",
      });

      onchainState.refresh();
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Execute failed",
      });
    } finally {
      setProcessing(false);
      setAction(null);
    }
  }, [
    connected, publicKey, signTransaction, futarchy, daoCtx,
    futarchyProposalAddress, squadsTransactionIndex,
    connection, proposalId, onchainState,
  ]);

  // ── Derived state (no hooks below this line) ──────────────────
  const outcome = onchainState.outcome ?? localOutcome;
  const isFinalized = onchainState.isFinalized || localOutcome !== null;
  const needsFinalize = onchainState.needsFinalize && !isFinalized;
  const needsExecute = (onchainState.isExecutable || localOutcome === "passed") &&
    dbStatus !== "executed";
  const isExecuted = dbStatus === "executed";

  // Visibility: show when on-chain state confirms window closed or proposal finalized.
  const shouldShow =
    !!futarchyProposalAddress &&
    !onchainState.loading &&
    onchainState.found &&
    !(onchainState.status === "pending" && onchainState.secondsRemaining > 0);

  if (!shouldShow) return null;

  // ── JSX ───────────────────────────────────────────────────────
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">

      {/* Already executed */}
      {isExecuted && (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
            <Icon icon="lucide:check-circle-2" width={22} height={22} className="text-green-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Proposal executed</h3>
            <p className="text-xs text-muted mt-0.5">
              The treasury action has been completed on-chain.
            </p>
          </div>
        </div>
      )}

      {/* Failed outcome */}
      {!isExecuted && isFinalized && outcome === "failed" && (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <Icon icon="lucide:x-circle" width={22} height={22} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-red-400 font-bold text-sm">Proposal did not pass</h3>
            <p className="text-xs text-muted mt-0.5">
              The market decided against this proposal. No treasury action will be taken.
              You can still redeem your conditional tokens below.
            </p>
          </div>
        </div>
      )}

      {/* Needs finalize */}
      {!isExecuted && needsFinalize && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Icon icon="lucide:gavel" width={22} height={22} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Trading has closed</h3>
              <p className="text-xs text-muted mt-0.5">
                Finalize to evaluate the TWAP and determine the outcome.
              </p>
            </div>
          </div>

          <button
            onClick={handleFinalize}
            disabled={processing}
            className={`w-full py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer
              bg-amber-500/12 border-amber-500/35 text-amber-400
              ${processing ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-500/20"}`}
          >
            {processing && action === "finalize" ? (
              <span className="flex items-center justify-center gap-2">
                <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" />
                Finalizing…
              </span>
            ) : (
              "Finalize Proposal"
            )}
          </button>
        </>
      )}

      {/* Needs execute (passed) */}
      {!isExecuted && needsExecute && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
              <Icon icon="lucide:rocket" width={22} height={22} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-green-400 font-bold text-sm">Proposal passed</h3>
              <p className="text-xs text-muted mt-0.5">
                Execute to run the authorized treasury action on-chain.
              </p>
            </div>
          </div>

          <button
            onClick={handleExecute}
            disabled={processing}
            className={`w-full py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer
              bg-green-500/12 border-green-500/35 text-green-400
              ${processing ? "opacity-50 cursor-not-allowed" : "hover:bg-green-500/20"}`}
          >
            {processing && action === "execute" ? (
              <span className="flex items-center justify-center gap-2">
                <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" />
                Executing…
              </span>
            ) : (
              "Execute Proposal"
            )}
          </button>
        </>
      )}

      {/* Result feedback */}
      {result && (
        <div className={`mt-4 p-3 rounded-xl text-sm ${
          result.success
            ? "bg-green-500/[0.08] border border-green-500/25 text-green-400"
            : "bg-red-500/[0.08] border border-red-500/25 text-red-400"
        }`}>
          <div>{result.success ? "✓ " : "✗ "}{result.message}</div>
          {result.txSignature && result.txSignature.length > 10 && (
            <div className="mt-1.5 font-mono text-[11px] opacity-70 break-all">
              tx: {result.txSignature}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
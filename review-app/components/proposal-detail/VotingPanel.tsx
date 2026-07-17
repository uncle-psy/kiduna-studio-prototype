"use client";

/**
 * VotingPanel — displayed on the proposal detail page when the proposal is live.
 *
 * Shows Pass/Fail prices, citizen's USDC balance, amount input, and
 * Vote Pass / Vote Fail buttons. Executes fully on-chain swap, signed by the
 * user's internal FROST wallet.
 */

import { useState, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useSponsorPubkey } from "@/lib/onchain/useAnchorProvider"; 
import { useFutarchy } from "@/lib/onchain/useFutarchy";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import type { OnchainProposalState } from "@/lib/onchain/read-proposal-state";
import { voteOnProposal, type VoteSide } from "@/lib/onchain/proposal-trading";
import { getToken, getSessionToken } from "@/lib/auth";

interface VotingPanelProps {
  proposalId: string;
  futarchyProposalAddress: string | null;
  status: string;
  /** On-chain state owned by ProposalShell — single polling loop. */
  onchainState: OnchainProposalState & { refresh: () => void };
}

export function VotingPanel({
  proposalId,
  futarchyProposalAddress,
  status,
  onchainState,
}: VotingPanelProps) {
  const { connection } = useConnection();
  const publicKey = useSponsorPubkey();
  const connected = !!publicKey;
  const futarchy = useFutarchy();
  const daoCtx = useDaoContext();

  const [amount, setAmount] = useState("");
  const [voting, setVoting] = useState(false);
  const [voteSide, setVoteSide] = useState<VoteSide | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleVote = useCallback(
    async (side: VoteSide) => {
      // Require a signed-in FROST wallet
      if (!connected || !publicKey) {
        setResult({ success: false, message: "Please sign in to vote." });
        return;
      }

      const amountNum = parseFloat(amount);
      if (!amountNum || amountNum <= 0) {
        setResult({ success: false, message: "Enter a valid USDC amount" });
        return;
      }

      if (amountNum > onchainState.usdcBalance) {
        setResult({ success: false, message: "Insufficient USDC balance" });
        return;
      }

      if (!futarchy || !daoCtx.ok || !daoCtx.ctx) {
        setResult({ success: false, message: "DAO context not ready" });
        return;
      }

      if (!futarchyProposalAddress) {
        setResult({ success: false, message: "Proposal not submitted on-chain" });
        return;
      }

      if (!daoCtx.ctx.baseMint) {
        setResult({ success: false, message: "Base token mint not available for this market" });
        return;
      }

      const baseMint = daoCtx.ctx.baseMint; // narrowed to PublicKey after guard

      setVoting(true);
      setVoteSide(side);
      setResult(null);

      try {
        const txSignature = await voteOnProposal({
          futarchy,
          connection,
          dao: daoCtx.ctx.dao,
          baseMint,
          usdcMint: daoCtx.ctx.usdcMint,
          proposal: new PublicKey(futarchyProposalAddress),
          side,
          amountUsdc: amountNum,
        });

        // Save vote to DB for price calculation (fire-and-forget)
        const authToken = getToken() || getSessionToken();
        const voteHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) voteHeaders.Authorization = `Bearer ${authToken}`;

        fetch(`/api/v1/proposals/${proposalId}/vote`, {
          method: "POST",
          headers: voteHeaders,
          body: JSON.stringify({
            side,
            stakeUsd: amountNum,
            txSignature,
            wallet: publicKey.toBase58(),
          }),
        }).catch((err) => console.warn("[Vote] DB save failed (prices still on-chain):", err));

        setResult({
          success: true,
          message: `Voted ${side.toUpperCase()} with ${amountNum} USDC`,
        });
        setAmount("");
        onchainState.refresh();
      } catch (err) {
        console.error("[Vote] Error:", err);
        setResult({
          success: false,
          message: (err as Error).message?.split("\n")[0] || "Vote failed",
        });
      } finally {
        setVoting(false);
        setVoteSide(null);
      }
    },
    [
      amount,
      connected,
      publicKey,
      futarchy,
      daoCtx,
      futarchyProposalAddress,
      connection,
      proposalId,
      onchainState,
    ],
  );

  // Don't show voting panel if proposal isn't live
  if (status !== "live" && status !== "pending") {
    return null;
  }

  const isReady = connected && futarchy && daoCtx.ok && futarchyProposalAddress;
  const isPending = onchainState.status === "pending";
  const isClosed = isPending && onchainState.secondsRemaining <= 0 && !onchainState.loading;
  const canVote = isReady && !isClosed;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-lg font-bold text-white mb-1">
        {isClosed ? "Trading closed" : "Vote on this proposal"}
      </h3>
      <p className="text-xs text-muted mb-4">
        {isClosed
          ? "The trading window has ended. Final prices are shown below."
          : isPending
            ? "Trading is open. Buy Pass or Fail tokens with USDC."
            : onchainState.loading
              ? "Loading on-chain state…"
              : "Trading window may have closed."}
      </p>

      {/* Market trade indicator */}
      {!isClosed && isPending && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-accent/[0.06] border border-accent/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent/80">Market trade</span>
          <span className="text-[10px] text-muted/50 ml-2">Your vote swaps tokens in the AMM and moves the price.</span>
        </div>
      )}

      {/* Prices */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-green-500/[0.06] border border-green-500/20">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--pass)", marginBottom: 4 }}>
            Pass Price
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--pass)" }}>
            {onchainState.loading ? "—" : onchainState.passPrice.toFixed(4)}
          </div>
        </div>
        <div style={{
          flex: 1, padding: "12px 16px", borderRadius: 10,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fail)", marginBottom: 4 }}>
            Fail Price
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--fail)" }}>
            {onchainState.loading ? "—" : onchainState.failPrice.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Balance */}
      {!isClosed && (
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        Your USDC balance:{" "}
        <span style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
          {connected ? (onchainState.loading ? "…" : onchainState.usdcBalance.toLocaleString()) : "—"}
        </span>
        {" USDC"}
      </div>
      )}

      {/* Amount input */}
      {!isClosed && (
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
          Amount (USDC)
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            step="1"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={voting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-input border border-card-border text-foreground outline-none focus:border-accent/50 font-mono"
          />
          {connected && onchainState.usdcBalance > 0 && (
            <button
              onClick={() => setAmount(String(Math.floor(onchainState.usdcBalance)))}
              disabled={voting}
              className="px-3 py-2.5 rounded-xl text-[11px] bg-input border border-card-border text-muted cursor-pointer font-mono uppercase tracking-wider hover:border-white/20 transition-colors"
            >
              Max
            </button>
          )}
        </div>
      </div>
      )}

      {/* Vote buttons */}
      {!isClosed && (
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={() => handleVote("pass")}
          disabled={voting || !canVote}
          className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer
            ${voting && voteSide === "pass" ? "bg-green-500/30" : "bg-green-500/12"} 
            border-green-500/35 text-green-400
            ${voting || !canVote ? "opacity-50 cursor-not-allowed" : "hover:bg-green-500/20"}
            ${voting && voteSide !== "pass" ? "opacity-40" : ""}`}
        >
          {voting && voteSide === "pass" ? "Signing…" : "Vote Pass ↑"}
        </button>
        <button
          onClick={() => handleVote("fail")}
          disabled={voting || !canVote}
          className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer
            ${voting && voteSide === "fail" ? "bg-red-500/30" : "bg-red-500/12"} 
            border-red-500/35 text-red-400
            ${voting || !canVote ? "opacity-50 cursor-not-allowed" : "hover:bg-red-500/20"}
            ${voting && voteSide !== "fail" ? "opacity-40" : ""}`}
        >
          {voting && voteSide === "fail" ? "Signing…" : "Vote Fail ↓"}
        </button>
      </div>
      )}

      {/* Sign-in prompt (FROST wallet comes from the signed-in account) */}
      {!connected && !isClosed && (
        <div className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-white/[0.04] border border-card-border text-muted text-center">
          Sign in to vote
        </div>
      )}

      {/* Time remaining */}
      {isPending && !isClosed && onchainState.secondsRemaining > 0 && (
        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 8, fontFamily: "var(--font-mono)" }}>
          Trading closes in {formatDuration(onchainState.secondsRemaining)}
        </div>
      )}

      {/* Closed banner */}
      {isClosed && (
        <div className={`mt-2 p-4 rounded-xl text-center ${
          onchainState.twapPrediction === "pass"
            ? "bg-green-500/[0.06] border border-green-500/20"
            : onchainState.twapPrediction === "fail"
              ? "bg-red-500/[0.06] border border-red-500/20"
              : "bg-white/[0.03] border border-card-border"
        }`}>
          <div className={`text-sm font-semibold mb-1 ${
            onchainState.twapPrediction === "pass" ? "text-green-400"
              : onchainState.twapPrediction === "fail" ? "text-red-400"
                : "text-muted"
          }`}>
            {onchainState.twapPrediction === "pass"
              ? "This proposal is set to pass"
              : onchainState.twapPrediction === "fail"
                ? "This proposal is set to fail"
                : "Outcome not yet determined"}
          </div>
          <p className="text-xs text-muted">
            {onchainState.twapPrediction === "unknown"
              ? "TWAP has not accumulated enough data to predict the outcome."
              : "Voting has ended. The proposal will be finalized based on the TWAP comparison above."}
          </p>
          {onchainState.passTwap !== null && onchainState.failTwap !== null && (
            <div className="mt-2 flex justify-center gap-4 text-[11px] font-mono text-muted/70">
              <span>Pass TWAP: <span className="text-green-400">{onchainState.passTwap.toFixed(4)}</span></span>
              <span>Fail TWAP: <span className="text-red-400">{onchainState.failTwap.toFixed(4)}</span></span>
            </div>
          )}
        </div>
      )}

      {/* Result feedback */}
      {result && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${
          result.success
            ? "bg-green-500/[0.08] border border-green-500/25 text-green-400"
            : "bg-red-500/[0.08] border border-red-500/25 text-red-400"
        }`}>
          {result.success ? "✓ " : "✗ "}{result.message}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}
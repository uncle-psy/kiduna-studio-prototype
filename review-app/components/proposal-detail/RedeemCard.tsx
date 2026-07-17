"use client";

/**
 * RedeemCard — redeem conditional tokens after a proposal is finalized.
 *
 * Reads real on-chain conditional token balances for the connected wallet
 * and calls futarchy.vaultClient.redeemTokensIx() to convert them back
 * to underlying tokens.
 *
 * Pass-side holders receive full underlying value.
 * Fail-side holders receive zero (handled by the program).
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { Icon } from "@iconify/react";
import { useFutarchy } from "@/lib/onchain/useFutarchy";
import { useSponsorPubkey } from "@/lib/onchain/useAnchorProvider";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import {
  readConditionalBalances,
  redeemConditionalTokens,
  type ConditionalBalances,
} from "@/lib/onchain/proposal-lifecycle";

interface RedeemCardProps {
  proposalId: string;
  status: string;
  futarchyProposalAddress?: string | null;
}

export function RedeemCard({
  status,
  proposalId,
  futarchyProposalAddress,
}: RedeemCardProps) {
  const { connection } = useConnection();
  const publicKey = useSponsorPubkey();
  const connected = !!publicKey;
  const futarchy = useFutarchy();
  const daoCtx = useDaoContext();

  const [balances, setBalances] = useState<ConditionalBalances | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
    txSignature?: string;
  } | null>(null);

  const isFinalized =
    status === "resolved" || status === "executed" || status === "measured";
  const canReadBalances =
    connected &&
    publicKey &&
    futarchy &&
    daoCtx.ok &&
    daoCtx.ctx?.baseMint &&
    futarchyProposalAddress;

  // ── Load on-chain conditional token balances ──────────────────
  const loadBalances = useCallback(async () => {
    if (!canReadBalances) return;
    setLoadingBalances(true);
    try {
      const b = await readConditionalBalances({
        futarchy: futarchy!,
        connection,
        dao: daoCtx.ctx!.dao,
        baseMint: daoCtx.ctx!.baseMint!,
        quoteMint: daoCtx.ctx!.usdcMint,
        futarchyProposalAddress: new PublicKey(futarchyProposalAddress!),
        walletPubkey: publicKey!,
      });
      setBalances(b);
    } catch (err) {
      console.warn("[RedeemCard] Failed to read balances:", err);
      setBalances(null);
    } finally {
      setLoadingBalances(false);
    }
  }, [canReadBalances, futarchy, connection, daoCtx.ctx, futarchyProposalAddress, publicKey]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // ── Redeem handler ────────────────────────────────────────────
  const handleRedeem = useCallback(async () => {
    if (!futarchy || !daoCtx.ok || !daoCtx.ctx?.baseMint || !futarchyProposalAddress) return;

    setRedeeming(true);
    setRedeemResult(null);

    try {
      const res = await redeemConditionalTokens({
        futarchy,
        connection,
        dao: daoCtx.ctx.dao,
        baseMint: daoCtx.ctx.baseMint,
        quoteMint: daoCtx.ctx.usdcMint,
        futarchyProposalAddress: new PublicKey(futarchyProposalAddress),
      });

      if (res.noop) {
        setRedeemResult({
          success: true,
          message: "No conditional tokens to redeem.",
        });
      } else {
        setRedeemResult({
          success: true,
          message: "Conditional tokens redeemed successfully.",
          txSignature: res.signature,
        });
        // Refresh balances after redeem.
        loadBalances();
      }
    } catch (err) {
      setRedeemResult({
        success: false,
        message: err instanceof Error ? err.message : "Redeem failed",
      });
    } finally {
      setRedeeming(false);
    }
  }, [futarchy, daoCtx, futarchyProposalAddress, connection, loadBalances]);

  // ── Don't render until proposal is on-chain ───────────────────
  if (!futarchyProposalAddress) return null;

  // ── Wallet not connected ──────────────────────────────────────
  if (!connected) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Icon icon="lucide:wallet" width={18} height={18} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Redeem</h3>
            <p className="text-[11px] text-muted">
              Sign in to see redeemable positions.
            </p>
          </div>
        </div>
        <div className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-white/[0.04] border border-card-border text-muted text-center">
          Sign in to redeem
        </div>
      </div>
    );
  }

  // ── Not finalized yet ─────────────────────────────────────────
  if (!isFinalized) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
            <Icon icon="lucide:clock" width={18} height={18} className="text-muted" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Redeem</h3>
            <p className="text-[11px] text-muted">
              Finalize the proposal first to redeem conditional tokens.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading balances ──────────────────────────────────────────
  if (loadingBalances && !balances) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-3">
          <Icon icon="lucide:loader-2" width={18} height={18} className="text-muted animate-spin" />
          <p className="text-sm text-muted">Loading conditional token balances…</p>
        </div>
      </div>
    );
  }

  // ── No tokens to redeem ───────────────────────────────────────
  if (balances && !balances.hasAny) {
    return (
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <Icon icon="lucide:circle-check" width={22} height={22} className="text-muted" />
          </div>
          <p className="text-white font-medium text-sm mb-1">All clear</p>
          <p className="text-muted/60 text-xs">
            No outstanding conditional tokens to redeem.
          </p>
        </div>
        <div className="px-4 py-3 border-t border-card-border">
          <Link href="/market/redeem-history" className="text-xs text-accent hover:underline flex items-center gap-1">
            View redeem history <Icon icon="lucide:arrow-right" width={12} height={12} />
          </Link>
        </div>
      </div>
    );
  }

  // ── Has tokens to redeem ──────────────────────────────────────
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Icon icon="lucide:wallet" width={18} height={18} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Redeem</h3>
            <p className="text-[11px] text-muted">
              Convert conditional tokens back to underlying tokens.
            </p>
          </div>
        </div>
      </div>

      {/* Balances */}
      {balances && (
        <div className="p-4 space-y-2">
          {balances.passQuote > 0 && (
            <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-card-border rounded-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-green-500/10 border-green-500/30 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />PASS
                </span>
                <span className="text-sm text-white">USDC</span>
              </div>
              <span className="text-sm text-white font-mono font-semibold">
                {balances.passQuote.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {balances.passBase > 0 && (
            <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-card-border rounded-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-green-500/10 border-green-500/30 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />PASS
                </span>
                <span className="text-sm text-white">Base token</span>
              </div>
              <span className="text-sm text-white font-mono font-semibold">
                {balances.passBase.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
          )}
          {balances.failQuote > 0 && (
            <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-card-border rounded-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-red-500/10 border-red-500/30 text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />FAIL
                </span>
                <span className="text-sm text-white">USDC</span>
              </div>
              <span className="text-sm text-white font-mono font-semibold">
                {balances.failQuote.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {balances.failBase > 0 && (
            <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-card-border rounded-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-red-500/10 border-red-500/30 text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />FAIL
                </span>
                <span className="text-sm text-white">Base token</span>
              </div>
              <span className="text-sm text-white font-mono font-semibold">
                {balances.failBase.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
          )}

          {/* Redeem button */}
          <button
            onClick={handleRedeem}
            disabled={redeeming}
            className={`w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer
              bg-accent/12 border-accent/35 text-accent
              ${redeeming ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/20"}`}
          >
            {redeeming ? (
              <span className="flex items-center justify-center gap-2">
                <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" />
                Redeeming…
              </span>
            ) : (
              "Redeem all conditional tokens"
            )}
          </button>
        </div>
      )}

      {/* Result feedback */}
      {redeemResult && (
        <div className="px-4 pb-4">
          <div className={`p-3 rounded-xl text-sm ${
            redeemResult.success
              ? "bg-green-500/[0.08] border border-green-500/25 text-green-400"
              : "bg-red-500/[0.08] border border-red-500/25 text-red-400"
          }`}>
            <div>{redeemResult.success ? "✓ " : "✗ "}{redeemResult.message}</div>
            {redeemResult.txSignature && (
              <div className="mt-1.5 font-mono text-[11px] opacity-70 break-all">
                tx: {redeemResult.txSignature}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-card-border">
        <Link href="/market/redeem-history" className="text-xs text-accent hover:underline flex items-center gap-1">
          View redeem history <Icon icon="lucide:arrow-right" width={12} height={12} />
        </Link>
      </div>
    </div>
  );
}

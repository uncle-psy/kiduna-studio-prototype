"use client";

import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { useCurrentMarket } from "@/lib/market-context";
import type { Proposal } from "@/lib/proposal-detail-mocks";

/**
 * Format a USDC/token amount for display.
 * USDC has 6 decimals, so a bare `toLocaleString()` (which defaults to a max of
 * 3 fraction digits) silently rounds small amounts like 0.0001 down to "0".
 * Show up to 6 fraction digits, trimming trailing zeros.
 */
function formatAmount(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export function SpendBody({ proposal }: { proposal: Proposal }) {
  if (proposal.kind !== "spend") return null;
  const s = proposal.spend;

  // Determine the asset label
  const isToken = (s as any).asset === "token";
  const { current } = useCurrentMarket();
  const ticker = isToken
    ? (current.tokenTicker || current.slug.replace(/-/g, "").slice(0, 6).toUpperCase() || "TOKEN")
    : "USDC";

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-1">
        {proposal.status === "resolved" ? "What was done" : "What Pass authorizes"}
      </h3>
      <p className="text-[11px] text-muted mb-4">
        {isToken ? `${ticker} token` : "USDC"} transfer from the DAO treasury to a verified recipient.
      </p>

      <div className="divide-y divide-card-border">
        <div className="flex justify-between items-start py-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Recipient</span>
          <div className="text-right">
            <span className="text-sm text-white font-medium">{s.recipientName}</span>
            {s.priorProposalsCount > 0 && (
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                {s.priorProposalsCount} prior · trusted
              </span>
            )}
            <div className="text-[11px] font-mono text-muted mt-0.5">{s.recipientAddress}</div>
          </div>
        </div>

        <div className="flex justify-between items-center py-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Amount</span>
          <span className="text-lg font-bold text-green-400">
            {isToken ? "" : "$"}{formatAmount(s.amountUsd)} {ticker}
          </span>
        </div>

        <TreasuryRow
          amountUsd={s.amountUsd}
          mintAddress={(s as any).mintAddress ?? null}
          isToken={isToken}
          ticker={ticker}
        />

        {proposal.status === "resolved" && (
          <div className="flex justify-between items-center py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Transaction</span>
            <span className="text-xs font-mono text-accent">{s.txSignature ?? "Pending execution"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Reads treasury balance from blockchain for the correct asset */
function TreasuryRow({
  amountUsd, mintAddress, isToken, ticker,
}: {
  amountUsd: number; mintAddress: string | null; isToken: boolean; ticker: string;
}) {
  const { connection } = useConnection();
  const daoCtx = useDaoContext();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!daoCtx.ok || !daoCtx.ctx) return;

    // Determine which mint to read: use stored mintAddress, or derive from asset type
    const mint = mintAddress
      ? new PublicKey(mintAddress)
      : isToken
        ? daoCtx.ctx.baseMint
        : daoCtx.ctx.usdcMint;

    if (!mint) return;

    let cancelled = false;
    (async () => {
      try {
        const ata = getAssociatedTokenAddressSync(mint, daoCtx.ctx!.treasuryVault, true);
        const bal = await connection.getTokenAccountBalance(ata);
        if (!cancelled) setBalance(parseFloat(bal.value.uiAmountString ?? "0"));
      } catch {
        if (!cancelled) setBalance(null);
      }
    })();
    return () => { cancelled = true; };
  }, [connection, daoCtx.ok, daoCtx.ctx, mintAddress, isToken]);

  const before = balance;
  const after = before != null ? Math.max(0, before - amountUsd) : null;

  return (
    <div className="flex justify-between items-center py-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Treasury</span>
      <div className="text-xs">
        {before != null ? (
          <>
            <span className="text-muted">{isToken ? "" : "$"}{formatAmount(before)} {ticker}</span>
            <span className="text-muted mx-2">→</span>
            <span className="text-white font-medium">{isToken ? "" : "$"}{after != null ? formatAmount(after) : "—"} {ticker}</span>
          </>
        ) : (
          <span className="text-muted">Loading…</span>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import type { Proposal } from "@/lib/proposal-detail-mocks";

/**
 * USDC has 6 decimals — a bare `toLocaleString()` caps at 3 fraction digits and
 * rounds small amounts (e.g. 0.0001) down to "0". Show up to 6 fraction digits.
 */
function formatAmount(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export function LiquidityBody({ proposal }: { proposal: Proposal }) {
  if (proposal.kind !== "liquidity") return null;
  const l = proposal.liquidity;
  if (!l) return null;

  const isProvide = l.direction === "provide";

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-1">
        {proposal.status === "resolved" ? "What was done" : "What Pass authorizes"}
      </h3>
      <p className="text-[11px] text-muted mb-4">
        {isProvide
          ? "Treasury adds liquidity to the pool. Pool depth grows."
          : "Treasury withdraws liquidity from the pool. Returns USDC + tokens."}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Pool</div>
          <div className="font-mono text-sm text-cyan-400">{l.poolName}</div>
        </div>
        <div className="p-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">{isProvide ? "Adding" : "Withdrawing"}</div>
          <div className="font-mono text-sm text-cyan-400">${formatAmount(l.amountUsd)}</div>
        </div>
      </div>

      <PoolDepthRow
        label="Pool depth"
        dbBefore={l.poolDepthBeforeUsd}
        amountUsd={l.amountUsd}
        direction={l.direction}
      />

      {proposal.status === "resolved" && (
        <div className="mt-3 pt-3 border-t border-card-border text-[11px] text-muted font-mono">
          Tx · {l.txSignature ?? "Pending execution"}
        </div>
      )}
    </div>
  );
}

/** Reads treasury USDC balance from blockchain as pool depth proxy */
function PoolDepthRow({ label, dbBefore, amountUsd, direction }: {
  label: string; dbBefore: number; amountUsd: number; direction: string;
}) {
  const { connection } = useConnection();
  const daoCtx = useDaoContext();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!daoCtx.ok || !daoCtx.ctx) return;
    let cancelled = false;
    (async () => {
      try {
        const ata = getAssociatedTokenAddressSync(daoCtx.ctx!.usdcMint, daoCtx.ctx!.treasuryVault, true);
        const bal = await connection.getTokenAccountBalance(ata);
        if (!cancelled) setBalance(parseFloat(bal.value.uiAmountString ?? "0"));
      } catch { if (!cancelled) setBalance(null); }
    })();
    return () => { cancelled = true; };
  }, [connection, daoCtx.ok, daoCtx.ctx]);

  const before = balance ?? (dbBefore > 0 ? dbBefore : null);
  const after = before != null
    ? direction === "provide" ? before + amountUsd : Math.max(0, before - amountUsd)
    : null;
  const deltaPct = before != null && before > 0 ? ((after! - before) / before) * 100 : 0;

  return (
    <div className="flex justify-between items-center py-3 border-t border-card-border">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <div className="text-xs">
        {before != null ? (
          <>
            <span className="text-muted">${formatAmount(before)}</span>
            <span className="text-muted mx-2">→</span>
            <span className="text-white font-medium">${after != null ? formatAmount(after) : "—"}</span>
            <span className={`ml-2 font-mono text-[11px] ${deltaPct >= 0 ? "text-green-400" : "text-red-400"}`}>
              ({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%)
            </span>
          </>
        ) : (
          <span className="text-muted">Loading…</span>
        )}
      </div>
    </div>
  );
}
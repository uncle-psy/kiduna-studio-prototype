"use client";

import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { getMint } from "@solana/spl-token";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import type { Proposal } from "@/lib/proposal-detail-mocks";

export function MintBody({ proposal }: { proposal: Proposal }) {
  if (proposal.kind !== "mint") return null;
  const m = proposal.mint;
  if (!m || !m.amount) return null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-1">
        {proposal.status === "resolved" ? "What was minted" : "What Pass would mint"}
      </h3>
      <p className="text-[11px] text-muted mb-4">
        New tokens are created and routed to the listed recipients. Existing holders see proportional dilution.
      </p>

      <SupplyStats amount={m.amount} ticker={m.ticker} dbSupplyBefore={m.supplyBefore} dbSupplyAfter={m.supplyAfter} />

      <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 mt-4">Distribution</div>
      <div className="divide-y divide-card-border">
        {(m.distribution ?? []).map((d: any, i: number) => (
          <div key={d.recipient || i} className="flex justify-between items-center py-2.5">
            <span className="text-xs text-white font-mono truncate max-w-[60%]">{d.recipient}</span>
            <span className="text-xs text-muted font-mono">
              {d.pct}% · {Math.round((m.amount * d.pct) / 100).toLocaleString()} {m.ticker}
            </span>
          </div>
        ))}
      </div>

      {proposal.status === "resolved" && (
        <div className="mt-3 pt-3 border-t border-card-border text-[11px] text-muted font-mono">
          Tx · {m.txSignature ?? "Pending execution"}
        </div>
      )}
    </div>
  );
}

/** Reads current token supply directly from blockchain */
function SupplyStats({
  amount, ticker, dbSupplyBefore, dbSupplyAfter,
}: {
  amount: number; ticker: string; dbSupplyBefore: number; dbSupplyAfter: number;
}) {
  const { connection } = useConnection();
  const daoCtx = useDaoContext();
  const [onchainSupply, setOnchainSupply] = useState<number | null>(null);
  const [decimals, setDecimals] = useState<number>(9);

  useEffect(() => {
    if (!daoCtx.ok || !daoCtx.ctx?.baseMint) return;
    let cancelled = false;
    (async () => {
      try {
        const mintInfo = await getMint(connection, daoCtx.ctx!.baseMint!);
        const dec = mintInfo.decimals;
        const supply = Number(mintInfo.supply) / 10 ** dec;
        if (!cancelled) {
          setOnchainSupply(supply);
          setDecimals(dec);
        }
      } catch {
        if (!cancelled) setOnchainSupply(null);
      }
    })();
    return () => { cancelled = true; };
  }, [connection, daoCtx.ok, daoCtx.ctx]);

  // Use on-chain supply if available, otherwise fall back to DB
  const supplyBefore = onchainSupply ?? (dbSupplyBefore > 0 ? dbSupplyBefore : null);
  const supplyAfter = supplyBefore != null ? supplyBefore + amount : (dbSupplyAfter > 0 ? dbSupplyAfter : null);
  const dilutionPct = supplyBefore != null && supplyBefore > 0 ? (amount / supplyBefore) * 100 : 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 rounded-xl bg-purple-500/[0.06] border border-purple-500/30">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Mint amount</div>
        <div className="font-mono text-sm text-purple-400">{amount.toLocaleString()} {ticker}</div>
      </div>
      <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/30">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Supply impact</div>
        <div className="font-mono text-sm text-amber-400">+{dilutionPct.toFixed(2)}%</div>
      </div>
      <div className="p-3 rounded-xl bg-white/[0.02] border border-card-border">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Supply after</div>
        <div className="font-mono text-sm text-white">
          {supplyAfter != null ? supplyAfter.toLocaleString() : "Loading…"}
        </div>
        {onchainSupply != null && (
          <div className="text-[9px] text-muted mt-0.5">Live from blockchain</div>
        )}
      </div>
    </div>
  );
}
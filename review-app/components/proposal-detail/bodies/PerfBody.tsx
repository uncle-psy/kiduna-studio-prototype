"use client";

import { Icon } from "@iconify/react";
import type { Proposal } from "@/lib/proposal-detail-mocks";

export function PerfBody({ proposal }: { proposal: Proposal }) {
  if (proposal.kind !== "perf") return null;
  const p = proposal.perf;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-1">
        {proposal.status === "resolved"
          ? "What was escrowed"
          : "What Pass would escrow"}
      </h3>
      <p className="text-[11px] text-muted mb-4">
        Tokens are escrowed in a performance-package PDA. Tranches unlock when
        the token TWAP exceeds each price threshold.
      </p>

      <div className="divide-y divide-card-border">
        {/* Recipient */}
        <div className="flex justify-between items-start py-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Recipient</span>
          <div className="text-right">
            <span className="text-sm text-white font-medium">{p.recipientName}</span>
            {p.recipientWallet && (
              <div className="text-[11px] font-mono text-muted mt-0.5">{p.recipientWallet}</div>
            )}
          </div>
        </div>

        {/* Reward */}
        <div className="flex justify-between items-center py-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Total reward</span>
          <span className="text-lg font-bold text-purple-400">
            {p.rewardAmount.toLocaleString()} {p.rewardTicker}
          </span>
        </div>

        {/* TWAP window */}
        {p.twapWindowHours && (
          <div className="flex justify-between items-center py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">TWAP window</span>
            <span className="text-xs text-white">{p.twapWindowHours}h sustained price</span>
          </div>
        )}

        {/* Min unlock */}
        {p.minUnlockTimestamp && (
          <div className="flex justify-between items-center py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Earliest unlock</span>
            <span className="text-xs text-white">
              {new Date(p.minUnlockTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        )}

        {/* Program version */}
        {p.programVersion && (
          <div className="flex justify-between items-center py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Program</span>
            <span className="text-xs font-mono text-muted">{p.programVersion}</span>
          </div>
        )}
      </div>

      {/* Price tranches */}
      {p.tranches && p.tranches.length > 0 && (
        <div className="mt-4 pt-4 border-t border-card-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Price tranches ({p.tranches.length})
          </span>
          <div className="mt-2 space-y-2">
            {p.tranches.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/20">
                <span className="text-[11px] font-mono text-muted w-5">{i + 1}.</span>
                <div className="flex-1">
                  <span className="text-xs text-white">
                    TWAP ≥ <span className="font-mono font-semibold">${t.priceThreshold}</span>
                  </span>
                </div>
                <span className="text-xs font-mono text-purple-400 font-semibold">
                  {t.tokenAmount.toLocaleString()} {p.rewardTicker}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unlock conditions */}
      <div className="mt-4 pt-4 border-t border-card-border">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Unlock conditions ({p.unlockConditions.length})
        </span>
        <div className="mt-2 space-y-2">
          {p.unlockConditions.map((u) => (
            <div
              key={u.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${
                u.status === "met"
                  ? "bg-green-500/[0.04] border-green-500/20"
                  : u.status === "failed"
                  ? "bg-red-500/[0.04] border-red-500/20"
                  : "bg-white/[0.02] border-card-border"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  u.status === "met" ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : u.status === "failed" ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-white/[0.04] border-card-border text-muted"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {u.status === "met" ? "Met" : u.status === "failed" ? "Failed" : "Waiting"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white">{u.description}</div>
                {u.progress && (
                  <div className="text-[11px] text-muted mt-1 font-mono">{u.progress}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Escrow */}
      {proposal.status === "resolved" && (
        <div className="mt-4 pt-3 border-t border-card-border">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Escrow</span>
            <span className="text-[11px] font-mono text-muted">
              {p.escrowAddress ?? "Will be created at execution"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

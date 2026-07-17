"use client";

/**
 * Redeem History — shows the user's USDC balance and a ledger of all
 * past redemptions across resolved proposals.
 *
 * The actual redeem action lives on each proposal's detail page
 * (VotingPanel → RedeemSection). This page is the audit trail.
 *
 * Currently uses mock data. Will read from on-chain + DB later.
 */

import { useState, useMemo } from "react";
import { Icon } from "@iconify/react";

/* ── Mock Data ─────────────────────────────────────────────────────── */

type RedeemStatus = "success" | "pending";
type ProposalKind = "spend" | "param" | "mint" | "metadata" | "liquidity" | "perf";

interface RedeemRecord {
  id: string;
  proposalId: string;
  proposalTitle: string;
  proposalKind: ProposalKind;
  objective: string;
  side: "pass" | "fail";
  stakeUsd: number;
  pnlUsd: number;
  redeemedUsd: number;
  status: RedeemStatus;
  redeemedAt: string;
  txSignature: string;
}

const MOCK_USDC_BALANCE = 2_847.50;

const MOCK_HISTORY: RedeemRecord[] = [
  {
    id: "rd-1",
    proposalId: "p-spend-audit",
    proposalTitle: "Contract security audit — 8k USDC to Trail of Bits",
    proposalKind: "spend",
    objective: "Operations",
    side: "pass",
    stakeUsd: 250,
    pnlUsd: 68,
    redeemedUsd: 318,
    status: "success",
    redeemedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    txSignature: "5KzR7...xR7q",
  },
  {
    id: "rd-2",
    proposalId: "p-perf-marketing",
    proposalTitle: "Performance package — Q2 marketing lead",
    proposalKind: "perf",
    objective: "Growth",
    side: "fail",
    stakeUsd: 150,
    pnlUsd: 46,
    redeemedUsd: 196,
    status: "success",
    redeemedAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
    txSignature: "3AbQ2...mQ2p",
  },
  {
    id: "rd-3",
    proposalId: "p-spend-infra",
    proposalTitle: "Infrastructure upgrade — 5k USDC to DevOps",
    proposalKind: "spend",
    objective: "Operations",
    side: "pass",
    stakeUsd: 400,
    pnlUsd: 112,
    redeemedUsd: 512,
    status: "success",
    redeemedAt: new Date(Date.now() - 22 * 86_400_000).toISOString(),
    txSignature: "7FgH3...nP4s",
  },
  {
    id: "rd-4",
    proposalId: "p-param-quorum",
    proposalTitle: "Raise quorum from 50 to 75 electors",
    proposalKind: "param",
    objective: "Strategy",
    side: "pass",
    stakeUsd: 300,
    pnlUsd: 88,
    redeemedUsd: 388,
    status: "success",
    redeemedAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    txSignature: "9WkM1...tY8v",
  },
  {
    id: "rd-5",
    proposalId: "p-mint-rewards",
    proposalTitle: "Mint 100K ACME for staking rewards program",
    proposalKind: "mint",
    objective: "Growth",
    side: "pass",
    stakeUsd: 600,
    pnlUsd: 210,
    redeemedUsd: 810,
    status: "success",
    redeemedAt: new Date(Date.now() - 45 * 86_400_000).toISOString(),
    txSignature: "2BnX5...qR3k",
  },
];

/* ── Helpers ───────────────────────────────────────────────────────── */

const KIND_ICONS: Record<ProposalKind, string> = {
  spend: "lucide:banknote",
  param: "lucide:sliders-horizontal",
  mint: "lucide:coins",
  metadata: "lucide:file-edit",
  liquidity: "lucide:waves",
  perf: "lucide:trophy",
};

function fmtUsd(n: number): string {
  return `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPnl(n: number): string {
  if (n === 0) return "$0";
  return `${n > 0 ? "+" : "−"}${fmtUsd(n)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "1d ago";
  return `${diff}d ago`;
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function RedeemHistoryPage() {
  const totalRedeemed = MOCK_HISTORY.reduce((sum, r) => sum + r.redeemedUsd, 0);
  const totalPnl = MOCK_HISTORY.reduce((sum, r) => sum + r.pnlUsd, 0);

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">Acme Strategy DAO / Redeem History</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Redeem history.</h1>
          <p className="text-muted mt-1">Your USDC balance and past redemptions from resolved proposals.</p>
        </div>
      </div>

      {/* ── USDC Balance card ───────────────────────────────────── */}
      <div className="bg-card border border-card-border rounded-xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
            <Icon icon="lucide:wallet" width={24} height={24} className="text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Your USDC Balance</p>
            <p className="text-3xl font-bold text-white">{fmtUsd(MOCK_USDC_BALANCE)}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Available for voting</p>
            <p className="text-sm text-muted">Connect wallet to see live balance</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Total redeemed</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:check-check" width={16} height={16} className="text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{fmtUsd(totalRedeemed)}</p>
          <p className="text-xs text-muted mt-1">{MOCK_HISTORY.length} redemptions</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Net P&L from votes</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:trending-up" width={16} height={16} className="text-accent" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtPnl(totalPnl)}</p>
          <p className="text-xs text-muted mt-1">all time</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Win rate</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:target" width={16} height={16} className="text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {MOCK_HISTORY.length > 0
              ? `${Math.round((MOCK_HISTORY.filter((r) => r.pnlUsd > 0).length / MOCK_HISTORY.length) * 100)}%`
              : "—"}
          </p>
          <p className="text-xs text-green-400 mt-1">
            {MOCK_HISTORY.filter((r) => r.pnlUsd > 0).length} of {MOCK_HISTORY.length} winning
          </p>
        </div>
      </div>

      {/* ── Redeem History panel ─────────────────────────────────── */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center gap-3 p-4 border-b border-card-border">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Icon icon="lucide:history" width={18} height={18} className="text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Redemption ledger</h2>
            <p className="text-[11px] text-muted">Every redemption from resolved proposals.</p>
          </div>
        </div>

        {/* Empty state */}
        {MOCK_HISTORY.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Icon icon="lucide:history" width={24} height={24} className="text-muted" />
            </div>
            <p className="text-white font-medium text-sm mb-1">No redemptions yet</p>
            <p className="text-muted/60 text-xs">Vote on proposals and redeem your winnings to see them here.</p>
          </div>
        )}

        {/* History rows */}
        {MOCK_HISTORY.length > 0 && (
          <div className="p-3 space-y-2">
            {MOCK_HISTORY.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-3 p-3 bg-white/[0.02] border border-card-border rounded-xl hover:border-accent/40 hover:bg-white/[0.04] transition-all"
              >
                {/* Kind icon */}
                <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Icon icon={KIND_ICONS[record.proposalKind]} width={18} height={18} className="text-accent" />
                </div>

                {/* Proposal title + objective */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{record.proposalTitle}</p>
                  <p className="text-[11px] text-muted/60 truncate">{record.objective}</p>
                </div>

                {/* Side badge */}
                <span className={`hidden sm:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                  record.side === "pass"
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {record.side === "pass" ? "PASS" : "FAIL"}
                </span>

                {/* P&L */}
                <div className="text-right shrink-0 hidden md:block w-16">
                  <p className={`text-xs font-mono ${record.pnlUsd >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fmtPnl(record.pnlUsd)}
                  </p>
                  <p className="text-[10px] text-muted">P&L</p>
                </div>

                {/* Redeemed amount */}
                <div className="text-right shrink-0 w-20">
                  <p className="text-sm text-white font-mono font-semibold">{fmtUsd(record.redeemedUsd)}</p>
                  <p className="text-[10px] text-muted">redeemed</p>
                </div>

                {/* Date */}
                <div className="text-right shrink-0 hidden lg:block w-20">
                  <p className="text-[11px] text-muted">{fmtDate(record.redeemedAt)}</p>
                  <p className="text-[10px] text-muted/50">{daysAgo(record.redeemedAt)}</p>
                </div>

                {/* Status + tx */}
                <div className="shrink-0 w-20 text-right">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-green-500/10 border-green-500/30 text-green-400">
                    <Icon icon="lucide:check" width={10} height={10} />
                    Success
                  </span>
                  <p className="text-[10px] text-muted/50 font-mono mt-1 truncate">{record.txSignature}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

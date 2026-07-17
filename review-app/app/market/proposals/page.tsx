"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { type ProposalKind, proposalTypesFor } from "@/lib/proposal-types";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";
import { getToken, getSessionToken } from "@/lib/auth";
import { AdminOnly } from "@/components/market/AdminOnly";
import { useOnchainProposalState } from "@/lib/onchain/read-proposal-state";
import { useDaoContext } from "@/lib/onchain/useDaoContext";

/* ── Types ─────────────────────────────────────────────────────────── */

interface ProposalRow {
  id: string; kind: ProposalKind; title: string;
  objectiveId: string; objectiveName: string; objectiveIcon: string;
  status: string; passTwap: number; failTwap: number;
  passMarginPct: number; closesAt: string | null; createdAt: string;
  futarchyProposalAddress: string | null;
}

const KIND_FILTERS: Array<{ key: ProposalKind | "all"; label: string; icon: string }> = [
  { key: "all", label: "All", icon: "lucide:layers" },
  { key: "spend", label: "Spend", icon: "lucide:banknote" },
  { key: "param", label: "Param", icon: "lucide:sliders-horizontal" },
  { key: "mint", label: "Mint", icon: "lucide:coins" },
  { key: "metadata", label: "Metadata", icon: "lucide:file-edit" },
  { key: "liquidity", label: "Liquidity", icon: "lucide:waves" },
  { key: "perf", label: "Perf", icon: "lucide:trophy" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  live: { bg: "bg-accent/10 border-accent/30", text: "text-accent", label: "LIVE" },
  draft: { bg: "bg-white/[0.04] border-card-border", text: "text-muted", label: "DRAFT" },
  submitted: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", label: "SUBMITTED" },
  resolving: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", label: "RESOLVING" },
  passed: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", label: "PASSED" },
  failed: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "FAILED" },
  resolved: { bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-400", label: "RESOLVED" },
  executed: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", label: "EXECUTED" },
  measured: { bg: "bg-cyan-500/10 border-cyan-500/30", text: "text-cyan-400", label: "MEASURED" },
  cancelled: { bg: "bg-white/[0.04] border-card-border", text: "text-muted", label: "CANCELLED" },
};

const RESOLUTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  trading: { bg: "bg-accent/10 border-accent/30", text: "text-accent", label: "Trading" },
  passed: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", label: "Passed" },
  failed: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "Failed" },
  executed: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", label: "Executed" },
};

function getAuthHeaders(authToken: string | null): Record<string, string> {
  const t = authToken || getToken() || getSessionToken();
  const h: Record<string, string> = { Accept: "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/* ── LivePrices — reads on-chain AMM for correct pass/fail prices ── */

function LivePrices({
  futarchyProposalAddress,
}: {
  futarchyProposalAddress: string | null;
}) {
  const daoCtx = useDaoContext();
  const onchain = useOnchainProposalState(
    futarchyProposalAddress,
    daoCtx.ctx?.usdcMint?.toBase58(),
  );

  if (onchain.loading || (!onchain.found && onchain.passPrice === 0.5)) {
    return <span className="text-muted text-xs animate-pulse">loading…</span>;
  }

  return (
    <>
      <span className="text-xs font-mono text-green-400">{onchain.passPrice.toFixed(2)}</span>
      <span className="text-muted mx-1 text-xs">/</span>
      <span className="text-xs font-mono text-red-400">{onchain.failPrice.toFixed(2)}</span>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

export default function MarketProposalsPage() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const { token } = useAuth();
  const [filter, setFilter] = useState<ProposalKind | "all">("all");
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!current?.slug || current.id === "__loading__") return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/v1/markets/${current.slug}/proposals?page=1&pageSize=100`, {
      headers: getAuthHeaders(token),
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => { if (!cancelled) setProposals(data.items ?? []); })
      .catch(() => { if (!cancelled) setProposals([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [current?.slug, current?.id, token]);

  const filtered = useMemo(
    () => filter === "all" ? proposals : proposals.filter((p) => p.kind === filter),
    [filter, proposals],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: proposals.length };
    for (const p of proposals) c[p.kind] = (c[p.kind] ?? 0) + 1;
    return c;
  }, [proposals]);

  const allowedKinds = useMemo(() => {
    const types = proposalTypesFor();
    return new Set(types.map((t) => t.id));
  }, []);

  const visibleFilters = useMemo(
    () => KIND_FILTERS.filter((k) => k.key === "all" || allowedKinds.has(k.key)),
    [allowedKinds],
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">{current?.name || "Market"} / Proposals</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">All proposals.</h1>
          <p className="text-muted mt-1">Filter by type or status. Click any row to view.</p>
        </div>
        <AdminOnly>
          <button onClick={() => router.push("/market/create-start")}
            className="bg-accent hover:bg-accent-dark text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 cursor-pointer">
            <Icon icon="lucide:plus" width={18} height={18} />
            New proposal
          </button>
        </AdminOnly>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {visibleFilters.map((k) => {
          const active = filter === k.key;
          return (
            <button key={k.key} onClick={() => setFilter(k.key)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                active ? "bg-accent/10 border-accent/30 text-accent"
                       : "bg-card border-card-border text-muted hover:border-white/20"
              }`}>
              <Icon icon={k.icon} width={12} height={12} />
              {k.label}
              {!loading && <span className="text-[10px] opacity-70">({counts[k.key] ?? 0})</span>}
            </button>
          );
        })}
      </div>

      {/* Active proposal banner */}
      {!loading && (() => {
        const active = proposals.find((p) => p.status === "live");
        if (!active) return null;
        const timeLeft = active.closesAt ? formatTimeRemaining(active.closesAt) : null;
        return (
          <div className="mb-4 p-3 rounded-xl border border-accent/20 bg-accent/[0.04] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 text-xs">
              <span className="text-accent font-semibold">Active market:</span>{" "}
              <span className="text-white">{active.title}</span>
              {timeLeft && <span className="text-muted ml-2 font-mono">· closes {timeLeft}</span>}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-accent/60 bg-accent/10 px-2 py-0.5 rounded shrink-0">
              New proposals locked
            </span>
          </div>
        );
      })()}

      {/* Proposals panel */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 border-b border-card-border">
          {["Proposal", "Type", "Objective", "Status", "Pass / Fail", "Resolution"].map((h) => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted">{h}</span>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="p-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-card-border rounded-xl animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/[0.04] rounded w-2/3" />
                  <div className="h-2 bg-white/[0.03] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Icon icon="lucide:file-text" width={24} height={24} className="text-muted" />
            </div>
            <p className="text-white font-medium text-sm mb-1">
              {proposals.length === 0 ? "No proposals yet" : "No matching proposals"}
            </p>
            <p className="text-muted/60 text-xs">
              {proposals.length === 0
                ? "Create your first proposal to put a decision in front of the market."
                : "Try a different filter."}
            </p>
          </div>
        )}

        {/* Rows */}
        {!loading && filtered.length > 0 && (
          <div className="p-3 space-y-2">
            {filtered.map((p) => {
              const passed = p.status === "resolved" && p.passTwap > p.failTwap + p.passMarginPct / 100;
              const statusKey = p.status === "resolved" ? (passed ? "passed" : "failed") : p.status;
              const st = STATUS_STYLES[statusKey] || STATUS_STYLES.draft;
              const kindFilter = KIND_FILTERS.find((k) => k.key === p.kind);

              // Resolution badge logic
              let resolution: { bg: string; text: string; label: string } | null = null;
              if (p.status === "live") resolution = RESOLUTION_STYLES.trading;
              else if (p.status === "resolved" && passed) resolution = RESOLUTION_STYLES.passed;
              else if (p.status === "resolved") resolution = RESOLUTION_STYLES.failed;
              else if (p.status === "executed") resolution = RESOLUTION_STYLES.executed;

              return (
                <div key={p.id}
                  onClick={() => {
                    if (p.status === "draft" || p.status === "submitted") {
                      router.push(`/market/proposals/launching?proposalId=${p.id}&resume=true`);
                    } else {
                      router.push(`/market/proposals/${p.id}`);
                    }
                  }}
                  className="flex items-center gap-3 p-3 bg-white/[0.02] border border-card-border rounded-xl hover:border-accent/40 hover:bg-white/[0.04] transition-all cursor-pointer">

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                    <Icon icon={kindFilter?.icon || "lucide:file-text"} width={18} height={18} className="text-accent" />
                  </div>

                  {/* Title + objective */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{p.title}</p>
                    <p className="text-[11px] text-muted/60 truncate">
                      {p.objectiveIcon && `${p.objectiveIcon} `}{p.objectiveName || p.objectiveId}
                    </p>
                  </div>

                  {/* Type badge */}
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-accent bg-accent/[0.06] px-1.5 py-0.5 rounded shrink-0">
                    {kindFilter && <Icon icon={kindFilter.icon} width={10} height={10} />}
                    {p.kind.toUpperCase()}
                  </span>

                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${st.bg} ${st.text} shrink-0`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {st.label}
                  </span>

                  {/* Time remaining for live proposals */}
                  {p.status === "live" && p.closesAt && (
                    <span className="text-[10px] font-mono text-muted/50 shrink-0 hidden sm:inline">
                      {formatTimeRemaining(p.closesAt)}
                    </span>
                  )}

                  {/* Pass/Fail — live on-chain prices */}
                  <div className="text-right shrink-0 hidden md:block">
                    <LivePrices
                      futarchyProposalAddress={p.futarchyProposalAddress}
                    />
                  </div>

                  {/* Resolution */}
                  <div className="shrink-0 hidden lg:block w-20 text-right">
                    {resolution ? (
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${resolution.bg} ${resolution.text}`}>
                        {resolution.label}
                      </span>
                    ) : p.status === "draft" ? (
                      <span className="text-[11px] text-accent font-semibold">Resume →</span>
                    ) : p.status === "submitted" ? (
                      <span className="text-[11px] text-accent font-semibold">Resume →</span>
                    ) : p.status === "cancelled" ? (
                      <span className="text-[11px] text-muted">Cancelled</span>
                    ) : (
                      <span className="text-[11px] text-muted">{p.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeRemaining(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "closed";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
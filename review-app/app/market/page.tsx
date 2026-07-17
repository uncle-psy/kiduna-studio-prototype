"use client";

/**
 * Market Dashboard — Kinship Studio theme.
 *
 * Stats from GET /api/v1/markets/{slug} (treasury from blockchain).
 * Open proposals from GET /api/v1/markets/{slug}/proposals?status=live.
 * All styled with Kinship Studio Tailwind tokens — no separate CSS file.
 */

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";
import { getToken, getSessionToken } from "@/lib/auth";
import { AdminOnly } from "@/components/market/AdminOnly";
import { useOnchainProposalState } from "@/lib/onchain/read-proposal-state";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import type { ProposalKind } from "@/lib/proposal-types";

/* ── Types ─────────────────────────────────────────────────────────── */

interface StatCard { label: string; value: string; delta?: string; icon: string; }

interface OpenProposal {
  id: string; title: string; objective: string; kind: string;
  closesIn: string;
  futarchyProposalAddress: string | null;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatCountdown(closesAt: string | null): string {
  if (!closesAt) return "—";
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "closed";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

function formatUsd(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

function getAuthHeaders(authToken: string | null): Record<string, string> {
  const t = authToken || getToken() || getSessionToken();
  const h: Record<string, string> = { Accept: "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

const KIND_ICONS: Record<string, string> = {
  spend: "lucide:banknote", param: "lucide:sliders-horizontal",
  mint: "lucide:coins", metadata: "lucide:file-edit",
  liquidity: "lucide:waves", perf: "lucide:trophy",
};

/* ── LivePrices — reads on-chain AMM for correct pass/fail prices ── */

function LivePrices({ futarchyProposalAddress }: {
  futarchyProposalAddress: string | null;
}) {
  const daoCtx = useDaoContext();
  const onchain = useOnchainProposalState(
    futarchyProposalAddress,
    daoCtx.ctx?.usdcMint?.toBase58(),
  );

  // Show loader until on-chain values arrive (loading=true or still at default 0.5)
  if (onchain.loading || (!onchain.found && onchain.passPrice === 0.5)) {
    return <span className="text-muted text-xs animate-pulse">loading…</span>;
  }

  return (
    <>
      <span className="text-green-400">{onchain.passPrice.toFixed(2)}</span>
      <span className="text-muted mx-1">/</span>
      <span className="text-red-400">{onchain.failPrice.toFixed(2)}</span>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

function DashboardInner() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const { token } = useAuth();

  const [stats, setStats] = useState<StatCard[]>([]);
  const [proposals, setProposals] = useState<OpenProposal[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);

  const isReady = current?.slug && current.id !== "__loading__";
  const newProposalHref = `/market/create-start`;

  /* ── Fetch stats ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    setLoadingStats(true);

    fetch(`/api/v1/markets/${current.slug}`, { headers: getAuthHeaders(token) })
      .then((r) => (r.ok ? r.json() : null))
      .then((resp) => {
        if (cancelled || !resp) { setLoadingStats(false); return; }
        const data = resp.market ?? resp;

        const cards: StatCard[] = [
          {
            label: "Treasury available",
            value: data.treasuryUsd != null ? formatUsd(data.treasuryUsd) : "—",
            delta: data.treasuryUsd != null ? undefined : (data.launchStatus === "live" ? "No funds yet" : "Launch required"),
            icon: "lucide:wallet",
          },
          {
            label: "Open proposals",
            value: String(data.openProposalsCount ?? 0),
            icon: "lucide:vote",
          },
          {
            label: "Token",
            value: data.tokenTicker ? `${data.tokenTicker}` : "—",
            icon: "lucide:coins",
          },
          {
            label: "Active citizens",
            value: String(data.memberCount ?? 0),
            icon: "lucide:users",
          },
        ];
        setStats(cards);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingStats(false); });

    return () => { cancelled = true; };
  }, [current?.slug, current?.id, token, isReady]);

  /* ── Fetch proposals ──────────────────────────────────────────── */
  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    setLoadingProposals(true);

    fetch(`/api/v1/markets/${current.slug}/proposals?status=live&page=1&pageSize=10`, {
      headers: getAuthHeaders(token),
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (cancelled) return;
        setProposals((data.items ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          objective: p.objectiveName || p.objectiveId || "—",
          kind: p.kind,
          closesIn: formatCountdown(p.closesAt),
          futarchyProposalAddress: p.futarchyProposalAddress ?? null,
        })));
      })
      .catch(() => { if (!cancelled) setProposals([]); })
      .finally(() => { if (!cancelled) setLoadingProposals(false); });

    return () => { cancelled = true; };
  }, [current?.slug, current?.id, token, isReady]);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">{current.name} / Dashboard</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Where things stand.</h1>
          </div>
          <p className="text-muted mt-1">Your open proposals, in-flight executors, and treasury at a glance.</p>
        </div>
        <AdminOnly>
          <button
            onClick={() => router.push(newProposalHref)}
            className="bg-accent hover:bg-accent-dark text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Icon icon="lucide:plus" width={18} height={18} />
            New proposal
          </button>
        </AdminOnly>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {loadingStats ? (
          <>
            {["Treasury available", "Open proposals", "Token", "Active citizens"].map((label) => (
              <div key={label} className="bg-card border border-card-border rounded-xl p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04]" />
                </div>
                <div className="h-8 w-20 bg-white/[0.06] rounded-lg" />
              </div>
            ))}
          </>
        ) : (
          stats.map((s, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{s.label}</span>
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Icon icon={s.icon} width={16} height={16} className="text-accent" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              {s.delta && <p className="text-xs text-accent mt-1">{s.delta}</p>}
            </div>
          ))
        )}
      </div>

      {/* ── Proposals + In flight ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Open proposals */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-card-border">
            <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:vote" width={18} height={18} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Open proposals</h2>
              <p className="text-[11px] text-muted">Markets currently trading.</p>
            </div>
          </div>

          <div className="p-3">
            {loadingProposals ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-card-border rounded-xl animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-3/4 bg-white/[0.06] rounded" />
                      <div className="h-3 w-1/3 bg-white/[0.04] rounded" />
                    </div>
                    <div className="text-right shrink-0 space-y-2">
                      <div className="h-3 w-16 bg-white/[0.06] rounded ml-auto" />
                      <div className="h-3 w-10 bg-white/[0.04] rounded ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                  <Icon icon="lucide:vote" width={22} height={22} className="text-muted" />
                </div>
                <p className="text-white font-medium text-sm mb-1">No open proposals</p>
                <p className="text-muted/60 text-xs mb-4">Start one to put a decision in front of the market.</p>
                <AdminOnly>
                  <button
                    onClick={() => router.push(newProposalHref)}
                    className="px-4 py-2 rounded-lg text-xs font-medium border bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 transition-colors cursor-pointer"
                  >
                    + New proposal
                  </button>
                </AdminOnly>
              </div>
            ) : (
              <div className="space-y-2">
                {proposals.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/market/proposals/${p.id}`)}
                    className="flex items-center gap-3 p-3 bg-white/[0.02] border border-card-border rounded-xl hover:border-accent/40 hover:bg-white/[0.04] transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                      <Icon icon={KIND_ICONS[p.kind] || "lucide:file-text"} width={16} height={16} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{p.title}</p>
                      <p className="text-[11px] text-muted">under {p.objective}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs">
                        <LivePrices
                          futarchyProposalAddress={p.futarchyProposalAddress}
                        />
                      </p>
                      <p className="text-[10px] text-muted">{p.closesIn}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* In flight */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-card-border">
            <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:rocket" width={18} height={18} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">In flight</h2>
              <p className="text-[11px] text-muted">Passed proposals being carried out.</p>
            </div>
          </div>

          <div className="p-3">
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Icon icon="lucide:rocket" width={22} height={22} className="text-muted" />
              </div>
              <p className="text-white font-medium text-sm mb-1">Nothing in flight</p>
              <p className="text-muted/60 text-xs">When a proposal passes, the assigned executor's run will appear here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Loading dashboard...</p>
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}
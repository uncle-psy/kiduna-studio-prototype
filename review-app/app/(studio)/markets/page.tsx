"use client";

/**
 * Markets listing page — v3 (Kinship Studio theme aligned).
 *
 * Design system tokens used (from globals.css + Empower/Agents pages):
 *   bg-card, border-card-border, rounded-xl, rounded-2xl
 *   bg-accent/15, text-accent, bg-accent hover:bg-accent-dark
 *   bg-input, bg-white/[0.04], bg-white/[0.06], bg-white/[0.08]
 *   text-white, text-muted, text-foreground
 *   text-[10px] font-bold uppercase tracking-wider (badge pattern)
 *   w-10 h-10 rounded-xl bg-accent/15 (icon container pattern)
 *   hover:border-accent/50 (card hover pattern)
 *   px-4 py-3 rounded-xl border border-card-border (list-item pattern)
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";

/* ── Types ─────────────────────────────────────────────────────────── */
interface MarketSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  tokenTicker: string | null;
  launchStatus: "draft" | "initialized" | "fundraising" | "closed" | "settling" | "launching" | "live" | "refunding" | "failed" | "cancelled";
  memberCount: number;
  openProposalsCount: number;
  treasuryUsd: number | null;
  createdAt: string;
}

interface PageResponse {
  items: MarketSummary[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/* ── Constants ──────────────────────────────────────────────────────── */
const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Draft" },
  { value: "fundraising", label: "Fundraising" },
  { value: "launching", label: "Launching" },
  { value: "closed", label: "Closed" },
  { value: "failed", label: "Failed" },
] as const;

const LAUNCH_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-white/[0.06]", text: "text-white/50", label: "Draft" },
  initialized: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Ready" },
  fundraising: { bg: "bg-green-500/15", text: "text-green-400", label: "Fundraising" },
  closed: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Closed" },
  settling: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Settling" },
  launching: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Launching" },
  live: { bg: "bg-accent/15", text: "text-accent", label: "Live" },
  refunding: { bg: "bg-red-500/15", text: "text-red-400", label: "Refunding" },
  failed: { bg: "bg-red-500/15", text: "text-red-400", label: "Failed" },
  cancelled: { bg: "bg-white/[0.06]", text: "text-white/40", label: "Cancelled" },
};

/* ── Helpers ────────────────────────────────────────────────────────── */
function formatUsd(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "Created today";
  if (days === 1) return "Created yesterday";
  if (days < 30) return `Created ${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Created 1mo ago" : `Created ${months}mo ago`;
}

/* ════════════════════════════════════════════════════════════════════ */

export default function MarketsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  // Data
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Filters & pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<MarketSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Total pages derived from server response
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Range label: "Showing 1–10 of 15"
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  /* ── Debounce search ──────────────────────────────────────────── */
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  /* ── Fetch markets ────────────────────────────────────────────── */
  const fetchMarkets = useCallback(async () => {
    if (authLoading || !token) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);

      const res = await fetch(`/api/v1/markets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error?.message || `Failed (${res.status})`);
      }

      const data: PageResponse = await res.json();
      setMarkets(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
      setInitialFetchDone(true);
    }
  }, [authLoading, token, page, debouncedSearch, statusFilter]);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setLoading(false);
      setError("Please log in to view your markets.");
      return;
    }

    fetchMarkets();
  }, [fetchMarkets, authLoading, token]);

  function handleRowClick(m: MarketSummary) {
    switch (m.launchStatus) {
      case "live":
        router.push(`/market?id=${m.id}`);
        break;
      case "draft":
        router.push(`/markets/create/review?resume=${m.slug}`);
        break;
      case "launching":
        router.push(`/markets/create/launching?slug=${m.slug}`);
        break;
      default:
        // initialized, fundraising, closed, settling, refunding, failed, cancelled
        router.push(`/launchpad/${m.slug}`);
        break;
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/markets/${encodeURIComponent(deleteTarget.slug)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error?.message || `Delete failed (${res.status})`);
      }
      setDeleteTarget(null);
      // Refresh the list
      fetchMarkets();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete market.");
    } finally {
      setDeleting(false);
    }
  }

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="max-w-full overflow-hidden">
      {/* ── Header (matches Empower/Agents pattern) ────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Markets</h1>
          <p className="text-muted mt-1">
            {!initialFetchDone
              ? "Loading..."
              : `${total} market${total !== 1 ? "s" : ""}${statusFilter !== "all" ? ` (${statusFilter})` : ""}`}
          </p>
        </div>
        <button
          onClick={() => router.push("/markets/create?new=1")}
          className="bg-accent hover:bg-accent-dark text-black font-semibold px-5 py-2.5 rounded-[4px] transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon icon="lucide:plus" width={18} height={18} />
          New Market
        </button>
      </div>

      {/* ── Skeleton loader (initial load only) ── */}
      {!initialFetchDone && (loading || authLoading) && (
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-card-border">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-white/[0.06] rounded animate-pulse" />
              <div className="h-3 w-40 bg-white/[0.04] rounded animate-pulse" />
            </div>
          </div>
          <div className="p-2 sm:p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 sm:p-4 bg-white/[0.02] border border-card-border rounded-xl animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 w-2/3 bg-white/[0.06] rounded" />
                  <div className="h-3 w-1/3 bg-white/[0.04] rounded" />
                </div>
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  <div className="h-4 w-12 bg-white/[0.04] rounded" />
                  <div className="h-4 w-12 bg-white/[0.04] rounded" />
                  <div className="h-4 w-16 bg-white/[0.04] rounded" />
                </div>
                <div className="h-8 w-16 bg-white/[0.04] rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Error (matches Empower) ────────────────────────────── */}
      {!authLoading && error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-4">
            <Icon icon="lucide:alert-circle" width={32} height={32} className="text-red-400" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">Failed to load markets</h3>
          <p className="text-muted text-sm mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); location.reload(); }}
            className="px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Toolbar + List + Pagination ─────────────────────────────
           Mounted once after the first fetch completes and never unmounted.
           All states (data, empty filter results, no markets) render INSIDE
           the rows area to prevent layout shifts on filter changes.
      ──────────────────────────────────────────────────────────────── */}
      {initialFetchDone && !error && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            {/* Status filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      active
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-card border-card-border text-muted hover:text-white hover:border-white/20"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Icon
                icon="lucide:search"
                width={16}
                height={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search markets..."
                className="w-full sm:w-72 bg-input border border-card-border rounded-xl pl-10 pr-4 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          {/* ── Market list ──────────────────────────────────────── */}
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-card-border">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <Icon icon="lucide:landmark" width={20} height={20} className="text-accent" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">Markets</h2>
                <p className="text-xs text-muted">Your team decision markets</p>
              </div>
            </div>

            {/* Rows — all states handled inline to prevent container unmount */}
            <div className="p-2 sm:p-3">
              {markets.length > 0 ? (
                /* ── Has rows: show them, dim during refetch ──── */
                <div className={`space-y-2 transition-opacity duration-150 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                  {markets.map((m) => (
                    <MarketRow
                      key={m.id}
                      market={m}
                      onClick={() => handleRowClick(m)}
                      onDelete={() => setDeleteTarget(m)}
                    />
                  ))}
                </div>
              ) : loading ? (
                /* ── Empty + loading: skeleton rows ──────────── */
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 sm:p-4 bg-white/[0.02] border border-card-border rounded-xl animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 w-2/3 bg-white/[0.06] rounded" />
                        <div className="h-3 w-1/3 bg-white/[0.04] rounded" />
                      </div>
                      <div className="hidden sm:flex items-center gap-4 shrink-0">
                        <div className="h-4 w-12 bg-white/[0.04] rounded" />
                        <div className="h-4 w-12 bg-white/[0.04] rounded" />
                        <div className="h-4 w-16 bg-white/[0.04] rounded" />
                      </div>
                      <div className="h-8 w-16 bg-white/[0.04] rounded-lg shrink-0" />
                    </div>
                  ))}
                </div>
              ) : debouncedSearch ? (
                /* ── Empty because of search ─────────────────── */
                <div className="text-center py-10">
                  <p className="text-muted text-sm">
                    No markets found matching &ldquo;{debouncedSearch}&rdquo;{statusFilter !== "all" ? ` in ${statusFilter}` : ""}
                  </p>
                </div>
              ) : (
                /* ── No live markets at all ───────────────────── */
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-card-border flex items-center justify-center mb-4">
                    <Icon icon="lucide:landmark" width={32} height={32} className="text-accent" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">No Markets yet</h3>
                  <p className="text-muted text-sm max-w-sm mb-5">
                    Create your first Market to start making decisions with your team.
                  </p>
                  <button
                    onClick={() => router.push("/markets/create?new=1")}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-black font-semibold rounded-[4px] transition-colors cursor-pointer"
                  >
                    + Create your first Market
                  </button>
                </div>
              )}
            </div>

            {/* ── Pagination footer ────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-card-border">
                <p className="text-xs text-muted">
                  Showing {rangeStart}–{rangeEnd} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="px-3 py-1.5 text-xs font-medium bg-input border border-card-border rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-muted tabular-nums px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="px-3 py-1.5 text-xs font-medium bg-input border border-card-border rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Delete confirmation modal ──────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-5 sm:p-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center mb-4">
                <Icon icon="lucide:trash-2" width={24} height={24} className="text-red-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Delete market</h3>
              <p className="text-muted text-sm leading-relaxed">
                Are you sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>?
                This will deactivate the market and all its objectives. This action can be reversed by contacting support.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-card-border">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-foreground hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Market row — styled like Empower tool row                         */
/* ═══════════════════════════════════════════════════════════════════ */

function MarketRow({
  market: m,
  onClick,
  onDelete,
}: {
  market: MarketSummary;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 sm:p-4 bg-white/[0.02] border border-card-border rounded-xl hover:border-accent/50 hover:bg-white/[0.04] transition-all cursor-pointer group"
    >
      {/* ── Avatar ─────────────────────────────────────────── */}
      <LogoOrFallback logoUrl={m.logoUrl} name={m.name} status={m.launchStatus} />

      {/* ── Info ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white text-sm font-medium truncate">{m.name}</p>
          {m.tokenTicker && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
              ${m.tokenTicker}
            </span>
          )}
          {/* Type badge */}
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-400"
          >
            Token
          </span>
          {/* Launch status badge */}
          {(() => {
            const st = LAUNCH_STATUS_STYLES[m.launchStatus] || LAUNCH_STATUS_STYLES.draft;
            return (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${st.bg} ${st.text}`}>
                {st.label}
              </span>
            );
          })()}
        </div>
        <p className="text-xs text-muted mt-0.5 truncate">
          {m.description && m.description !== m.name
            ? m.description
            : timeAgo(m.createdAt)}
        </p>
      </div>

      {/* ── Stats (compact, right side) ────────────────────── */}
      <div className="hidden sm:flex items-center gap-4 shrink-0">
        <StatChip
          icon="lucide:users"
          value={m.memberCount}
          label="citizens"
        />
        <StatChip
          icon="lucide:vote"
          value={m.openProposalsCount}
          label="open"
          highlight={m.openProposalsCount > 0}
        />
        <StatChip
          icon="lucide:wallet"
          value={formatUsd(m.treasuryUsd)}
          label="treasury"
        />
      </div>

      {/* ── Action button ──────────────────────────────────── */}
      <button
        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-shrink-0 flex items-center gap-1.5 ${
          m.launchStatus === "live"
            ? "bg-accent/10 text-accent border-accent/30 hover:bg-accent/20"
            : "bg-white/[0.04] text-muted border-card-border hover:text-white hover:border-white/20"
        }`}
      >
        {m.launchStatus === "live" ? "Enter" :
         m.launchStatus === "draft" ? "Resume" :
         m.launchStatus === "launching" ? "Continue" :
         m.launchStatus === "fundraising" ? "View ICO" :
         "View"}
      </button>

      {/* ── Delete button ──────────────────────────────────── */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1.5 rounded-lg text-muted/40 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
        title="Delete market"
      >
        <Icon icon="lucide:trash-2" width={15} height={15} />
      </button>

      {/* ── Chevron ────────────────────────────────────────── */}
      <Icon
        icon="lucide:chevron-right"
        width={18}
        height={18}
        className="text-muted group-hover:text-accent transition-colors shrink-0"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Sub-components                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function StatChip({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: string;
  value: string | number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center min-w-[48px]">
      <div className={`text-sm font-semibold tabular-nums ${highlight ? "text-accent" : "text-white"}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted/60">{label}</div>
    </div>
  );
}

function LogoOrFallback({
  logoUrl,
  name,
  status,
}: {
  logoUrl: string | null;
  name: string;
  status: string;
}) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt=""
        onError={() => setFailed(true)}
        className="w-10 h-10 rounded-xl object-cover border border-card-border shrink-0"
      />
    );
  }

  // Match the Empower/Agents icon container pattern:
  // accent tint for live, neutral for others
  const isLive = status === "live";
  return (
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        isLive
          ? "bg-accent/15"
          : "bg-white/[0.06]"
      }`}
    >
      <span className={`text-sm font-bold ${isLive ? "text-accent" : "text-white/60"}`}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
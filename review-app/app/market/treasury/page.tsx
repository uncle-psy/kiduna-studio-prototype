"use client";

/**
 * Treasury page — on-chain balance, monthly allowance, SOL balance,
 * reserved funds, and transaction history.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";
import { getToken, getSessionToken } from "@/lib/auth";
import { AdminOnly } from "@/components/market/AdminOnly";
import { QuickSendModal } from "@/components/market/QuickSendModal";

/* ── Types ──────────────────────────────────────────────────────────── */

interface TreasuryBalance {
  multisigAddress: string | null;
  availableUsd: number;
  reservedUsd: number;
  totalUsd: number;
  solBalance: number | null;
  monthlyBudgetUsdc: number | null;
  spendingLimitConfigured: boolean;
  spendingLimitTotal: number | null;
  spendingLimitRemaining: number | null;
  indexerStatus: "live" | "pending" | "error";
}

interface TreasuryMovement {
  id: string;
  kind: string;
  label: string;
  amountUsd: number;
  direction: "in" | "out";
  txSignature: string | null;
  proposalId: string | null;
  at: string;
}

interface MovementsResponse {
  items: TreasuryMovement[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function getAuthHeaders(authToken: string | null): Record<string, string> {
  const t = authToken || getToken() || getSessionToken();
  const h: Record<string, string> = { Accept: "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

function formatUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatSol(n: number | null): string {
  if (n == null) return "—";
  return `${n.toFixed(3)} SOL`;
}

function shortSig(sig: string): string {
  return `${sig.slice(0, 8)}…${sig.slice(-6)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const EXPLORER_BASE = "https://explorer.solana.com";

function explorerUrl(type: "address" | "tx", value: string): string {
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "";
  let cluster = "";

  if (rpc.includes("mainnet") || rpc.includes("mainnet-beta")) {
    cluster = "";
  } else if (rpc.includes("devnet")) {
    cluster = "?cluster=devnet";
  } else if (rpc.includes("testnet")) {
    cluster = "?cluster=testnet";
  } else if (rpc) {
    cluster = "?cluster=custom&customUrl=" + encodeURIComponent(rpc);
  }

  return `${EXPLORER_BASE}/${type}/${value}${cluster}`;
}

/* ── Movement kind → icon + color mapping ──────────────────────────── */

function movementStyle(kind: string, direction: "in" | "out") {
  switch (kind) {
    case "spend":
      return { icon: "lucide:arrow-up-right", bg: "bg-red-500/15", fg: "text-red-400" };
    case "ico-fund":
      return { icon: "lucide:arrow-down-left", bg: "bg-green-500/15", fg: "text-green-400" };
    case "ico-refund":
      return { icon: "lucide:undo-2", bg: "bg-red-500/15", fg: "text-red-400" };
    case "mint":
      return { icon: "lucide:diamond", bg: "bg-purple-500/15", fg: "text-purple-400" };
    case "quick-send":
      return { icon: "lucide:send", bg: "bg-amber-500/15", fg: "text-amber-400" };
    case "liquidity":
      return direction === "out"
        ? { icon: "lucide:waves", bg: "bg-blue-500/15", fg: "text-blue-400" }
        : { icon: "lucide:waves", bg: "bg-green-500/15", fg: "text-green-400" };
    case "launch":
      return { icon: "lucide:rocket", bg: "bg-accent/15", fg: "text-accent" };
    default:
      return direction === "out"
        ? { icon: "lucide:arrow-up-right", bg: "bg-red-500/15", fg: "text-red-400" }
        : { icon: "lucide:arrow-down-left", bg: "bg-green-500/15", fg: "text-green-400" };
  }
}

/* ── CopyableAddress — click to copy with inline feedback + explorer ── */

function CopyableAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted w-24 shrink-0">{label}</span>

      {/* Address — click to copy */}
      <button
        type="button"
        onClick={handleCopy}
        className="text-xs font-mono px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5 border-none"
        style={{ color: "var(--accent)" }}
      >
        {address}
        <Icon
          icon={copied ? "lucide:check" : "lucide:copy"}
          width={12}
          height={12}
          style={{ color: copied ? "#22c55e" : undefined }}
          className={copied ? "" : "text-muted"}
        />
      </button>

      {/* "Copied!" — green text, inline, no background trickery */}
      {copied && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#22c55e",
            letterSpacing: "0.05em",
          }}
        >
          Copied!
        </span>
      )}

      {/* Explorer link */}
      <a
        href={explorerUrl("address", address)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted hover:text-accent transition-colors shrink-0"
        title="View in explorer"
      >
        <Icon icon="lucide:external-link" width={12} height={12} />
      </a>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

export default function MarketTreasuryPage() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const { token } = useAuth();

  /* ── Treasury balance state ──────────────────────────────────────── */
  const [balance, setBalance] = useState<TreasuryBalance | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [quoteMint, setQuoteMint] = useState<string | null>(null);
  const [balLoading, setBalLoading] = useState(true);
  const [balError, setBalError] = useState<string | null>(null);

  /* ── Movements state ─────────────────────────────────────────────── */
  const [movements, setMovements] = useState<TreasuryMovement[]>([]);
  const [movTotal, setMovTotal] = useState(0);
  const [movHasMore, setMovHasMore] = useState(false);
  const [movPage, setMovPage] = useState(1);
  const [movLoading, setMovLoading] = useState(false);

  /* ── Refresh counter ─────────────────────────────────────────────── */
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── Quick Send modal ────────────────────────────────────────────── */
  const [showQuickSend, setShowQuickSend] = useState(false);

  const slug = current?.slug;

  /* ── Fetch balance ───────────────────────────────────────────────── */
  const fetchBalance = useCallback(async () => {
    if (!slug || current?.id === "__loading__") return;
    setBalLoading(true);
    setBalError(null);

    const headers = getAuthHeaders(token);

    try {
      const [treasuryRes, marketRes] = await Promise.all([
        fetch(`/api/v1/markets/${slug}/treasury`, { headers }),
        fetch(`/api/v1/markets/${slug}`, { headers }),
      ]);

      if (treasuryRes.ok) {
        const data: TreasuryBalance = await treasuryRes.json();
        setBalance(data);
      } else {
        setBalError("Failed to load treasury data.");
      }

      if (marketRes.ok) {
        const resp = await marketRes.json();
        const m = resp?.market ?? resp;
        setVaultAddress(m?.squadsVault || null);
        setQuoteMint(m?.quoteMint || null);

        // Fallback: if treasury endpoint failed but market detail has treasuryUsd
        if (!treasuryRes.ok && m?.treasuryUsd != null) {
          setBalance({
            multisigAddress: m?.multisigAddress || null,
            availableUsd: m.treasuryUsd,
            reservedUsd: 0,
            totalUsd: m.treasuryUsd,
            solBalance: null,
            monthlyBudgetUsdc: null,
            spendingLimitConfigured: false,
            spendingLimitTotal: null,
            spendingLimitRemaining: null,
            indexerStatus: "pending",
          });
          setBalError(null);
        }
      }
    } catch {
      setBalError("Network error — could not reach the server.");
    } finally {
      setBalLoading(false);
    }
  }, [slug, current?.id, token]);

  /* ── Fetch movements ─────────────────────────────────────────────── */
  const fetchMovements = useCallback(async (page: number, append: boolean) => {
    if (!slug) return;
    setMovLoading(true);

    const headers = getAuthHeaders(token);

    try {
      const res = await fetch(
        `/api/v1/markets/${slug}/treasury/movements?page=${page}&pageSize=20`,
        { headers },
      );
      if (res.ok) {
        const data: MovementsResponse = await res.json();
        setMovements((prev) => append ? [...prev, ...data.items] : data.items);
        setMovTotal(data.total);
        setMovHasMore(data.hasMore);
        setMovPage(page);
      }
    } catch {
      // Silent — movements are supplemental
    } finally {
      setMovLoading(false);
    }
  }, [slug, token]);

  /* ── Effects ─────────────────────────────────────────────────────── */
  useEffect(() => {
    fetchBalance();
    fetchMovements(1, false);
  }, [fetchBalance, fetchMovements, refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);
  const handleLoadMore = () => fetchMovements(movPage + 1, true);

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">{current?.name || "Market"} / Treasury</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Treasury.</h1>
          <p className="text-muted mt-1">On-chain treasury balances and transaction history.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Icon icon="lucide:refresh-cw" width={14} height={14} />
            Refresh
          </button>
          <AdminOnly>
            {balance?.monthlyBudgetUsdc && balance?.spendingLimitConfigured && (
              <button
                onClick={() => setShowQuickSend(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-on-accent hover:bg-accent-dark transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Icon icon="lucide:send" width={14} height={14} />
                Quick Send
              </button>
            )}
            <button
              onClick={() => router.push("/market/create-spend")}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Icon icon="lucide:arrow-up-right" width={14} height={14} />
              New spend proposal
            </button>
          </AdminOnly>
        </div>
      </div>

      {/* Error banner */}
      {balError && (
        <div className="mb-4 p-3 rounded-xl text-sm bg-red-500/[0.08] border border-red-500/25 text-red-400 flex items-center gap-2">
          <Icon icon="lucide:alert-circle" width={16} height={16} />
          {balError}
        </div>
      )}

      {/* ─── On-chain vault (moved above stats) ─────────────────────── */}
      {vaultAddress && (
        <div className="mb-5 p-4 rounded-xl bg-white/[0.03] border border-card-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:vault" width={13} height={13} className="text-accent" />
            </div>
            <h3 className="text-white font-bold text-sm">On-chain vault</h3>
          </div>
          <div className="space-y-2">
            <CopyableAddress label="Vault" address={vaultAddress} />
            {quoteMint && (
              <CopyableAddress label="USDC Mint" address={quoteMint} />
            )}
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {/* Available */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Available</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <Icon icon="lucide:wallet" width={16} height={16} className="text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {balLoading ? "…" : formatUsd(balance?.availableUsd)}
          </p>
          <p className="text-xs text-green-400 mt-1">
            {balance?.indexerStatus === "live" ? "On-chain balance" :
             balance?.indexerStatus === "error" ? "Balance unavailable" :
             !vaultAddress ? "Launch your market first" : "Syncing…"}
          </p>
        </div>

        {/* Reserved */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Reserved</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:lock" width={16} height={16} className="text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {balLoading ? "…" : formatUsd(balance?.reservedUsd ?? 0)}
          </p>
          <p className="text-xs text-muted mt-1">In open spend proposals</p>
        </div>

        {/* Monthly allowance */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Monthly Allowance</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:calendar" width={16} height={16} className="text-accent" />
            </div>
          </div>
          {balance?.spendingLimitConfigured && balance?.spendingLimitRemaining != null ? (
            <>
              <p className="text-2xl font-bold text-white">
                {balLoading ? "…" : formatUsd(balance.spendingLimitRemaining)}
              </p>
              <p className="text-xs text-muted mt-1">
                remaining of {formatUsd(balance.spendingLimitTotal ?? balance.monthlyBudgetUsdc ?? 0)} / month
              </p>
              {/* Usage bar */}
              {balance.spendingLimitTotal != null && balance.spendingLimitTotal > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: `${Math.min(100, (balance.spendingLimitRemaining / balance.spendingLimitTotal) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-white">
                {balLoading ? "…" : balance?.monthlyBudgetUsdc ? formatUsd(balance.monthlyBudgetUsdc) : "—"}
              </p>
              <p className="text-xs text-muted mt-1">
                {balance?.monthlyBudgetUsdc ? "Direct spend limit / month" : "No limit set"}
              </p>
            </>
          )}
        </div>

        {/* SOL balance */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Vault SOL</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Icon icon="lucide:fuel" width={16} height={16} className="text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {balLoading ? "…" : formatSol(balance?.solBalance ?? null)}
          </p>
          <p className="text-xs mt-1" style={{
            color: balance?.solBalance != null && balance.solBalance < 0.01 ? "var(--fail)" : "var(--muted)"
          }}>
            {balance?.solBalance != null && balance.solBalance < 0.01
              ? "Low — top up for tx fees"
              : "For transaction fees"}
          </p>
        </div>
      </div>

      {/* Transaction log */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-card-border">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Icon icon="lucide:scroll-text" width={18} height={18} className="text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Transaction log</h2>
            <p className="text-[11px] text-muted">
              {movTotal > 0 ? `${movTotal} transaction${movTotal !== 1 ? "s" : ""}` : "On-chain treasury transactions."}
            </p>
          </div>
        </div>

        {movements.length > 0 ? (
          <div>
            {movements.map((m) => {
              const style = movementStyle(m.kind, m.direction);
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-card-border last:border-b-0 hover:bg-white/[0.02] transition-colors">
                  {/* Direction icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                    <Icon icon={style.icon} width={14} height={14} className={style.fg} />
                  </div>

                  {/* Label + kind badge + time */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white truncate">{m.label}</span>
                      {m.kind !== "spend" && m.kind !== "launch" && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-muted shrink-0">
                          {m.kind.replace("ico-", "")}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted">{timeAgo(m.at)}</div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    {m.amountUsd > 0 && (
                      <div className={`text-sm font-mono font-medium ${
                        m.direction === "out" ? "text-red-400" : "text-green-400"
                      }`}>
                        {m.direction === "out" ? "−" : "+"}${m.amountUsd.toLocaleString()}
                      </div>
                    )}
                    {m.txSignature && (
                      <a href={explorerUrl("tx", m.txSignature)} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-mono text-muted hover:text-accent transition-colors">
                        {shortSig(m.txSignature)}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Load more */}
            {movHasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={movLoading}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-card-border text-muted hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {movLoading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </div>
        ) : movLoading ? (
          <div className="text-center py-12">
            <p className="text-muted text-sm">Loading transactions…</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Icon icon="lucide:scroll-text" width={24} height={24} className="text-muted" />
            </div>
            <p className="text-white font-medium text-sm mb-1">No transactions yet</p>
            <p className="text-muted/60 text-xs">Treasury transactions will appear here as proposals are executed.</p>
          </div>
        )}
      </div>

      {/* Quick Send modal */}
      <QuickSendModal
        open={showQuickSend}
        onClose={() => setShowQuickSend(false)}
        onSuccess={() => {
          setShowQuickSend(false);
          setRefreshKey((k) => k + 1);
        }}
        monthlyBudgetUsdc={balance?.monthlyBudgetUsdc ?? null}
        spendingLimitTotal={balance?.spendingLimitTotal ?? null}
        spendingLimitRemaining={balance?.spendingLimitRemaining ?? null}
      />
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";
import { getToken, getSessionToken } from "@/lib/auth";

/* ── Helpers ────────────────────────────────────────────────────────── */

function getAuthHeaders(authToken: string | null): Record<string, string> {
  const t = authToken || getToken() || getSessionToken();
  const h: Record<string, string> = { Accept: "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/* ════════════════════════════════════════════════════════════════════ */

export default function MarketTokensPage() {
  const { current } = useCurrentMarket();
  const { token } = useAuth();

  const [ticker, setTicker] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!current?.slug || current.id === "__loading__") return;
    setLoading(true);

    fetch(`/api/v1/markets/${current.slug}`, { headers: getAuthHeaders(token) })
      .then((r) => (r.ok ? r.json() : null))
      .then((resp) => {
        const data = resp?.market ?? resp;
        if (data) {
          setTicker(data.tokenTicker || null);
          setMintAddress(data.tokenMintAddress || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [current?.slug, current?.id, token]);

  const tokenName = ticker ? `$${ticker}` : "Market Token";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted mb-1">{current?.name || "Market"} / Tokens & vesting</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{tokenName} token & vesting.</h1>
        <p className="text-muted mt-1">Supply overview, active vesting packages, mint history.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Total supply</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:coins" width={16} height={16} className="text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{loading ? "..." : "—"}</p>
          <p className="text-xs text-muted mt-1">From on-chain mint</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">In vesting</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Icon icon="lucide:lock" width={16} height={16} className="text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-muted mt-1">Locked in vesting</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Circulating</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <Icon icon="lucide:repeat" width={16} height={16} className="text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-muted mt-1">Liquid supply</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Price (TWAP)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Icon icon="lucide:trending-up" width={16} height={16} className="text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-muted mt-1">30-day average</p>
        </div>
      </div>

      {/* Token info card */}
      {mintAddress && (
        <div className="mb-5 p-4 rounded-xl bg-white/[0.03] border border-card-border">
          <h3 className="text-white font-bold text-sm mb-2">Token details</h3>
          <div className="space-y-1.5">
            {ticker && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted w-24">Ticker</span>
                <span className="text-xs text-white font-medium">{ticker}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted w-24">Mint address</span>
              <code className="text-xs text-foreground bg-white/[0.04] px-2 py-0.5 rounded font-mono">{mintAddress}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted w-24">Type</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                Token-backed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Vesting packages */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden mb-5">
        <div className="flex items-center gap-3 p-4 border-b border-card-border">
          <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <Icon icon="lucide:lock" width={18} height={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Active vesting packages</h2>
            <p className="text-[11px] text-muted">Conditional grants authorized by passed proposals.</p>
          </div>
        </div>
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <Icon icon="lucide:lock" width={24} height={24} className="text-muted" />
          </div>
          <p className="text-white font-medium text-sm mb-1">No vesting packages</p>
          <p className="text-muted/60 text-xs">Vesting packages will appear here when created via performance proposals.</p>
        </div>
      </div>

      {/* Mint history */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-card-border">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Icon icon="lucide:scroll-text" width={18} height={18} className="text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Mint history</h2>
            <p className="text-[11px] text-muted">Token mint events on-chain.</p>
          </div>
        </div>
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <Icon icon="lucide:scroll-text" width={24} height={24} className="text-muted" />
          </div>
          <p className="text-white font-medium text-sm mb-1">No mint events</p>
          <p className="text-muted/60 text-xs">Mint events will appear here as tokens are minted via proposals.</p>
        </div>
      </div>
    </div>
  );
}
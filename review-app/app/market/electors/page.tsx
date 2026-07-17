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

export default function MarketElectorsPage() {
  const { current } = useCurrentMarket();
  const { token } = useAuth();
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!current?.slug || current.id === "__loading__") return;
    setLoading(true);

    fetch(`/api/v1/markets/${current.slug}`, { headers: getAuthHeaders(token) })
      .then((r) => (r.ok ? r.json() : null))
      .then((resp) => {
        const data = resp?.market ?? resp;
        if (data) setMemberCount(data.memberCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [current?.slug, current?.id, token]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted mb-1">{current?.name || "Market"} / Electors</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Your Citizens & their Electors.</h1>
        <p className="text-muted mt-1">
          Every Citizen with standing configures an Elector — an agent with its own value vector that votes on their behalf.
        </p>
      </div>

      {/* Explainer */}
      <div className="mb-5 p-5 rounded-2xl border border-accent/20 bg-accent/[0.04]">
        <h3 className="text-white font-bold text-sm mb-2">Electors vs Executors vs Operators</h3>
        <div className="text-muted text-sm leading-relaxed space-y-1.5">
          <p><span className="text-white font-medium">Electors</span> are on this page. One per Citizen. Each reads proposals, projects the impact on the Objective's value vector, and trades Pass/Fail based on alignment with its Citizen's values.</p>
          <p><span className="text-white font-medium">Operators</span> run Objectives and publish proposals. They don't trade.</p>
          <p><span className="text-white font-medium">Executors</span> do operational work after a proposal passes. They don't trade either.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Electors</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:users" width={16} height={16} className="text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? "..." : memberCount}
          </p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Participation</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:activity" width={16} height={16} className="text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-muted mt-1">Calculated from trades</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Accuracy</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:target" width={16} height={16} className="text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-muted mt-1">Needs resolved proposals</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Stake deployed</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:wallet" width={16} height={16} className="text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-muted mt-1">Across open proposals</p>
        </div>
      </div>

      {/* Electors list */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-card-border">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Icon icon="lucide:users" width={18} height={18} className="text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Elector roster</h2>
            <p className="text-[11px] text-muted">Citizens who have configured voting agents.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin text-muted" />
            <p className="text-muted text-sm">Loading...</p>
          </div>
        ) : memberCount === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Icon icon="lucide:users" width={24} height={24} className="text-muted" />
            </div>
            <p className="text-white font-medium text-sm mb-1">No electors yet</p>
            <p className="text-muted/60 text-xs">When Citizens join this market and configure their voting agents, they'll appear here.</p>
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-muted text-sm">{memberCount} member{memberCount !== 1 ? "s" : ""} in this market.</p>
            <p className="text-muted/60 text-xs mt-1">Individual elector details will be available once the elector API is implemented.</p>
          </div>
        )}
      </div>
    </div>
  );
}
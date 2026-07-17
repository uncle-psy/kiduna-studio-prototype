"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";
import { getToken, getSessionToken } from "@/lib/auth";
import { AdminOnly } from "@/components/market/AdminOnly";

/* ── Types ─────────────────────────────────────────────────────────── */

interface Dimension {
  id: string; slug: string; name: string;
  description: string | null; weightPct: number; position: number;
}

interface Objective {
  id: string; slug: string; name: string;
  description: string | null; icon: string | null;
  allowedProposalKinds: string[];
  dimensions: Dimension[];
}

const DIM_COLORS = [
  "bg-emerald-400", "bg-blue-400", "bg-amber-400",
  "bg-purple-400", "bg-pink-400", "bg-cyan-400",
];

/* ════════════════════════════════════════════════════════════════════ */

export default function MarketObjectivesPage() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const { token, isLoading: authLoading } = useAuth();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch objectives ────────────────────────────────────────────── */
  const fetchObjectives = useCallback(async () => {
    if (!current.slug || current.id === "__loading__") return;
    if (authLoading) return;

    setLoading(true);
    setError(null);

    const t = token || getToken() || getSessionToken();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (t) headers.Authorization = `Bearer ${t}`;

    try {
      const res = await fetch(`/api/v1/markets/${current.slug}/objectives?page=1&pageSize=50`, { headers });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setObjectives(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load objectives.");
    } finally {
      setLoading(false);
    }
  }, [current.slug, current.id, token, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    fetchObjectives();
  }, [fetchObjectives, authLoading]);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Objectives</h1>
          <p className="text-muted mt-1">Each Objective defines how a category of decisions is judged.</p>
        </div>
        <AdminOnly>
          <button onClick={() => router.push("/objectives/create")}
            className="bg-accent hover:bg-accent-dark text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 cursor-pointer">
            <Icon icon="lucide:plus" width={18} height={18} />
            New Objective
          </button>
        </AdminOnly>
      </div>

      {/* Explainer callout */}
      {!authLoading && !loading && (
        <div className="mb-5 p-5 rounded-2xl border border-accent/20 bg-accent/[0.04]">
          <h3 className="text-white font-bold text-sm mb-1">What is an Objective?</h3>
          <p className="text-muted text-sm leading-relaxed">
            An Objective is a scoped area — like "Growth" or "Hiring" — with its own
            definition of success. Proposals under Growth get judged on revenue and user love;
            proposals under Operations get judged on cost and reliability.
          </p>
        </div>
      )}

      {/* Loading */}
      {(authLoading || loading) && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted mt-4">Loading...</p>
        </div>
      )}

      {/* Error */}
      {!authLoading && !loading && error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-4">
            <Icon icon="lucide:alert-circle" width={32} height={32} className="text-red-400" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">Failed to load</h3>
          <p className="text-muted text-sm mb-4">{error}</p>
          <button onClick={fetchObjectives}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 transition-colors cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!authLoading && !loading && !error && objectives.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-accent/15 border border-card-border flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:crosshair" width={36} height={36} className="text-accent" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">No Objectives yet</h3>
          <p className="text-muted text-sm mb-6">Create your first Objective to define how decisions are judged.</p>
          <AdminOnly>
            <button onClick={() => router.push("/objectives/create")}
              className="bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer">
              Create your first Objective
            </button>
          </AdminOnly>
        </div>
      )}

      {/* Objectives list */}
      {!authLoading && !loading && !error && objectives.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-card-border">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:crosshair" width={20} height={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Objectives</h2>
              <p className="text-xs text-muted">{objectives.length} objective{objectives.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {objectives.map((obj) => (
              <div key={obj.id}
                onClick={() => router.push(`/objectives/detail?id=${obj.id}`)}
                className="flex items-center gap-3 p-3 bg-white/[0.02] border border-card-border rounded-xl hover:border-accent/40 hover:bg-white/[0.04] transition-all cursor-pointer">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/15 shrink-0">
                  <Icon icon="lucide:crosshair" width={18} height={18} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">{obj.name}</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent">Active</span>
                  </div>
                  <p className="text-xs text-muted/60">
                    {obj.description || `${obj.dimensions.length} dimensions · ${obj.dimensions.length} dimensions`}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {obj.dimensions.sort((a, b) => a.position - b.position).slice(0, 3).map((d, i) => (
                    <span key={d.id} className="inline-flex items-center gap-1 text-[10px] text-muted bg-white/[0.03] px-1.5 py-0.5 rounded">
                      <span className={`w-1.5 h-1.5 rounded-full ${DIM_COLORS[i % DIM_COLORS.length]}`} />
                      {d.name}
                    </span>
                  ))}
                  {obj.dimensions.length > 3 && (
                    <span className="text-[10px] text-muted/60">+{obj.dimensions.length - 3}</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/objectives/detail?id=${obj.id}`); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 transition-colors flex-shrink-0 cursor-pointer">
                  View
                </button>
              </div>
            ))}

            <AdminOnly>
              <button onClick={() => router.push("/objectives/create")}
                className="w-full py-3 rounded-xl border border-dashed border-card-border text-muted hover:text-accent hover:border-accent/40 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Icon icon="lucide:plus" width={14} height={14} />
                <span className="text-xs">Add Objective</span>
              </button>
            </AdminOnly>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";

/* ── Types ─────────────────────────────────────────────────────────── */

interface DimensionData {
  id: string; slug: string; name: string;
  description: string | null; weightPct: number; position: number;
}

interface ObjectiveData {
  id: string; slug: string; name: string;
  description: string | null; icon: string | null;
  allowedProposalKinds: string[];
  dimensions: DimensionData[];
}

const DIM_COLORS = [
  "bg-emerald-400", "bg-blue-400", "bg-amber-400",
  "bg-purple-400", "bg-pink-400", "bg-cyan-400",
];

/* ════════════════════════════════════════════════════════════════════ */

export default function ObjectivesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();

  const [objectives, setObjectives] = useState<ObjectiveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch objectives directly (standalone endpoint) ─────────────── */
  const fetchObjectives = useCallback(async () => {
    if (authLoading || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/objectives?page=1&pageSize=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load objectives.");
      const data = await res.json();
      setObjectives(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load objectives.");
    } finally { setLoading(false); }
  }, [authLoading, token]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setLoading(false); setError("Please log in."); return; }
    fetchObjectives();
  }, [fetchObjectives, authLoading, token]);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Objectives</h1>
          <p className="text-muted mt-1">Each Objective defines how a category of decisions is judged.</p>
        </div>
        <button onClick={() => router.push("/objectives/create")}
          className="bg-accent hover:bg-accent-dark text-black font-semibold px-5 py-2.5 rounded-[4px] transition-colors flex items-center gap-2 shrink-0 cursor-pointer">
          <Icon icon="lucide:plus" width={18} height={18} />
          New Objective
        </button>
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

      {/* Loading skeleton */}
      {(authLoading || loading) && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <style>{`@keyframes ob-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
          {/* header */}
          <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-card-border">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.07)' }} />
            <div>
              <div style={{ height: 16, width: 88, borderRadius: 5, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />
              <div style={{ height: 11, width: 60, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
            </div>
          </div>
          {/* rows */}
          <div className="p-3 space-y-2" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'ob-shimmer 1.4s ease-in-out infinite', zIndex: 1 }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-card-border rounded-xl">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ height: 14, width: `${45 + i * 8}%`, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />
                  <div style={{ height: 11, width: '35%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  {[0,1,2].map(j => (
                    <div key={j} style={{ height: 20, width: 52, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                </div>
                <div style={{ height: 30, width: 48, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
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
          <button onClick={() => router.push("/objectives/create")}
            className="bg-accent hover:bg-accent-dark text-black font-semibold px-6 py-2.5 rounded-[4px] transition-colors cursor-pointer">
            Create your first Objective
          </button>
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

            <button onClick={() => router.push("/objectives/create")}
              className="w-full py-3 rounded-xl border border-dashed border-card-border text-muted hover:text-accent hover:border-accent/40 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Icon icon="lucide:plus" width={14} height={14} />
              <span className="text-xs">Add Objective</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
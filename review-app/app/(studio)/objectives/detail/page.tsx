"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";

/* ── Types ─────────────────────────────────────────────────────────── */

interface DimensionData {
  id: string; slug: string; name: string;
  description: string | null; weightPct: number; position: number;
}

interface ObjectiveDetail {
  id: string; slug: string; name: string;
  description: string | null; icon: string | null;
  allowedProposalKinds: string[];
  dimensions: DimensionData[];
}

const DIM_COLORS = [
  "#22c55e", "#6aa6ff", "#eb8000", "#a78bfa", "#ec4899", "#06b6d4",
];

const KIND_META: Record<string, { icon: string; label: string }> = {
  spend: { icon: "lucide:banknote", label: "Spend" },
  param: { icon: "lucide:sliders-horizontal", label: "Parameter" },
  mint: { icon: "lucide:coins", label: "Mint" },
  metadata: { icon: "lucide:file-edit", label: "Metadata" },
  liquidity: { icon: "lucide:waves", label: "Liquidity" },
  perf: { icon: "lucide:trophy", label: "Performance" },
};

/* ════════════════════════════════════════════════════════════════════ */

function ObjectiveDetailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const objectiveId = searchParams.get("id");
  const { token, isLoading: authLoading } = useAuth();

  const [objective, setObjective] = useState<ObjectiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch objective ──────────────────────────────────────────────── */
  useEffect(() => {
    if (authLoading || !token || !objectiveId) return;
    (async () => {
      try {
        const res = await fetch(`/api/v1/objectives/${encodeURIComponent(objectiveId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error?.message || `Failed (${res.status})`);
        }
        setObjective(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load objective.");
      } finally { setLoading(false); }
    })();
  }, [authLoading, token, objectiveId]);

  /* ── No ID ────────────────────────────────────────────────────────── */
  if (!objectiveId) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">No objective selected.</p>
        <button onClick={() => router.push("/objectives")}
          className="mt-4 px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors cursor-pointer text-sm">
          Back to Objectives
        </button>
      </div>
    );
  }

  /* ── Loading ──────────────────────────────────────────────────────── */
  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Loading objective...</p>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────────────────────── */
  if (error || !objective) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-4">
          <Icon icon="lucide:alert-circle" width={32} height={32} className="text-red-400" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-1">Failed to load objective</h3>
        <p className="text-muted text-sm mb-4">{error || "Objective not found."}</p>
        <button onClick={() => router.push("/objectives")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 transition-colors cursor-pointer">
          Back to Objectives
        </button>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────────────── */
  const obj = objective;
  const sortedDims = [...obj.dimensions].sort((a, b) => a.position - b.position);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted mb-1">
          <span className="hover:text-accent cursor-pointer" onClick={() => router.push("/objectives")}>
            Objectives
          </span>{" "} / {obj.name}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{obj.name}</h1>
            {obj.description && <p className="text-muted mt-1">{obj.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/objectives/create?edit=${obj.id}`)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer">
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* ── Left column ─────────────────────────────── */}
        <div className="space-y-5">
          {/* Dimensions */}
          <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
            <h2 className="text-base font-bold text-white mb-4">
              How {obj.name} judges decisions
            </h2>
            <div className="space-y-3">
              {sortedDims.map((d, i) => {
                const color = DIM_COLORS[i % DIM_COLORS.length];
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-white font-medium">{d.name}</p>
                        <span className="text-xs font-mono tabular-nums text-muted">{d.weightPct}%</span>
                      </div>
                      {d.description && (
                        <p className="text-[11px] text-muted/60 mb-1.5">{d.description}</p>
                      )}
                      {/* Weight bar */}
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${d.weightPct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allowed proposal types */}
          <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
            <h2 className="text-base font-bold text-white mb-3">Allowed proposal types</h2>
            <div className="flex flex-wrap gap-2">
              {obj.allowedProposalKinds.map((kind) => {
                const meta = KIND_META[kind];
                return (
                  <span key={kind}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent">
                    {meta && <Icon icon={meta.icon} width={13} height={13} />}
                    {meta?.label ?? kind}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right column ────────────────────────────── */}
        <div className="space-y-4">
          {/* Settings */}
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Settings</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Trading window</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Pass margin</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Dimensions</span>
                <span className="text-xs text-white font-medium">{obj.dimensions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Proposal types</span>
                <span className="text-xs text-white font-medium">{obj.allowedProposalKinds.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Status</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent">Active</span>
              </div>
            </div>
          </div>

          {/* Dimensions summary */}
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Dimension weights</h3>
            <div className="space-y-2">
              {sortedDims.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DIM_COLORS[i % DIM_COLORS.length] }} />
                  <span className="text-xs text-muted flex-1 truncate">{d.name}</span>
                  <span className="text-xs font-mono tabular-nums text-white">{d.weightPct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border">
            <h3 className="text-white font-bold text-sm mb-2">About this Objective</h3>
            <p className="text-muted text-xs leading-relaxed">
              Objectives define how proposals are evaluated. Each dimension carries a weight
              that electors use when trading on a proposal's merit. The trading window sets
              how long a proposal stays open for trading, and the pass margin determines
              how much the pass price must exceed the fail price for approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ObjectiveDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Loading...</p>
      </div>
    }>
      <ObjectiveDetailInner />
    </Suspense>
  );
}
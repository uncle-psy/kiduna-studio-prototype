"use client";

/**
 * Objective + Impact Claims selector — shared across all proposal create pages.
 *
 * Fetches the Market's Objectives via the existing API, filters to those whose
 * `allowedProposalKinds` includes the current proposal kind, and renders claim
 * sliders for the selected Objective's Dimensions.
 *
 * Outputs: objectiveId, impactClaims array — exactly what ProposalBaseSchema needs.
 */

import { useState, useEffect, useCallback } from "react";
import { useCurrentMarket } from "@/lib/market-context";
import { getToken, getSessionToken } from "@/lib/auth";
import type { ProposalKind } from "@/lib/proposal-draft/ProposalDraftContext";

// ── Types (mirror the server's ObjectiveSchema/DimensionSchema) ─────

interface Dimension {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  weightPct: number;
  position: number;
}

interface Objective {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  allowedProposalKinds: string[];
  dimensions: Dimension[];
}

export interface ImpactClaim {
  dimensionId: string;
  claim: number; // -1 to 1
}

/** Human-readable labels for each proposal kind, used in empty-state messages. */
const KIND_LABELS: Record<string, string> = {
  spend: "Send Funds",
  param: "Parameter Change",
  mint: "Mint Tokens",
  metadata: "Metadata Update",
  liquidity: "Liquidity",
  perf: "Performance Package",
};

interface ObjectiveSelectorProps {
  kind: ProposalKind;
  objectiveId: string | null;
  impactClaims: ImpactClaim[];
  onObjectiveChange: (
  objectiveId: string,
  dimensions: Dimension[],
  objectiveName: string,
) => void;
  onClaimsChange: (claims: ImpactClaim[]) => void;
}

export function ObjectiveSelector({
  kind,
  objectiveId,
  impactClaims,
  onObjectiveChange,
  onClaimsChange,
}: ObjectiveSelectorProps) {
  const { current } = useCurrentMarket();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch objectives — tries market-scoped first, falls back to standalone.
  // This handles both linked objectives (marketId set) and standalone ones
  // created before the market was linked.
  // Passes `kind` to the API for server-side filtering and also filters
  // client-side as a safety net.
  useEffect(() => {
    if (!current.slug) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken() || getSessionToken();
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        // Fetch from both endpoints in parallel, passing kind for server-side filtering
        const [marketRes, standaloneRes] = await Promise.all([
          fetch(`/api/v1/markets/${current.slug}/objectives?pageSize=50&kind=${kind}`, { headers }).catch(() => null),
          fetch(`/api/v1/objectives?pageSize=50&kind=${kind}`, { headers }).catch(() => null),
        ]);

        const marketData = marketRes?.ok ? await marketRes.json() : { items: [] };
        const standaloneData = standaloneRes?.ok ? await standaloneRes.json() : { items: [] };

        // Merge and deduplicate by id
        const allObjectives: Objective[] = [...(marketData.items ?? [])];
        const existingIds = new Set(allObjectives.map((o: Objective) => o.id));
        for (const obj of (standaloneData.items ?? [])) {
          if (!existingIds.has(obj.id)) {
            allObjectives.push(obj);
          }
        }

        // Client-side filter: only show objectives whose allowedProposalKinds
        // includes the current proposal kind. This is the primary enforcement
        // point — the API filter is defense-in-depth.
        const filtered = allObjectives.filter(
          (o) => o.allowedProposalKinds.includes(kind),
        );

        if (!cancelled) setObjectives(filtered);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load objectives");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [current.slug, kind]);

  const handleObjectiveSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const obj = objectives.find((o) => o.id === e.target.value);
      if (!obj) return;
      onObjectiveChange(obj.id, obj.dimensions, obj.name);
      // Initialize claims to 0 for each dimension.
      onClaimsChange(obj.dimensions.map((d) => ({ dimensionId: d.id, claim: 0 })));
    },
    [objectives, onObjectiveChange, onClaimsChange],
  );

  if (loading) {
    return (
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Objective <span className="text-accent">*</span></label>
        <select disabled className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-muted focus:outline-none opacity-50">
          <option>Loading objectives…</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Objective <span className="text-accent">*</span></label>
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>
      </div>
    );
  }

  if (objectives.length === 0) {
    const kindLabel = KIND_LABELS[kind] ?? kind;
    return (
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Objective <span className="text-accent">*</span></label>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          No objectives allow <strong>{kindLabel}</strong> proposals. Update an existing Objective's allowed proposal types, or create a new one that includes <strong>{kindLabel}</strong>.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Objective picker */}
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Objective <span className="text-accent">*</span></label>
        <select value={objectiveId ?? ""} onChange={handleObjectiveSelect}
          className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent/50 cursor-pointer">
          <option value="" disabled>Select an objective…</option>
          {objectives.map((o) => (
            <option key={o.id} value={o.id}>
              {o.icon ? `${o.icon} ` : ""}{o.name}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted mt-1">The category this decision lives under. Determines which value dimensions it's judged against.</p>
      </div>

    </>
  );
}
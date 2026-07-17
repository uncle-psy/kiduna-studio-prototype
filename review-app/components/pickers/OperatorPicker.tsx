"use client";

/**
 * OperatorPicker — selectable operator card list.
 *
 * Fetches Presence avatars with presenceSubtype === "operator" and renders
 * them as selectable cards. Styled with Tailwind to match Kinship Studio.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { listAgents } from "@/lib/agents-api";
import type { Presence } from "@/lib/agent-types";

export interface OperatorPickerProps {
  wallet?: string;
  value?: string;
  onChange?: (id: string | null) => void;
}

export function OperatorPicker({
  wallet,
  value,
  onChange,
}: OperatorPickerProps) {
  const [operators, setOperators] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedId = value ?? null;

  const fetchOperators = useCallback(async () => {
    if (!wallet) {
      setOperators([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listAgents({
        wallet,
        presenceSubtype: "operator",
      });
      setOperators(
        (result.agents || []).filter(
          (a) => a.status?.toUpperCase() !== "ARCHIVED",
        ),
      );
    } catch (err) {
      console.error("Failed to fetch operators:", err);
      setError("Failed to load operators.");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const handleSelect = (id: string) => {
    onChange?.(id === selectedId ? null : id);
  };

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 border border-card-border rounded-xl bg-white/[0.02]">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted animate-pulse">
          Loading operators…
        </span>
      </div>
    );
  }

  /* ── Error ─────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 border border-red-500/25 rounded-xl bg-red-500/[0.04]">
        <span className="text-xs text-red-400">{error}</span>
        <button
          type="button"
          onClick={fetchOperators}
          className="px-3 py-1.5 text-xs font-medium border border-card-border rounded-lg text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── No wallet ─────────────────────────────────────────────── */
  if (!wallet) {
    return (
      <div className="flex items-center justify-center py-8 border border-dashed border-card-border rounded-xl">
        <span className="text-xs text-muted">
          Connect your wallet above to see available Operators.
        </span>
      </div>
    );
  }

  /* ── Empty ─────────────────────────────────────────────────── */
  if (operators.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 border border-dashed border-accent/30 rounded-xl bg-accent/[0.03] text-center">
        <div className="text-xl mb-2">⚙️</div>
        <div className="text-sm font-bold text-white mb-1">
          No Operator avatars yet
        </div>
        <div className="text-xs text-muted leading-relaxed mb-4 max-w-xs">
          Create an avatar with the <b className="text-accent">Operator</b> type, then return here to select it.
        </div>
        <Link
          href="/agents"
          className="bg-accent hover:bg-accent-dark text-on-accent font-semibold px-4 py-2 text-xs rounded-full transition-colors no-underline"
        >
          + Create Operator
        </Link>
      </div>
    );
  }

  /* ── Pick list ─────────────────────────────────────────────── */
  return (
    <div>
      <div className="flex flex-col gap-2">
        {operators.map((op) => {
          const active = op.id === selectedId;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => handleSelect(op.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                active
                  ? "border-accent bg-accent/[0.06]"
                  : "border-card-border bg-card hover:border-white/20"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Radio indicator */}
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  active
                    ? "border-accent bg-accent"
                    : "border-white/20 bg-transparent"
                }`}>
                  {active && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${active ? "text-accent" : "text-white"}`}>
                      {op.name}
                    </span>
                    {op.handle && (
                      <span className="text-[11px] font-mono text-muted break-all">
                        @{op.handle}
                      </span>
                    )}
                    {op.tone && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-card-border text-muted">
                        {op.tone.toLowerCase()}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {(op.description || op.briefDescription) && (
                    <div className="text-xs text-muted mt-1 line-clamp-2 break-all" style={{ overflowWrap: "anywhere" }}>
                      {op.description || op.briefDescription}
                    </div>
                  )}
                </div>

                {/* Check mark */}
                {active && (
                  <svg className="w-5 h-5 text-accent shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}

        {/* Create new Operator */}
        <Link
          href="/agents"
          className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-card-border hover:border-accent/50 hover:bg-accent/[0.03] transition-all no-underline group"
        >
          <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
            <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-accent">Create new Operator</span>
            <span className="text-xs text-muted ml-2">on the Agents page</span>
          </div>
        </Link>
      </div>

      <p className="text-[11px] text-muted mt-3">
        Select the Operator avatar that will author proposals for this Market.
      </p>
    </div>
  );
}
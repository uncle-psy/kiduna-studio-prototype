"use client";

/**
 * Settings → Mechanism
 *
 * Two sections:
 *   1. Locked settings — v1 immutable (Visibility, Ledger, Economic model, Reward unit)
 *   2. Proposal defaults — per-class defaults from GET/PATCH mechanism API
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { useCurrentMarket } from "@/lib/market-context";
import { getToken, getSessionToken } from "@/lib/auth";

/* ── Types ─────────────────────────────────────────────────────────── */

type TradingWindow = "1d" | "3d" | "7d";
type PassThreshold = "3%" | "5%";

interface ClassDefaults {
  tradingWindow: TradingWindow;
  passThreshold: PassThreshold;
  vaultLiquidityUsd: number;
}

interface LockedSettings {
  visibility: string; ledger: string;
  economicModel: string; rewardUnit: string;
}

interface ProposalClassMeta { key: string; label: string; hint: string; icon: string; }

const PROPOSAL_CLASSES: ProposalClassMeta[] = [
  { key: "spend",     label: "Send funds",            hint: "USDC transfers and reimbursements", icon: "lucide:banknote" },
  { key: "param",     label: "Change a setting",      hint: "Parameter updates",                 icon: "lucide:sliders-horizontal" },
  { key: "mint",      label: "Mint tokens",           hint: "Token supply increases",            icon: "lucide:coins" },
  { key: "metadata",  label: "Update token metadata", hint: "Name, ticker, image",               icon: "lucide:file-edit" },
  { key: "liquidity", label: "Adjust liquidity",      hint: "Provide or withdraw LP",            icon: "lucide:waves" },
  { key: "perf",      label: "Performance package",   hint: "Conditional team rewards",          icon: "lucide:trophy" },
];

type RowSaveState = "idle" | "saving" | "saved" | "error";

function getAuthHeaders(): Record<string, string> {
  const t = getToken() || getSessionToken();
  const h: Record<string, string> = { Accept: "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/* ════════════════════════════════════════════════════════════════════ */

export default function MarketSettingsPage() {
  const { current } = useCurrentMarket();

  const [locked, setLocked] = useState<LockedSettings | null>(null);
  const [defaults, setDefaults] = useState<Record<string, ClassDefaults>>({});
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowSaveState>>({});
  const savedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* ── Fetch ─────────────────────────────────────────────────────── */
  const fetchDefaults = useCallback(async () => {
    if (!current.slug) return;
    setLoadState("loading"); setLoadError(null);
    try {
      const res = await fetch(`/api/v1/markets/${current.slug}/settings/mechanism`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setLocked(data.locked ?? null);
      setDefaults(data.classDefaults ?? {});
      setLoadState("idle");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
      setLoadState("error");
    }
  }, [current.slug]);

  useEffect(() => { fetchDefaults(); }, [fetchDefaults]);
  useEffect(() => {
    const timers = savedTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);

  /* ── Save ──────────────────────────────────────────────────────── */
  const saveClass = useCallback(async (classKey: string, updated: ClassDefaults) => {
    if (!current.slug) return;
    setDefaults((d) => ({ ...d, [classKey]: updated }));
    setRowState((s) => ({ ...s, [classKey]: "saving" }));
    try {
      const res = await fetch(`/api/v1/markets/${current.slug}/settings/mechanism`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ classDefaults: { [classKey]: updated } }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const data = await res.json();
      setDefaults(data.classDefaults ?? {});
      setLocked(data.locked ?? null);
      setRowState((s) => ({ ...s, [classKey]: "saved" }));
      if (savedTimers.current[classKey]) clearTimeout(savedTimers.current[classKey]);
      savedTimers.current[classKey] = setTimeout(() => {
        setRowState((s) => ({ ...s, [classKey]: "idle" }));
      }, 2000);
    } catch {
      setRowState((s) => ({ ...s, [classKey]: "error" }));
      fetchDefaults();
    }
  }, [current.slug, fetchDefaults]);

  const handleSelectChange = (classKey: string, field: keyof ClassDefaults, value: string) => {
    const c = defaults[classKey]; if (!c) return;
    saveClass(classKey, { ...c, [field]: value });
  };
  const handleVaultChange = (classKey: string, raw: string) => {
    const c = defaults[classKey]; if (!c) return;
    saveClass(classKey, { ...c, vaultLiquidityUsd: Math.max(0, Number(raw) || 0) });
  };

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted mb-1">Settings / Mechanism</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Mechanism.</h1>
        <p className="text-muted mt-1">How decisions are run on this Market. Locked v1 settings stay constant; proposal defaults can be tuned per class.</p>
      </div>

      {/* Locked settings + explainer */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-5">
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Locked settings</h2>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-400/30 bg-blue-500/10 text-blue-400">
              Locked · v1
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Visibility", value: locked?.visibility ?? "Public", icon: "lucide:eye" },
              { label: "Ledger", value: locked?.ledger ?? "Solana", icon: "lucide:database" },
              { label: "Economic model", value: locked?.economicModel ?? "Skin-in-the-game futarchy", icon: "lucide:scale" },
              { label: "Reward unit", value: locked?.rewardUnit ?? "USDC", icon: "lucide:coins" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2.5 p-3 bg-white/[0.02] border border-card-border rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Icon icon={s.icon} width={15} height={15} className="text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{s.label}</p>
                  <p className="text-sm text-white font-medium truncate">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full py-2.5 rounded-xl border border-dashed border-card-border text-muted hover:text-accent hover:border-accent/40 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs">
            <Icon icon="lucide:external-link" width={13} height={13} />
            Open meta-proposal to change
          </button>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border h-fit">
          <h3 className="text-white font-bold text-sm mb-2">Why locked?</h3>
          <p className="text-muted text-xs leading-relaxed">
            Switching from Public to Private, or from Sponsor-funded to Participant-funded, changes Citizens' risk profile.
            Those changes go through the same market mechanism they govern.
          </p>
        </div>
      </div>

      {/* Proposal defaults */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-card-border">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Icon icon="lucide:settings" width={20} height={20} className="text-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Proposal defaults</h2>
            <p className="text-xs text-muted">Change once — every future proposal of that class picks them up.</p>
          </div>
        </div>

        {/* Error */}
        {loadState === "error" && loadError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2">
            <Icon icon="lucide:alert-circle" width={14} height={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400 flex-1">{loadError}</p>
            <button onClick={fetchDefaults} className="text-xs text-red-400 underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loadState === "loading" && (
          <div className="flex items-center justify-center py-10 gap-2">
            <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin text-muted" />
            <p className="text-muted text-sm">Loading defaults...</p>
          </div>
        )}

        {/* Table */}
        {loadState !== "loading" && (
          <div className="p-3 space-y-2">
            {PROPOSAL_CLASSES.map((c) => {
              const d = defaults[c.key];
              if (!d) return null;
              const rs = rowState[c.key] ?? "idle";
              const isSaving = rs === "saving";

              return (
                <div key={c.key}
                  className={`p-3 bg-white/[0.02] border border-card-border rounded-xl transition-opacity ${isSaving ? "opacity-60" : ""}`}>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                      <Icon icon={c.icon} width={15} height={15} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{c.label}</p>
                      <p className="text-[11px] text-muted/60">{c.hint}</p>
                    </div>
                    {/* Save state */}
                    <div className="text-[11px] shrink-0 w-16 text-right">
                      {isSaving && <span className="text-muted">Saving...</span>}
                      {rs === "saved" && <span className="text-green-400">Saved ✓</span>}
                      {rs === "error" && <span className="text-red-400">Error</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Window</label>
                      <select value={d.tradingWindow} disabled={isSaving}
                        onChange={(e) => handleSelectChange(c.key, "tradingWindow", e.target.value)}
                        className="w-full bg-input border border-card-border rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-accent/50 cursor-pointer">
                        <option value="1d">1 day</option>
                        <option value="3d">3 days</option>
                        <option value="7d">7 days</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Pass threshold</label>
                      <select value={d.passThreshold} disabled={isSaving}
                        onChange={(e) => handleSelectChange(c.key, "passThreshold", e.target.value)}
                        className="w-full bg-input border border-card-border rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-accent/50 cursor-pointer">
                        <option value="3%">3% (standard)</option>
                        <option value="5%">5% (stricter)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Vault liquidity</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted font-mono pointer-events-none">$</span>
                        <input type="number" min={0} step={100}
                          defaultValue={d.vaultLiquidityUsd} key={`${c.key}-${d.vaultLiquidityUsd}`}
                          disabled={isSaving}
                          onBlur={(e) => handleVaultChange(c.key, e.target.value)}
                          className="w-full bg-input border border-card-border rounded-lg pl-6 pr-3 py-2 text-foreground text-xs font-mono focus:outline-none focus:border-accent/50" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="mx-3 mb-3 p-3 rounded-xl border border-dashed border-accent/30 bg-accent/[0.03]">
          <p className="text-xs text-accent/80">
            <span className="font-semibold text-accent">Vault liquidity</span> is sponsor-funded and returned at settlement.
            It's the float that lets the conditional market trade — too low and Pass/Fail prices stay noisy; too high and capital sits idle.
          </p>
        </div>
      </div>
    </div>
  );
}
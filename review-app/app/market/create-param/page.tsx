"use client";

/**
 * Update DAO Parameter — proposal creation form.
 *
 * Reads live DAO config via GET /v1/markets/{slug}/dao-config (server-side).
 * Builds the param instruction via POST .../param/build-instruction (server-side).
 */

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";
import { getToken, getSessionToken } from "@/lib/auth";
import {
  ObjectiveSelector,
  type ImpactClaim,
} from "@/components/proposal-create/ObjectiveSelector";

// ── Parameter definitions ─────────────────────────────────────────

interface ParamDef { label: string; unit: string; hint: string; minValue?: number; icon: string; }

const PARAM_DEFS: Record<string, ParamDef> = {
  passThresholdBps:            { label: "Pass threshold",       unit: "bps",       hint: "How much Pass TWAP must beat Fail TWAP to pass. 300 = 3%.", icon: "lucide:percent" },
  secondsPerProposal:          { label: "Trading window",       unit: "seconds",   hint: "How long proposals trade. Min 86400 (1 day).", minValue: 86400, icon: "lucide:clock" },
  minQuoteFutarchicLiquidity:  { label: "Min quote liquidity",  unit: "USDC raw",  hint: "Min USDC reserves required in conditional pools.", icon: "lucide:coins" },
  minBaseFutarchicLiquidity:   { label: "Min base liquidity",   unit: "token raw", hint: "Min token reserves required in conditional pools.", icon: "lucide:coins" },
  twapStartDelaySeconds:       { label: "TWAP start delay",     unit: "seconds",   hint: "Trading is live but TWAP only starts recording after this delay.", icon: "lucide:timer" },
};

type ParamKey = keyof typeof PARAM_DEFS;

const TITLE_MAX = 80;
const RATIONALE_MAX = 500;
const NEW_VALUE_MAX_DIGITS = 20; // fits a u64 on-chain value

// ── Page ──────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const walletAddress = user?.wallet ?? "";
  const connected = !!walletAddress;
  const handleCopyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [objectiveId, setObjectiveId] = useState<string | null>(null);
  const [objectiveName, setObjectiveName] = useState("");
  const [impactClaims, setImpactClaims] = useState<ImpactClaim[]>([]);
  const [paramKey, setParamKey] = useState<ParamKey>("passThresholdBps");
  const [newValue, setNewValue] = useState("");

  const [liveConfig, setLiveConfig] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(true);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Scroll to top when form error appears
  useEffect(() => {
    if (formError) requestAnimationFrame(() => document.querySelector('[data-form-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [formError])

  // ── Fetch live DAO config ─────────────────────────────────────
  useEffect(() => {
    if (!current.slug) return;
    let cancelled = false;
    (async () => {
      setConfigLoading(true);
      try {
        const token = getToken() || getSessionToken();
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`/api/v1/markets/${current.slug}/dao-config`, { headers });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) setLiveConfig(data);
      } catch { /* leave empty */ }
      finally { if (!cancelled) setConfigLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [current.slug]);

  const cfg = PARAM_DEFS[paramKey];
  const currentValue = liveConfig[paramKey] ?? "—";

  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (!objectiveId) return "Select an objective.";
    if (!rationale.trim()) return "Rationale is required.";
    if (!newValue.trim()) return "New value is required.";
    const nv = parseInt(newValue, 10);
    if (isNaN(nv)) return "New value must be an integer.";
    if (cfg.minValue && nv < cfg.minValue) return `Minimum value is ${cfg.minValue}.`;
    if (newValue === currentValue) return "New value is the same as current.";
    return null;
  }

  const handleSaveDraft = useCallback(async () => {
    const err = validate();
    if (err) { setFormError(err); return null; }
    setFormError(null); setSaving(true);
    try {
      const token = getToken() || getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/v1/markets/${current.slug}/proposals/param`, {
        method: "POST", headers,
        body: JSON.stringify({ title: title.trim(), rationale: rationale.trim(), objectiveId, impactClaims, parameterPath: paramKey, valueBefore: currentValue, valueAfter: newValue }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error ?? `Failed (${res.status})`); }
      const data = await res.json();
      setDraftId(data.id);
      return data.id as string;
    } catch (e) { setFormError(e instanceof Error ? e.message : "Save failed"); return null; }
    finally { setSaving(false); }
  }, [title, rationale, objectiveId, impactClaims, paramKey, newValue, currentValue, current.slug]);

  const handleReviewOpen = useCallback(async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    const id = draftId ?? (await handleSaveDraft());
    if (!id) return;

    // Save proposal data to sessionStorage for the launching page
    sessionStorage.setItem("kinship.proposal-launch.proposalId", id);
    sessionStorage.setItem("kinship.proposal-launch.title", title);
    sessionStorage.setItem("kinship.proposal-launch.objectiveName", objectiveName);
    sessionStorage.setItem("kinship.proposal-launch.rationale", rationale);
    sessionStorage.setItem("kinship.proposal-launch.kind", "param");
    sessionStorage.setItem("kinship.proposal-launch.marketSlug", current.slug);
    sessionStorage.setItem("kinship.proposal-launch.summary",
      `${cfg.label}: ${currentValue} → ${newValue} ${cfg.unit}`
    );
    sessionStorage.setItem("kinship.proposal-launch.paramData", JSON.stringify({
      paramKey,
      newValue,
      currentValue,
    }));

    // Persist build data to DB so it survives browser close (resume support)
    const lcToken = getToken() || getSessionToken();
    const lcHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (lcToken) lcHeaders.Authorization = `Bearer ${lcToken}`;
    fetch(`/api/v1/proposals/${id}/launch-context`, {
      method: "PATCH", headers: lcHeaders,
      body: JSON.stringify({ launchPhase: 0, context: {
        paramData: { paramKey, newValue, currentValue },
      }}),
    }).catch(() => {}); // fire-and-forget

    router.push("/market/proposals/launching");
  }, [draftId, handleSaveDraft, title, objectiveName, rationale, cfg, currentValue, newValue, paramKey, current.slug, router]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">
            <Link href="/market/proposals" className="hover:text-accent no-underline text-muted">Proposals</Link> / New / Update parameter
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Update DAO parameter</h1>
          <p className="text-muted mt-1">Change a DAO setting via futarchy. The program updates its own config when the proposal passes.</p>
        </div>
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0">
          <Icon icon="lucide:arrow-left" width={14} height={14} />
          Change type
        </button>
      </div>

      {/* Type banner */}
      <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
        <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <Icon icon="lucide:sliders-horizontal" width={22} height={22} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-sm">Parameter change</h2>
          <p className="text-xs text-muted">Modify a DAO config value on Pass.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <div className="space-y-4">
          {/* Sponsor wallet (FROST) */}
          <div className="bg-card border border-green-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted font-mono">Sponsor Wallet · FROST</div>
                {walletAddress ? (
                  <div className="text-sm text-white font-mono mt-0.5">{walletAddress.slice(0, 4)}&hellip;{walletAddress.slice(-4)}</div>
                ) : (
                  <div className="text-sm text-muted mt-0.5">Sign in to load your wallet</div>
                )}
              </div>
            </div>
          </div>

          {/* 1. Story */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1">1 · Tell the story</h2>
            <p className="text-xs text-muted/60 mb-4">What citizens see when this proposal opens for trading.</p>

            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Title <span className="text-accent">*</span></label>
              <input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="One-line summary"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50" />
              <div className="flex justify-end mt-1.5">
                <span className="text-[0.72rem]" style={{ color: title.length >= TITLE_MAX ? '#fff' : 'rgba(255,255,255,0.4)' }}>{title.length}/{TITLE_MAX}</span>
              </div>
            </div>

            <ObjectiveSelector kind="param" objectiveId={objectiveId} impactClaims={impactClaims}
              onObjectiveChange={(id, _dims, name) => { setObjectiveId(id); setObjectiveName(name); }}
              onClaimsChange={setImpactClaims} />

            <div className="mt-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Rationale <span className="text-accent">*</span></label>
              <textarea rows={3} value={rationale} maxLength={RATIONALE_MAX} onChange={(e) => setRationale(e.target.value)} placeholder="Why this change?"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none" />
              <div className="flex justify-end mt-1.5">
                <span className="text-[0.72rem]" style={{ color: rationale.length >= RATIONALE_MAX ? '#fff' : 'rgba(255,255,255,0.4)' }}>{rationale.length}/{RATIONALE_MAX}</span>
              </div>
            </div>
          </div>

          {/* 2. Parameter */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1">2 · Which parameter?</h2>
            <p className="text-xs text-muted/60 mb-4">One DAO config field per proposal.</p>

            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Parameter</label>
              <select value={paramKey} onChange={(e) => { setParamKey(e.target.value as ParamKey); setNewValue(""); }}
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent/50 cursor-pointer">
                {Object.entries(PARAM_DEFS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted mt-1.5">{cfg.hint}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Current value</label>
                <input value={configLoading ? "Loading…" : currentValue} disabled
                  className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground opacity-50" />
                <p className="text-[11px] text-muted mt-1.5">Live from on-chain DAO config.</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">New value ({cfg.unit}) <span className="text-accent">*</span></label>
                <input value={newValue} inputMode="numeric" maxLength={NEW_VALUE_MAX_DIGITS}
                  onChange={(e) => setNewValue(e.target.value.replace(/\D/g, ""))} placeholder="Integer"
                  className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50" />
                <div className="flex justify-end mt-1.5">
                  <span className="text-[0.72rem]" style={{ color: newValue.length >= NEW_VALUE_MAX_DIGITS ? '#fff' : 'rgba(255,255,255,0.4)' }}>{newValue.length}/{NEW_VALUE_MAX_DIGITS}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border">
            <h3 className="text-white font-bold text-sm mb-2">On Pass</h3>
            <p className="text-muted text-xs leading-relaxed mb-2">
              The DAO updates its own config. Future proposals use the new parameter immediately.
            </p>
            <p className="text-muted text-xs leading-relaxed">
              Citizens see this as a <span className="text-amber-400 font-semibold">PARAM</span> proposal.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-dashed border-accent/30 bg-accent/[0.03]">
            <p className="text-xs text-accent/80">
              <span className="font-semibold text-accent">Reverting</span> requires another parameter-change proposal. Pick the new value carefully.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {formError && (
        <div data-form-error className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <Icon icon="lucide:alert-circle" width={14} height={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-400">{formError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2.5 text-sm text-muted hover:text-white transition-colors cursor-pointer">← Back</button>
        <button onClick={handleSaveDraft} disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button onClick={handleReviewOpen} disabled={saving}
          className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer">
          Review & open →
        </button>
      </div>

    </div>
  );
}
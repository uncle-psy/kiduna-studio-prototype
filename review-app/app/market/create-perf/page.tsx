"use client";

/**
 * Performance Grant — proposal creation form.
 *
 * The v0.6/v0.7 performance package program is price-based:
 * tokens unlock in tranches when the token's TWAP exceeds each
 * tranche's price threshold.
 *
 * Wired to:
 *   - ObjectiveSelector for objective + impact claims
 *   - POST /v1/markets/{slug}/proposals/perf for draft creation
 *   - Navigates to /market/proposals/launching for on-chain submission
 */

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";
import { useCurrentMarket } from "@/lib/market-context";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { getToken, getSessionToken } from "@/lib/auth";
import {
  ObjectiveSelector,
  type ImpactClaim,
} from "@/components/proposal-create/ObjectiveSelector";

// ── Helpers ───────────────────────────────────────────────────────

function isValidBase58Pubkey(s: string): boolean {
  try { new PublicKey(s); return s.length >= 32 && s.length <= 44; }
  catch { return false; }
}

function makeIdempotencyKey(slug: string, title: string, wallet: string, amount: number): string {
  return `perf:${slug}:${title.trim()}:${wallet.trim()}:${amount}`;
}

// ── Types ─────────────────────────────────────────────────────────

interface Tranche { id: string; priceThreshold: string; tokenAmount: string; }

// ── Page ──────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const daoCtx = useDaoContext();

  // Wallet
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

  // Shared base fields
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [objectiveId, setObjectiveId] = useState<string | null>(null);
  const [objectiveName, setObjectiveName] = useState("");
  const [impactClaims, setImpactClaims] = useState<ImpactClaim[]>([]);

  // Recipient & reward
  const [recipientName, setRecipientName] = useState("");
  const [recipientWallet, setRecipientWallet] = useState("");
  const [rewardTicker, setRewardTicker] = useState("");

  // Price tranches
  const [tranches, setTranches] = useState<Tranche[]>([
    { id: "t1", priceThreshold: "0.10", tokenAmount: "" },
  ]);

  // TWAP & timing
  const [twapWindowHours, setTwapWindowHours] = useState("24");
  const [minUnlockTimestamp, setMinUnlockTimestamp] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 16);
  });

  // Unlock conditions (text descriptions)
  const [unlockConditions, setUnlockConditions] = useState([
    { id: "uc1", description: "" },
  ]);

  // Program
  const [programVersion, setProgramVersion] = useState<"v0.6" | "v0.7">("v0.7");

  // Draft state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Scroll to top when form error appears
  useEffect(() => {
    if (formError) requestAnimationFrame(() => document.querySelector('[data-form-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [formError])
  const draftKeyRef = useRef<string | null>(null);

  // ── Tranche helpers ─────────────────────────────────────────────
  const addTranche = () => setTranches((prev) => [
    ...prev, { id: `t${prev.length + 1}`, priceThreshold: "", tokenAmount: "" },
  ]);
  const updateTranche = (id: string, key: keyof Tranche, val: string) =>
    setTranches((prev) => prev.map((t) => t.id === id ? { ...t, [key]: val } : t));
  const removeTranche = (id: string) =>
    setTranches((prev) => prev.length > 1 ? prev.filter((t) => t.id !== id) : prev);

  // ── Condition helpers ───────────────────────────────────────────
  const addCondition = () => setUnlockConditions((prev) => [
    ...prev, { id: `uc${prev.length + 1}`, description: "" },
  ]);
  const updateCondition = (id: string, desc: string) => setUnlockConditions((prev) =>
    prev.map((c) => c.id === id ? { ...c, description: desc } : c));
  const removeCondition = (id: string) => setUnlockConditions((prev) =>
    prev.length > 1 ? prev.filter((c) => c.id !== id) : prev);

  // ── Computed ────────────────────────────────────────────────────
  const totalTokens = tranches.reduce((sum, t) => sum + (parseFloat(t.tokenAmount.replace(/,/g, "")) || 0), 0);

  // ── Validation ──────────────────────────────────────────────────
  function validate(): string | null {
    if (!current?.slug) return "Market context not loaded.";
    if (!title.trim()) return "Title is required.";
    if (!objectiveId) return "Select an objective.";
    if (!rationale.trim()) return "Rationale is required.";
    if (!recipientName.trim()) return "Recipient name is required.";
    if (!isValidBase58Pubkey(recipientWallet)) return "Invalid recipient wallet address.";
    if (!rewardTicker.trim()) return "Reward ticker is required.";
    if (rewardTicker.trim().length > 10) return "Reward ticker must be 10 characters or fewer.";
    for (const t of tranches) {
      const price = parseFloat(t.priceThreshold);
      const amount = parseFloat(t.tokenAmount.replace(/,/g, ""));
      if (!price || price <= 0) return "Each tranche needs a positive price threshold.";
      if (!amount || amount <= 0) return "Each tranche needs a positive token amount.";
    }
    if (totalTokens <= 0) return "Total reward must be positive.";
    if (!parseInt(twapWindowHours) || parseInt(twapWindowHours) <= 0) return "TWAP window must be positive.";
    if (!minUnlockTimestamp) return "Minimum unlock timestamp is required.";
    const validConditions = unlockConditions.filter((c) => c.description.trim());
    if (validConditions.length === 0) return "At least one unlock condition description is required.";
    return null;
  }

  // ── Save draft ──────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async (): Promise<string | null> => {
    const err = validate();
    if (err) { setFormError(err); return null; }
    setFormError(null);

    const currentKey = makeIdempotencyKey(current.slug, title, recipientWallet, totalTokens);
    if (draftId && draftKeyRef.current === currentKey) return draftId;

    setDraftId(null); draftKeyRef.current = null; setSaving(true);
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const parsedTranches = tranches.map((t) => ({
        priceThreshold: parseFloat(t.priceThreshold),
        tokenAmount: parseFloat(t.tokenAmount.replace(/,/g, "")),
      }));

      const res = await fetch(`/api/v1/markets/${current.slug}/proposals/perf`, {
        method: "POST", headers,
        body: JSON.stringify({
          title: title.trim(),
          rationale: rationale.trim(),
          objectiveId,
          impactClaims,
          recipientName: recipientName.trim(),
          recipientWallet: recipientWallet.trim(),
          rewardAmount: totalTokens,
          rewardTicker: rewardTicker.trim(),
          rewardMintAddress: null,
          unlockConditions: unlockConditions
            .filter((c) => c.description.trim())
            .map((c) => ({ description: c.description.trim() })),
          tranches: parsedTranches,
          minUnlockTimestamp: new Date(minUnlockTimestamp).toISOString(),
          twapWindowHours: parseInt(twapWindowHours),
          programVersion,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const fieldErrors = body.error?.details?.fieldErrors;
        if (fieldErrors && typeof fieldErrors === "object") {
          const messages = Object.entries(fieldErrors)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(", ")}`)
            .join(". ");
          throw new Error(messages);
        }
        throw new Error(body.error?.message ?? body.error ?? `Failed (${res.status})`);
      }

      const data = await res.json();
      setDraftId(data.id); draftKeyRef.current = currentKey;
      return data.id as string;
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed");
      return null;
    } finally { setSaving(false); }
  }, [title, rationale, objectiveId, impactClaims, recipientName, recipientWallet,
      rewardTicker, tranches, twapWindowHours, minUnlockTimestamp, unlockConditions,
      programVersion, totalTokens, current?.slug, draftId]);

  // ── Navigate to launch page ─────────────────────────────────────
  const handleReviewOpen = useCallback(async () => {
    const formErr = validate();
    if (formErr) { setFormError(formErr); return; }
    setFormError(null);
    const id = await handleSaveDraft();
    if (!id) return;

    const baseMint = daoCtx.ctx?.baseMint;
    const parsedTranches = tranches.map((t) => ({
      priceThreshold: parseFloat(t.priceThreshold),
      tokenAmount: parseFloat(t.tokenAmount.replace(/,/g, "")),
    }));

    sessionStorage.setItem("kinship.proposal-launch.proposalId", id);
    sessionStorage.setItem("kinship.proposal-launch.title", title);
    sessionStorage.setItem("kinship.proposal-launch.objectiveName", objectiveName);
    sessionStorage.setItem("kinship.proposal-launch.rationale", rationale);
    sessionStorage.setItem("kinship.proposal-launch.kind", "perf");
    sessionStorage.setItem("kinship.proposal-launch.marketSlug", current.slug);
    sessionStorage.setItem("kinship.proposal-launch.summary",
      `${totalTokens.toLocaleString()} ${rewardTicker} → ${recipientName} (${parsedTranches.length} tranche${parsedTranches.length !== 1 ? "s" : ""})`,
    );
    sessionStorage.setItem("kinship.proposal-launch.perfData", JSON.stringify({
      recipientWallet: recipientWallet.trim(),
      rewardMintAddress: baseMint?.toBase58() ?? "",
      tranches: parsedTranches,
      minUnlockTimestamp: new Date(minUnlockTimestamp).toISOString(),
      twapWindowHours: parseInt(twapWindowHours),
      programVersion,
      tokenDecimals: 9,
    }));

    const token = getToken() || getSessionToken();
    const lcHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (token) lcHeaders.Authorization = `Bearer ${token}`;
    fetch(`/api/v1/proposals/${id}/launch-context`, {
      method: "PATCH", headers: lcHeaders,
      body: JSON.stringify({ launchPhase: 0, context: {
        perfData: JSON.parse(sessionStorage.getItem("kinship.proposal-launch.perfData")!),
      }}),
    }).catch(() => {});

    router.push("/market/proposals/launching");
  }, [handleSaveDraft, recipientName, recipientWallet, rewardTicker, tranches,
      twapWindowHours, minUnlockTimestamp, programVersion, totalTokens,
      title, objectiveName, rationale, daoCtx, current?.slug, router]);

  // ── Render ──────────────────────────────────────────────────────

  const inputCls = "w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50";
  const labelCls = "text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5";
  const hintCls = "text-[10px] text-muted mt-1";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">
            <Link href="/market/proposals" className="hover:text-accent no-underline text-muted">Proposals</Link> / New / Performance grant
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Performance grant.</h1>
          <p className="text-muted mt-1">Price-based token grant — unlocks in tranches when token TWAP exceeds thresholds.</p>
        </div>
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0">
          <Icon icon="lucide:arrow-left" width={14} height={14} /> Change type
        </button>
      </div>

      {/* Type banner */}
      <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-purple-500/[0.06] border border-purple-500/20">
        <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
          <Icon icon="lucide:trophy" width={22} height={22} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-sm">Performance grant</h2>
          <p className="text-xs text-muted">Tokens escrow and unlock when price milestones are hit.</p>
        </div>
      </div>

      {/* Error */}
      {formError && (
        <div data-form-error className="p-3 mb-5 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-sm text-red-400">
          {formError}
        </div>
      )}

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
              <label className={labelCls}>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Performance grant — VP Engineering" className={inputCls} />
            </div>
            <div className="mb-4">
              <ObjectiveSelector
                kind="perf"
                objectiveId={objectiveId}
                impactClaims={impactClaims}
                onObjectiveChange={(id, _dimensions, name) => { setObjectiveId(id); setObjectiveName(name); }}
                onClaimsChange={setImpactClaims}
              />
            </div>
            <div>
              <label className={labelCls}>Rationale</label>
              <textarea rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)}
                placeholder="Why this grant?" className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* 2. Recipient */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-4">2 · Recipient</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={labelCls}>Recipient name</label>
                <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Who earns the reward" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Reward ticker</label>
                <input value={rewardTicker} onChange={(e) => setRewardTicker(e.target.value)}
                  placeholder="e.g. ACME" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Recipient wallet</label>
              <input value={recipientWallet} onChange={(e) => setRecipientWallet(e.target.value)}
                placeholder="Solana wallet address" className={`${inputCls} font-mono text-sm`} />
            </div>
          </div>

          {/* 3. Price tranches */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1">3 · Price tranches</h2>
            <p className="text-xs text-muted/60 mb-4">
              Each tranche unlocks its token amount when the token&apos;s TWAP exceeds
              the price threshold. Thresholds should be in ascending order.
            </p>

            <div className="space-y-2 mb-3">
              {tranches.map((t, i) => (
                <div key={t.id} className="flex gap-2 items-start">
                  <div className="w-7 h-9 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-mono text-muted">{i + 1}.</span>
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Price threshold (USDC)</label>
                    <input value={t.priceThreshold} onChange={(e) => updateTranche(t.id, "priceThreshold", e.target.value)}
                      placeholder="0.10" className={`${inputCls} font-mono`} />
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Token amount</label>
                    <input value={t.tokenAmount} onChange={(e) => updateTranche(t.id, "tokenAmount", e.target.value)}
                      placeholder="25,000" className={inputCls} />
                  </div>
                  {tranches.length > 1 && (
                    <button type="button" onClick={() => removeTranche(t.id)}
                      className="mt-6 px-2 text-muted hover:text-red-400 cursor-pointer shrink-0" style={{ background: "none", border: "none" }}>×</button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" onClick={addTranche}
              className="text-xs text-accent hover:underline cursor-pointer mb-3" style={{ background: "none", border: "none", padding: 0 }}>
              + Add tranche
            </button>

            {totalTokens > 0 && (
              <div className="p-3 rounded-xl bg-purple-500/[0.06] border border-purple-500/20 text-sm">
                <span className="text-muted">Total reward: </span>
                <span className="text-purple-400 font-semibold font-mono">
                  {totalTokens.toLocaleString()} {rewardTicker || "tokens"}
                </span>
                <span className="text-muted"> across {tranches.length} tranche{tranches.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* 4. TWAP & timing */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1">4 · TWAP & timing</h2>
            <p className="text-xs text-muted/60 mb-4">Configure the price oracle window and earliest unlock.</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={labelCls}>TWAP window (hours)</label>
                <input value={twapWindowHours} onChange={(e) => setTwapWindowHours(e.target.value)} className={inputCls} />
                <p className={hintCls}>Price must sustain for this window. Default 24h.</p>
              </div>
              <div>
                <label className={labelCls}>Earliest unlock</label>
                <input type="datetime-local" value={minUnlockTimestamp}
                  onChange={(e) => setMinUnlockTimestamp(e.target.value)} className={inputCls} />
                <p className={hintCls}>No unlock before this timestamp.</p>
              </div>
            </div>

            {/* Conditions */}
            <div className="pt-4 border-t border-card-border">
              <label className={labelCls}>Unlock condition descriptions ({unlockConditions.length})</label>
              <div className="space-y-2">
                {unlockConditions.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <input value={c.description} onChange={(e) => updateCondition(c.id, e.target.value)}
                      placeholder="e.g. Token TWAP exceeds $0.10 for 24h"
                      className={`${inputCls} flex-1`} />
                    {unlockConditions.length > 1 && (
                      <button type="button" onClick={() => removeCondition(c.id)}
                        className="px-2 text-muted hover:text-red-400 cursor-pointer" style={{ background: "none", border: "none" }}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addCondition}
                className="mt-2 text-xs text-accent hover:underline cursor-pointer" style={{ background: "none", border: "none", padding: 0 }}>
                + Add condition
              </button>
            </div>
          </div>

          {/* 5. Program version */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-4">5 · Program version</h2>
            <label className={labelCls}>Program version</label>
            <select value={programVersion} onChange={(e) => setProgramVersion(e.target.value as "v0.6" | "v0.7")}
              className={`${inputCls} cursor-pointer`}>
              <option value="v0.6">v0.6 — pbPPQH7jyKoSLu8QYs3rSY3YkDRXEBojKbTgnUg7NDS</option>
              <option value="v0.7">v0.7 — pPV2pfrxnmstSb9j7kEeCLny5BGj6SNwCWGd6xbGGzz</option>
            </select>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border">
            <h3 className="text-white font-bold text-sm mb-2">How it works</h3>
            <p className="text-muted text-xs leading-relaxed mb-2">
              On Pass, a performance package PDA is created on-chain. Your reward tokens
              are escrowed in its vault. The recipient can start an unlock attempt when:
            </p>
            <ol className="text-muted text-xs leading-relaxed list-decimal pl-4 space-y-1 mb-2">
              <li>The current timestamp exceeds the <span className="text-white">earliest unlock</span> time</li>
              <li>The token&apos;s <span className="text-white">TWAP</span> (time-weighted average price) exceeds a tranche&apos;s <span className="text-white">price threshold</span> for the configured window</li>
            </ol>
            <p className="text-muted text-xs leading-relaxed">
              Each tranche unlocks independently. Lower-priced tranches unlock first as the token price rises.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-dashed border-accent/30 bg-accent/[0.03]">
            <p className="text-xs text-accent/80">
              <span className="font-semibold text-accent">Treasury must hold the reward tokens</span> at execute time. Mint first if needed, then propose the grant.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2.5 text-sm text-muted hover:text-white transition-colors cursor-pointer">← Back</button>
        <button onClick={() => handleSaveDraft()} disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50">
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button onClick={handleReviewOpen} disabled={saving}
          className="bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
          Review & open →
        </button>
      </div>
    </div>
  );
}
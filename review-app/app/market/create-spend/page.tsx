"use client";

/**
 * Spend Tokens — proposal creation form.
 *
 * Wired to:
 *   - ObjectiveSelector (shared) for objective + impact claims
 *   - POST /v1/markets/{slug}/proposals/spend for draft creation
 *   - useProposalSubmit → runPhase1/2/3 for on-chain submission
 *   - Navigates to /market/proposals/launching for on-chain submission
 */

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Icon } from "@iconify/react";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { getToken, getSessionToken } from "@/lib/auth";
import {
  ObjectiveSelector,
  type ImpactClaim,
} from "@/components/proposal-create/ObjectiveSelector";

import {
  buildSpendInstruction,
  ensureRecipientAta,
} from "@/lib/onchain/instruction-builders-light";

// ── Helpers ───────────────────────────────────────────────────────

const USDC_DECIMALS = 6;
const TITLE_MAX = 80;
const RATIONALE_MAX = 500;

function isValidBase58Pubkey(s: string): boolean {
  try { new PublicKey(s); return s.length >= 32 && s.length <= 44; }
  catch { return false; }
}

function parseAmount(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function formatUsd(n: number): string {
  // USDC has 6 decimals — allow up to 6 fraction digits so small test amounts
  // (e.g. 0.0001) aren't silently rounded down to "0" in the UI.
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 });
}

function makeIdempotencyKey(slug: string, title: string, recipientAddress: string, amountUsd: number): string {
  return `spend:${slug}:${title.trim()}:${recipientAddress.trim()}:${amountUsd}`;
}

// ── Types ─────────────────────────────────────────────────────────

interface Recipient { id: string; name: string; wallet: string; amount: string; }

// ── Page ──────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const { connection } = useConnection();
  const daoCtx = useDaoContext();

  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [objectiveId, setObjectiveId] = useState<string | null>(null);
  const [objectiveName, setObjectiveName] = useState("");
  const [impactClaims, setImpactClaims] = useState<ImpactClaim[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: "r1", name: "", wallet: "", amount: "" },
  ]);
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

  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const treasuryBalance = usdcBalance;

  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Scroll to top when form error appears
  useEffect(() => {
    if (formError) requestAnimationFrame(() => document.querySelector('[data-form-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [formError])
  const draftKeyRef = useRef<string | null>(null);

  // ── Fetch USDC treasury balance ──────────────────────────────
  useEffect(() => {
    if (!daoCtx.ok || !daoCtx.ctx?.usdcMint) return;
    let cancelled = false;
    (async () => {
      try {
        const ata = getAssociatedTokenAddressSync(daoCtx.ctx!.usdcMint, daoCtx.ctx!.treasuryVault, true);
        const bal = await connection.getTokenAccountBalance(ata);
        if (!cancelled) setUsdcBalance(parseFloat(bal.value.uiAmountString ?? "0"));
      } catch { if (!cancelled) setUsdcBalance(null); }
    })();
    return () => { cancelled = true; };
  }, [connection, daoCtx.ok, daoCtx.ctx]);

  // ── Computed ──────────────────────────────────────────────────
  const totalAmount = recipients.reduce((sum, r) => sum + parseAmount(r.amount), 0);
  const treasuryAfter = treasuryBalance != null ? treasuryBalance - totalAmount : null;
  const overBudget = treasuryAfter != null && treasuryAfter < 0;

  const updateRecipient = (id: string, k: keyof Recipient, v: string) => setRecipients((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));

  // ── Validation ────────────────────────────────────────────────
  function validate(): string | null {
    if (!current.slug) return "Market context not loaded.";
    if (!title.trim()) return "Title is required.";
    if (!objectiveId) return "Select an objective.";
    if (!rationale.trim()) return "Rationale is required.";
    for (const r of recipients) {
      if (!r.name.trim()) return "Every recipient needs a name.";
      if (!r.wallet.trim()) return "Please enter Wallet address.";
      if (!isValidBase58Pubkey(r.wallet)) return `Invalid wallet address for "${r.name}".`;
      if (parseAmount(r.amount) <= 0) return `Amount for "${r.name}" must be positive.`;
    }
    if (overBudget) return "Total exceeds treasury balance.";
    return null;
  }

  function validateDaoContext(): string | null {
    if (!daoCtx.ok || !daoCtx.ctx) return "DAO context is not ready. Run local setup first: airdrop, create-mints, create-dao, fund-treasury.";
    return null;
  }

  // ── Save draft ────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async (): Promise<string | null> => {
    const err = validate();
    if (err) { setFormError(err); return null; }
    setFormError(null);

    const primary = recipients[0];
    const currentKey = makeIdempotencyKey(current.slug, title, primary.wallet, totalAmount);
    if (draftId && draftKeyRef.current === currentKey) return draftId;

    setDraftId(null); draftKeyRef.current = null; setSaving(true);
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/v1/markets/${current.slug}/proposals/spend`, {
        method: "POST", headers,
        body: JSON.stringify({
          title: title.trim(), rationale: rationale.trim(), objectiveId, impactClaims,
          recipientName: primary.name.trim(), recipientAddress: primary.wallet.trim(),
          amountUsd: totalAmount, idempotencyKey: currentKey,
          asset: "usdc",
          mintAddress: daoCtx.ctx?.usdcMint?.toBase58() ?? null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? body.error ?? `Failed (${res.status})`);
      }

      const data = await res.json();
      setDraftId(data.id); draftKeyRef.current = currentKey;
      return data.id as string;
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed");
      return null;
    } finally { setSaving(false); }
  }, [title, rationale, objectiveId, impactClaims, recipients, current.slug, totalAmount]);

  // ── Navigate to launch page ────────────────────────────────────
  const handleReviewOpen = useCallback(async () => {
    const formErr = validate();
    if (formErr) { setFormError(formErr); return; }
    const daoErr = validateDaoContext();
    if (daoErr) { setFormError(daoErr); return; }
    setFormError(null);
    const id = await handleSaveDraft();
    if (!id) return;

    // Save proposal data to sessionStorage for the launching page
    const primary = recipients[0];
    const mint = daoCtx.ctx?.usdcMint;
    const rawAmount = BigInt(Math.round(parseAmount(primary.amount) * 10 ** USDC_DECIMALS)).toString();

    sessionStorage.setItem("kinship.proposal-launch.proposalId", id);
    sessionStorage.setItem("kinship.proposal-launch.title", title);
    sessionStorage.setItem("kinship.proposal-launch.objectiveName", objectiveName);
    sessionStorage.setItem("kinship.proposal-launch.rationale", rationale);
    sessionStorage.setItem("kinship.proposal-launch.kind", "spend");
    sessionStorage.setItem("kinship.proposal-launch.marketSlug", current.slug);
    sessionStorage.setItem("kinship.proposal-launch.summary",
      `$${formatUsd(totalAmount)} USDC → ${primary.name}`
    );
    sessionStorage.setItem("kinship.proposal-launch.spendData", JSON.stringify({
      recipientWallet: primary.wallet.trim(),
      amount: parseAmount(primary.amount),
      mint: mint?.toBase58() ?? "",
      rawAmount,
    }));

    // Persist build data to DB so it survives browser close (resume support)
    const token = getToken() || getSessionToken();
    const lcHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (token) lcHeaders.Authorization = `Bearer ${token}`;
    fetch(`/api/v1/proposals/${id}/launch-context`, {
      method: "PATCH", headers: lcHeaders,
      body: JSON.stringify({ launchPhase: 0, context: {
        spendData: { recipientWallet: primary.wallet.trim(), amount: parseAmount(primary.amount), mint: mint?.toBase58() ?? "", rawAmount },
      }}),
    }).catch(() => {}); // fire-and-forget

    router.push("/market/proposals/launching");
  }, [handleSaveDraft, recipients, daoCtx, title, objectiveName, rationale, totalAmount, current.slug, router]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">
            <Link href="/market/proposals" className="hover:text-accent no-underline text-muted">Proposals</Link> / New / Send funds
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Send funds</h1>
          <p className="text-muted mt-1">Authorize a payment from the treasury. On Pass, the recipient receives funds — no agents, no executor.</p>
        </div>
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0">
          <Icon icon="lucide:arrow-left" width={14} height={14} />
          Change type
        </button>
      </div>

      {/* Type banner */}
      <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-green-500/[0.06] border border-green-500/20">
        <div className="w-11 h-11 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
          <Icon icon="lucide:banknote" width={22} height={22} className="text-green-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-sm">Spending proposal</h2>
          <p className="text-xs text-muted">Move funds from treasury to a recipient on Pass.</p>
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
              <input value={title} maxLength={TITLE_MAX}
                onChange={(e) => { setTitle(e.target.value); setDraftId(null); draftKeyRef.current = null; }}
                placeholder="One-line summary"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors" />
              <div className="flex justify-end mt-1.5">
                <span className="text-[0.72rem]" style={{ color: title.length >= TITLE_MAX ? '#fff' : 'rgba(255,255,255,0.4)' }}>{title.length}/{TITLE_MAX}</span>
              </div>
            </div>

            <ObjectiveSelector
              kind="spend"
              objectiveId={objectiveId}
              impactClaims={impactClaims}
              onObjectiveChange={(id, _dimensions, name) => { setObjectiveId(id); setObjectiveName(name); }}
              onClaimsChange={setImpactClaims}
            />

            <div className="mt-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Rationale <span className="text-accent">*</span></label>
              <textarea rows={3} value={rationale} maxLength={RATIONALE_MAX} onChange={(e) => setRationale(e.target.value)}
                placeholder="Why this spend? What does it solve?"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none" />
              <div className="flex justify-end mt-1.5">
                <span className="text-[0.72rem]" style={{ color: rationale.length >= RATIONALE_MAX ? '#fff' : 'rgba(255,255,255,0.4)' }}>{rationale.length}/{RATIONALE_MAX}</span>
              </div>
            </div>
          </div>

          {/* 2. Recipients */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1">2 · Recipients</h2>
            <p className="text-xs text-muted/60 mb-3">Add the recipient wallets and amounts in USDC.</p>

            {/* Treasury balance */}
            <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-card-border flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Treasury (USDC)</span>
              <span className="text-sm font-semibold text-foreground">
                {usdcBalance != null ? `$${formatUsd(usdcBalance)}` : daoCtx.loading ? "Loading…" : "—"}
              </span>
            </div>

            {/* Recipients */}
            <div className="grid grid-cols-[1fr_1fr_120px] gap-2 mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Recipient Name <span className="text-accent">*</span></label>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Wallet Address <span className="text-accent">*</span></label>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Amount <span className="text-accent">*</span></label>
            </div>
            <div className="space-y-2">
              {recipients.map((r) => (
                <div key={r.id} className="grid grid-cols-[1fr_1fr_120px] gap-2 items-start">
                  <input placeholder="Recipient name" value={r.name}
                    onChange={(e) => updateRecipient(r.id, "name", e.target.value)}
                    className="bg-input border border-card-border rounded-lg px-3 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50" />
                  <input placeholder="Solana wallet address" value={r.wallet}
                    onChange={(e) => { updateRecipient(r.id, "wallet", e.target.value); setDraftId(null); draftKeyRef.current = null; }}
                    className={`bg-input border rounded-lg px-3 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 ${
                      r.wallet && !isValidBase58Pubkey(r.wallet) ? "border-red-500/50" : "border-card-border"
                    }`} />
                  <input placeholder="Amount" value={r.amount}
                    onChange={(e) => { updateRecipient(r.id, "amount", e.target.value); setDraftId(null); draftKeyRef.current = null; }}
                    className="bg-input border border-card-border rounded-lg px-3 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50" />
                </div>
              ))}
            </div>

            {/* Total impact */}
            <div className={`mt-4 p-4 rounded-xl border ${
              overBudget ? "bg-red-500/[0.06] border-red-500/20" : "bg-green-500/[0.06] border-green-500/20"
            }`}>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${overBudget ? "text-red-400" : "text-green-400"}`}>Total Impact</div>
              <div className="text-2xl font-bold text-white mt-1">{formatUsd(totalAmount)} USDC</div>
              <div className={`text-xs mt-1 ${overBudget ? "text-red-400" : "text-muted"}`}>
                {treasuryAfter != null ? `Treasury after: $${formatUsd(treasuryAfter)}` : ""}
                {overBudget && " — exceeds balance"}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border">
            <h3 className="text-white font-bold text-sm mb-2">On Pass</h3>
            <p className="text-muted text-xs leading-relaxed mb-2">
              Treasury debits the spend amount. The recipient receives it. No executor. No scope envelope.
            </p>
            <p className="text-muted text-xs leading-relaxed">
              Citizens see this as a <span className="text-green-400 font-semibold">SPEND</span> proposal
              and trade it against the Objective's value dimensions.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-dashed border-accent/30 bg-accent/[0.03]">
            <p className="text-xs text-accent/80">
              <span className="font-semibold text-accent">Once Pass.</span> The transfer fires automatically when finalize runs. No further action needed from you.
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

      {/* Testing note */}
      <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-card-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Local Testing</p>
        <p className="text-xs text-muted/80">
          Local testing uses <code className="bg-white/[0.06] px-1.5 py-0.5 rounded font-mono text-[11px]">http://127.0.0.1:8899</code>. For devnet, use deployed devnet DAO, treasury, mint, and market records.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2.5 text-sm text-muted hover:text-white transition-colors cursor-pointer">
          ← Back
        </button>
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
"use client";

/**
 * Mint Tokens — proposal creation form.
 */

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { getMint } from "@solana/spl-token";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";
import { useCurrentMarket } from "@/lib/market-context";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { getToken, getSessionToken } from "@/lib/auth";
import { ObjectiveSelector, type ImpactClaim } from "@/components/proposal-create/ObjectiveSelector";

function isValidBase58Pubkey(s: string): boolean {
  try { new PublicKey(s); return s.length >= 32 && s.length <= 44; } catch { return false; }
}
function parseAmount(s: string): number { return parseFloat(s.replace(/,/g, "")) || 0; }
function fmtNum(n: number): string { return n.toLocaleString("en-US", { maximumFractionDigits: 2 }); }

interface Recipient { id: string; wallet: string; amount: string; }

export default function Page() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const { connection } = useConnection();
  const daoCtx = useDaoContext();
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
  const [recipients, setRecipients] = useState<Recipient[]>([{ id: "r1", wallet: "", amount: "" }]);

  const [currentSupply, setCurrentSupply] = useState<number | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState(9);
  const [mintAuthOk, setMintAuthOk] = useState<boolean | null>(null);
  const [tokenTicker, setTokenTicker] = useState("TOKEN");
  const [mintAddress, setMintAddress] = useState<string | null>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Scroll to top when form error appears
  useEffect(() => {
    if (formError) requestAnimationFrame(() => document.querySelector('[data-form-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [formError])

  // ── Fetch token info ──────────────────────────────────────────
  useEffect(() => {
    if (!daoCtx.ok || !daoCtx.ctx) return;
    let cancelled = false;
    (async () => {
      try {
        const token = getToken() || getSessionToken();
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`/api/v1/markets/${current.slug}`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        const market = data.market ?? data;
        const mintAddr = market.tokenMintAddress;
        if (!mintAddr || cancelled) return;
        setMintAddress(mintAddr);
        if (market.tokenTicker) setTokenTicker(market.tokenTicker);
        const mintPubkey = new PublicKey(mintAddr);
        const mintInfo = await getMint(connection, mintPubkey);
        if (cancelled) return;
        setTokenDecimals(mintInfo.decimals);
        setCurrentSupply(Number(mintInfo.supply) / 10 ** mintInfo.decimals);
        const treasury = daoCtx.ctx!.treasuryVault;
        setMintAuthOk(mintInfo.mintAuthority?.equals(treasury) ?? false);
      } catch { /* failed */ }
    })();
    return () => { cancelled = true; };
  }, [connection, daoCtx, current.slug]);

  const totalAmount = recipients.reduce((s, r) => s + parseAmount(r.amount), 0);
  const supplyAfter = currentSupply != null ? currentSupply + totalAmount : null;
  const dilutionPct = currentSupply != null && currentSupply > 0 ? ((totalAmount / currentSupply) * 100) : null;

  const addRow = () => setRecipients((rs) => [...rs, { id: `r${Date.now()}`, wallet: "", amount: "" }]);
  const removeRow = (id: string) => setRecipients((rs) => rs.filter((r) => r.id !== id));
  const update = (id: string, k: keyof Recipient, v: string) => setRecipients((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));

  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (!objectiveId) return "Select an objective.";
    if (!rationale.trim()) return "Rationale is required.";
    if (mintAuthOk === false) return "Mint authority is not the treasury vault.";
    for (const r of recipients) {
      if (!isValidBase58Pubkey(r.wallet)) return `Invalid wallet: ${r.wallet || "(empty)"}`;
      if (parseAmount(r.amount) <= 0) return "Every recipient needs a positive amount.";
    }
    if (totalAmount <= 0) return "Total mint amount must be positive.";
    return null;
  }

  const handleSaveDraft = useCallback(async () => {
    const err = validate();
    if (err) { setFormError(err); return null; }
    setFormError(null); setSaving(true);
    const distribution = recipients.map((r) => ({ recipient: r.wallet.trim(), pct: totalAmount > 0 ? (parseAmount(r.amount) / totalAmount) * 100 : 0 }));
    try {
      const token = getToken() || getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/v1/markets/${current.slug}/proposals/mint`, {
        method: "POST", headers,
        body: JSON.stringify({ title: title.trim(), rationale: rationale.trim(), objectiveId, impactClaims, amount: totalAmount, ticker: tokenTicker, distribution }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error ?? `Failed (${res.status})`); }
      const data = await res.json();
      setDraftId(data.id); return data.id as string;
    } catch (e) { setFormError(e instanceof Error ? e.message : "Save failed"); return null; }
    finally { setSaving(false); }
  }, [title, rationale, objectiveId, impactClaims, recipients, totalAmount, tokenTicker, current.slug]);

  const handleReviewOpen = useCallback(async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    const id = draftId ?? (await handleSaveDraft());
    if (!id) return;

    // Save mint data to sessionStorage for the launching page
    sessionStorage.setItem("kinship.proposal-launch.proposalId", id);
    sessionStorage.setItem("kinship.proposal-launch.title", title);
    sessionStorage.setItem("kinship.proposal-launch.objectiveName", objectiveName);
    sessionStorage.setItem("kinship.proposal-launch.rationale", rationale);
    sessionStorage.setItem("kinship.proposal-launch.kind", "mint");
    sessionStorage.setItem("kinship.proposal-launch.marketSlug", current.slug);
    sessionStorage.setItem("kinship.proposal-launch.summary",
      `Mint ${totalAmount.toLocaleString()} ${tokenTicker} to ${recipients.length} recipient(s)`
    );
    sessionStorage.setItem("kinship.proposal-launch.mintData", JSON.stringify({
      mintAddress,
      tokenDecimals,
      recipients: recipients.map((r) => ({
        wallet: r.wallet.trim(),
        amount: parseAmount(r.amount),
        rawAmount: BigInt(Math.round(parseAmount(r.amount) * 10 ** tokenDecimals)).toString(),
      })),
    }));

    // Persist to DB for resume support
    const lcToken = getToken() || getSessionToken();
    const lcHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (lcToken) lcHeaders.Authorization = `Bearer ${lcToken}`;
    fetch(`/api/v1/proposals/${id}/launch-context`, {
      method: "PATCH", headers: lcHeaders,
      body: JSON.stringify({ launchPhase: 0, context: { mintData: {
        mintAddress, tokenDecimals,
        recipients: recipients.map((r) => ({ wallet: r.wallet.trim(), amount: parseAmount(r.amount) })),
      }}}),
    }).catch(() => {});

    router.push("/market/proposals/launching");
  }, [draftId, handleSaveDraft, title, objectiveName, rationale, totalAmount, tokenTicker, recipients, mintAddress, tokenDecimals, current.slug, router]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">
            <Link href="/market/proposals" className="hover:text-accent no-underline text-muted">Proposals</Link> / New / Mint tokens
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Mint tokens</h1>
          <p className="text-muted mt-1">Increase token supply. On Pass, new tokens are minted to the recipients. Existing holders dilute.</p>
        </div>
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0">
          <Icon icon="lucide:arrow-left" width={14} height={14} /> Change type
        </button>
      </div>

      {/* Type banner */}
      <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-blue-500/[0.06] border border-blue-500/20">
        <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
          <Icon icon="lucide:coins" width={22} height={22} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-sm">Mint proposal</h2>
          <p className="text-xs text-muted">Increase token supply on Pass.</p>
        </div>
      </div>

      {/* Mint authority alerts */}
      {mintAuthOk === false && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <Icon icon="lucide:alert-triangle" width={14} height={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-400"><span className="font-semibold">Mint authority mismatch.</span> The mint authority is not the treasury vault. Transfer it first — this proposal's execution will fail otherwise.</p>
        </div>
      )}
      {mintAuthOk === true && (
        <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-start gap-2">
          <Icon icon="lucide:check-circle" width={14} height={14} className="text-green-400 mt-0.5 shrink-0" />
          <p className="text-xs text-green-400"><span className="font-semibold">Mint authority verified.</span> The treasury vault holds mint authority. ✓</p>
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="One-line summary"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50" />
            </div>
            <ObjectiveSelector kind="mint" objectiveId={objectiveId} impactClaims={impactClaims}
              onObjectiveChange={(id) => { setObjectiveId(id); setObjectiveName(id); }} onClaimsChange={setImpactClaims} />
            <div className="mt-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Rationale</label>
              <textarea rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why this mint? What outcome justifies dilution?"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none" />
            </div>
          </div>

          {/* 2. Mint details */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1">2 · Mint details</h2>
            <div className="mb-4 mt-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Token mint</label>
              <input value={mintAddress ?? "Loading…"} disabled
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground opacity-50 font-mono text-sm" />
              <p className="text-[11px] text-muted mt-1.5">From this Market's token configuration.</p>
            </div>

            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Recipients</label>
            <div className="space-y-2">
              {recipients.map((r) => (
                <div key={r.id} className="grid grid-cols-[1fr_140px_28px] gap-2 items-start">
                  <input placeholder="Solana wallet address" value={r.wallet}
                    onChange={(e) => update(r.id, "wallet", e.target.value)}
                    className={`bg-input border rounded-lg px-3 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 ${
                      r.wallet && !isValidBase58Pubkey(r.wallet) ? "border-red-500/50" : "border-card-border"
                    }`} />
                  <input placeholder="Amount" value={r.amount} onChange={(e) => update(r.id, "amount", e.target.value)}
                    className="bg-input border border-card-border rounded-lg px-3 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50" />
                  <button onClick={() => removeRow(r.id)} disabled={recipients.length === 1}
                    className="mt-1.5 text-muted hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                    <Icon icon="lucide:x" width={16} height={16} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addRow}
              className="mt-3 w-full py-2 rounded-xl border border-dashed border-card-border text-muted hover:text-accent hover:border-accent/40 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs">
              <Icon icon="lucide:plus" width={13} height={13} /> Add recipient
            </button>

            {/* Total mint */}
            <div className="mt-4 p-4 rounded-xl bg-purple-500/[0.06] border border-purple-500/20">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Total Mint</div>
              <div className="text-2xl font-bold text-white mt-1">{fmtNum(totalAmount)} {tokenTicker}</div>
              <div className="text-xs text-muted mt-1">
                {currentSupply != null
                  ? `Current supply: ${fmtNum(currentSupply)} · After: ${fmtNum(supplyAfter!)} (+${dilutionPct!.toFixed(2)}%)`
                  : "Loading supply…"}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border">
            <h3 className="text-white font-bold text-sm mb-2">On Pass</h3>
            <p className="text-muted text-xs leading-relaxed mb-2">
              The total mint amount is created and distributed to the listed recipients. Total supply grows by that amount.
            </p>
            <p className="text-muted text-xs leading-relaxed">
              Citizens see this as a <span className="text-blue-400 font-semibold">MINT</span> proposal. Strict scrutiny — every dilution event must justify itself.
            </p>
          </div>
        </div>
      </div>

      {formError && (
        <div data-form-error className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <Icon icon="lucide:alert-circle" width={14} height={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-400">{formError}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => router.push("/market/create-start")} className="px-4 py-2.5 text-sm text-muted hover:text-white transition-colors cursor-pointer">← Back</button>
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
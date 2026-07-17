"use client";

/**
 * Adjust Treasury Liquidity — proposal creation form.
 * Reads current pool data from blockchain, lets user choose provide/withdraw.
 */

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConnection } from "@solana/wallet-adapter-react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";
import { useCurrentMarket } from "@/lib/market-context";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { getToken, getSessionToken } from "@/lib/auth";
import { ObjectiveSelector, type ImpactClaim } from "@/components/proposal-create/ObjectiveSelector";

const parseNum = (s: string) => { const n = parseFloat(s.replace(/,/g, "")); return isNaN(n) ? 0 : n; };
const fmtNum = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function Page() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const daoCtx = useDaoContext();
  const { connection } = useConnection();
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

  // Form state
  const [title, setTitle] = useState("");
  const [objectiveId, setObjectiveId] = useState<string | null>(null);
  const [objectiveName, setObjectiveName] = useState("");
  const [impactClaims, setImpactClaims] = useState<ImpactClaim[]>([]);
  const [rationale, setRationale] = useState("");
  const [direction, setDirection] = useState<"provide" | "withdraw">("provide");
  const [amount, setAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState("50"); // 0.5%

  // On-chain pool data
  const [poolName, setPoolName] = useState("");
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Scroll to top when form error appears
  useEffect(() => {
    if (formError) requestAnimationFrame(() => document.querySelector('[data-form-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [formError])

  // ── Read treasury balances from blockchain ──────────────────────
  useEffect(() => {
    if (!daoCtx.ok || !daoCtx.ctx) return;
    const { treasuryVault, usdcMint, baseMint } = daoCtx.ctx;
    let cancelled = false;

    const { getAssociatedTokenAddressSync } = require("@solana/spl-token");

    (async () => {
      try {
        const usdcAta = getAssociatedTokenAddressSync(usdcMint, treasuryVault, true);
        const bal = await connection.getTokenAccountBalance(usdcAta);
        if (!cancelled) setUsdcBalance(parseFloat(bal.value.uiAmountString ?? "0"));
      } catch { if (!cancelled) setUsdcBalance(null); }

      if (baseMint) {
        try {
          const baseAta = getAssociatedTokenAddressSync(baseMint, treasuryVault, true);
          const bal = await connection.getTokenAccountBalance(baseAta);
          if (!cancelled) setTokenBalance(parseFloat(bal.value.uiAmountString ?? "0"));
        } catch { if (!cancelled) setTokenBalance(null); }
      }
    })();

    // Derive pool name from market
    setPoolName(`${current.tokenTicker || current.slug.replace(/-/g, "").slice(0, 6).toUpperCase()}/USDC`);

    return () => { cancelled = true; };
  }, [connection, daoCtx.ok, daoCtx.ctx, current.slug, current.tokenTicker]);

  const tokenTicker = current.tokenTicker || current.slug.replace(/-/g, "").slice(0, 6).toUpperCase();
  const amountNum = parseNum(amount);

  // ── Validation ──────────────────────────────────────────────────
  const validate = useCallback(() => {
    if (!title.trim()) return "Title is required.";
    if (!objectiveId) return "Select an objective.";
    if (!rationale.trim()) return "Rationale is required.";
    if (amountNum <= 0) return "Amount must be positive.";
    if (direction === "provide" && usdcBalance != null && amountNum > usdcBalance) return "Amount exceeds treasury USDC balance.";
    return null;
  }, [title, objectiveId, rationale, amountNum, direction, usdcBalance]);

  // ── Save draft ──────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    const err = validate();
    if (err) { setFormError(err); return null; }
    setFormError(null);
    setSaving(true);
    try {
      const token = getToken() || getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/v1/markets/${current.slug}/proposals/liquidity`, {
        method: "POST", headers,
        body: JSON.stringify({
          title: title.trim(), rationale: rationale.trim(), objectiveId, impactClaims,
          direction, amountUsd: amountNum, poolName,
        }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error ?? `Failed (${res.status})`); }
      const data = await res.json();
      setDraftId(data.id);
      return data.id as string;
    } catch (e) { setFormError(e instanceof Error ? e.message : "Save failed"); return null; }
    finally { setSaving(false); }
  }, [title, rationale, objectiveId, impactClaims, direction, amountNum, poolName, current.slug]);

  // ── Navigate to launch ──────────────────────────────────────────
  const handleReviewOpen = useCallback(async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    const id = draftId ?? (await handleSaveDraft());
    if (!id) return;

    sessionStorage.setItem("kinship.proposal-launch.proposalId", id);
    sessionStorage.setItem("kinship.proposal-launch.title", title);
    sessionStorage.setItem("kinship.proposal-launch.objectiveName", objectiveName);
    sessionStorage.setItem("kinship.proposal-launch.rationale", rationale);
    sessionStorage.setItem("kinship.proposal-launch.kind", "liquidity");
    sessionStorage.setItem("kinship.proposal-launch.marketSlug", current.slug);
    sessionStorage.setItem("kinship.proposal-launch.summary",
      `${direction === "provide" ? "Add" : "Remove"} ${fmtNum(amountNum)} USDC ${direction === "provide" ? "to" : "from"} ${poolName}`
    );
    sessionStorage.setItem("kinship.proposal-launch.liquidityData", JSON.stringify({
      direction, amountUsd: amountNum, slippageBps: parseInt(slippageBps, 10),
    }));

    // Persist for resume
    const lcToken = getToken() || getSessionToken();
    const lcHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (lcToken) lcHeaders.Authorization = `Bearer ${lcToken}`;
    fetch(`/api/v1/proposals/${id}/launch-context`, {
      method: "PATCH", headers: lcHeaders,
      body: JSON.stringify({ launchPhase: 0, context: { liquidityData: { direction, amountUsd: amountNum, slippageBps: parseInt(slippageBps, 10) } } }),
    }).catch(() => {});

    router.push("/market/proposals/launching");
  }, [draftId, handleSaveDraft, title, objectiveName, rationale, direction, amountNum, poolName, slippageBps, current.slug, router]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">
            <Link href="/market/proposals" className="hover:text-accent no-underline text-muted">Proposals</Link> / New / Adjust liquidity
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Adjust treasury liquidity.</h1>
          <p className="text-muted mt-1">Add or remove liquidity from the DAO's AMM pool.</p>
        </div>
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0">
          <Icon icon="lucide:arrow-left" width={14} height={14} /> Change type
        </button>
      </div>

      {/* Type banner */}
      <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20">
        <div className="w-11 h-11 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
          <Icon icon="lucide:droplets" width={22} height={22} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-sm">Liquidity adjustment</h2>
          <p className="text-xs text-muted">Modify the {poolName} pool reserves on Pass.</p>
        </div>
      </div>

      {formError && (
        <div data-form-error className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{formError}</div>
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
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Add 50K USDC to spot pool"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50" />
            </div>

            <ObjectiveSelector kind="liquidity" objectiveId={objectiveId} impactClaims={impactClaims}
              onObjectiveChange={(id, _dims, name) => { setObjectiveId(id); setObjectiveName(name); }}
              onClaimsChange={setImpactClaims} />

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Rationale</label>
              <textarea rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why this liquidity adjustment?"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none" />
            </div>
          </div>

          {/* 2. Direction & amount */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-4">2 · Direction & amount</h2>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setDirection("provide")}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  direction === "provide" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-card border-card-border text-muted hover:border-white/20"
                }`}>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{direction === "provide" ? "Provide ✓" : "Provide"}</div>
                <div className="font-bold text-sm">Add liquidity</div>
                <div className="text-[10px] opacity-70">Treasury → pool</div>
              </button>
              <button onClick={() => setDirection("withdraw")}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  direction === "withdraw" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-card border-card-border text-muted hover:border-white/20"
                }`}>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{direction === "withdraw" ? "Remove ✓" : "Remove"}</div>
                <div className="font-bold text-sm">Remove liquidity</div>
                <div className="text-[10px] opacity-70">Pool → treasury</div>
              </button>
            </div>

            <div className="mb-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                {direction === "provide" ? "USDC amount to add" : "USDC equivalent to remove"}
              </label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono" />
              <p className="text-[10px] text-muted mt-1">
                {direction === "provide" 
                  ? `Treasury USDC: ${usdcBalance != null ? `$${fmtNum(usdcBalance)}` : "Loading…"}`
                  : "LP units will be calculated at execution time."}
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Slippage tolerance</label>
              <select value={slippageBps} onChange={(e) => setSlippageBps(e.target.value)}
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent/50 cursor-pointer">
                <option value="10">0.1%</option>
                <option value="50">0.5% (default)</option>
                <option value="100">1%</option>
                <option value="200">2%</option>
              </select>
            </div>

            {/* Treasury balances */}
            <div className="mt-4 p-4 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">Treasury balances</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted leading-relaxed">
                <div>USDC: <span className="text-white font-medium">{usdcBalance != null ? `$${fmtNum(usdcBalance)}` : "Loading…"}</span></div>
                <div>{tokenTicker}: <span className="text-white font-medium">{tokenBalance != null ? fmtNum(tokenBalance) : "Loading…"}</span></div>
                <div>Pool: <span className="text-white font-medium">{poolName}</span></div>
              </div>
            </div>

            {amountNum > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-card-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Impact</p>
                <p className="text-sm text-white">
                  {direction === "provide" ? "+" : "-"}{fmtNum(amountNum)} USDC {direction === "provide" ? "into" : "from"} {poolName}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border">
            <h3 className="text-white font-bold text-sm mb-2">On Pass</h3>
            <p className="text-muted text-xs leading-relaxed mb-2">
              {direction === "provide"
                ? "Treasury adds liquidity. Pool depth grows. Price impact for trades shrinks."
                : "Treasury removes liquidity. Pool depth drops. Treasury receives back USDC + tokens."}
            </p>
            <p className="text-muted text-xs leading-relaxed">
              Citizens see this as a <span className="text-cyan-400 font-semibold">LIQUIDITY</span> proposal.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2.5 text-sm text-muted hover:text-white transition-colors cursor-pointer">← Back</button>
        <button onClick={handleSaveDraft} disabled={saving}
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
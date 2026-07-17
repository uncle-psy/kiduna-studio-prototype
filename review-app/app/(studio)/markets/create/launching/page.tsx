"use client";

/**
 * /launchpad/{slug} — Campaign detail + contribute/claim/approve page.
 * Shows campaign progress, token info, and action widgets based on state.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, Keypair } from "@solana/web3.js";
import { Buffer } from "buffer";
import type { CampaignDetail, ContributionSummary } from "@/lib/launchpad-api-types";

export default function CampaignDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { token, user } = useAuth();
  const wallet = user?.wallet || null;
  const { publicKey, signTransaction, connected } = useWallet();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [myContribution, setMyContribution] = useState<ContributionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scroll to top when error appears
  useEffect(() => {
    if (error) document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error])

  // Action states
  const [contributing, setContributing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initStep, setInitStep] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  function makeHeaders(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/launchpad/${slug}`, { headers: makeHeaders() });
      if (!res.ok) throw new Error("Campaign not found");
      const data: CampaignDetail = await res.json();
      setCampaign(data);

      // Fetch my contribution
      if (wallet) {
        const cRes = await fetch(`/api/v1/markets/${slug}/contributions?wallet=${wallet}`);
        if (cRes.ok) {
          const cData = await cRes.json();
          setMyContribution(cData.data?.[0] ?? null);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug, token, wallet]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  // Auto-refresh during fundraising
  useEffect(() => {
    if (campaign?.launchStatus !== "fundraising") return;
    const interval = setInterval(fetchCampaign, 10000);
    return () => clearInterval(interval);
  }, [campaign?.launchStatus, fetchCampaign]);

  /* ── Contribute USDC ─────────────────────────────────────────────── */
  async function handleContribute() {
    if (!wallet || !campaign?.launchAddress) return;
    const amount = Number(amountInput);
    if (amount <= 0) { setActionError("Enter a valid USDC amount."); return; }

    setContributing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // Build tx
      const buildRes = await fetch(`/api/v1/markets/${slug}/ico/fund/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ wallet, amountUsdc: amount }),
      });
      if (!buildRes.ok) { const d = await buildRes.json(); throw new Error(d.error || d.message || "Build failed"); }
      const { serializedTransaction } = await buildRes.json();

      // Sign with Phantom
      if (!signTransaction) throw new Error("Wallet not connected");
      
      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      if (!signTransaction) throw new Error("Wallet not connected"); const signed = await signTransaction(tx);

      // Submit
      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/fund/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signed.serialize()).toString("base64"), wallet, amountUsdc: amount }),
      });
      if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error || d.message || "Submit failed"); }
      const result = await submitRes.json();

      setActionSuccess(`✓ Contributed ${amount.toLocaleString()} USDC! Tx: ${result.txSignature.slice(0, 12)}...`);
      setAmountInput("");
      fetchCampaign();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setContributing(false);
    }
  }

  /* ── Claim tokens / Refund USDC ──────────────────────────────────── */
  async function handleClaim(type: "claim" | "refund") {
    if (!wallet) return;
    setClaiming(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const action = type === "claim" ? "claim" : "refund";
      const buildRes = await fetch(`/api/v1/markets/${slug}/ico/${action}/build`, {
        method: "POST", headers: makeHeaders(), body: JSON.stringify({ wallet }),
      });
      if (!buildRes.ok) { const d = await buildRes.json(); throw new Error(d.error || d.message || "Build failed"); }
      const { serializedTransaction } = await buildRes.json();

      if (!signTransaction) throw new Error("Wallet not connected");
      
      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      if (!signTransaction) throw new Error("Wallet not connected"); const signed = await signTransaction(tx);

      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/${action}/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signed.serialize()).toString("base64"), wallet }),
      });
      if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error || d.message || "Submit failed"); }
      const result = await submitRes.json();

      setActionSuccess(type === "claim"
        ? `✓ Claimed ${(result.tokensClaimed || 0).toLocaleString()} tokens!`
        : `✓ Refunded ${(result.usdcRefunded || 0).toLocaleString()} USDC!`);
      fetchCampaign();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  /* ── Initialize ICO (create mint + initializeLaunch) ───────────── */
  async function handleInitialize() {
    if (!wallet) return;
    console.log("[ICO Init] Starting...", { wallet, connected, hasSignTx: !!signTransaction, publicKey: publicKey?.toBase58() });
    if (!signTransaction) {
      setActionError("Wallet not ready for signing. Please reconnect your wallet.");
      return;
    }
    setInitializing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // Step 1: Create base mint
      setInitStep("Creating token mint...");
      const mintRes = await fetch(`/api/v1/markets/${slug}/ico/initialize/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ sponsorPubkey: wallet, step: "create-mint" }),
      });
      if (!mintRes.ok) { const d = await mintRes.json(); throw new Error(d.error || d.message || "Build mint failed"); }
      const mintData = await mintRes.json();

      if (!signTransaction) throw new Error("Wallet not connected");

      let tx: Transaction;

      // Resume idempotency: the mint may already exist (interrupted between the
      // mint and initialize txs). If so the server returns `alreadyMinted` with
      // the existing baseMint — skip re-minting.
      if (!mintData.alreadyMinted) {
        tx = Transaction.from(Buffer.from(mintData.serializedTransaction, "base64"));

        // Sign with generated keypair + wallet
        if (mintData.generatedKeypairs?.baseMint) {
          const mintKp = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(mintData.generatedKeypairs.baseMint, "base64")));
          tx.partialSign(mintKp);
        }
        const signedMint = await signTransaction(tx);

        const mintSubmit = await fetch(`/api/v1/markets/${slug}/ico/initialize/submit`, {
          method: "POST", headers: makeHeaders(),
          body: JSON.stringify({ signedTransaction: Buffer.from(signedMint.serialize()).toString("base64"), step: "create-mint", addresses: mintData.addresses }),
        });
        if (!mintSubmit.ok) { const d = await mintSubmit.json(); throw new Error(d.error || d.message || "Submit mint failed"); }
      }

      // Step 2: Initialize launch
      setInitStep("Initializing ICO on-chain...");
      const initRes = await fetch(`/api/v1/markets/${slug}/ico/initialize/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ sponsorPubkey: wallet, step: "initialize", baseMint: mintData.addresses.baseMint }),
      });
      if (!initRes.ok) { const d = await initRes.json(); throw new Error(d.error || d.message || "Build init failed"); }
      const initData = await initRes.json();

      tx = Transaction.from(Buffer.from(initData.serializedTransaction, "base64"));
      if (!signTransaction) throw new Error("Wallet not connected"); const signedInit = await signTransaction(tx);

      const initSubmit = await fetch(`/api/v1/markets/${slug}/ico/initialize/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signedInit.serialize()).toString("base64"), step: "initialize", addresses: initData.addresses }),
      });
      if (!initSubmit.ok) { const d = await initSubmit.json(); throw new Error(d.error || d.message || "Submit init failed"); }

      setInitStep(null);
      setActionSuccess("✓ ICO initialized on-chain! Now click 'Start ICO' to open contributions.");
      fetchCampaign();
    } catch (err: any) {
      console.error("[ICO Initialize Error]", err);
      setActionError(err?.message || err?.toString() || "Unexpected error during initialization");
      setInitStep(null);
    } finally {
      setInitializing(false);
    }
  }

  /* ── Start ICO (open contribution window) ────────────────────── */
  async function handleStartIco() {
    if (!wallet) return;
    setInitializing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const buildRes = await fetch(`/api/v1/markets/${slug}/ico/start/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ sponsorPubkey: wallet }),
      });
      if (!buildRes.ok) { const d = await buildRes.json(); throw new Error(d.error || d.message || "Build failed"); }
      const { serializedTransaction } = await buildRes.json();

      if (!signTransaction) throw new Error("Wallet not connected");
      
      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      if (!signTransaction) throw new Error("Wallet not connected"); const signed = await signTransaction(tx);

      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/start/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signed.serialize()).toString("base64") }),
      });
      if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error || d.message || "Submit failed"); }

      setActionSuccess("✓ ICO is now live! Contributors can commit USDC.");
      fetchCampaign();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setInitializing(false);
    }
  }

  /* ── Loading / Error ─────────────────────────────────────────────── */
  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted animate-pulse">Loading campaign...</div>;
  if (error || !campaign) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-red-400">{error || "Campaign not found"}</div>;

  const c = campaign;
  const isSponsor = wallet && c.sponsorWallet === wallet;
  const totalApproved = c.totalApproved || 0;
  const estimatedTokens = myContribution?.amountApproved && totalApproved > 0
    ? ((myContribution.amountApproved / totalApproved) * 10_000_000)
    : myContribution?.amountCommitted && c.totalCommitted > 0
      ? ((myContribution.amountCommitted / c.totalCommitted) * 10_000_000)
      : null;

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back button */}
      <button onClick={() => router.push("/launchpad")} className="text-sm text-muted hover:text-accent mb-4 transition-colors">
        ← Back to Launchpad
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-display font-bold tracking-tight">{c.name}</h1>
        {c.tokenTicker && <span className="font-mono text-sm text-muted bg-white/[0.06] px-2.5 py-1 rounded">{c.tokenTicker}</span>}
        <StatusBadge status={c.launchStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ LEFT COLUMN (2/3) ═══ */}
        <div className="lg:col-span-2 space-y-4">

          {/* Progress card */}
          <div className="p-5 rounded-xl bg-card border border-card-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Fundraising Progress</span>
              <span className="text-sm font-bold text-accent">{c.percentRaised}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden mb-3">
              <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${Math.min(100, c.percentRaised)}%` }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <Stat label="Committed" value={`${c.totalCommitted.toLocaleString()} USDC`} />
              <Stat label="Min target" value={c.minRaise ? `${c.minRaise.toLocaleString()} USDC` : "—"} />
              <Stat label="Contributors" value={String(c.contributorCount)} />
              <Stat label="Time left" value={formatTime(c.timeRemainingSeconds)} />
            </div>
          </div>

          {/* Token distribution */}
          <div className="p-5 rounded-xl bg-card border border-card-border">
            <div className="text-sm font-semibold mb-3">Token Distribution</div>
            <div className="space-y-2">
              <DistBar label="ICO Contributors" amount="10,000,000" pct={38.8} color="bg-accent" />
              <DistBar label="Futarchy AMM" amount="2,000,000" pct={7.8} color="bg-green-500" />
              <DistBar label="Meteora LP" amount="900,000" pct={3.5} color="bg-blue-500" />
              {c.perfPackageTokens && c.perfPackageTokens > 0 && (
                <DistBar label="Performance" amount={c.perfPackageTokens.toLocaleString()} pct={(c.perfPackageTokens / 25800000) * 100} color="bg-purple-500" />
              )}
            </div>
          </div>

          {/* USDC allocation */}
          <div className="p-5 rounded-xl bg-card border border-card-border">
            <div className="text-sm font-semibold mb-3">USDC Allocation (Protocol Fixed)</div>
            <div className="flex h-8 rounded-lg overflow-hidden">
              <div className="bg-accent flex items-center justify-center text-[11px] font-bold text-white" style={{ width: "80%" }}>Treasury 80%</div>
              <div className="bg-green-600 flex items-center justify-center text-[11px] font-bold text-white" style={{ width: "20%" }}>LP 20%</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="text-xs text-muted">Treasury: <span className="text-white font-semibold">{Math.floor((c.minRaise || 0) * 0.8).toLocaleString()} USDC</span></div>
              <div className="text-xs text-muted">Liquidity: <span className="text-white font-semibold">{Math.floor((c.minRaise || 0) * 0.2).toLocaleString()} USDC</span></div>
            </div>
          </div>

          {/* Recent contributions */}
          {c.recentContributions.length > 0 && (
            <div className="p-5 rounded-xl bg-card border border-card-border">
              <div className="text-sm font-semibold mb-3">Recent Contributions</div>
              <div className="space-y-2">
                {c.recentContributions.slice(0, 8).map((ct) => (
                  <div key={ct.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="font-mono text-muted">{ct.wallet.slice(0, 4)}...{ct.wallet.slice(-4)}</span>
                    <span className="font-semibold">{ct.amountCommitted.toLocaleString()} USDC</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT COLUMN (1/3) ═══ */}
        <div className="space-y-4">

          {/* Action widget */}
          <div className="p-5 rounded-xl bg-card border border-card-border">
            {c.launchStatus === "fundraising" && (
              <>
                <div className="text-sm font-semibold mb-3">💰 Contribute USDC</div>
                <div className="mb-3">
                  <input
                    type="number" placeholder="Amount (USDC)" value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-input border border-card-border text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                {estimatedTokens && (
                  <div className="text-xs text-muted mb-3">
                    Estimated tokens: <span className="text-white font-semibold">{Math.floor(estimatedTokens).toLocaleString()}</span>
                  </div>
                )}
                <button onClick={handleContribute} disabled={contributing || !wallet}
                  className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {contributing ? "Signing..." : wallet ? "Commit USDC" : "Connect wallet"}
                </button>
              </>
            )}

            {c.launchStatus === "live" && myContribution && myContribution.status !== "claimed" && (
              <>
                <div className="text-sm font-semibold mb-3">🎉 Claim Your Tokens</div>
                {estimatedTokens && (
                  <div className="text-xs text-muted mb-3">
                    You will receive: <span className="text-accent font-bold">{Math.floor(estimatedTokens).toLocaleString()} tokens</span>
                  </div>
                )}
                <button onClick={() => handleClaim("claim")} disabled={claiming}
                  className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {claiming ? "Claiming..." : "Claim Tokens"}
                </button>
              </>
            )}

            {(c.launchStatus === "refunding" || (c.launchStatus === "live" && myContribution && myContribution.amountApproved !== null && myContribution.amountCommitted > (myContribution.amountApproved || 0))) && myContribution && myContribution.status !== "refunded" && (
              <>
                <div className="text-sm font-semibold mb-3">💸 Claim USDC Refund</div>
                <div className="text-xs text-muted mb-3">
                  Refund: <span className="text-white font-semibold">
                    {c.launchStatus === "refunding"
                      ? myContribution.amountCommitted.toLocaleString()
                      : (myContribution.amountCommitted - (myContribution.amountApproved || 0)).toLocaleString()
                    } USDC
                  </span>
                </div>
                <button onClick={() => handleClaim("refund")} disabled={claiming}
                  className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {claiming ? "Processing..." : "Claim Refund"}
                </button>
              </>
            )}

            {c.launchStatus === "draft" && isSponsor && (
              <>
                <div className="text-sm font-semibold mb-3">🚀 Initialize Your ICO</div>
                <div className="text-xs text-muted mb-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">1</span>
                    <span>Create token mint on Solana</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">2</span>
                    <span>Initialize launch account + metadata</span>
                  </div>
                </div>
                {initStep && <div className="text-xs text-accent mb-3 animate-pulse">{initStep}</div>}
                <button onClick={handleInitialize} disabled={initializing || !wallet}
                  className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {initializing ? (initStep || "Processing...") : "Initialize ICO on-chain →"}
                </button>
                <div className="text-[11px] text-muted mt-2 text-center">2 transactions — Phantom will ask you to sign twice.</div>
              </>
            )}

            {c.launchStatus === "draft" && !isSponsor && (
              <div className="text-sm text-muted text-center py-4">
                ⏳ Campaign is being set up. Check back soon.
              </div>
            )}

            {c.launchStatus === "initialized" && isSponsor && (
              <>
                <div className="text-sm font-semibold mb-3">✅ ICO Initialized — Ready to Start</div>
                <div className="text-xs text-muted mb-4">
                  Your ICO is set up on-chain. Click below to open the {c.icoDurationSeconds ? `${c.icoDurationSeconds >= 86400 ? Math.round(c.icoDurationSeconds / 86400) + '-day' : c.icoDurationSeconds >= 3600 ? Math.round(c.icoDurationSeconds / 3600) + '-hour' : Math.round(c.icoDurationSeconds / 60) + '-minute'}` : ""} contribution window. Once started, contributors can commit USDC.
                </div>
                <button onClick={handleStartIco} disabled={initializing}
                  className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {initializing ? "Starting..." : "Start ICO — Open Contributions 🟢"}
                </button>
              </>
            )}

            {c.launchStatus === "initialized" && !isSponsor && (
              <div className="text-sm text-muted text-center py-4">
                ⏳ ICO starting soon. The sponsor will open contributions shortly.
              </div>
            )}

            {c.launchStatus === "live" && (!myContribution || myContribution.status === "claimed") && (
              <div className="text-sm text-muted text-center py-4">
                ✅ Market is live! Trade on the pool or participate in governance.
              </div>
            )}
          </div>

          {/* My position */}
          {myContribution && (
            <div className="p-5 rounded-xl bg-card border border-card-border">
              <div className="text-sm font-semibold mb-3">Your Position</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted">Committed</span><span className="font-semibold">{myContribution.amountCommitted.toLocaleString()} USDC</span></div>
                {myContribution.amountApproved !== null && (
                  <div className="flex justify-between"><span className="text-muted">Approved</span><span className="font-semibold">{(myContribution.amountApproved || 0).toLocaleString()} USDC</span></div>
                )}
                {estimatedTokens && (
                  <div className="flex justify-between"><span className="text-muted">Est. tokens</span><span className="font-semibold text-accent">{Math.floor(estimatedTokens).toLocaleString()}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted">Status</span><span className="font-mono uppercase">{myContribution.status}</span></div>
              </div>
            </div>
          )}

          {/* Campaign info */}
          <div className="p-5 rounded-xl bg-card border border-card-border">
            <div className="text-sm font-semibold mb-3">Campaign Info</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted">Sponsor</span><span className="font-mono">{c.sponsorWallet.slice(0, 4)}...{c.sponsorWallet.slice(-4)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Duration</span><span>{c.icoDurationSeconds ? `${c.icoDurationSeconds / 86400} days` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted">Monthly budget</span><span>{c.monthlyBudgetUsdc ? `${c.monthlyBudgetUsdc.toLocaleString()} USDC` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted">Bid wall</span><span>{c.hasBidWall ? "✅ Enabled" : "❌ Disabled"}</span></div>
              {c.icoPrice && <div className="flex justify-between"><span className="text-muted">ICO price</span><span className="text-accent font-semibold">${c.icoPrice.toFixed(6)}</span></div>}
            </div>
          </div>

          {/* Errors/Success */}
          {actionError && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400">{actionError}</div>}
          {actionSuccess && <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/25 text-xs text-green-400">{actionSuccess}</div>}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-white/10 text-muted" },
    fundraising: { label: "🟢 Live", cls: "bg-green-500/15 text-green-400" },
    initialized: { label: "Ready", cls: "bg-blue-500/15 text-blue-400" },
    closed: { label: "Closed", cls: "bg-yellow-500/15 text-yellow-400" },
    settling: { label: "Settling...", cls: "bg-yellow-500/15 text-yellow-400" },
    live: { label: "✅ Market live", cls: "bg-green-500/15 text-green-400" },
    refunding: { label: "Refunding", cls: "bg-red-500/15 text-red-400" },
    failed: { label: "Failed", cls: "bg-red-500/15 text-red-400" },
  };
  const b = map[status] || { label: status, cls: "bg-white/10 text-muted" };
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${b.cls}`}>{b.label}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function DistBar({ label, amount, pct, color }: { label: string; amount: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="font-semibold">{amount}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatTime(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
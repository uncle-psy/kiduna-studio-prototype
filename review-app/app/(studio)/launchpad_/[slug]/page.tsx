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
import { Icon } from "@iconify/react";
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
    if (!wallet) { setActionError("Connect your wallet first."); return; }
    if (!campaign?.launchAddress) { setActionError("Launch not initialized."); return; }
    const amount = Number(amountInput);
    if (amount <= 0) { setActionError("Enter a valid USDC amount."); return; }

    setContributing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // Build tx
      const buildRes = await fetch(`/api/v1/markets/${slug}/ico/fund/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ wallet: signerWallet, amountUsdc: amount }),
      });
      if (!buildRes.ok) { const d = await buildRes.json(); throw new Error(d.error?.message || d.message || d.error || "Build failed"); }
      const { serializedTransaction } = await buildRes.json();

      // Sign with Phantom
      if (!signTransaction) throw new Error("Wallet not connected");
      
      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      if (!signTransaction) throw new Error("Wallet not connected"); const signed = await signTransaction(tx);

      // Submit
      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/fund/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signed.serialize()).toString("base64"), wallet: signerWallet, amountUsdc: amount }),
      });
      if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error?.message || d.message || d.error || "Submit failed"); }
      const result = await submitRes.json();

      setActionSuccess(`Contributed ${amount.toLocaleString()} USDC! Tx: ${result.txSignature.slice(0, 12)}...`);
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
        method: "POST", headers: makeHeaders(), body: JSON.stringify({ wallet: signerWallet }),
      });
      if (!buildRes.ok) { const d = await buildRes.json(); throw new Error(d.error?.message || d.message || d.error || "Build failed"); }
      const { serializedTransaction } = await buildRes.json();

      if (!signTransaction) throw new Error("Wallet not connected");
      
      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      if (!signTransaction) throw new Error("Wallet not connected"); const signed = await signTransaction(tx);

      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/${action}/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signed.serialize()).toString("base64"), wallet: signerWallet }),
      });
      if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error?.message || d.message || d.error || "Submit failed"); }
      const result = await submitRes.json();

      setActionSuccess(type === "claim"
        ? `Claimed ${(result.tokensClaimed || 0).toLocaleString()} tokens!`
        : `Refunded ${(result.usdcRefunded || 0).toLocaleString()} USDC!`);
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
    console.log("[ICO Init] Starting...", { authWallet: wallet, signerWallet, connected, hasSignTx: !!signTransaction, publicKey: publicKey?.toBase58() });
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
        body: JSON.stringify({ sponsorPubkey: signerWallet, step: "create-mint" }),
      });
      if (!mintRes.ok) { const d = await mintRes.json(); throw new Error(d.error?.message || d.message || d.error || "Build mint failed"); }
      const mintData = await mintRes.json();

      if (!signTransaction) throw new Error("Wallet not connected");
      
      let tx = Transaction.from(Buffer.from(mintData.serializedTransaction, "base64"));

      // Sign with generated keypair + wallet
      if (mintData.generatedKeypairs?.baseMint) {
        const mintKp = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(mintData.generatedKeypairs.baseMint, "base64")));
        tx.partialSign(mintKp);
      }
      if (!signTransaction) throw new Error("Wallet not connected"); const signedMint = await signTransaction(tx);

      const mintSubmit = await fetch(`/api/v1/markets/${slug}/ico/initialize/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signedMint.serialize()).toString("base64"), step: "create-mint", addresses: mintData.addresses }),
      });
      if (!mintSubmit.ok) { const d = await mintSubmit.json(); throw new Error(d.error?.message || d.message || d.error || "Submit mint failed"); }

      // Step 2: Initialize launch
      setInitStep("Initializing ICO on-chain...");
      const initRes = await fetch(`/api/v1/markets/${slug}/ico/initialize/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ sponsorPubkey: signerWallet, step: "initialize", baseMint: mintData.addresses.baseMint }),
      });
      if (!initRes.ok) { const d = await initRes.json(); throw new Error(d.error?.message || d.message || d.error || "Build init failed"); }
      const initData = await initRes.json();

      tx = Transaction.from(Buffer.from(initData.serializedTransaction, "base64"));
      if (!signTransaction) throw new Error("Wallet not connected"); const signedInit = await signTransaction(tx);

      const initSubmit = await fetch(`/api/v1/markets/${slug}/ico/initialize/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signedInit.serialize()).toString("base64"), step: "initialize", addresses: initData.addresses }),
      });
      if (!initSubmit.ok) { const d = await initSubmit.json(); throw new Error(d.error?.message || d.message || d.error || "Submit init failed"); }

      setInitStep(null);
      setActionSuccess("ICO initialized on-chain! Now click 'Start ICO' to open contributions.");
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
        body: JSON.stringify({ sponsorPubkey: signerWallet }),
      });
      if (!buildRes.ok) { const d = await buildRes.json(); throw new Error(d.error?.message || d.message || d.error || "Build failed"); }
      const { serializedTransaction } = await buildRes.json();

      if (!signTransaction) throw new Error("Wallet not connected");
      
      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      if (!signTransaction) throw new Error("Wallet not connected"); const signed = await signTransaction(tx);

      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/start/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signed.serialize()).toString("base64") }),
      });
      if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error?.message || d.message || d.error || "Submit failed"); }

      setActionSuccess("ICO is now live! Contributors can commit USDC.");
      fetchCampaign();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setInitializing(false);
    }
  }

  /* ── Close ICO (sponsor ends contribution window early) ────────── */
  async function handleCloseIco() {
    console.log("[Close ICO]", { signerWallet, connected, hasSignTx: !!signTransaction, publicKey: publicKey?.toBase58() });
    if (!signerWallet) { setActionError("No wallet found. Please connect your wallet."); return; }
    if (!signTransaction) { setActionError("Wallet not ready for signing. Click 'Connect Wallet' in the top right and select Phantom."); return; }
    setInitializing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const buildRes = await fetch(`/api/v1/markets/${slug}/ico/close/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ wallet: signerWallet }),
      });
      if (!buildRes.ok) { const d = await buildRes.json(); throw new Error(d.error?.message || d.message || d.error || "Build failed"); }
      const { serializedTransaction } = await buildRes.json();

      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      const signed = await signTransaction(tx);

      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/close/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signed.serialize()).toString("base64") }),
      });
      if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error?.message || d.message || d.error || "Submit failed"); }
      const result = await submitRes.json();

      setActionSuccess(result.launchStatus === "closed"
        ? "ICO closed! Target met — you can now approve contributors and settle."
        : "ICO closed. Target not met — contributors can claim refunds.");
      fetchCampaign();
    } catch (err: any) {
      console.error("[ICO Close Error]", err);
      setActionError(err?.message || err?.toString() || "Failed to close ICO");
    } finally {
      setInitializing(false);
    }
  }

  /* ── Approve all contributors ────────────────────────────────── */
  async function handleApproveAll() {
    if (!signerWallet || !signTransaction) { setActionError("Connect your Phantom wallet first."); return; }
    if (!campaign?.launchAddress) { setActionError("Launch not initialized."); return; }
    setInitializing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // Fetch all contributions
      const cRes = await fetch(`/api/v1/markets/${slug}/contributions`, { headers: makeHeaders() });
      if (!cRes.ok) throw new Error("Failed to fetch contributions");
      const { data: contributions } = await cRes.json();

      let approvedCount = 0;
      for (const c of contributions) {
        if (c.status === "approved") { approvedCount++; continue; }
        setInitStep(`Approving ${c.wallet.slice(0, 6)}... (${approvedCount + 1}/${contributions.length})`);

        const buildRes = await fetch(`/api/v1/markets/${slug}/ico/approve/build`, {
          method: "POST", headers: makeHeaders(),
          body: JSON.stringify({ sponsorPubkey: signerWallet, funderWallet: c.wallet, approvedAmountUsdc: c.amountCommitted }),
        });
        if (!buildRes.ok) { const d = await buildRes.json(); throw new Error(d.error?.message || d.message || "Approve build failed"); }
        const { serializedTransaction } = await buildRes.json();

        const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
        const signed = await signTransaction(tx);

        const submitRes = await fetch(`/api/v1/markets/${slug}/ico/approve/submit`, {
          method: "POST", headers: makeHeaders(),
          body: JSON.stringify({ signedTransaction: Buffer.from(signed.serialize()).toString("base64"), funderWallet: c.wallet, approvedAmountUsdc: c.amountCommitted }),
        });
        if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error?.message || d.message || "Approve submit failed"); }
        approvedCount++;
      }

      setInitStep(null);
      setActionSuccess(`All ${approvedCount} contributors approved! Now click 'Settle Launch'.`);
      fetchCampaign();
    } catch (err: any) {
      console.error("[ICO Approve Error]", err);
      setActionError(err?.message || err?.toString() || "Failed to approve");
      setInitStep(null);
    } finally {
      setInitializing(false);
    }
  }

  /* ── Settle launch ───────────────────────────────────────────── */
  async function handleSettle() {
    if (!signerWallet || !signTransaction) { setActionError("Connect your Phantom wallet first."); return; }
    setInitializing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // Step 1: Create Address Lookup Table
      setInitStep("Step 1/2: Creating Address Lookup Table...");
      const altRes = await fetch(`/api/v1/markets/${slug}/ico/settle/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ sponsorPubkey: signerWallet }),
      });
      if (!altRes.ok) { const d = await altRes.json(); throw new Error(d.error?.message || d.message || "ALT build failed"); }
      const altData = await altRes.json();

      const altTx = Transaction.from(Buffer.from(altData.serializedTransaction, "base64"));
      const signedAlt = await signTransaction(altTx);

      setInitStep("Step 1/2: Submitting ALT...");
      const altSubmit = await fetch(`/api/v1/markets/${slug}/ico/settle/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signedAlt.serialize()).toString("base64"), step: "alt" }),
      });
      if (!altSubmit.ok) { const d = await altSubmit.json(); throw new Error(d.error?.message || d.message || "ALT submit failed"); }

      // Wait for ALT to be active
      setInitStep("Step 1/2: Waiting for ALT activation...");
      await new Promise(r => setTimeout(r, 3000));

      // Step 2: Build V0 settle transaction with ALT
      setInitStep("Step 2/2: Building settle transaction...");
      const settleRes = await fetch(`/api/v1/markets/${slug}/ico/settle/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ sponsorPubkey: signerWallet, altAddress: altData.addresses.altAddress }),
      });
      if (!settleRes.ok) { const d = await settleRes.json(); throw new Error(d.error?.message || d.message || "Settle build failed"); }
      const settleData = await settleRes.json();

      setInitStep("Step 2/2: Signing settle transaction...");
      const { VersionedTransaction: VTx } = await import("@solana/web3.js");
      const settleTx = VTx.deserialize(Buffer.from(settleData.serializedTransaction, "base64"));
      const signedSettle = await signTransaction(settleTx);

      setInitStep("Step 2/2: Submitting settle...");
      const settleSubmit = await fetch(`/api/v1/markets/${slug}/ico/settle/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(signedSettle.serialize()).toString("base64"), addresses: settleData.addresses }),
      });
      if (!settleSubmit.ok) { const d = await settleSubmit.json(); throw new Error(d.error?.message || d.message || "Settle submit failed"); }

      setInitStep(null);
      setActionSuccess("Launch settled! DAO + Pool + Treasury created. Market is now live!");
      fetchCampaign();
    } catch (err: any) {
      console.error("[Settle Error]", err);
      setActionError(err?.message || "Failed to settle");
      setInitStep(null);
    } finally {
      setInitializing(false);
    }
  }

  /* ── Loading / Error ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="text-center py-16">
      <Icon icon="lucide:loader-2" width={40} height={40} className="mx-auto mb-3 text-muted animate-spin" />
      <p className="text-muted">Loading campaign…</p>
    </div>
  )
  if (error || !campaign) return (
    <div className="text-center py-16">
      <Icon icon="lucide:alert-circle" width={40} height={40} className="mx-auto mb-3 text-red-400" />
      <p className="text-red-400">{error || 'Campaign not found'}</p>
    </div>
  )

  const c = campaign
  const isSponsor = wallet && c.sponsorWallet === wallet
  const signerWallet = publicKey?.toBase58() || wallet
  const totalApproved = c.totalApproved || 0
  const estimatedTokens = myContribution?.amountApproved && totalApproved > 0
    ? ((myContribution.amountApproved / totalApproved) * 10_000_000)
    : myContribution?.amountCommitted && c.totalCommitted > 0
      ? ((myContribution.amountCommitted / c.totalCommitted) * 10_000_000)
      : null

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-4">
        <button onClick={() => router.push('/launchpad')} className="hover:text-accent transition-colors">
          Launchpad
        </button>
        <Icon icon="lucide:chevron-right" width={14} height={14} />
        <span className="text-foreground">{c.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
            <Icon icon="lucide:rocket" width={24} height={24} className="text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{c.name}</h1>
              {c.tokenTicker && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">${c.tokenTicker}</span>}
              <StatusBadge status={c.launchStatus} />
            </div>
            {c.description && <p className="text-muted mt-1 text-sm">{c.description}</p>}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
          <Icon icon="lucide:alert-circle" width={14} height={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-400">{actionError}</p>
        </div>
      )}
      {actionSuccess && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-start gap-2">
          <Icon icon="lucide:check-circle" width={14} height={14} className="text-green-400 mt-0.5 shrink-0" />
          <p className="text-xs text-green-400">{actionSuccess}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-4">

          {/* Progress */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Icon icon="lucide:bar-chart-3" width={14} height={14} className="text-accent" /> Fundraising Progress
              </h2>
              <span className="text-sm font-bold text-accent">{c.percentRaised}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, c.percentRaised)}%`, background: '#eb8000' }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Committed', value: `${c.totalCommitted.toLocaleString()} USDC`, icon: 'lucide:wallet' },
                { label: 'Min target', value: c.minRaise ? `${c.minRaise.toLocaleString()} USDC` : '—', icon: 'lucide:target' },
                { label: 'Contributors', value: String(c.contributorCount), icon: 'lucide:users' },
              ].map((m) => (
                <div key={m.label} className="bg-white/[0.02] border border-card-border rounded-xl p-3 text-center">
                  <Icon icon={m.icon} width={12} height={12} className="text-muted mx-auto mb-1" />
                  <p className="text-[10px] text-muted uppercase tracking-wider">{m.label}</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{m.value}</p>
                </div>
              ))}
              {/* Live countdown */}
              <div className="bg-white/[0.02] border border-card-border rounded-xl p-3 text-center">
                <Icon icon="lucide:clock" width={12} height={12} className="text-muted mx-auto mb-1" />
                <p className="text-[10px] text-muted uppercase tracking-wider">Time left</p>
                <Countdown deadline={c.fundraiseDeadline} />
              </div>
            </div>
          </div>

          {/* Token Distribution */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Icon icon="lucide:pie-chart" width={14} height={14} className="text-accent" /> Token Distribution
            </h2>
            <div className="space-y-3">
              {[
                { label: 'ICO Contributors', amount: '10,000,000', pct: 77.5, barColor: '#c96d00' },
                { label: 'Futarchy AMM', amount: '2,000,000', pct: 15.5, barColor: '#2d9d78' },
                { label: 'Meteora LP (Treasury)', amount: '900,000', pct: 7.0, barColor: '#4a8fd4' },
                ...(c.perfPackageTokens && c.perfPackageTokens > 100
                  ? [{ label: 'Performance', amount: c.perfPackageTokens.toLocaleString(), pct: (c.perfPackageTokens / (12900000 + c.perfPackageTokens)) * 100, barColor: '#8b6fc0' }]
                  : []),
              ].map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted">{d.label}</span>
                    <span className="font-semibold text-white">{d.amount}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.barColor }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* USDC Allocation */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Icon icon="lucide:split" width={14} height={14} className="text-accent" /> USDC Allocation
              <span className="text-[10px] text-muted font-normal">(protocol fixed)</span>
            </h2>
            <div className="flex h-8 rounded-lg overflow-hidden mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-center text-[10px] font-semibold text-white" style={{ width: '80%', background: '#c96d00' }}>Treasury 80%</div>
              <div className="flex items-center justify-center text-[10px] font-semibold text-white" style={{ width: '20%', background: '#2d9d78' }}>LP 20%</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.02] border border-card-border rounded-xl p-3">
                <p className="text-[10px] text-muted uppercase tracking-wider">Treasury</p>
                <p className="text-sm font-semibold text-white">{Math.floor((c.minRaise || 0) * 0.8).toLocaleString()} USDC</p>
              </div>
              <div className="bg-white/[0.02] border border-card-border rounded-xl p-3">
                <p className="text-[10px] text-muted uppercase tracking-wider">Liquidity</p>
                <p className="text-sm font-semibold text-white">{Math.floor((c.minRaise || 0) * 0.2).toLocaleString()} USDC</p>
              </div>
            </div>
          </div>

          {/* Recent Contributions */}
          {c.recentContributions.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Icon icon="lucide:list" width={14} height={14} className="text-accent" /> Recent Contributions
              </h2>
              <div className="space-y-1">
                {c.recentContributions.slice(0, 8).map((ct) => (
                  <div key={ct.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center">
                        <Icon icon="lucide:user" width={12} height={12} className="text-accent" />
                      </div>
                      <span className="font-mono text-xs text-muted">{ct.wallet.slice(0, 4)}…{ct.wallet.slice(-4)}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{ct.amountCommitted.toLocaleString()} USDC</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">

          {/* Action Widget */}
          <div className="bg-card border border-card-border rounded-xl p-5">

            {c.launchStatus === 'draft' && isSponsor && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:rocket" width={14} height={14} className="text-accent" /> Initialize ICO</h2>
              <div className="space-y-2 text-xs text-muted mb-4">
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">1</span> Create token mint</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">2</span> Initialize launch</p>
              </div>
              {initStep && <p className="text-xs text-accent mb-3 animate-pulse">{initStep}</p>}
              <button onClick={handleInitialize} disabled={initializing} className="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                {initializing ? (initStep || 'Processing…') : 'Initialize ICO →'}
              </button>
              <p className="text-[10px] text-muted mt-2 text-center">2 transactions — sign twice</p>
            </>)}

            {c.launchStatus === 'draft' && !isSponsor && (<p className="text-sm text-muted text-center py-6">Campaign is being set up.</p>)}

            {c.launchStatus === 'initialized' && isSponsor && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:play-circle" width={14} height={14} className="text-green-400" /> Start ICO</h2>
              <p className="text-xs text-muted mb-4">Open the {c.icoDurationSeconds ? `${c.icoDurationSeconds >= 86400 ? Math.round(c.icoDurationSeconds / 86400) + '-day' : c.icoDurationSeconds >= 3600 ? Math.round(c.icoDurationSeconds / 3600) + '-hour' : Math.round(c.icoDurationSeconds / 60) + '-minute'}` : ''} contribution window.</p>
              <button onClick={handleStartIco} disabled={initializing} className="w-full bg-accent hover:bg-accent-dark text-on-accent font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                {initializing ? 'Starting…' : 'Start ICO →'}
              </button>
            </>)}

            {c.launchStatus === 'initialized' && !isSponsor && (<p className="text-sm text-muted text-center py-6">ICO starting soon.</p>)}

            {c.launchStatus === 'fundraising' && (<>
              {c.timeRemainingSeconds !== null && c.timeRemainingSeconds <= 0 ? (
                isSponsor ? (
                  <>
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:lock" width={14} height={14} className="text-accent" /> ICO Period Ended</h2>
                    <p className="text-xs text-muted mb-4">The contribution window has ended. Close the ICO to proceed.</p>
                    <button onClick={handleCloseIco} disabled={initializing} className="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                      {initializing ? 'Closing...' : 'Close ICO'}
                    </button>
                    {c.totalCommitted >= (c.minRaise || 0)
                      ? <p className="text-[10px] text-muted mt-2 text-center">Target met — will proceed to approve & settle.</p>
                      : <p className="text-[10px] text-muted mt-2 text-center">Below target — contributors will get refunds.</p>
                    }
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Icon icon="lucide:clock" width={24} height={24} className="text-muted mx-auto mb-2" />
                    <p className="text-sm text-muted">ICO period ended. Waiting for sponsor to close.</p>
                  </div>
                )
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:hand-coins" width={14} height={14} className="text-accent" /> Contribute USDC</h2>
                  <input type="number" placeholder="Amount (USDC)" value={amountInput} onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full bg-input border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 mb-3" />
                  {estimatedTokens && <p className="text-xs text-muted mb-3">Est. tokens: <span className="text-white font-semibold">{Math.floor(estimatedTokens).toLocaleString()}</span></p>}
                  <button onClick={handleContribute} disabled={contributing || !wallet} className="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                    {contributing ? 'Signing…' : wallet ? 'Commit USDC' : 'Connect wallet'}
                  </button>
                </>
              )}
            </>)}

            {c.launchStatus === 'closed' && isSponsor && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:clipboard-check" width={14} height={14} className="text-accent" /> Approve & Settle</h2>
              <div className="space-y-1.5 text-xs mb-4">
                <div className="flex justify-between"><span className="text-muted">Committed</span><span className="text-white font-semibold">{c.totalCommitted.toLocaleString()} USDC</span></div>
                <div className="flex justify-between"><span className="text-muted">Approved</span><span className="text-white font-semibold">{c.totalApproved.toLocaleString()} USDC</span></div>
                <div className="flex justify-between"><span className="text-muted">Min required</span><span className="text-muted">{(c.minRaise || 0).toLocaleString()} USDC</span></div>
              </div>
              {initStep && <p className="text-xs text-accent mb-3 animate-pulse">{initStep}</p>}
              {c.totalApproved < c.totalCommitted && (
                <button onClick={handleApproveAll} disabled={initializing} className="w-full bg-accent hover:bg-accent-dark text-on-accent font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 mb-2 cursor-pointer text-sm">
                  {initializing && initStep?.includes('Approving') ? initStep : 'Approve All Contributors'}
                </button>
              )}
              <button onClick={handleSettle} disabled={initializing || c.totalApproved < (c.minRaise || 0)} className="w-full bg-accent hover:bg-accent-dark text-on-accent font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                {initializing && initStep?.includes('settle') ? initStep : 'Settle Launch'}
              </button>
              {c.totalApproved < (c.minRaise || 0) && <p className="text-[10px] text-muted mt-2 text-center">Approve first — need ≥ {(c.minRaise || 0).toLocaleString()} USDC</p>}
            </>)}

            {c.launchStatus === 'closed' && !isSponsor && (<p className="text-sm text-muted text-center py-6">ICO closed. Sponsor is reviewing.</p>)}

            {c.launchStatus === 'live' && myContribution && myContribution.status !== 'claimed' && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:gift" width={14} height={14} className="text-accent" /> Claim Tokens</h2>
              {estimatedTokens && <p className="text-xs text-muted mb-3">You receive: <span className="text-accent font-bold">{Math.floor(estimatedTokens).toLocaleString()} tokens</span></p>}
              <button onClick={() => handleClaim('claim')} disabled={claiming} className="w-full bg-accent hover:bg-accent-dark text-on-accent font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                {claiming ? 'Claiming…' : 'Claim Tokens'}
              </button>
            </>)}

            {(c.launchStatus === 'refunding' || (c.launchStatus === 'live' && myContribution && myContribution.amountApproved !== null && myContribution.amountCommitted > (myContribution.amountApproved || 0))) && myContribution && myContribution.status !== 'refunded' && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:undo-2" width={14} height={14} className="text-red-400" /> Claim Refund</h2>
              <p className="text-xs text-muted mb-3">Refund: <span className="text-white font-semibold">{c.launchStatus === 'refunding' ? myContribution.amountCommitted.toLocaleString() : (myContribution.amountCommitted - (myContribution.amountApproved || 0)).toLocaleString()} USDC</span></p>
              <button onClick={() => handleClaim('refund')} disabled={claiming} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                {claiming ? 'Processing…' : 'Claim Refund'}
              </button>
            </>)}

            {c.launchStatus === 'live' && (!myContribution || myContribution.status === 'claimed') && (
              <div className="text-center py-6">
                <Icon icon="lucide:check-circle-2" width={24} height={24} className="text-accent mx-auto mb-2" />
                <p className="text-sm text-muted">Market is live!</p>
              </div>
            )}
          </div>

          {/* My Position */}
          {myContribution && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:badge-check" width={14} height={14} className="text-accent" /> Your Position</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted">Committed</span><span className="font-semibold text-white">{myContribution.amountCommitted.toLocaleString()} USDC</span></div>
                {myContribution.amountApproved !== null && <div className="flex justify-between"><span className="text-muted">Approved</span><span className="font-semibold text-white">{(myContribution.amountApproved || 0).toLocaleString()} USDC</span></div>}
                {estimatedTokens && <div className="flex justify-between"><span className="text-muted">Est. tokens</span><span className="font-semibold text-accent">{Math.floor(estimatedTokens).toLocaleString()}</span></div>}
                <div className="flex justify-between"><span className="text-muted">Status</span><span className="font-mono uppercase text-[10px]">{myContribution.status}</span></div>
              </div>
            </div>
          )}

          {/* Campaign Info */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:info" width={14} height={14} className="text-accent" /> Campaign Info</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted">Sponsor</span><span className="font-mono">{c.sponsorWallet.slice(0, 4)}…{c.sponsorWallet.slice(-4)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Duration</span><span>{c.icoDurationSeconds ? `${c.icoDurationSeconds / 86400} days` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Monthly budget</span><span>{c.monthlyBudgetUsdc ? `${c.monthlyBudgetUsdc.toLocaleString()} USDC` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Bid wall</span><span>{c.hasBidWall ? 'Enabled' : 'Disabled'}</span></div>
              {c.icoPrice && <div className="flex justify-between"><span className="text-muted">ICO price</span><span className="text-accent font-semibold">${c.icoPrice.toFixed(6)}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-white/[0.08] text-white/60' },
    initialized: { label: 'Ready', cls: 'bg-blue-500/20 text-blue-400' },
    fundraising: { label: 'Live', cls: 'bg-green-500/20 text-green-400' },
    closed: { label: 'Closed', cls: 'bg-yellow-500/20 text-yellow-400' },
    settling: { label: 'Settling', cls: 'bg-yellow-500/20 text-yellow-400' },
    live: { label: 'Market Live', cls: 'bg-accent/20 text-accent' },
    refunding: { label: 'Refunding', cls: 'bg-red-500/20 text-red-400' },
    failed: { label: 'Failed', cls: 'bg-red-500/20 text-red-400' },
  }
  const b = map[status] || { label: status, cls: 'bg-white/[0.08] text-white/60' }
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span>
}

function Countdown({ deadline }: { deadline: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!deadline) { setRemaining(null); return }
    const target = new Date(deadline).getTime()

    function tick() {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setRemaining(diff)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (remaining == null) {
    // No deadline yet — the fundraise countdown hasn't started.
    return <p className="text-xs font-semibold text-muted mt-0.5">Not started</p>
  }
  if (remaining <= 0) {
    return <p className="text-xs font-semibold text-muted mt-0.5">Ended</p>
  }

  const d = Math.floor(remaining / 86400)
  const h = Math.floor((remaining % 86400) / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60

  return (
    <p className="text-xs font-semibold text-white mt-0.5 font-mono tabular-nums">
      {d > 0 && <span>{d}<span className="text-muted text-[10px]">d </span></span>}
      {(d > 0 || h > 0) && <span>{String(h).padStart(2, '0')}<span className="text-muted text-[10px]">h </span></span>}
      <span>{String(m).padStart(2, '0')}<span className="text-muted text-[10px]">m </span></span>
      <span>{String(s).padStart(2, '0')}<span className="text-muted text-[10px]">s</span></span>
    </p>
  )
}

function fmtTime(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  if (d > 0) return `${d}d ${h}h`
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
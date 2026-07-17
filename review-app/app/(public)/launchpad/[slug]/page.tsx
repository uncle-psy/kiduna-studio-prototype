"use client";

/**
 * /launchpad/{slug} — Public campaign detail + contribute/claim/approve page.
 * Same design & functionality as studio launchpad_/[slug]/page.tsx.
 *
 * All on-chain signing uses the user's internal FROST (custodial) wallet via
 * the auth backend's /sign endpoint — no Phantom / browser wallet.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Transaction, Keypair } from "@solana/web3.js";
import { Buffer } from "buffer";
import { Icon } from "@iconify/react";
import DunaLandingNav from "@/components/landing/DunaLandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import type { CampaignDetail, ContributionSummary } from "@/lib/launchpad-api-types";
import FrostContribute from "@/components/landing/FrostContribute";
import { frostSignTransaction } from "@/lib/sign-with-login-wallet";
import "../../dunathon-landing.css";

export default function PublicCampaignDetailWrapper() {
  return (
    <>
      <div className="duna-landing">
        <DunaLandingNav />
      </div>
      <style jsx global>{`
        @keyframes lp-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lp-progress { from { width: 0; } }
        @keyframes lp-glow { 0%,100% { opacity: 0.5; } 50% { opacity: 0.9; } }
        .lp-rise { opacity: 0; animation: lp-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .lp-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s, box-shadow 0.3s;
        }
        .lp-card:hover { border-color: rgba(255,255,255,0.12); box-shadow: 0 8px 24px -6px rgba(0,0,0,0.25); }
        .lp-stat {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .lp-stat:hover { background: rgba(255,255,255,0.04); transform: translateY(-2px); }
        .lp-bar-glow { box-shadow: 0 0 12px rgba(234,170,0,0.3); }
      `}</style>
      <div
        className="relative overflow-hidden"
        style={{
          background: `
            radial-gradient(800px 300px at 85% -10%, rgba(234,170,0,0.14), transparent 50%),
            radial-gradient(600px 400px at -5% 60%, rgba(3,204,217,0.08), transparent 55%)
          `,
        }}
      >
        <div className="w-full max-w-[1240px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
          <CampaignDetailPage />
        </div>
      </div>
      <LandingFooter />
    </>
  );
}

function CampaignDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { token, user, checkAuth } = useAuth();
  const wallet = user?.wallet || null;

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

  // FROST custodial wallet — all signing goes through the auth backend's
  // /sign endpoint (no Phantom / browser wallet).
  const signerWallet = wallet;

  // The amount input is hidden (fixed first-commit) ONLY on the official
  // onboarding launchpad (NEXT_PUBLIC_LAUNCHPAD_SLUG) while the user is still in
  // the onboarding flow — i.e. they hold an unconsumed co-founder credit and
  // have not committed yet. Every other launchpad, and any user who has already
  // committed USDC (existing contribution), shows the free-amount input.
  const OFFICIAL_LAUNCHPAD_SLUG = process.env.NEXT_PUBLIC_LAUNCHPAD_SLUG || "kiduna";
  const isOnboardingFirstCommit =
    slug === OFFICIAL_LAUNCHPAD_SLUG &&
    user?.hasCofounderCredit === true &&
    !myContribution;

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/launchpad/${slug}`, { headers: makeHeaders() });
      if (!res.ok) throw new Error("Campaign not found");
      const data: CampaignDetail = await res.json();
      setCampaign(data);

      // Fetch my contribution
      if (signerWallet) {
        const cRes = await fetch(`/api/v1/markets/${slug}/contributions?wallet=${signerWallet}`);
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
  }, [slug, token, wallet, signerWallet]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  // Auto-consume cofounder credit if user already committed but credit wasn't consumed.
  // This handles the case where FrostContribute's consume call failed silently.
  // After consuming, redirect to /cofounder since onboarding is complete.
  useEffect(() => {
    if (!myContribution || !user?.hasCofounderCredit || !token) return;
    // User has a contribution AND still has credit → consume it now
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'}/stripe/consume-cofounder-credit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          // Fastify rejects an empty body with Content-Type: application/json
          // (FST_ERR_CTP_EMPTY_JSON_BODY → 400). Send a JSON body so the request
          // reaches the handler.
          body: '{}',
        });
        if (res.ok) {
          // Credit consumed — redirect to cofounder page
          window.location.href = '/cofounder';
        }
      } catch { /* non-blocking */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myContribution, user?.hasCofounderCredit, token]);

  // Auto-refresh during fundraising or refunding
  useEffect(() => {
    if (campaign?.launchStatus !== "fundraising" && campaign?.launchStatus !== "refunding") return;
    const interval = setInterval(fetchCampaign, 10000);
    return () => clearInterval(interval);
  }, [campaign?.launchStatus, fetchCampaign]);

  /* ── Contribute USDC ─────────────────────────────────────────────── */
  async function handleContribute() {
    if (!wallet || !token) { setActionError("Please sign in first."); return; }
    if (!campaign?.launchAddress) { setActionError("Launch not initialized."); return; }
    const amount = Number(amountInput);
    if (amount <= 0) { setActionError("Enter a valid USDC amount."); return; }

    setContributing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const buildRes = await fetch(`/api/v1/markets/${slug}/ico/fund/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ wallet: signerWallet, amountUsdc: amount }),
      });
      if (!buildRes.ok) { const d = await buildRes.json(); throw new Error(d.error?.message || d.message || d.error || "Build failed"); }
      const { serializedTransaction } = await buildRes.json();

      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      await frostSignTransaction(tx, signerWallet!, token);

      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/fund/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(tx.serialize()).toString("base64"), wallet: signerWallet, amountUsdc: amount }),
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
    if (!wallet || !token) { setActionError("Please sign in first."); return; }
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

      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      await frostSignTransaction(tx, signerWallet!, token);

      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/${action}/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(tx.serialize()).toString("base64"), wallet: signerWallet }),
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
    if (!wallet || !token) {
      setActionError("Please sign in first.");
      return;
    }
    setInitializing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      setInitStep("Creating token mint...");
      const mintRes = await fetch(`/api/v1/markets/${slug}/ico/initialize/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ sponsorPubkey: signerWallet, step: "create-mint" }),
      });
      if (!mintRes.ok) { const d = await mintRes.json(); throw new Error(d.error?.message || d.message || d.error || "Build mint failed"); }
      const mintData = await mintRes.json();

      // Resume idempotency: if the mint already exists (interrupted between the
      // mint and initialize txs), the server returns `alreadyMinted` — skip
      // re-minting instead of orphaning the existing mint.
      if (!mintData.alreadyMinted) {
        const tx = Transaction.from(Buffer.from(mintData.serializedTransaction, "base64"));
        // The generated mint keypair signs first (local), then the sponsor's
        // FROST wallet adds its signature via the auth backend.
        if (mintData.generatedKeypairs?.baseMint) {
          const mintKp = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(mintData.generatedKeypairs.baseMint, "base64")));
          tx.partialSign(mintKp);
        }
        await frostSignTransaction(tx, signerWallet!, token);

        const mintSubmit = await fetch(`/api/v1/markets/${slug}/ico/initialize/submit`, {
          method: "POST", headers: makeHeaders(),
          body: JSON.stringify({ signedTransaction: Buffer.from(tx.serialize()).toString("base64"), step: "create-mint", addresses: mintData.addresses }),
        });
        if (!mintSubmit.ok) { const d = await mintSubmit.json(); throw new Error(d.error?.message || d.message || d.error || "Submit mint failed"); }
      }

      setInitStep("Initializing ICO on-chain...");
      const initRes = await fetch(`/api/v1/markets/${slug}/ico/initialize/build`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ sponsorPubkey: signerWallet, step: "initialize", baseMint: mintData.addresses.baseMint }),
      });
      if (!initRes.ok) { const d = await initRes.json(); throw new Error(d.error?.message || d.message || d.error || "Build init failed"); }
      const initData = await initRes.json();

      const tx = Transaction.from(Buffer.from(initData.serializedTransaction, "base64"));
      await frostSignTransaction(tx, signerWallet!, token);

      const initSubmit = await fetch(`/api/v1/markets/${slug}/ico/initialize/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(tx.serialize()).toString("base64"), step: "initialize", addresses: initData.addresses }),
      });
      if (!initSubmit.ok) { const d = await initSubmit.json(); throw new Error(d.error?.message || d.message || d.error || "Submit init failed"); }

      setInitStep(null);
      setActionSuccess("ICO initialized on-chain! Now click 'Start ICO' to open contributions.");
      fetchCampaign();
    } catch (err: any) {
      setActionError(err?.message || "Unexpected error during initialization");
      setInitStep(null);
    } finally {
      setInitializing(false);
    }
  }

  /* ── Start ICO ────────────────────────────────────────────────── */
  async function handleStartIco() {
    if (!wallet || !token) { setActionError("Please sign in first."); return; }
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

      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      await frostSignTransaction(tx, signerWallet!, token);

      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/start/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(tx.serialize()).toString("base64") }),
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

  /* ── Close ICO ────────────────────────────────────────────────── */
  async function handleCloseIco() {
    if (!signerWallet || !token) { setActionError("Please sign in first."); return; }
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
      await frostSignTransaction(tx, signerWallet, token);

      const submitRes = await fetch(`/api/v1/markets/${slug}/ico/close/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(tx.serialize()).toString("base64") }),
      });
      if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error?.message || d.message || d.error || "Submit failed"); }
      const result = await submitRes.json();

      setActionSuccess(result.launchStatus === "closed"
        ? "ICO closed! Target met — you can now approve contributors and settle."
        : "ICO closed. Target not met — contributors can claim refunds.");
      fetchCampaign();
    } catch (err: any) {
      setActionError(err?.message || "Failed to close ICO");
    } finally {
      setInitializing(false);
    }
  }

  /* ── Approve all contributors ────────────────────────────────── */
  async function handleApproveAll() {
    if (!signerWallet || !token) { setActionError("Please sign in first."); return; }
    if (!campaign?.launchAddress) { setActionError("Launch not initialized."); return; }
    setInitializing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
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
        await frostSignTransaction(tx, signerWallet, token);

        const submitRes = await fetch(`/api/v1/markets/${slug}/ico/approve/submit`, {
          method: "POST", headers: makeHeaders(),
          body: JSON.stringify({ signedTransaction: Buffer.from(tx.serialize()).toString("base64"), funderWallet: c.wallet, approvedAmountUsdc: c.amountCommitted }),
        });
        if (!submitRes.ok) { const d = await submitRes.json(); throw new Error(d.error?.message || d.message || "Approve submit failed"); }
        approvedCount++;
      }

      setInitStep(null);
      setActionSuccess(`All ${approvedCount} contributors approved! Now click 'Settle Launch'.`);
      fetchCampaign();
    } catch (err: any) {
      setActionError(err?.message || "Failed to approve");
      setInitStep(null);
    } finally {
      setInitializing(false);
    }
  }

  /* ── Settle launch ───────────────────────────────────────────── */
  async function handleSettle() {
    if (!signerWallet || !token) { setActionError("Please sign in first."); return; }
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
      await frostSignTransaction(altTx, signerWallet, token);

      setInitStep("Step 1/2: Submitting ALT...");
      const altSubmit = await fetch(`/api/v1/markets/${slug}/ico/settle/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(altTx.serialize()).toString("base64"), step: "alt" }),
      });
      if (!altSubmit.ok) { const d = await altSubmit.json(); throw new Error(d.error?.message || d.message || "ALT submit failed"); }

      // Wait for ALT to be active (needs 1 slot)
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
      await frostSignTransaction(settleTx, signerWallet, token);

      setInitStep("Step 2/2: Submitting settle...");
      const settleSubmit = await fetch(`/api/v1/markets/${slug}/ico/settle/submit`, {
        method: "POST", headers: makeHeaders(),
        body: JSON.stringify({ signedTransaction: Buffer.from(settleTx.serialize()).toString("base64"), addresses: settleData.addresses }),
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

  /* ── Loading Skeleton ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-20 bg-white/[0.06] rounded" />
        <div className="h-4 w-3 bg-white/[0.06] rounded" />
        <div className="h-4 w-32 bg-white/[0.06] rounded" />
      </div>

      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-white/[0.06]" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-48 bg-white/[0.06] rounded" />
            <div className="h-5 w-20 bg-white/[0.06] rounded" />
            <div className="h-5 w-14 bg-white/[0.06] rounded-full" />
          </div>
          <div className="h-4 w-72 bg-white/[0.06] rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Progress card */}
          <div className="lp-card p-5">
            <div className="flex justify-between mb-3">
              <div className="h-4 w-40 bg-white/[0.06] rounded" />
              <div className="h-4 w-10 bg-white/[0.06] rounded" />
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="lp-stat p-3">
                  <div className="h-3 w-8 bg-white/[0.06] rounded mx-auto mb-2" />
                  <div className="h-3 w-16 bg-white/[0.06] rounded mx-auto mb-1" />
                  <div className="h-4 w-24 bg-white/[0.06] rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Token distribution card */}
          <div className="lp-card p-5">
            <div className="h-4 w-36 bg-white/[0.06] rounded mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <div className="h-3 w-28 bg-white/[0.06] rounded" />
                    <div className="h-3 w-20 bg-white/[0.06] rounded" />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06]" />
                </div>
              ))}
            </div>
          </div>

          {/* USDC allocation card */}
          <div className="lp-card p-5">
            <div className="h-4 w-32 bg-white/[0.06] rounded mb-4" />
            <div className="h-8 rounded-lg bg-white/[0.06] mb-3" />
            <div className="grid grid-cols-2 gap-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="lp-stat p-3">
                  <div className="h-3 w-16 bg-white/[0.06] rounded mb-1" />
                  <div className="h-4 w-24 bg-white/[0.06] rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Action widget */}
          <div className="lp-card p-5">
            <div className="h-4 w-32 bg-white/[0.06] rounded mb-3" />
            <div className="h-10 rounded-xl bg-white/[0.06] mb-3" />
            <div className="h-10 rounded-xl bg-white/[0.06]" />
          </div>

          {/* Campaign info */}
          <div className="lp-card p-5">
            <div className="h-4 w-28 bg-white/[0.06] rounded mb-3" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-20 bg-white/[0.06] rounded" />
                  <div className="h-3 w-24 bg-white/[0.06] rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
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
  const totalApproved = c.totalApproved || 0
  const estimatedTokens = myContribution?.amountApproved && totalApproved > 0
    ? ((myContribution.amountApproved / totalApproved) * 10_000_000)
    : myContribution?.amountCommitted && c.totalCommitted > 0
      ? ((myContribution.amountCommitted / c.totalCommitted) * 10_000_000)
      : null

  return (
    <div>
      {/* Breadcrumb */}
      <div className="lp-rise flex items-center gap-2 text-sm text-muted mb-5">
        <button onClick={() => router.push('/launchpad')} className="hover:text-accent transition-colors">
          Launchpad
        </button>
        <Icon icon="lucide:chevron-right" width={14} height={14} />
        <span className="text-foreground">{c.name}</span>
      </div>

      {/* ── Hero Header + Progress ── */}
      <div
        className="lp-rise rounded-[20px] p-6 sm:p-8 mb-6"
        style={{
          animationDelay: '0.05s',
          background: 'linear-gradient(145deg, rgba(234,170,0,0.06), rgba(3,204,217,0.03), rgba(255,255,255,0.015))',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Campaign identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(234,170,0,0.12)', border: '1.5px solid rgba(234,170,0,0.25)', boxShadow: '0 0 24px rgba(234,170,0,0.1)' }}
            >
              <Icon icon="lucide:rocket" width={26} height={26} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white break-words min-w-0">{c.name}</h1>
                {c.tokenTicker && <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/20">${c.tokenTicker}</span>}
                <StatusBadge status={c.launchStatus} />
              </div>
              {c.description && <p className="text-muted mt-1.5 text-sm">{c.description}</p>}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between items-end mb-2">
            <p className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-white/30">Fundraising progress</p>
            <span className="text-lg font-bold text-accent">{c.percentRaised}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(Math.min(100, c.percentRaised), 1)}%`,
                background: 'linear-gradient(90deg, #EAAA00 0%, #D4950A 60%, #C07A08 100%)',
                boxShadow: '0 0 16px rgba(234,170,0,0.35)',
                animation: 'lp-progress 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
              }}
            />
          </div>
        </div>

        {/* Key stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Committed', value: `${c.totalCommitted.toLocaleString()} USDC`, icon: 'lucide:wallet' },
            { label: 'Min target', value: c.minRaise ? `${c.minRaise.toLocaleString()} USDC` : '—', icon: 'lucide:target' },
            { label: 'Contributors', value: String(c.contributorCount), icon: 'lucide:users' },
          ].map((m) => (
            <div key={m.label} className="lp-stat p-3.5 text-center">
              <Icon icon={m.icon} width={16} height={16} className="text-accent mx-auto mb-2" />
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">{m.label}</p>
              <p className="text-sm font-bold text-white mt-1">{m.value}</p>
            </div>
          ))}
          <div className="lp-stat p-3.5 text-center">
            <Icon icon="lucide:clock" width={16} height={16} className="text-accent mx-auto mb-2" />
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Time left</p>
            <Countdown deadline={c.fundraiseDeadline} status={c.launchStatus} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/8 p-4 flex items-start gap-2.5">
          <Icon icon="lucide:alert-circle" width={16} height={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">{actionError}</p>
        </div>
      )}
      {actionSuccess && (
        <div className="mb-5 rounded-xl border border-green-500/20 bg-green-500/8 p-4 flex items-start gap-2.5">
          <Icon icon="lucide:check-circle" width={16} height={16} className="text-green-400 mt-0.5 shrink-0" />
          <p className="text-sm text-green-400">{actionSuccess}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">

          {/* Tokenomics — merged Token Distribution + USDC Allocation */}
          <div className="lp-rise lp-card p-6" style={{ animationDelay: '0.12s' }}>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-5">
              <Icon icon="lucide:coins" width={14} height={14} className="text-accent" /> Tokenomics
            </h2>

            {/* Token distribution bars */}
            <div className="space-y-4 mb-6">
              {[
                { label: 'ICO Contributors', amount: '10,000,000', pct: 77.5, color: '#EAAA00' },
                { label: 'Futarchy AMM', amount: '2,000,000', pct: 15.5, color: '#2d9d78' },
                { label: 'Meteora LP (Treasury)', amount: '900,000', pct: 7.0, color: '#4a8fd4' },
                ...(c.perfPackageTokens && c.perfPackageTokens > 100
                  ? [{ label: 'Performance', amount: c.perfPackageTokens.toLocaleString(), pct: (c.perfPackageTokens / (12900000 + c.perfPackageTokens)) * 100, color: '#8b6fc0' }]
                  : []),
              ].map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-white/50">{d.label}</span>
                    <span className="font-semibold text-white">{d.amount}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.pct}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="border-t border-white/[0.04] my-5" />

            {/* USDC allocation */}
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-3">USDC allocation (protocol fixed)</p>
            <div className="flex h-8 rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-center text-[10px] font-semibold text-white/90" style={{ width: '80%', background: 'linear-gradient(135deg, rgba(234,170,0,0.35), rgba(234,170,0,0.2))' }}>Treasury 80%</div>
              <div className="flex items-center justify-center text-[10px] font-semibold text-white/90" style={{ width: '20%', background: 'linear-gradient(135deg, rgba(45,157,120,0.5), rgba(45,157,120,0.3))' }}>LP 20%</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="lp-stat p-3">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Treasury</p>
                <p className="text-sm font-semibold text-white mt-0.5">{Math.floor((c.minRaise || 0) * 0.8).toLocaleString()} USDC</p>
              </div>
              <div className="lp-stat p-3">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Liquidity</p>
                <p className="text-sm font-semibold text-white mt-0.5">{Math.floor((c.minRaise || 0) * 0.2).toLocaleString()} USDC</p>
              </div>
            </div>
          </div>

          {/* Recent Contributions */}
          {c.recentContributions.length > 0 && (
            <div className="lp-rise lp-card p-6" style={{ animationDelay: '0.18s' }}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Icon icon="lucide:activity" width={14} height={14} className="text-accent" /> Recent Contributions
              </h2>
              <div className="space-y-1">
                {c.recentContributions.slice(0, 8).map((ct) => (
                  <div key={ct.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.025] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(234,170,0,0.1)' }}>
                        <Icon icon="lucide:user" width={13} height={13} className="text-accent" />
                      </div>
                      <span className="font-mono text-xs text-white/40">{ct.wallet.slice(0, 4)}…{ct.wallet.slice(-4)}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{ct.amountCommitted.toLocaleString()} <span className="text-xs text-white/40">USDC</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">

          {/* Action Widget */}
          <div className="lp-rise lp-card p-5" style={{ animationDelay: '0.12s' }}>

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
              <p className="text-[10px] text-muted mt-2 text-center">2 on-chain steps — signed automatically by your FROST wallet</p>
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
                /* Timer ended */
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
                /* Timer still running — FROST wallet contribution only */
                <>
                  {wallet ? (
                    <FrostContribute
                      campaignSlug={slug}
                      mode={isOnboardingFirstCommit ? 'first-commit' : 'additional'}
                    />
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted">Please sign in to contribute.</p>
                    </div>
                  )}
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

            {/* Settlement was started (ALT created) but not finished — let the
                sponsor resume it. handleSettle re-runs both steps; a fresh
                lookup table is created (the old one is harmless). */}
            {c.launchStatus === 'settling' && isSponsor && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:clipboard-check" width={14} height={14} className="text-accent" /> Finish Settlement</h2>
              <p className="text-xs text-muted mb-3">Settlement was interrupted. Click to complete it on-chain.</p>
              <button onClick={handleSettle} disabled={initializing} className="w-full bg-accent hover:bg-accent-dark text-on-accent font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                {initializing && initStep?.includes('settle') ? initStep : 'Continue Settlement'}
              </button>
            </>)}

            {c.launchStatus === 'settling' && !isSponsor && (<p className="text-sm text-muted text-center py-6">Finalizing launch…</p>)}

            {c.launchStatus === 'live' && myContribution && myContribution.status !== 'claimed' && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:gift" width={14} height={14} className="text-green-400" /> Claim Tokens</h2>
              {estimatedTokens && <p className="text-xs text-muted mb-3">You receive: <span className="text-accent font-bold">{Math.floor(estimatedTokens).toLocaleString()} tokens</span></p>}
              <button onClick={() => handleClaim('claim')} disabled={claiming} className="w-full bg-accent hover:bg-accent-dark text-on-accent font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                {claiming ? 'Claiming…' : 'Claim Tokens'}
              </button>
            </>)}

            {/* ── Refunding: Sponsor view (only when there are contributors to refund) ── */}
            {c.launchStatus === 'refunding' && isSponsor && c.contributorCount > 0 && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:alert-triangle" width={14} height={14} className="text-red-400" /> ICO Did Not Meet Target</h2>
              <div className="space-y-1.5 text-xs mb-4">
                <div className="flex justify-between"><span className="text-muted">Committed</span><span className="text-white font-semibold">{c.totalCommitted.toLocaleString()} USDC</span></div>
                <div className="flex justify-between"><span className="text-muted">Target</span><span className="text-white font-semibold">{(c.minRaise || 0).toLocaleString()} USDC</span></div>
                <div className="flex justify-between"><span className="text-muted">Shortfall</span><span className="text-red-400 font-semibold">{((c.minRaise || 0) - c.totalCommitted).toLocaleString()} USDC</span></div>
              </div>
              <div className="bg-white/[0.03] border border-card-border rounded-xl p-3 mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted">Refund progress</span>
                  <span className="text-white font-semibold">{(c as any).refundedCount || 0} / {c.contributorCount}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full bg-red-400 transition-all duration-700" style={{ width: `${c.contributorCount > 0 ? (((c as any).refundedCount || 0) / c.contributorCount) * 100 : 0}%` }} />
                </div>
              </div>
              {/* Sponsor is also a contributor — show refund button */}
              {myContribution && myContribution.status !== 'refunded' ? (
                <>
                  <p className="text-xs text-muted mb-3">Your committed: <span className="text-white font-semibold">{myContribution.amountCommitted.toLocaleString()} USDC</span></p>
                  <button onClick={() => handleClaim('refund')} disabled={claiming} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                    {claiming ? 'Processing…' : 'Claim Refund'}
                  </button>
                </>
              ) : myContribution && myContribution.status === 'refunded' ? (
                <p className="text-xs text-green-400 text-center">Your {(myContribution.usdcRefunded || myContribution.amountCommitted).toLocaleString()} USDC has been refunded.</p>
              ) : (
                <p className="text-xs text-muted text-center">Contributors are claiming their refunds.</p>
              )}
            </>)}

            {/* ── Refunding: Contributor NOT yet refunded ── */}
            {c.launchStatus === 'refunding' && !isSponsor && myContribution && myContribution.status !== 'refunded' && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:undo-2" width={14} height={14} className="text-red-400" /> Claim Your Refund</h2>
              <p className="text-xs text-muted mb-1">The ICO did not reach its {(c.minRaise || 0).toLocaleString()} USDC target.</p>
              <p className="text-xs text-muted mb-3">Your committed: <span className="text-white font-semibold">{myContribution.amountCommitted.toLocaleString()} USDC</span></p>
              <button onClick={() => handleClaim('refund')} disabled={claiming} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                {claiming ? 'Processing…' : 'Claim Refund'}
              </button>
              <p className="text-[10px] text-muted mt-2 text-center">Signs one transaction — your USDC returns to your wallet.</p>
            </>)}

            {/* ── Refunding: Contributor ALREADY refunded ── */}
            {c.launchStatus === 'refunding' && !isSponsor && myContribution && myContribution.status === 'refunded' && (
              <div className="text-center py-6">
                <Icon icon="lucide:check-circle-2" width={24} height={24} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white mb-1">Refunded {(myContribution.usdcRefunded || myContribution.amountCommitted).toLocaleString()} USDC</p>
                <p className="text-xs text-muted">Your funds have been returned to your wallet.</p>
              </div>
            )}

            {/* ── Refunding: Visitor (no contribution) — only when refunds are actually in progress ── */}
            {c.launchStatus === 'refunding' && !isSponsor && !myContribution && c.contributorCount > 0 && (
              <div className="text-center py-6">
                <Icon icon="lucide:alert-triangle" width={24} height={24} className="text-red-400 mx-auto mb-2" />
                <p className="text-sm text-muted mb-1">This ICO did not reach its target.</p>
                <p className="text-xs text-muted">Contributors are claiming refunds.</p>
              </div>
            )}

            {/* ── Partial refund in live state (approved < committed) ── */}
            {c.launchStatus === 'live' && myContribution && myContribution.amountApproved !== null && myContribution.amountCommitted > (myContribution.amountApproved || 0) && myContribution.status !== 'refunded' && (<>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:undo-2" width={14} height={14} className="text-red-400" /> Claim Partial Refund</h2>
              <p className="text-xs text-muted mb-3">Refund: <span className="text-white font-semibold">{(myContribution.amountCommitted - (myContribution.amountApproved || 0)).toLocaleString()} USDC</span></p>
              <button onClick={() => handleClaim('refund')} disabled={claiming} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-sm">
                {claiming ? 'Processing…' : 'Claim Refund'}
              </button>
            </>)}

            {/* ── Failed: Terminal state ──
                 Two cases:
                  • no contributors  → nothing to refund
                  • had contributors → all refunds complete
                 Also covers legacy markets left in "refunding" with 0 contributors. */}
            {(c.launchStatus === 'failed' || (c.launchStatus === 'refunding' && c.contributorCount === 0)) && (
              <div className="text-center py-6">
                {c.contributorCount === 0 ? (<>
                  <Icon icon="lucide:x-circle" width={28} height={28} className="text-red-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white mb-1">ICO Ended — Did Not Meet Target</p>
                  <p className="text-xs text-muted">This ICO received no contributions. There is nothing to refund.</p>
                </>) : (<>
                  <Icon icon="lucide:circle-check-big" width={28} height={28} className="text-red-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white mb-1">ICO Ended — All Refunds Complete</p>
                  <p className="text-xs text-muted mb-3">{c.totalCommitted.toLocaleString()} USDC returned to {c.contributorCount} contributors.</p>
                  {myContribution && myContribution.status === 'refunded' && (
                    <p className="text-xs text-green-400">Your {(myContribution.usdcRefunded || myContribution.amountCommitted).toLocaleString()} USDC was refunded.</p>
                  )}
                </>)}
              </div>
            )}

            {c.launchStatus === 'live' && (!myContribution || myContribution.status === 'claimed') && (
              <div className="text-center py-6">
                <Icon icon="lucide:check-circle-2" width={24} height={24} className="text-accent mx-auto mb-2" />
                <p className="text-sm text-muted">Market is live!</p>
              </div>
            )}
          </div>

          {/* My Position */}
          {myContribution && (
            <div className="lp-rise lp-card p-5" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><Icon icon="lucide:badge-check" width={14} height={14} className="text-accent" /> Your Position</h2>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center"><span className="text-white/40">Committed</span><span className="font-semibold text-white text-sm">{myContribution.amountCommitted.toLocaleString()} USDC</span></div>
                {myContribution.amountApproved !== null && <div className="flex justify-between items-center"><span className="text-white/40">Approved</span><span className="font-semibold text-white text-sm">{(myContribution.amountApproved || 0).toLocaleString()} USDC</span></div>}
                {estimatedTokens && <div className="flex justify-between items-center"><span className="text-white/40">Est. tokens</span><span className="font-semibold text-accent text-sm">{Math.floor(estimatedTokens).toLocaleString()}</span></div>}
                <div className="flex justify-between items-center"><span className="text-white/40">Status</span><span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded bg-green-500/15 text-green-400">{myContribution.status}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Campaign Details + On-chain — full width below grid ── */}
      <div className="lp-rise lp-card p-6 mt-5" style={{ animationDelay: '0.3s' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Column 1: About this campaign */}
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><Icon icon="lucide:info" width={14} height={14} className="text-accent" /> About this campaign</h2>
            <div className="space-y-3.5 text-[13px]">
              <div>
                <p className="text-white/35 text-[11px] mb-0.5">Token</p>
                <p className="text-white/80 break-words">{(c as any).tokenName || c.name} {c.tokenTicker ? <span className="text-accent ml-1">${c.tokenTicker}</span> : ''}</p>
              </div>
              <div>
                <p className="text-white/35 text-[11px] mb-0.5">How it works</p>
                <p className="text-white/80 capitalize">{(c as any).launchMode === 'ico' ? 'Public ICO — anyone can contribute USDC and receive tokens' : (c as any).launchMode || '—'}</p>
              </div>
              <div>
                <p className="text-white/35 text-[11px] mb-0.5">Created by</p>
                <p className="font-mono text-white/60 text-[12px]">{c.sponsorWallet.slice(0, 6)}…{c.sponsorWallet.slice(-6)}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-white/35 text-[11px] mb-0.5">Fundraising window</p>
                  <p className="text-white/80">{c.icoDurationSeconds ? `${c.icoDurationSeconds >= 86400 ? Math.round(c.icoDurationSeconds / 86400) + ' days' : c.icoDurationSeconds >= 3600 ? Math.round(c.icoDurationSeconds / 3600) + ' hours' : Math.round(c.icoDurationSeconds / 60) + ' minutes'}` : '—'}</p>
                </div>
                <div>
                  <p className="text-white/35 text-[11px] mb-0.5">Minimum goal</p>
                  <p className="text-white/80">{c.minRaise ? `${c.minRaise.toLocaleString()} USDC` : '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-white/35 text-[11px] mb-0.5">Campaign started</p>
                <p className="text-white/80">{new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Column 2: Governance + Performance */}
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><Icon icon="lucide:settings" width={14} height={14} className="text-accent" /> Governance settings</h2>
            <div className="space-y-3.5 text-[13px]">
              <div>
                <p className="text-white/35 text-[11px] mb-0.5">Monthly DAO budget</p>
                <p className="text-white/80">{c.monthlyBudgetUsdc ? `${c.monthlyBudgetUsdc.toLocaleString()} USDC per month` : 'Not configured'}</p>
              </div>
              <div>
                <p className="text-white/35 text-[11px] mb-0.5">Market-maker bid wall</p>
                <p className="text-white/80">{c.hasBidWall ? 'Enabled — protects token price floor' : 'Disabled'}</p>
              </div>
              {c.icoPrice && (
                <div>
                  <p className="text-white/35 text-[11px] mb-0.5">Token price at ICO</p>
                  <p className="text-accent font-semibold">${c.icoPrice.toFixed(6)} per token</p>
                </div>
              )}
              <div className="flex gap-6">
                <div>
                  <p className="text-white/35 text-[11px] mb-0.5">Approved so far</p>
                  <p className="text-white/80">{c.totalApproved ? `${c.totalApproved.toLocaleString()} USDC` : 'Pending'}</p>
                </div>
                {(c as any).refundedCount > 0 && (
                  <div>
                    <p className="text-white/35 text-[11px] mb-0.5">Refunds issued</p>
                    <p className="text-white/80">{(c as any).refundedCount} contributors</p>
                  </div>
                )}
              </div>
            </div>
            {(c as any).perfPackageTokens > 0 && (
              <>
                <div className="border-t border-white/[0.04] my-5" />
                <h3 className="text-xs font-semibold text-white flex items-center gap-2 mb-3"><Icon icon="lucide:trophy" width={12} height={12} className="text-accent" /> Performance grant</h3>
                <div className="space-y-3 text-[13px]">
                  <div>
                    <p className="text-white/35 text-[11px] mb-0.5">Tokens reserved</p>
                    <p className="text-white/80">{(c as any).perfPackageTokens?.toLocaleString()} tokens</p>
                  </div>
                  {(c as any).perfPackageGrantee && (
                    <div>
                      <p className="text-white/35 text-[11px] mb-0.5">Recipient wallet</p>
                      <p className="font-mono text-white/60 text-[12px]">{(c as any).perfPackageGrantee.slice(0, 6)}…{(c as any).perfPackageGrantee.slice(-6)}</p>
                    </div>
                  )}
                  {(c as any).perfMinUnlockMonths && (
                    <div>
                      <p className="text-white/35 text-[11px] mb-0.5">Vesting period</p>
                      <p className="text-white/80">{(c as any).perfMinUnlockMonths} months before tokens unlock</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Column 3: On-chain addresses */}
          {((c as any).launchAddress || (c as any).tokenMintAddress) && (
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><Icon icon="lucide:link" width={14} height={14} className="text-accent" /> On-chain addresses</h2>
              <p className="text-white/35 text-[11px] mb-4">All data lives on the Solana blockchain. Click any address to verify on an explorer.</p>
              <div className="space-y-3.5">
                {[
                  { key: 'tokenMintAddress', label: 'Token mint', desc: 'The unique address of this token' },
                  { key: 'launchAddress', label: 'ICO contract', desc: 'Manages contributions and claims' },
                  { key: 'launchSignerAddress', label: 'ICO signer', desc: 'Authority for the launch' },
                  { key: 'daoAddress', label: 'DAO', desc: 'Governance account (after settlement)' },
                  { key: 'poolAddress', label: 'Trading pool', desc: 'Meteora AMM pool (after settlement)' },
                  { key: 'squadsVault', label: 'Treasury vault', desc: 'Multisig-controlled treasury' },
                ].filter(a => (c as any)[a.key]).map(a => (
                  <div key={a.key}>
                    <p className="text-white/50 text-[11px] mb-0.5">{a.label}</p>
                    <p className="font-mono text-white/40 text-[11px] break-all leading-relaxed">{(c as any)[a.key]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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

function Countdown({ deadline, status }: { deadline: string | null; status?: string }) {
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

  if (remaining == null || remaining <= 0) {
    // Show status-aware text
    const label = (() => {
      switch (status) {
        case "draft":
        case "initialized": return "Not started";
        case "fundraising":  return remaining === 0 ? "Closing…" : "Not started";
        case "closed":       return "Awaiting settlement";
        case "settling":     return "Settling…";
        case "live":         return "Settled";
        case "refunding":    return "Refunding";
        case "failed":       return "Failed";
        default:             return deadline ? "Closed" : "Not started";
      }
    })();
    return <p className="text-xs font-semibold text-muted mt-0.5">{label}</p>
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
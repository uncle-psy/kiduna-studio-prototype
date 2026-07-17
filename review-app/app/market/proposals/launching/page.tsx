"use client";

/**
 * /market/proposals/launching — On-chain proposal submission page.
 *
 * Supports two entry modes:
 *   1. Fresh launch — reads from sessionStorage (written by create-spend/param)
 *   2. Resume — reads from DB via ?proposalId=xxx&resume=true
 *
 * After each phase, persists progress to DB so the user can resume if
 * they close the tab.
 */

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Icon } from "@iconify/react";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { useSponsorPubkey, useFrostSignTransaction } from "@/lib/onchain/useAnchorProvider";
import { getToken, getSessionToken } from "@/lib/auth";

/* ── Step definitions ───────────────────────────────────────────────── */

const STEPS = [
  { id: "phase1", label: "Create proposal transaction", hint: "Wraps the instruction in a Squads vault tx", icon: "lucide:file-plus" },
  { id: "phase2-setup", label: "Initialize question & vaults", hint: "Creates conditional token vaults for trading", icon: "lucide:layers" },
  { id: "phase3-combined", label: "Initialize, sponsor & launch", hint: "Creates the proposal and opens Pass/Fail trading", icon: "lucide:rocket" },
];

type StepStatus = "pending" | "active" | "complete" | "failed";

interface StepState {
  status: StepStatus;
  signature?: string;
  error?: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function ssGet(key: string): string {
  try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; }
}

function authHeaders(): Record<string, string> {
  const token = getToken() || getSessionToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function patchOnchainAddresses(
  proposalId: string,
  data: { squadsProposalAddress?: string; futarchyProposalAddress?: string },
) {
  await fetch(`/api/v1/proposals/${proposalId}/onchain`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify(data),
  });
}

async function patchLaunchContext(
  proposalId: string,
  launchPhase: number,
  context: Record<string, unknown>,
) {
  await fetch(`/api/v1/proposals/${proposalId}/launch-context`, {
    method: "PATCH", headers: authHeaders(),
    body: JSON.stringify({ launchPhase, context }),
  });
}

async function advanceProposal(proposalId: string, to: "submitted" | "live") {
  const res = await fetch(`/api/v1/proposals/${proposalId}/advance`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify({ to }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Advance to "${to}" failed (${res.status})`);
  }
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("PoolNotInSpotState") || msg.includes("0x178a"))
    return "This market already has an active proposal. Wait for it to be finalized.";
  if (msg.includes("User rejected"))
    return "Transaction was rejected in your wallet.";
  if (msg.includes("InsufficientFunds") || msg.includes("0x1"))
    return "Insufficient funds. Check your USDC and SOL balance.";
  return msg;
}

/* ── Resume data loader ──────────────────────────────────────────────── */

interface LaunchData {
  proposalId: string;
  title: string;
  objectiveName: string;
  rationale: string;
  summary: string;
  kind: string;
  marketSlug: string;
  launchPhase: number;
  squadsProposalAddress: string | null;
  futarchyProposalAddress: string | null;
  launchContext: Record<string, any>;
  squadsTransactionIndex: string | null;
  spendData: any;
  paramData: any;
  perfData: any;
}

async function loadFromResume(proposalId: string): Promise<LaunchData | null> {
  const res = await fetch(`/api/v1/proposals/${proposalId}/resume`, { headers: authHeaders() });
  if (!res.ok) return null;
  const d = await res.json();
  return {
    proposalId: d.proposalId,
    title: d.title,
    objectiveName: d.objectiveName,
    rationale: d.rationale,
    summary: d.summary,
    kind: d.kind,
    marketSlug: d.marketSlug,
    launchPhase: d.launchPhase ?? 0,
    squadsProposalAddress: d.squadsProposalAddress,
    futarchyProposalAddress: d.futarchyProposalAddress,
    launchContext: d.launchContext ?? {},
    squadsTransactionIndex: d.launchContext?.squadsTransactionIndex ?? null,
    spendData: d.launchContext?.spendData ?? d.spend ?? null,
    paramData: d.launchContext?.paramData ?? d.param ?? null,
    perfData: d.launchContext?.perfData ?? d.perf ?? null,
  };
}

function loadFromSessionStorage(): LaunchData | null {
  const proposalId = ssGet("kinship.proposal-launch.proposalId");
  if (!proposalId) return null;
  return {
    proposalId,
    title: ssGet("kinship.proposal-launch.title"),
    objectiveName: ssGet("kinship.proposal-launch.objectiveName"),
    rationale: ssGet("kinship.proposal-launch.rationale"),
    summary: ssGet("kinship.proposal-launch.summary"),
    kind: ssGet("kinship.proposal-launch.kind") || "spend",
    marketSlug: ssGet("kinship.proposal-launch.marketSlug"),
    launchPhase: 0,
    squadsProposalAddress: null,
    futarchyProposalAddress: null,
    launchContext: {},
    squadsTransactionIndex: null,
    spendData: (() => { try { return JSON.parse(ssGet("kinship.proposal-launch.spendData")); } catch { return null; } })(),
    paramData: (() => { try { return JSON.parse(ssGet("kinship.proposal-launch.paramData")); } catch { return null; } })(),
    perfData: (() => { try { return JSON.parse(ssGet("kinship.proposal-launch.perfData")); } catch { return null; } })(),
  };
}

/* ════════════════════════════════════════════════════════════════════ */

function LaunchingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Sign via the user's internal FROST wallet (no Phantom / browser wallet).
  const publicKey = useSponsorPubkey();
  const signTransaction = useFrostSignTransaction();
  const connected = !!publicKey && !!signTransaction;
  const { connection } = useConnection();
  const daoCtx = useDaoContext();

  const [data, setData] = useState<LaunchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<StepState[]>(STEPS.map(() => ({ status: "pending" })));
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const updateStep = useCallback((idx: number, update: Partial<StepState>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...update } : s)));
  }, []);

  /* ── Load data (resume or fresh) ─────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resumeId = searchParams.get("proposalId");
      const ssData = loadFromSessionStorage();
      // A proposalId from the URL OR from sessionStorage both identify a draft.
      const proposalId = resumeId || ssData?.proposalId || null;

      let loaded: LaunchData | null = null;

      // DB is the source of truth for on-chain progress. ALWAYS reconcile from
      // it when a proposalId is known — even in "fresh" mode — so a refresh mid
      // on-chain flow never re-runs a completed phase (which would create a
      // duplicate/orphaned Squads vault transaction).
      if (proposalId) {
        loaded = await loadFromResume(proposalId);
      }
      if (loaded && ssData) {
        // Keep locally-entered build data if the DB copy is missing it.
        loaded.spendData = loaded.spendData ?? ssData.spendData;
        loaded.paramData = loaded.paramData ?? ssData.paramData;
        loaded.perfData = loaded.perfData ?? ssData.perfData;
      }
      if (!loaded) {
        // No DB record yet (draft not persisted / offline) — fall back to local.
        loaded = ssData;
      }

      if (cancelled) return;
      setData(loaded);

      // Pre-fill completed steps from launchPhase
      if (loaded && loaded.launchPhase >= 1) {
        updateStep(0, { status: "complete" });
      }
      if (loaded && loaded.launchPhase >= 2) {
        updateStep(1, { status: "complete" });
      }
      if (loaded && loaded.launchPhase >= 3) {
        setIsComplete(true);
        updateStep(2, { status: "complete" });
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [searchParams, updateStep]);

  /* ── Build instructions ──────────────────────────────────────────── */
  async function buildInstructions(d: LaunchData): Promise<{
    wrappedInstructions: TransactionInstruction[];
    preflightInstructions?: TransactionInstruction[];
  }> {
    if (d.kind === "spend" && d.spendData) {
      const { buildSpendInstruction, ensureRecipientAta } = await import("@/lib/onchain/instruction-builders-light");
      const recipientPubkey = new PublicKey(d.spendData.recipientWallet);
      const mint = new PublicKey(d.spendData.mint || d.spendData.mintAddress);
      const rawAmount = BigInt(d.spendData.rawAmount || Math.round(d.spendData.amount * 1e6));
      const treasuryVault = daoCtx.ctx!.treasuryVault;

      const { createIx } = await ensureRecipientAta({ connection, payer: publicKey!, mint, owner: recipientPubkey });
      const ix = await buildSpendInstruction({ connection, treasuryVault, recipientPubkey, mint, rawAmount });
      return { wrappedInstructions: [ix], preflightInstructions: createIx ? [createIx] : undefined };
    }

    if (d.kind === "param" && d.paramData) {
      const slug = d.marketSlug;
      const res = await fetch(`/api/v1/markets/${slug}/proposals/param/build-instruction`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ parameterPath: d.paramData.paramKey, value: parseInt(d.paramData.newValue || d.paramData.valueAfter, 10) }),
      });
      if (!res.ok) throw new Error("Failed to build param instruction");
      const { instruction } = await res.json();
      const ix = new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: instruction.keys.map((k: any) => ({ pubkey: new PublicKey(k.pubkey), isSigner: k.isSigner, isWritable: k.isWritable })),
        data: Buffer.from(instruction.data, "base64"),
      });
      return { wrappedInstructions: [ix] };
    }

    if (d.kind === "mint") {
      const mintData = d.launchContext?.mintData
        || (() => { try { return JSON.parse(ssGet("kinship.proposal-launch.mintData")); } catch { return null; } })();
      if (!mintData?.mintAddress || !mintData?.recipients?.length) throw new Error("Missing mint data");

      const { buildMintInstruction } = await import("@/lib/onchain/proposal-phases");
      const { ensureRecipientAta } = await import("@/lib/onchain/instruction-builders-light");
      const mint = new PublicKey(mintData.mintAddress);
      const treasuryVault = daoCtx.ctx!.treasuryVault;

      const wrappedInstructions: TransactionInstruction[] = [];
      const preflightInstructions: TransactionInstruction[] = [];

      for (const r of mintData.recipients) {
        const recipientPubkey = new PublicKey(r.wallet);
        const rawAmount = BigInt(r.rawAmount || Math.round(r.amount * 10 ** (mintData.tokenDecimals || 9)));

        const { createIx } = await ensureRecipientAta({ connection, payer: publicKey!, mint, owner: recipientPubkey });
        if (createIx) preflightInstructions.push(createIx);

        wrappedInstructions.push(buildMintInstruction({ treasuryVault, mint, recipientPubkey, rawAmount }));
      }

      return { wrappedInstructions, preflightInstructions: preflightInstructions.length > 0 ? preflightInstructions : undefined };
    }

    if (d.kind === "metadata") {
      const metaData = d.launchContext?.metadataData
        || (() => { try { return JSON.parse(ssGet("kinship.proposal-launch.metadataData")); } catch { return null; } })();
      if (!metaData?.name && !metaData?.symbol) throw new Error("Missing metadata data");

      const { buildMetadataUpdateInstruction, findMetadataPda } = await import("@/lib/onchain/proposal-phases");
      const baseMint = daoCtx.ctx!.baseMint;
      if (!baseMint) throw new Error("Base mint not available");
      const metadataPda = findMetadataPda(baseMint);
      const treasuryVault = daoCtx.ctx!.treasuryVault;

      const ix = buildMetadataUpdateInstruction({
        treasuryVault,
        metadataPda,
        data: {
          name: metaData.name || "",
          symbol: metaData.symbol || "",
          uri: metaData.uri || "",
          sellerFeeBasisPoints: 0,
        },
      });
      return { wrappedInstructions: [ix] };
    }

    if (d.kind === "liquidity") {
      const liqData = d.launchContext?.liquidityData
        || (() => { try { return JSON.parse(ssGet("kinship.proposal-launch.liquidityData")); } catch { return null; } })();
      if (!liqData?.direction || !liqData?.amountUsd) throw new Error("Missing liquidity data");

      const { buildLiquidityAdjustInstruction } = await import("@/lib/onchain/proposal-phases");
      const { FutarchyClient } = await import("@metadaoproject/futarchy/v0.6");
      const { AnchorProvider } = await import("@coral-xyz/anchor");
      const { BN } = await import("@coral-xyz/anchor");

      const baseMint = daoCtx.ctx!.baseMint;
      if (!baseMint) throw new Error("Base mint not available");

      const anchorWallet = {
        publicKey: publicKey!,
        signTransaction: async (t: any) => t,
        signAllTransactions: async (t: any) => t,
      };
      const provider = new AnchorProvider(connection, anchorWallet as any, { commitment: "confirmed" });
      const futarchyForBuild = FutarchyClient.createClient({ provider });

      const decimals = 6; // USDC decimals
      const rawAmount = new BN(Math.round(liqData.amountUsd * 10 ** decimals));
      const maxBaseAmount = new BN("18446744073709551615"); // u64 max — let the pool decide ratio

      const ix = await buildLiquidityAdjustInstruction({
        futarchy: futarchyForBuild,
        dao: daoCtx.ctx!.dao,
        baseMint,
        quoteMint: daoCtx.ctx!.usdcMint,
        treasuryVault: daoCtx.ctx!.treasuryVault,
        quoteAmount: rawAmount,
        maxBaseAmount,
        direction: liqData.direction,
        connection,
      });
      return { wrappedInstructions: [ix] };
    }

    if (d.kind === "perf") {
      const perfData = d.perfData ?? d.launchContext?.perfData
        ?? (() => { try { return JSON.parse(ssGet("kinship.proposal-launch.perfData")); } catch { return null; } })();
      if (!perfData?.tranches?.length || !perfData?.recipientWallet) throw new Error("Missing perf data");

      const {
        buildPerformanceGrantInstruction,
        getTokenProgramForMint,
      } = await import("@/lib/onchain/proposal-phases");
      const { AnchorProvider } = await import("@coral-xyz/anchor");
      const BN = (await import("bn.js")).default;
      const { Keypair } = await import("@solana/web3.js");

      const baseMint = daoCtx.ctx!.baseMint;
      if (!baseMint) throw new Error("Base mint not available");

      const rewardMint = perfData.rewardMintAddress
        ? new PublicKey(perfData.rewardMintAddress)
        : baseMint;
      const treasuryVault = daoCtx.ctx!.treasuryVault;
      const tokenProgram = await getTokenProgramForMint(connection, rewardMint);

      const anchorWallet = {
        publicKey: publicKey!,
        signTransaction: async (t: any) => t,
        signAllTransactions: async (t: any) => t,
      };
      const provider = new AnchorProvider(connection, anchorWallet as any, { commitment: "confirmed" });

      const createKey = Keypair.generate();
      const decimals = perfData.tokenDecimals ?? 9;

      // Build tranches: convert human-readable prices/amounts to raw BN values
      // priceThreshold is u128 — scale to USDC decimals (6) for the oracle
      const tranches = perfData.tranches.map((t: any) => ({
        priceThreshold: new BN(Math.round(t.priceThreshold * 1e6)),
        tokenAmount: new BN(Math.round(t.tokenAmount * 10 ** decimals)),
      }));

      const minUnlockTimestamp = new BN(
        Math.floor(new Date(perfData.minUnlockTimestamp).getTime() / 1000),
      );
      const twapLengthSeconds = (perfData.twapWindowHours ?? 24) * 3600;

      // Oracle account: use the DAO address as the TWAP oracle source.
      // In MetaDAO futarchy, the DAO's AMM stores TWAP aggregator data.
      const oracleAccount = daoCtx.ctx!.dao;

      const ix = await buildPerformanceGrantInstruction({
        provider,
        treasuryVault,
        rewardMint,
        createKey: createKey.publicKey,
        tranches,
        minUnlockTimestamp,
        oracleAccount,
        twapLengthSeconds,
        grantee: new PublicKey(perfData.recipientWallet),
        tokenProgram,
        programVersion: perfData.programVersion ?? "v0.7",
      });

      return { wrappedInstructions: [ix] };
    }

    throw new Error(`Unsupported proposal kind: ${d.kind}`);
  }

  /* ── Run submission ──────────────────────────────────────────────── */
  const startSubmission = useCallback(async () => {
    if (isRunning || !data) return;
    if (!publicKey || !signTransaction) { setGlobalError("Please sign in to continue."); return; }
    if (!daoCtx.ok || !daoCtx.ctx) { setGlobalError("DAO context not ready."); return; }

    setIsRunning(true);
    setGlobalError(null);

    const { dao, multisigPda, treasuryVault } = daoCtx.ctx;
    const { runPhase1, runPhase2Setup, runPhase2bAndPhase3 } = await import("@/lib/onchain/proposal-phases");
    const { FutarchyClient } = await import("@metadaoproject/futarchy/v0.6");
    const { AnchorProvider } = await import("@coral-xyz/anchor");

    const anchorWallet = {
      publicKey,
      signTransaction: signTransaction as any,
      signAllTransactions: async (txs: any[]) => { const s = []; for (const tx of txs) s.push(await signTransaction(tx)); return s; },
    };
    const provider = new AnchorProvider(connection, anchorWallet as any, { commitment: "confirmed" });
    const futarchy = FutarchyClient.createClient({ provider });

    // Track addresses across phases (loaded from resume or built fresh)
    let squadsProposalAddress: PublicKey | null = data.squadsProposalAddress ? new PublicKey(data.squadsProposalAddress) : null;
    let phase2SetupResult: any = null;

    // Restore Phase 2a result from launchContext if available
    if (data.launchPhase >= 2 && data.launchContext?.phase2Setup) {
      const ctx = data.launchContext.phase2Setup;
      phase2SetupResult = {
        futarchyProposalAddress: new PublicKey(ctx.futarchyProposalAddress),
        question: new PublicKey(ctx.question),
        baseMint: new PublicKey(ctx.baseMint),
        quoteMint: new PublicKey(ctx.quoteMint),
      };
    }

    // ── Phase 1: Squads vault tx ────────────────────────────────
    if (data.launchPhase < 1) {
      try {
        setCurrentStep(0);
        updateStep(0, { status: "active" });

        const { wrappedInstructions, preflightInstructions } = await buildInstructions(data);
        if (wrappedInstructions.length === 0) { setGlobalError("No instructions to submit."); setIsRunning(false); return; }

        const p1 = await runPhase1({
          connection, futarchy, sponsorPubkey: publicKey, signTransaction,
          dao, multisigPda, wrappedInstructions, preflightInstructions,
          // Reuse a persisted index on retry so the SAME Squads tx PDA is
          // re-derived (no duplicate/orphaned vault transaction).
          transactionIndex: data.squadsTransactionIndex
            ? BigInt(data.squadsTransactionIndex)
            : undefined,
        });

        squadsProposalAddress = p1.squadsProposalAddress;
        updateStep(0, { status: "complete", signature: p1.signature });

        // Persist BEFORE proceeding, awaited — so an interruption after Phase 1
        // resumes with the address AND the index (prevents duplicate Squads tx).
        await patchOnchainAddresses(data.proposalId, { squadsProposalAddress: squadsProposalAddress.toBase58() });
        await advanceProposal(data.proposalId, "submitted");
        await patchLaunchContext(data.proposalId, 1, {
          squadsProposalAddress: squadsProposalAddress.toBase58(),
          squadsTransactionIndex: p1.squadsTransactionIndex.toString(),
        });
      } catch (err) {
        const msg = friendlyError(err);
        updateStep(0, { status: "failed", error: msg });
        setGlobalError(msg);
        setIsRunning(false);
        return;
      }
    }

    if (!squadsProposalAddress) { setGlobalError("Missing Squads proposal address."); setIsRunning(false); return; }

    // ── Phase 2a: Initialize question + vaults ──────────────────
    if (data.launchPhase < 2) {
      try {
        setCurrentStep(1);
        updateStep(1, { status: "active" });

        phase2SetupResult = await runPhase2Setup({
          futarchy, dao, squadsProposalAddress,
          multisigPda, connection, sponsorPubkey: publicKey, signTransaction,
        });

        updateStep(1, { status: "complete", signature: phase2SetupResult.signature });

        // Also persist futarchyProposalAddress to its column now (not only at
        // Phase 3) so resume inference is consistent between 2a and 3.
        await patchOnchainAddresses(data.proposalId, {
          futarchyProposalAddress: phase2SetupResult.futarchyProposalAddress.toBase58(),
        });
        await patchLaunchContext(data.proposalId, 2, {
          phase2Setup: {
            futarchyProposalAddress: phase2SetupResult.futarchyProposalAddress.toBase58(),
            question: phase2SetupResult.question.toBase58(),
            baseMint: phase2SetupResult.baseMint.toBase58(),
            quoteMint: phase2SetupResult.quoteMint.toBase58(),
          },
        });
      } catch (err) {
        const msg = friendlyError(err);
        updateStep(1, { status: "failed", error: msg });
        setGlobalError(msg);
        setIsRunning(false);
        return;
      }
    }

    if (!phase2SetupResult) { setGlobalError("Missing Phase 2 setup data."); setIsRunning(false); return; }

    // ── Phase 3: Initialize, sponsor & launch (combined) ────────
    if (data.launchPhase < 3) {
      try {
        setCurrentStep(2);
        updateStep(2, { status: "active" });

        const combined = await runPhase2bAndPhase3({
          futarchy, dao, squadsProposalAddress,
          multisigPda, connection, sponsorPubkey: publicKey, signTransaction,
          futarchyProposalAddress: phase2SetupResult.futarchyProposalAddress,
          question: phase2SetupResult.question,
          baseMint: phase2SetupResult.baseMint,
          quoteMint: phase2SetupResult.quoteMint,
        });

        updateStep(2, { status: "complete", signature: combined.signature });

        await patchOnchainAddresses(data.proposalId, { futarchyProposalAddress: combined.futarchyProposalAddress.toBase58() });
        await advanceProposal(data.proposalId, "live");
        await patchLaunchContext(data.proposalId, 3, {});
        setIsComplete(true);
      } catch (err) {
        const msg = friendlyError(err);
        updateStep(2, { status: "failed", error: msg });
        setGlobalError(msg);
      }
    }

    setIsRunning(false);
  }, [isRunning, data, publicKey, signTransaction, daoCtx, connection, updateStep]);

  /* ── Retry ───────────────────────────────────────────────────────── */
  const retrySubmission = useCallback(() => {
    setSteps((prev) => prev.map((s) => (s.status === "failed" ? { ...s, status: "pending", error: undefined } : s)));
    setGlobalError(null);
    setTimeout(() => startSubmission(), 100);
  }, [startSubmission]);

  /* ── Abandon ─────────────────────────────────────────────────────────
     Cancel a proposal whose on-chain submission is stuck. A "submitted"
     proposal otherwise blocks the market's active-proposal guard forever.
     This marks it cancelled server-side so the market is unblocked. */
  const [cancelling, setCancelling] = useState(false);
  const abandonProposal = useCallback(async () => {
    if (!data) return;
    if (!window.confirm(
      "Abandon this proposal? This unblocks the market so you can create a new one. Any Squads transaction already created on-chain is left unused (never executed).",
    )) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/v1/proposals/${data.proposalId}/cancel`, {
        method: "POST", headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error?.message || d.message || d.error || "Cancel failed");
      }
      router.push(`/market/proposals`);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }, [data, router]);

  /* ── Render ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Loading proposal data…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-muted">No proposal data found.</p>
        <button onClick={() => router.push("/market/proposals")}
          className="mt-4 px-4 py-2 rounded-xl border border-card-border text-foreground hover:bg-white/[0.04] cursor-pointer">
          Back to proposals
        </button>
      </div>
    );
  }

  const isResuming = (data.launchPhase ?? 0) > 0;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div className="text-center mb-8">
        {isComplete ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <Icon icon="lucide:check-circle" width={36} height={36} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Proposal is live!</h1>
            <p className="text-muted">Trading is now open. Citizens can vote Pass or Fail.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
              <Icon icon={isResuming ? "lucide:play" : "lucide:rocket"} width={36} height={36} className="text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {isResuming ? "Resume proposal launch" : "Review & launch proposal"}
            </h1>
            <p className="text-muted">
              {isResuming
                ? `Resuming from step ${data.launchPhase + 1}. Previous steps were saved.`
                : isRunning ? "Sign each transaction in your wallet." : "Review the details, then launch on-chain."}
            </p>
          </>
        )}
      </div>

      {/* Proposal summary */}
      <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
            <Icon icon={data.kind === "spend" ? "lucide:banknote" : data.kind === "mint" ? "lucide:coins" : data.kind === "metadata" ? "lucide:file-edit" : "lucide:sliders-horizontal"} width={20} height={20} className="text-accent" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">{data.title || "Untitled proposal"}</h2>
            <p className="text-[11px] text-muted">{data.objectiveName || "—"} · {data.kind.toUpperCase()}</p>
          </div>
        </div>
        {data.summary && (
          <div className="p-3 rounded-lg bg-white/[0.02] border border-card-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Details</p>
            <p className="text-sm text-white">{data.summary}</p>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-8">
        {STEPS.map((def, idx) => {
          const state = steps[idx];
          return (
            <div key={def.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                state.status === "complete" ? "bg-green-500/[0.04] border-green-500/20"
                  : state.status === "failed" ? "bg-red-500/[0.04] border-red-500/20"
                    : state.status === "active" ? "bg-accent/[0.04] border-accent/30"
                      : "bg-card border-card-border"
              }`}>
              <div className="shrink-0">
                {state.status === "complete" && (
                  <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                    <Icon icon="lucide:check" width={20} height={20} className="text-green-400" />
                  </div>
                )}
                {state.status === "failed" && (
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                    <Icon icon="lucide:x" width={20} height={20} className="text-red-400" />
                  </div>
                )}
                {state.status === "active" && (
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                    <Icon icon="lucide:loader-2" width={20} height={20} className="text-accent animate-spin" />
                  </div>
                )}
                {state.status === "pending" && (
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <Icon icon={def.icon} width={20} height={20} className="text-muted" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm ${
                    state.status === "complete" ? "text-green-400"
                      : state.status === "failed" ? "text-red-400"
                        : state.status === "pending" ? "text-muted" : "text-white"
                  }`}>{def.label}</span>
                  <span className="text-[10px] font-mono text-muted">{idx + 1}/{STEPS.length}</span>
                </div>
                <p className="text-[11px] text-muted/60">{def.hint}</p>
                {state.status === "active" && <p className="text-xs text-accent mt-1">Building transaction…</p>}
                {state.status === "complete" && state.signature && (
                  <p className="text-[10px] text-muted/50 font-mono mt-1 truncate">tx: {state.signature}</p>
                )}
                {state.status === "failed" && state.error && (
                  <p className="text-xs text-red-400 mt-1">{state.error}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Global error */}
      {globalError && !isRunning && (
        <div className="p-4 rounded-xl bg-red-500/[0.06] border border-red-500/20 mb-6">
          <p className="text-sm text-red-400">{globalError}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3">
        {isComplete ? (
          <button onClick={() => router.push(`/market/proposals/${data.proposalId}`)}
            className="bg-accent hover:bg-accent-dark text-white font-semibold px-8 py-3 rounded-full transition-colors cursor-pointer flex items-center gap-2">
            <Icon icon="lucide:external-link" width={18} height={18} />
            View Proposal
          </button>
        ) : !connected ? (
          <p className="text-muted">Sign in to continue.</p>
        ) : isRunning ? (
          <p className="text-sm text-muted">Do not close this page. Approve each transaction in your wallet.</p>
        ) : globalError ? (
          <>
            <button onClick={() => router.back()}
              className="px-4 py-2.5 rounded-xl border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer">
              Back
            </button>
            <button onClick={retrySubmission}
              className="bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-2.5 rounded-full transition-colors cursor-pointer">
              Retry
            </button>
            <button onClick={abandonProposal} disabled={cancelling}
              className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/[0.06] transition-colors cursor-pointer disabled:opacity-50">
              {cancelling ? "Abandoning…" : "Abandon"}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => router.back()}
              className="px-4 py-2.5 rounded-xl border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer">
              Back
            </button>
            <button onClick={startSubmission}
              className="bg-accent hover:bg-accent-dark text-white font-semibold px-8 py-2.5 rounded-full transition-colors cursor-pointer flex items-center gap-2">
              <Icon icon={isResuming ? "lucide:play" : "lucide:rocket"} width={18} height={18} />
              {isResuming ? "Continue Launch" : "Launch Proposal"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProposalLaunchingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Loading…</p>
      </div>
    }>
      <LaunchingInner />
    </Suspense>
  );
}
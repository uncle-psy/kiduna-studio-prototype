"use client";

/**
 * useProposalSubmit — orchestrates the three-phase on-chain proposal flow.
 *
 * 1. Phase 1 — Wraps type-specific instructions in a Squads vault tx.
 * 2. Phase 2 — Initializes the futarchy proposal pointing at the Squads tx.
 * 3. Phase 3 — Sponsors and launches the proposal (trading opens).
 *
 * Between phases, the hook writes on-chain addresses back to the server and
 * advances the proposal lifecycle (draft → submitted → live).
 */

import { useState, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import type { TransactionInstruction } from "@solana/web3.js";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { useSponsorPubkey, useFrostSignTransaction } from "@/lib/onchain/useAnchorProvider";
import { useProposalDraft } from "@/lib/proposal-draft/ProposalDraftContext";
import { getSessionToken } from "@/lib/auth";

// Inline types to avoid any import from proposal-phases.ts at the module level,
// which would cause Turbopack to trace into futarchy → bundlr → avsc → require('fs').
interface Phase1Result {
  squadsProposalAddress: import("@solana/web3.js").PublicKey;
  squadsTransactionIndex: bigint;
  signature: string;
  preflightSignature?: string;
}
interface Phase2SetupResult {
  futarchyProposalAddress: import("@solana/web3.js").PublicKey;
  question: import("@solana/web3.js").PublicKey;
  baseMint: import("@solana/web3.js").PublicKey;
  quoteMint: import("@solana/web3.js").PublicKey;
  signature: string;
}
interface Phase2Result {
  futarchyProposalAddress: import("@solana/web3.js").PublicKey;
  signature: string;
}
interface Phase3Result {
  signatures: { sponsor?: string; launch: string };
}

export type SubmitPhase =
  | "idle"
  | "phase1" // Create Squads vault transaction
  | "phase1-done"
  | "phase2-setup" // Initialize question + vaults
  | "phase2-setup-done"
  | "phase2-proposal" // Initialize futarchy proposal
  | "phase2-proposal-done"
  | "phase3" // Sponsor + launch trading
  | "done"
  | "error";

export interface UseProposalSubmitResult {
  submit: (args: {
    proposalId: string;
    wrappedInstructions: TransactionInstruction[];
    preflightInstructions?: TransactionInstruction[];
  }) => Promise<void>;
  phase: SubmitPhase;
  error: string | null;
  phase1Result: Phase1Result | null;
  phase2Result: Phase2Result | null;
  phase3Result: Phase3Result | null;
}

// ── Friendly error translation ──────────────────────────────────────────────
// Translates known on-chain program errors into user-readable messages.
// Falls back to the raw error message for unknown errors.

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("PoolNotInSpotState") || msg.includes("0x178a")) {
    return "This market already has an active proposal. Wait for it to be finalized before creating a new one.";
  }
  if (msg.includes("ProposalTooYoung") || msg.includes("0x177c")) {
    return "The trading window hasn't ended yet. Wait for it to close before finalizing.";
  }
  if (msg.includes("InsufficientFunds") || msg.includes("0x1")) {
    return "Insufficient funds. Check your USDC and SOL balance.";
  }
  if (msg.includes("AccountNotInitialized") || msg.includes("0x3")) {
    return "A required token account is missing. The market may not be fully launched.";
  }
  if (msg.includes("User rejected")) {
    return "Transaction was rejected in your wallet.";
  }

  return msg;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function patchOnchainAddresses(
  proposalId: string,
  data: { squadsProposalAddress?: string; futarchyProposalAddress?: string },
) {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  await fetch(`/api/v1/proposals/${proposalId}/onchain`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
}

async function advanceProposal(proposalId: string, to: "submitted" | "live") {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/v1/proposals/${proposalId}/advance`, {
    method: "POST",
    headers,
    body: JSON.stringify({ to }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Advance to "${to}" failed (${res.status})`);
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useProposalSubmit(): UseProposalSubmitResult {
  const { connection } = useConnection();
  // Sign via the user's internal FROST wallet (no Phantom / browser wallet).
  const publicKey = useSponsorPubkey();
  const signTransaction = useFrostSignTransaction();
  const daoCtx = useDaoContext();
  const { markPhaseComplete, recordError } = useProposalDraft();

  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [phase1Result, setPhase1Result] = useState<Phase1Result | null>(null);
  const [phase2Result, setPhase2Result] = useState<Phase2Result | null>(null);
  const [phase3Result, setPhase3Result] = useState<Phase3Result | null>(null);

  const submit = useCallback(
    async (args: {
      proposalId: string;
      wrappedInstructions: TransactionInstruction[];
      preflightInstructions?: TransactionInstruction[];
    }) => {
      const { proposalId, wrappedInstructions, preflightInstructions } = args;

      // Pre-checks
      if (!publicKey || !signTransaction) {
        setError("Please sign in to submit this proposal.");
        setPhase("error");
        return;
      }
      if (!daoCtx.ok || !daoCtx.ctx) {
        setError(
          `DAO context not resolved: ${daoCtx.missing.join(", ")}. Has this Market been launched?`,
        );
        setPhase("error");
        return;
      }

      const { dao, multisigPda, treasuryVault, usdcMint } = daoCtx.ctx;

      // Dynamic import to avoid pulling Node-only transitive deps into the
      // client bundle (futarchy → bundlr → avsc → require('fs')).
      const { runPhase1, runPhase2Setup, runPhase2Initialize, runPhase3 } =
        await import("@/lib/onchain/proposal-phases");
      const { FutarchyClient } = await import("@metadaoproject/futarchy/v0.6");
      const { AnchorProvider } = await import("@coral-xyz/anchor");

      // Create a FutarchyClient bound to the connected wallet.
      const anchorWallet = {
        publicKey,
        signTransaction: signTransaction as any,
        signAllTransactions: async (txs: any[]) => {
          const signed = [];
          for (const tx of txs) signed.push(await signTransaction(tx));
          return signed;
        },
      };
      const provider = new AnchorProvider(connection, anchorWallet as any, {
        commitment: "confirmed",
      });
      const futarchy = FutarchyClient.createClient({ provider });

      setError(null);
      setPhase1Result(null);
      setPhase2Result(null);
      setPhase3Result(null);

      // Local variables to hold results within this async call.
      // React state setters are batched and won't be readable until the
      // next render — these locals are the source of truth for subsequent phases.
      let localP1: Phase1Result;
      let localP2Setup: Phase2SetupResult;
      let localP2: Phase2Result;

      // ── Phase 1: Squads vault tx ──────────────────────────────
      try {
        setPhase("phase1");

        localP1 = await runPhase1({
          connection,
          futarchy,
          sponsorPubkey: publicKey,
          signTransaction,
          dao,
          multisigPda,
          wrappedInstructions,
          preflightInstructions,
        });

        setPhase1Result(localP1);
        markPhaseComplete("submit-squads");

        // Write Squads address to server + advance to submitted.
        await patchOnchainAddresses(proposalId, {
          squadsProposalAddress: localP1.squadsProposalAddress.toBase58(),
        });
        await advanceProposal(proposalId, "submitted");

        setPhase("phase1-done");
      } catch (err) {
        const msg = friendlyError(err);
        setError(msg);
        setPhase("error");
        recordError("submit-squads", msg);
        return;
      }

      // ── Phase 2a: Initialize question + vaults ────────────────
      try {
        setPhase("phase2-setup");

        localP2Setup = await runPhase2Setup({
          futarchy,
          dao,
          squadsProposalAddress: localP1.squadsProposalAddress,
          multisigPda,
          connection,
          sponsorPubkey: publicKey,
          signTransaction,
        });

        setPhase("phase2-setup-done");
      } catch (err) {
        const msg = friendlyError(err);
        setError(msg);
        setPhase("error");
        recordError("init-futarchy", msg);
        return;
      }

      // ── Phase 2b: Initialize futarchy proposal ────────────────
      try {
        setPhase("phase2-proposal");

        localP2 = await runPhase2Initialize({
          futarchy,
          dao,
          squadsProposalAddress: localP1.squadsProposalAddress,
          multisigPda,
          connection,
          sponsorPubkey: publicKey,
          signTransaction,
          futarchyProposalAddress: localP2Setup.futarchyProposalAddress,
          question: localP2Setup.question,
          baseMint: localP2Setup.baseMint,
          quoteMint: localP2Setup.quoteMint,
        });

        setPhase2Result(localP2);
        markPhaseComplete("init-futarchy");

        await patchOnchainAddresses(proposalId, {
          futarchyProposalAddress: localP2.futarchyProposalAddress.toBase58(),
        });

        setPhase("phase2-proposal-done");
      } catch (err) {
        const msg = friendlyError(err);
        setError(msg);
        setPhase("error");
        recordError("init-futarchy", msg);
        return;
      }

      // ── Phase 3: Sponsor + Launch ─────────────────────────────
      try {
        setPhase("phase3");

        const localP3 = await runPhase3({
          futarchy,
          sponsorPubkey: publicKey,
          dao,
          futarchyProposalAddress: localP2.futarchyProposalAddress,
          squadsProposalAddress: localP1.squadsProposalAddress,
          multisigPda,

          // required by merged Phase 3
          connection,
          signTransaction,
        });

        setPhase3Result(localP3);
        markPhaseComplete("sponsor-launch");

        await advanceProposal(proposalId, "live");

        setPhase("done");
        markPhaseComplete("done");
      } catch (err) {
        const msg = friendlyError(err);
        setError(msg);
        setPhase("error");
        recordError("sponsor-launch", msg);
      }
    },
    [
      publicKey,
      signTransaction,
      daoCtx,
      connection,
      markPhaseComplete,
      recordError,
    ],
  );

  return { submit, phase, error, phase1Result, phase2Result, phase3Result };
}
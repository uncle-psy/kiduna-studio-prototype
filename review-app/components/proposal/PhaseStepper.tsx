"use client";

/**
 * PhaseStepper — the reusable submit flow for any proposal type.
 *
 * Renders a 3-phase stepper (Submit Squads → Init Futarchy → Sponsor + Launch),
 * runs each phase against real on-chain calls when its button is clicked,
 * surfaces signatures with explorer links, and shows errors per phase.
 *
 * Each create page passes:
 *   - `getWrappedInstructions`: a function returning the proposal-type-specific
 *     instructions to wrap inside the Squads vault transaction. Async because
 *     some types (param, liquidity) need to call SDK builders.
 *   - `daoCtx`: the DAO + multisig + treasury addresses (read from context
 *     or env for v1).
 *
 * The stepper handles all the orchestration: button states, loading, errors,
 * sequence guarantees (can't run Phase 2 before Phase 1 completes).
 */

import { useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { Button, Card, CardSub, CardTitle } from "@/components/ui/index";
import { useFutarchy } from "@/lib/onchain/useFutarchy";
import { useSponsorPubkey, useFrostSignTransaction } from "@/lib/onchain/useAnchorProvider";
import {
  runPhase1,
  runPhase2,
  runPhase3,
} from "@/lib/onchain/proposal-phases";

export interface DaoContext {
  /** DAO PDA on-chain. */
  dao: PublicKey;
  /** Squads multisig PDA. */
  multisigPda: PublicKey;
  /** Squads vault PDA (treasury). */
  treasuryVault: PublicKey;
}

export interface PhaseStepperProps {
  daoCtx: DaoContext;
  /**
   * Build the instructions to wrap. Called when sponsor clicks Phase 1.
   * Throw if validation fails — the error string surfaces in the UI.
   */
  getWrappedInstructions: () => Promise<TransactionInstruction[]>;
  /**
   * Optional: build pre-flight instructions (e.g. recipient ATA creation)
   * to send BEFORE the Squads bundle, signed by the sponsor's wallet on
   * the host network. Called from Phase 1.
   */
  getPreflightInstructions?: () => Promise<TransactionInstruction[]>;
  /** Optional: a label specific to this proposal type (e.g. "Spend"). */
  typeLabel?: string;
  /**
   * Cluster name for explorer links. Default "devnet". Pass "mainnet-beta"
   * for production or "custom" for localnet (explorer links won't resolve).
   */
  cluster?: "mainnet-beta" | "devnet" | "testnet" | "custom";
}

type Phase = "p1" | "p2" | "p3";

export function PhaseStepper({
  daoCtx,
  getWrappedInstructions,
  getPreflightInstructions,
  typeLabel = "proposal",
  cluster = "devnet",
}: PhaseStepperProps) {
  const { connection } = useConnection();
  const sponsorPubkey = useSponsorPubkey();
  const frostSign = useFrostSignTransaction();
  const futarchy = useFutarchy();

  const [busy, setBusy] = useState<Phase | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Phase, string>>>({});
  const [signatures, setSignatures] = useState<Partial<Record<Phase, string>>>({});

  // Phase 1 outputs feed Phase 2; Phase 2 output feeds Phase 3.
  const [squadsAddr, setSquadsAddr] = useState<PublicKey | null>(null);
  const [futarchyAddr, setFutarchyAddr] = useState<PublicKey | null>(null);

  const ready =
    !!futarchy && !!sponsorPubkey && !!frostSign;

  const explorer = (sig: string) =>
    cluster === "custom"
      ? `https://explorer.solana.com/tx/${sig}`
      : `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;

  const doPhase1 = async () => {
    if (!futarchy || !sponsorPubkey || !frostSign) return;
    setBusy("p1");
    setErrors((e) => ({ ...e, p1: undefined }));
    try {
      const wrappedInstructions = await getWrappedInstructions();
      if (!wrappedInstructions.length) {
        throw new Error("No instructions to wrap. Check Phase 1 form.");
      }
      const preflightInstructions = getPreflightInstructions
        ? await getPreflightInstructions()
        : undefined;
      const r = await runPhase1({
        connection,
        futarchy,
        sponsorPubkey: sponsorPubkey,
        signTransaction: frostSign,
        dao: daoCtx.dao,
        multisigPda: daoCtx.multisigPda,
        wrappedInstructions,
        preflightInstructions,
      });
      setSquadsAddr(r.squadsProposalAddress);
      setSignatures((s) => ({ ...s, p1: r.signature }));
    } catch (err) {
      setErrors((e) => ({
        ...e,
        p1: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setBusy(null);
    }
  };

  const doPhase2 = async () => {
    if (!futarchy || !squadsAddr || !sponsorPubkey || !frostSign) return;
    setBusy("p2");
    setErrors((e) => ({ ...e, p2: undefined }));
    try {
      const r = await runPhase2({
        futarchy,
        dao: daoCtx.dao,
        squadsProposalAddress: squadsAddr,
        multisigPda: daoCtx.multisigPda,
        connection,
        sponsorPubkey: sponsorPubkey,
        signTransaction: frostSign,
      });
      setFutarchyAddr(r.futarchyProposalAddress);
      setSignatures((s) => ({ ...s, p2: r.signature }));
    } catch (err) {
      setErrors((e) => ({
        ...e,
        p2: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setBusy(null);
    }
  };

  const doPhase3 = async () => {
    if (!futarchy || !sponsorPubkey || !frostSign || !squadsAddr || !futarchyAddr) return;
    setBusy("p3");
    setErrors((e) => ({ ...e, p3: undefined }));
    try {
      const r = await runPhase3({
        futarchy,
        sponsorPubkey: sponsorPubkey,
        dao: daoCtx.dao,
        futarchyProposalAddress: futarchyAddr,
        squadsProposalAddress: squadsAddr,
        multisigPda: daoCtx.multisigPda,
        connection,
        signTransaction: frostSign,
      });
      setSignatures((s) => ({ ...s, p3: r.signatures.launch }));
    } catch (err) {
      setErrors((e) => ({
        ...e,
        p3: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardTitle>Submit on-chain</CardTitle>
      <CardSub>
        Three phases. Each runs a real Solana transaction, signed automatically
        by your FROST wallet. Don&apos;t close this tab until Phase 3
        finishes — the proposal isn&apos;t live until Launch lands.
      </CardSub>

      {!ready && (
        <div className="mt-[12px] p-[10px] bg-[rgba(234,170,0,0.06)] border-[1px] border-[rgba(234,170,0,0.25)] rounded-[8px] text-[12px] text-at-param">
          Sign in to author this {typeLabel}.
        </div>
      )}

      <PhaseRow
        index={1}
        label="Submit Squads proposal"
        description="Wraps your action(s) inside a Squads vault transaction and registers it as a multisig proposal."
        onRun={doPhase1}
        running={busy === "p1"}
        complete={!!signatures.p1}
        signature={signatures.p1}
        error={errors.p1}
        explorer={explorer}
        disabled={!ready}
      />

      <PhaseRow
        index={2}
        label="Initialize futarchy proposal"
        description="Creates the question, conditional vaults, and proposal account on the futarchy program."
        onRun={doPhase2}
        running={busy === "p2"}
        complete={!!signatures.p2}
        signature={signatures.p2}
        error={errors.p2}
        explorer={explorer}
        disabled={!ready || !squadsAddr || !!signatures.p2}
        gateMessage={!squadsAddr ? "Complete Phase 1 first." : undefined}
      />

      <PhaseRow
        index={3}
        label="Sponsor & launch"
        description="Marks the proposal team-sponsored and opens trading. Halves the spot pool into Pass/Fail conditional AMMs."
        onRun={doPhase3}
        running={busy === "p3"}
        complete={!!signatures.p3}
        signature={signatures.p3}
        error={errors.p3}
        explorer={explorer}
        disabled={!ready || !futarchyAddr || !!signatures.p3}
        gateMessage={!futarchyAddr ? "Complete Phase 2 first." : undefined}
      />

      {signatures.p3 && (
        <div className="mt-[16px] p-[12px] bg-[rgba(34,197,94,0.06)] border-[1px] border-[rgba(34,197,94,0.25)] rounded-[8px]">
          <div className="font-mono text-[10px] text-pass tracking-[0.08em] uppercase">
            Trading is open
          </div>
          <div className="text-[12px] text-subtle mt-[4px] leading-[1.6]">
            Pass/Fail conditional markets are live. Citizens&apos; Electors will
            trade for the duration of the trading window. After the window
            closes, anyone can call <code>finalize_proposal</code> to settle.
          </div>
        </div>
      )}
    </Card>
  );
}

function PhaseRow(props: {
  index: number;
  label: string;
  description: string;
  onRun: () => void;
  running: boolean;
  complete: boolean;
  signature?: string;
  error?: string;
  explorer: (sig: string) => string;
  disabled: boolean;
  gateMessage?: string;
}) {
  const { index, label, description, onRun, running, complete, signature, error, explorer, disabled, gateMessage } = props;

  return (
    <div
      className={`mt-[10px] p-[12px] rounded-[10px] border-[1px] ${
        complete
          ? "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.04)]"
          : error
          ? "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.04)]"
          : "border-border bg-[rgba(255,255,255,0.02)]"
      }`}
    >
      <div className="flex items-start gap-[10px]">
        <div
          className={`text-[14px] font-mono w-[24px] h-[24px] rounded-full flex items-center justify-center flex-shrink-0 ${
            complete
              ? "bg-pass text-[#0b2010]"
              : running
              ? "bg-accent-2 text-[#0b2010] animate-pulse"
              : "bg-[rgba(255,255,255,0.05)] text-muted"
          }`}
        >
          {complete ? "✓" : running ? "…" : index}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-[13px]">{label}</div>
          <div className="text-[11px] text-muted leading-[1.5] mt-[2px]">
            {description}
          </div>
          {signature && (
            <div className="mt-[6px] text-[11px]">
              <span className="text-muted">Signature: </span>
              <a
                href={explorer(signature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-2 underline font-mono"
              >
                {signature.slice(0, 8)}…{signature.slice(-8)} ↗
              </a>
            </div>
          )}
          {error && (
            <div className="mt-[6px] text-[11px] text-fail leading-[1.5]">
              {error}
            </div>
          )}
          {gateMessage && !complete && (
            <div className="mt-[6px] text-[11px] text-muted">
              {gateMessage}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant={complete ? "ghost" : "primary"}
          onClick={onRun}
          disabled={disabled || running || complete}
          className="cursor-pointer flex-shrink-0"
        >
          {complete ? "Done" : running ? "Running…" : "Run"}
        </Button>
      </div>
    </div>
  );
}
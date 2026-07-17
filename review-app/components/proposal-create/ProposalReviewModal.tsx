"use client";

/**
 * ProposalReviewModal — shared across all 6 proposal types.
 *
 * Shows a summary of the proposal, a three-phase on-chain stepper, and drives
 * the wallet signing flow via `useProposalSubmit`.
 *
 * The caller provides:
 *   - `proposalId` — from the draft API call
 *   - `summary` — type-specific React element (recipient, amount, params, etc.)
 *   - `buildInstructions` — async fn that returns the wrapped + preflight instructions
 */

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  useProposalSubmit,
  type SubmitPhase,
} from "@/lib/onchain/useProposalSubmit";
import type { TransactionInstruction } from "@solana/web3.js";

interface ProposalReviewModalProps {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  title: string;
  objectiveName: string;
  rationale: string;
  summary: ReactNode;
  buildInstructions: () => Promise<{
    wrappedInstructions: TransactionInstruction[];
    preflightInstructions?: TransactionInstruction[];
  }>;
}

const PHASES: { id: SubmitPhase | string; label: string }[] = [
  { id: "phase1", label: "Create proposal transaction" },
  { id: "phase2-setup", label: "Initialize question & vaults" },
  { id: "phase2-proposal", label: "Initialize futarchy proposal" },
  { id: "phase3", label: "Sponsor & launch trading" },
];

function phaseIndex(phase: SubmitPhase): number {
  if (phase === "idle") return -1;
  if (phase === "phase1") return 0;
  if (phase === "phase1-done" || phase === "phase2-setup") return 1;
  if (phase === "phase2-setup-done" || phase === "phase2-proposal") return 2;
  if (phase === "phase2-proposal-done" || phase === "phase3") return 3;
  if (phase === "done") return 4;
  return -1; // error
}

function PhaseStep({
  index,
  label,
  currentIndex,
  isError,
}: {
  index: number;
  label: string;
  currentIndex: number;
  isError: boolean;
}) {
  const isDone = currentIndex > index;
  const isActive = currentIndex === index;
  const isFailed = isError && isActive;

  let indicator = <span className="phase-dot" />;
  if (isDone) indicator = <span className="phase-dot done">✓</span>;
  if (isActive && !isFailed)
    indicator = <span className="phase-dot active spinner" />;
  if (isFailed) indicator = <span className="phase-dot error">✗</span>;

  return (
    <div
      className={`phase-step ${isDone ? "done" : ""} ${isActive ? "active" : ""} ${isFailed ? "error" : ""}`}
    >
      {indicator}
      <span className="phase-label">{label}</span>
    </div>
  );
}

export function ProposalReviewModal({
  open,
  onClose,
  proposalId,
  title,
  objectiveName,
  rationale,
  summary,
  buildInstructions,
}: ProposalReviewModalProps) {
  const router = useRouter();
  const { submit, phase, error, phase1Result, phase3Result } =
    useProposalSubmit();
  const [building, setBuilding] = useState(false);

  const isSubmitting =
    phase !== "idle" && phase !== "done" && phase !== "error";
  const isDone = phase === "done";
  const currentPhaseIdx = phaseIndex(phase);

  const handleConfirm = useCallback(async () => {
    setBuilding(true);
    try {
      const { wrappedInstructions, preflightInstructions } =
        await buildInstructions();
      setBuilding(false);
      await submit({ proposalId, wrappedInstructions, preflightInstructions });
    } catch (err) {
      setBuilding(false);
      // buildInstructions threw — let the UI show the error state
    }
  }, [buildInstructions, submit, proposalId]);

  const handleDone = useCallback(() => {
    onClose();
    router.push("/market/proposals");
  }, [onClose, router]);

  if (!open) return null;

  return (
    <div
      className="review-overlay"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div className="review-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="review-header">
          <div className="review-title">Review & Submit</div>
          {!isSubmitting && !isDone && (
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        {/* Proposal summary */}
        <div className="review-section">
          <div className="review-label">Proposal</div>
          <div className="review-value">{title}</div>
        </div>
        <div className="review-section">
          <div className="review-label">Objective</div>
          <div className="review-value">{objectiveName}</div>
        </div>
        {rationale && (
          <div className="review-section">
            <div className="review-label">Rationale</div>
            <div className="review-value review-rationale">{rationale}</div>
          </div>
        )}

        {/* Type-specific summary */}
        <div className="review-section">{summary}</div>

        {/* Phase stepper */}
        {(isSubmitting || isDone || phase === "error") && (
          <div className="phase-stepper">
            {PHASES.map((p, i) => (
              <PhaseStep
                key={p.id}
                index={i}
                label={p.label}
                currentIndex={currentPhaseIdx}
                isError={phase === "error"}
              />
            ))}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="review-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Explorer link on success */}
        {isDone && phase3Result?.signatures.launch && (
          <div className="review-success">
            Proposal is live! Trading is now open.
          </div>
        )}

        {/* Actions */}
        <div className="review-actions">
          {!isSubmitting && !isDone && (
            <>
              <button
                className="btn secondary"
                onClick={onClose}
                disabled={building}
              >
                Back
              </button>
              <button
                className="btn primary"
                onClick={handleConfirm}
                disabled={building}
              >
                {building ? "Building tx…" : "Sign & Submit"}
              </button>
            </>
          )}
          {isSubmitting && (
            <button className="btn secondary" disabled>
              Submitting…
            </button>
          )}
          {phase === "error" && (
            <button className="btn primary" onClick={handleConfirm}>
              Retry
            </button>
          )}
          {isDone && (
            <button className="btn primary" onClick={handleDone}>
              View proposals
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

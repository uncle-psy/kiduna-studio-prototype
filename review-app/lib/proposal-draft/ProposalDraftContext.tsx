"use client";

/**
 * State shared across the multi-phase proposal creation flow.
 *
 * The Sponsor app's create-spend / create-mint / etc. pages have multiple
 * phases (pre-flight, story, build, submit-squads, init-futarchy, sponsor+launch).
 * Each phase reads earlier state and writes its own outputs (signatures,
 * pubkeys). This context is the shared bag.
 *
 * Lives only in memory — refresh = lose state. For "resume after refresh"
 * later, mirror to sessionStorage, similar pattern as the connect step.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ProposalKind =
  | "spend"
  | "param"
  | "mint"
  | "metadata"
  | "liquidity"
  | "perf";

/** Phase tracker — drives the stepper UI. */
export type PhaseId = "preflight" | "story" | "build" | "submit-squads" | "init-futarchy" | "sponsor-launch" | "done";

export interface ProposalDraftState {
  kind: ProposalKind | null;

  /** Story fields (Phase 1) — what the sponsor wrote in the form. */
  story: {
    title: string;
    rationale: string;
  };

  /** Action fields (Phase 1) — proposal-type-specific. */
  action: Record<string, unknown>;

  /** Phase tracking. */
  currentPhase: PhaseId;
  phasesComplete: Partial<Record<PhaseId, boolean>>;

  /** On-chain artifacts produced as we go. */
  squadsTransactionIndex: string | null;
  squadsProposalAddress: string | null;
  futarchyProposalAddress: string | null;

  /** Signatures, indexed by phase — for showing explorer links. */
  signatures: Partial<Record<PhaseId, string>>;

  /** Latest error per phase, for showing in the UI. */
  errors: Partial<Record<PhaseId, string>>;
}

const INITIAL: ProposalDraftState = {
  kind: null,
  story: { title: "", rationale: "" },
  action: {},
  currentPhase: "preflight",
  phasesComplete: {},
  squadsTransactionIndex: null,
  squadsProposalAddress: null,
  futarchyProposalAddress: null,
  signatures: {},
  errors: {},
};

interface ProposalDraftContextShape {
  state: ProposalDraftState;
  setKind: (k: ProposalKind) => void;
  updateStory: (s: Partial<ProposalDraftState["story"]>) => void;
  updateAction: (a: Partial<Record<string, unknown>>) => void;
  goToPhase: (p: PhaseId) => void;
  markPhaseComplete: (p: PhaseId, opts?: { signature?: string }) => void;
  recordError: (p: PhaseId, msg: string) => void;
  setSquadsArtifacts: (args: {
    transactionIndex?: string;
    proposalAddress?: string;
  }) => void;
  setFutarchyProposal: (address: string) => void;
  reset: () => void;
}

const Ctx = createContext<ProposalDraftContextShape | null>(null);

export function ProposalDraftProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProposalDraftState>(INITIAL);

  const setKind = useCallback((kind: ProposalKind) => {
    setState((s) => ({ ...s, kind }));
  }, []);

  const updateStory = useCallback(
    (story: Partial<ProposalDraftState["story"]>) => {
      setState((s) => ({ ...s, story: { ...s.story, ...story } }));
    },
    [],
  );

  const updateAction = useCallback(
    (action: Partial<Record<string, unknown>>) => {
      setState((s) => ({ ...s, action: { ...s.action, ...action } }));
    },
    [],
  );

  const goToPhase = useCallback((currentPhase: PhaseId) => {
    setState((s) => ({ ...s, currentPhase }));
  }, []);

  const markPhaseComplete = useCallback(
    (p: PhaseId, opts?: { signature?: string }) => {
      setState((s) => ({
        ...s,
        phasesComplete: { ...s.phasesComplete, [p]: true },
        signatures: opts?.signature
          ? { ...s.signatures, [p]: opts.signature }
          : s.signatures,
        errors: { ...s.errors, [p]: undefined },
      }));
    },
    [],
  );

  const recordError = useCallback((p: PhaseId, msg: string) => {
    setState((s) => ({ ...s, errors: { ...s.errors, [p]: msg } }));
  }, []);

  const setSquadsArtifacts = useCallback(
    (args: { transactionIndex?: string; proposalAddress?: string }) => {
      setState((s) => ({
        ...s,
        squadsTransactionIndex: args.transactionIndex ?? s.squadsTransactionIndex,
        squadsProposalAddress: args.proposalAddress ?? s.squadsProposalAddress,
      }));
    },
    [],
  );

  const setFutarchyProposal = useCallback((address: string) => {
    setState((s) => ({ ...s, futarchyProposalAddress: address }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL);
  }, []);

  const value = useMemo<ProposalDraftContextShape>(
    () => ({
      state,
      setKind,
      updateStory,
      updateAction,
      goToPhase,
      markPhaseComplete,
      recordError,
      setSquadsArtifacts,
      setFutarchyProposal,
      reset,
    }),
    [
      state,
      setKind,
      updateStory,
      updateAction,
      goToPhase,
      markPhaseComplete,
      recordError,
      setSquadsArtifacts,
      setFutarchyProposal,
      reset,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProposalDraft(): ProposalDraftContextShape {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useProposalDraft must be used inside ProposalDraftProvider");
  }
  return v;
}

"use client";

/**
 * ProposalShell — main layout for the proposal detail page.
 * Rewritten with Kinship Studio Tailwind tokens (no old CSS).
 */

import Link from "next/link";
import { Countdown } from "./Countdown";
import { TwapCard } from "./TwapCard";
import { ActivityCard } from "./ActivityCard";
import { HowThisScores } from "./HowThisScores";
import { AuthoringTrail } from "./AuthoringTrail";
import { ParticipantSettlement } from "./ParticipantSettlement";
import { ImpactTracking } from "./ImpactTracking";
import { VotingPanel } from "./VotingPanel";
import { RedeemCard } from "./RedeemCard";
import { LifecycleActions } from "./LifecycleActions";
import { SpendBody } from "./bodies/SpendBody";
import { ParamBody } from "./bodies/ParamBody";
import { MintBody } from "./bodies/MintBody";
import { MetadataBody } from "./bodies/MetadataBody";
import { LiquidityBody } from "./bodies/LiquidityBody";
import { PerfBody } from "./bodies/PerfBody";
import { findObjective } from "@/lib/objectives";
import { useOnchainProposalState } from "@/lib/onchain/read-proposal-state";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import type { Proposal } from "@/lib/proposal-detail-mocks";

import { Icon } from "@iconify/react";

import type { InitialPrices } from "@/lib/onchain/read-proposal-state";

const KIND_LABEL: Record<Proposal["kind"], string> = {
  spend: "Spending proposal",
  param: "Parameter proposal",
  mint: "Mint proposal",
  metadata: "Metadata proposal",
  liquidity: "Liquidity proposal",
  perf: "Performance package",
};

const KIND_ICON: Record<Proposal["kind"], string> = {
  spend: "lucide:banknote",
  param: "lucide:sliders-horizontal",
  mint: "lucide:coins",
  metadata: "lucide:file-edit",
  liquidity: "lucide:droplets",
  perf: "lucide:trophy",
};

const KIND_COLOR: Record<Proposal["kind"], string> = {
  spend: "green",
  param: "blue",
  mint: "purple",
  metadata: "blue",
  liquidity: "cyan",
  perf: "amber",
};

function StatusBadge({ status, countdown }: { status: string; countdown?: React.ReactNode }) {
  const colors: Record<string, string> = {
    live: "bg-green-500/15 text-green-400 border-green-500/30",
    draft: "bg-white/5 text-muted border-card-border",
    submitted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    resolved: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    executed: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const c = colors[status] ?? colors.draft;

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${c}`}>
      {status}
      {countdown && <span className="text-[10px] font-mono opacity-80">· {countdown}</span>}
    </span>
  );
}

export function ProposalShell({
  proposal,
  proposalId,
  futarchyProposalAddress,
  squadsProposalAddress,
  squadsTransactionIndex,
  initialPrices,
}: {
  proposal: Proposal;
  proposalId?: string;
  futarchyProposalAddress?: string | null;
  squadsProposalAddress?: string | null;
  squadsTransactionIndex?: string | null;
  initialPrices?: InitialPrices;
}) {
  const objective = findObjective(proposal.objectiveId);
  const objectiveName = objective?.name ?? proposal.objectiveId;
  const daoCtx = useDaoContext();
  const kind = proposal.kind;
  const color = KIND_COLOR[kind];

  const onchainState = useOnchainProposalState(
    futarchyProposalAddress,
    daoCtx.ctx?.usdcMint?.toBase58(),
    proposalId,
    initialPrices,
  );

  const isLive = proposal.status === "live";
  // closesAt from onchainState is already browser-clock-aligned (see
  // read-proposal-state.ts). Safe to pass directly to Countdown which
  // uses Date.now() internally.
  const closesAt = onchainState.closesAt ?? proposal.closesAt;

  return (
    <div>
      {/* ── Breadcrumbs ──────────────────────────────────────────── */}
      <div className="text-xs text-muted mb-2">
        <Link href="/market/proposals" className="hover:text-accent transition-colors">Proposals</Link>
        <span className="mx-1.5 opacity-50">/</span>
        <span>{objectiveName}</span>
        <span className="mx-1.5 opacity-50">/</span>
        <span className={`text-${color}-400 font-medium`}>{proposal.title}</span>
      </div>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-white">
            {isLive ? "Live market." : proposal.status === "resolved" ? "Resolved market." : `Proposal (${proposal.status})`}
          </h1>
          <StatusBadge
            status={proposal.status}
            countdown={isLive ? <Countdown target={closesAt} /> : undefined}
          />
        </div>
        <p className="text-muted text-sm">
          {isLive
            ? "Trade Pass or Fail. The TWAP at close decides."
            : "Decided. See what happened and what changed."}
        </p>
      </div>

      {/* ── Proposal type card ───────────────────────────────────── */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border bg-${color}-500/[0.04] border-${color}-500/20 mb-6`}>
        <div className={`w-12 h-12 rounded-xl bg-${color}-500/15 flex items-center justify-center shrink-0`}>
          <Icon icon={KIND_ICON[kind]} width={22} height={22} className={`text-${color}-400`} />
        </div>
        <div className="min-w-0">
          <div className={`text-${color}-400 font-semibold text-sm`}>{KIND_LABEL[kind]}</div>
          <div className="text-white text-base font-medium">{proposal.title}</div>
          {proposal.rationale && (
            <p className="text-xs text-muted mt-1 line-clamp-2">{proposal.rationale}</p>
          )}
        </div>
      </div>

      {/* ── Two-column grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left column: market + kind-specific body */}
        <div className="space-y-6">
          <TwapCard onchainState={onchainState} />

          {proposalId && (
            <VotingPanel
              proposalId={proposalId}
              futarchyProposalAddress={futarchyProposalAddress ?? null}
              status={proposal.status}
              onchainState={onchainState}
            />
          )}

          {proposalId && (
            <LifecycleActions
              proposalId={proposalId}
              futarchyProposalAddress={futarchyProposalAddress ?? null}
              squadsProposalAddress={squadsProposalAddress ?? null}
              dbStatus={proposal.status}
              onchainState={onchainState}
              squadsTransactionIndex={squadsTransactionIndex ?? null}
            />
          )}

          {proposalId && (
            <RedeemCard
              proposalId={proposalId}
              status={proposal.status}
              futarchyProposalAddress={futarchyProposalAddress}
            />
          )}

          {kind === "spend" && <SpendBody proposal={proposal} />}
          {kind === "param" && <ParamBody proposal={proposal} />}
          {kind === "mint" && <MintBody proposal={proposal} />}
          {kind === "metadata" && <MetadataBody proposal={proposal} />}
          {kind === "liquidity" && <LiquidityBody proposal={proposal} />}
          {kind === "perf" && <PerfBody proposal={proposal} />}

          {proposal.status === "resolved" && <ImpactTracking proposal={proposal} />}
        </div>

        {/* Right column: scoring + activity + settlement + authoring */}
        <div className="space-y-6">
          <HowThisScores proposal={proposal} />
          <ActivityCard proposal={proposal} />
          {proposal.status === "resolved" && <ParticipantSettlement proposal={proposal} />}
          <AuthoringTrail proposal={proposal} />
        </div>
      </div>
    </div>
  );
}

/** Used by the dynamic route when an id doesn't match. */
export function ProposalNotFound({ id }: { id: string }) {
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-bold text-white mb-2">Proposal not found</h1>
      <p className="text-muted text-sm mb-1">That ID doesn't match any proposal in this Market.</p>
      <p className="font-mono text-xs text-muted/60 mb-6">{id}</p>
      <Link href="/market/proposals"
        className="text-sm text-accent hover:underline">
        ← Back to proposals
      </Link>
    </div>
  );
}
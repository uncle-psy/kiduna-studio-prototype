'use client'

/**
 * Proposal list card — ports the Flutter _ProposalCard.
 * Reads live pass/fail prices from on-chain AMM.
 */

import { ChevronRight, Users, ArrowLeftRight, Timer } from 'lucide-react'
import {
  kindLabel,
  statusLabel,
  statusColor,
  kindColor,
  isLive,
  VOTE_COLORS,
  type Proposal,
} from '@/lib/vote-api'
import { useCountdown, formatCountdown } from './useCountdown'
import { useOnchainProposalState } from '@/lib/onchain/read-proposal-state'

export default function ProposalCard({
  proposal,
  onClick,
  daoAddress,
  usdcMint,
}: {
  proposal: Proposal
  onClick: () => void
  daoAddress?: string | null
  usdcMint?: string | null
}) {
  const { remainingMs } = useCountdown(proposal.closesAt)

  const onchain = useOnchainProposalState(
    proposal.futarchyProposalAddress ?? null,
    usdcMint ?? null,
    undefined,
    undefined,
    daoAddress ?? null,
  )

  const pricesLoading = onchain.loading || (!onchain.found && onchain.passPrice === 0.5)
  const pp = pricesLoading ? 0.5 : onchain.passPrice
  const fp = pricesLoading ? 0.5 : onchain.failPrice
  const tc = proposal.tradeCount
  const live = isLive(proposal)
  const sColor = statusColor(proposal.status)
  const kColor = kindColor(proposal.kind)

  return (
    <div className="vote-card" onClick={onClick}>
      <div className="vote-card-bar" style={{ background: sColor }} />
      <div className="vote-card-body">
        <div className="vote-card-titlerow">
          <span className="vote-card-title">{proposal.title}</span>
          <span
            className="proposal-type-badge"
            style={{
              background: `${kColor}1f`,
              color: kColor,
              border: `0.8px solid ${kColor}4d`,
            }}
          >
            {kindLabel(proposal.kind)}
          </span>
          <span
            className="vote-status-badge"
            style={{ background: `${sColor}1a`, color: sColor }}
          >
            <span className="vote-status-dot" style={{ background: sColor }} />
            {statusLabel(proposal.status)}
          </span>
        </div>

        {proposal.objectiveName && (
          <div className="vote-card-objective">{proposal.objectiveName}</div>
        )}

        <div className="vote-card-stats">
          {live && (
            pricesLoading ? (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>loading…</span>
            ) : (
              <span>
                <span style={{ color: `${VOTE_COLORS.success}99` }}>Pass </span>
                <span
                  style={{ color: `${VOTE_COLORS.success}cc`, fontWeight: 700 }}
                >
                  {pp.toFixed(2)}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}> / </span>
                <span style={{ color: `${VOTE_COLORS.fail}99` }}>Fail </span>
                <span style={{ color: `${VOTE_COLORS.fail}cc`, fontWeight: 700 }}>
                  {fp.toFixed(2)}
                </span>
              </span>
            )
          )}
          <span>
            <Users size={11} /> {proposal.activeElectors}
          </span>
          <span>
            <ArrowLeftRight size={11} /> {tc}
          </span>
          {live && proposal.closesAt && (
            <span
              style={{
                marginLeft: 'auto',
                color: `${VOTE_COLORS.warn}b3`,
                fontWeight: 600,
              }}
            >
              <Timer size={11} /> {formatCountdown(remainingMs)}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={20} className="vote-card-chevron" />
    </div>
  )
}
'use client'

/**
 * Proposal detail — ports the Flutter _ProposalDetailScreen.
 *
 * Title card · live countdown · TWAP/market prices · vote panel
 * (check my vote → voted state OR cast vote via on-chain flow) ·
 * kind-specific "What Pass authorizes" card · rationale · stats.
 *
 * The proposal object is refetched from getProposals(slug) (mobile passes it
 * between screens; web reads ?slug= and finds it by id), and market detail is
 * fetched for the token ticker + mint (on-chain supply for mint proposals).
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Flag,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Loader2,
  AlarmClock,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  getProposals,
  getMarketDetail,
  getProposalVote,
  getTokenSupply,
  voteCostUsdc,
  kindLabel,
  statusLabel,
  statusColor,
  isLive as isProposalLive,
  VOTE_COLORS,
  type Proposal,
  type MarketDetail,
} from '@/lib/vote-api'
import { voteOnProposal } from '@/lib/vote-onchain'
import {
  useCountdown,
  countdownProgress,
} from '@/components/active/vote/useCountdown'
import { useOnchainProposalState } from '@/lib/onchain/read-proposal-state'

type DetailItem = {
  label: string
  value: string
  valueColor?: string
  subValue?: string
  trailing?: string
  trailingColor?: string
}

const C = VOTE_COLORS

export default function ProposalDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const proposalId = (params.proposalId as string) || ''
  const slug = searchParams.get('slug') || ''
  const wallet = user?.wallet || ''

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [market, setMarket] = useState<MarketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Live prices — from on-chain AMM
  // The vote page gets slug from query params, not from MarketProvider,
  // so we fetch DAO addresses directly from the market detail API.
  const [daoAddress, setDaoAddress] = useState<string | null>(null)
  const [usdcMint, setUsdcMint] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    getMarketDetail(slug).then((mk) => {
      if (mk) {
        setDaoAddress((mk as any).daoAddress ?? null)
        setUsdcMint((mk as any).quoteMint ?? null)
      }
    })
  }, [slug])

  const onchain = useOnchainProposalState(
    proposal?.futarchyProposalAddress ?? null,
    usdcMint,
    undefined,
    undefined,
    daoAddress,
  )

  // Vote state
  const [loadingVote, setLoadingVote] = useState(true)
  const [hasVoted, setHasVoted] = useState(false)
  const [votedSide, setVotedSide] = useState<'pass' | 'fail' | null>(null)
  const [voteTxSig, setVoteTxSig] = useState<string | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [votingSide, setVotingSide] = useState<'pass' | 'fail' | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [voteCount, setVoteCount] = useState('')

  // On-chain supply (mint proposals)
  const [onchainSupply, setOnchainSupply] = useState<number | null>(null)

  const { remainingMs, expired } = useCountdown(proposal?.closesAt)

  // ── Load proposal + market ──────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    const [res, mk] = await Promise.all([
      slug ? getProposals(slug, { pageSize: 50 }) : Promise.resolve(null),
      slug ? getMarketDetail(slug) : Promise.resolve(null),
    ])
    const found = res?.items.find((p) => p.id === proposalId) ?? null
    if (!found) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setProposal(found)
    setMarket(mk)
    setLoading(false)
  }, [slug, proposalId])

  useEffect(() => {
    load()
  }, [load])

  // ── My-vote status ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!proposal) return
    getProposalVote(proposalId).then(({ myVote }) => {
      setHasVoted(myVote.voted)
      setVotedSide(myVote.side ?? null)
      setVoteTxSig(myVote.txSignature ?? null)
      setLoadingVote(false)
    })
  }, [proposal, proposalId])

  // ── On-chain supply for mint proposals ──────────────────────────────────
  useEffect(() => {
    if (proposal?.kind !== 'mint' || !market?.tokenMintAddress) return
    getTokenSupply(market.tokenMintAddress).then((s) => {
      if (s) setOnchainSupply(s)
    })
  }, [proposal?.kind, market?.tokenMintAddress])

  const onVote = async (side: 'pass' | 'fail') => {
    if (isVoting || hasVoted) return
    if (proposal?.closesAt && expired) {
      setVoteError('Voting has ended')
      return
    }
    const votes = parseInt(voteCount.trim(), 10)
    if (!votes || votes <= 0) {
      setVoteError('Enter a valid number of votes (minimum 1)')
      return
    }
    if (!wallet) {
      setVoteError('No wallet found for your account.')
      return
    }
    const amount = votes * voteCostUsdc()
    setIsVoting(true)
    setVotingSide(side)
    setVoteError(null)

    const r = await voteOnProposal(proposalId, side, amount, wallet)
    if (r.success) {
      setHasVoted(true)
      setVotedSide(r.side ?? side)
      setVoteTxSig(r.txSignature ?? null)
      setIsVoting(false)
      onchain.refresh()
    } else {
      setVoteError(r.error ?? 'Vote failed')
      setIsVoting(false)
    }
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="vote-detail-page">
        <BackBtn onClick={() => router.push('/vote')} />
        <div className="seek-skel" style={{ height: 160, marginTop: 16 }} />
        <div className="seek-skel" style={{ height: 120, marginTop: 12 }} />
      </div>
    )
  }
  if (notFound || !proposal) {
    return (
      <div className="vote-detail-page">
        <BackBtn onClick={() => router.push('/vote')} />
        <div className="seek-state">
          <WifiOff size={42} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <div>Could not load this proposal</div>
          <button className="seek-retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const sColor = statusColor(proposal.status)
  const pricesLoading = onchain.loading || (!onchain.found && onchain.passPrice === 0.5)
  const pp = pricesLoading ? 0.5 : onchain.passPrice
  const fp = pricesLoading ? 0.5 : onchain.failPrice
  const leading = pp > fp ? 'pass' : fp > pp ? 'fail' : 'tied'
  const tc = proposal.tradeCount
  const vol = proposal.volumeUsd

  const live = isProposalLive(proposal)
  const timerExpired = !!proposal.closesAt && expired
  const votingOpen = live && !timerExpired
  const detail = buildDetailCard(proposal, onchainSupply)

  return (
    <div className="vote-detail-page">
      <BackBtn onClick={() => router.push('/vote')} />

      {/* Title card */}
      <div className="vote-detail-card" style={{ borderColor: `${sColor}26` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge label={kindLabel(proposal.kind)} color={C.accent} />
          <Badge label={statusLabel(proposal.status)} color={sColor} dot />
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontWeight: 600,
              color: `${C.market}80`,
            }}
          >
            {market?.name ?? ''}
          </span>
        </div>
        <h1 className="vote-detail-title">{proposal.title}</h1>
        {proposal.objectiveName && (
          <div className="vote-detail-objective">
            <Flag size={13} style={{ color: `${C.warn}99` }} />
            {proposal.objectiveName}
          </div>
        )}
      </div>

      {/* Countdown */}
      {live && proposal.closesAt && (
        <CountdownBar
          openedAt={proposal.openedAt}
          closesAt={proposal.closesAt}
          remainingMs={remainingMs}
        />
      )}

      {/* TWAP / market prices */}
      <div className="vote-detail-card">
        <div className="vote-section-label">MARKET PRICES</div>
        {pricesLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <Loader2 size={18} className="spin" style={{ color: C.market }} />
            <span style={{ marginLeft: 8, fontSize: 11, color: `${C.market}80` }}>Loading on-chain prices…</span>
          </div>
        ) : (
          <>
            <div className="vote-price-row">
              <PriceBox
                label="PASS PRICE"
                value={pp}
                color={C.success}
                highlight={leading === 'pass'}
              />
              <PriceBox
                label="FAIL PRICE"
                value={fp}
                color={C.fail}
                highlight={leading === 'fail'}
              />
            </div>
            {(tc > 0) && (
              <div className="vote-price-summary">
                {tc} trades &nbsp;·&nbsp; ${vol.toFixed(2)} volume
              </div>
            )}
          </>
        )}
      </div>

      {/* Vote panel */}
      {votingOpen || hasVoted ? (
        <div
          className="vote-detail-card"
          style={{
            borderColor: hasVoted
              ? `${votedSide === 'pass' ? C.success : C.fail}33`
              : `${C.market}1a`,
          }}
        >
          {loadingVote ? (
            <div
              style={{ display: 'flex', justifyContent: 'center', padding: 12 }}
            >
              <Loader2 size={20} className="spin" style={{ color: C.market }} />
            </div>
          ) : hasVoted ? (
            <VotedState side={votedSide} txSig={voteTxSig} />
          ) : (
            <VoteButtons
              voteCount={voteCount}
              setVoteCount={setVoteCount}
              isVoting={isVoting}
              votingSide={votingSide}
              voteError={voteError}
              onVote={onVote}
            />
          )}
        </div>
      ) : (
        timerExpired && <ClosedBanner pass={pp > fp} />
      )}

      {/* What Pass authorizes */}
      <div
        className="vote-detail-card"
        style={{ borderColor: `${C.accent}26` }}
      >
        <h2 className="vote-detail-section-title">{detail.title}</h2>
        {detail.subtitle && (
          <p className="vote-detail-subtitle">{detail.subtitle}</p>
        )}
        {detail.items.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {detail.items.map((it, i) => (
              <DetailRow key={i} item={it} />
            ))}
          </div>
        )}
      </div>

      {/* Rationale */}
      {proposal.rationale && (
        <div className="vote-detail-card">
          <div className="vote-section-label">RATIONALE</div>
          <p className="vote-rationale">{proposal.rationale}</p>
        </div>
      )}

      {/* Stats */}
      <div className="vote-detail-card">
        <StatRow
          label="Electors"
          value={`${proposal.activeElectors} / ${proposal.totalElectors}`}
        />
        <StatRow label="Trades" value={`${tc}`} />
        <StatRow label="Volume" value={`$${vol.toFixed(2)}`} />
        {proposal.openedAt && (
          <StatRow label="Opened" value={fmtDate(proposal.openedAt)} />
        )}
        {proposal.closesAt && (
          <StatRow label="Closes" value={fmtDate(proposal.closesAt)} />
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="seek-back-btn" onClick={onClick}>
      <ArrowLeft size={14} /> Vote
    </button>
  )
}

function Badge({
  label,
  color,
  dot,
}: {
  label: string
  color: string
  dot?: boolean
}) {
  return (
    <span
      className="vote-badge"
      style={{
        background: `${color}1a`,
        color,
        border: `0.8px solid ${color}40`,
      }}
    >
      {dot && (
        <span className="vote-status-dot" style={{ background: color }} />
      )}
      {label}
    </span>
  )
}

function PriceBox({
  label,
  value,
  color,
  highlight,
}: {
  label: string
  value: number
  color: string
  highlight: boolean
}) {
  return (
    <div
      className="vote-price-box"
      style={{
        background: `${color}10`,
        borderColor: highlight ? `${color}66` : `${color}26`,
      }}
    >
      <div
        style={{
          color: `${color}99`,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.8,
        }}
      >
        {label}
      </div>
      <div className="vote-price-value" style={{ color }}>
        {value.toFixed(4)}
      </div>
    </div>
  )
}

function CountdownBar({
  openedAt,
  closesAt,
  remainingMs,
}: {
  openedAt?: string | null
  closesAt?: string | null
  remainingMs: number
}) {
  const urgent = remainingMs > 0 && remainingMs < 10 * 60 * 1000
  const color = urgent ? C.fail : C.warn
  const totalSec = Math.floor(remainingMs / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const progress = countdownProgress(openedAt, closesAt)

  const seg = (val: string, label: string) => (
    <div className="vote-time-seg">
      <div
        className="vote-time-val"
        style={{ color, background: `${color}14`, borderColor: `${color}33` }}
      >
        {val}
      </div>
      <div className="vote-time-label" style={{ color: `${color}66` }}>
        {label}
      </div>
    </div>
  )
  const sep = (
    <span
      style={{
        color: `${color}66`,
        fontSize: 20,
        fontWeight: 800,
        padding: '0 6px',
      }}
    >
      :
    </span>
  )

  return (
    <div className="vote-detail-card" style={{ borderColor: `${color}33` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlarmClock size={16} style={{ color }} />
        <span
          style={{
            color: `${color}b3`,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          VOTING ENDS IN
        </span>
        {urgent && (
          <span
            style={{
              marginLeft: 'auto',
              padding: '2px 6px',
              borderRadius: 4,
              background: `${C.fail}26`,
              color: C.fail,
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
          >
            ENDING SOON
          </span>
        )}
      </div>
      <div className="vote-time-row">
        {d > 0 && (
          <>
            {seg(String(d), 'DAYS')}
            {sep}
          </>
        )}
        {seg(String(h).padStart(2, '0'), 'HRS')}
        {sep}
        {seg(String(m).padStart(2, '0'), 'MIN')}
        {sep}
        {seg(String(s).padStart(2, '0'), 'SEC')}
      </div>
      <div className="vote-progress">
        <div
          className="vote-progress-fill"
          style={{ width: `${progress * 100}%`, background: `${color}99` }}
        />
      </div>
    </div>
  )
}

function VotedState({
  side,
  txSig,
}: {
  side: 'pass' | 'fail' | null
  txSig: string | null
}) {
  const isPass = side === 'pass'
  const color = isPass ? C.success : C.fail
  const shortSig =
    txSig && txSig.length > 12
      ? `${txSig.slice(0, 8)}...${txSig.slice(-4)}`
      : txSig
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${color}1a`,
          border: `1px solid ${color}40`,
        }}
      >
        <CheckCircle2 size={24} style={{ color }} />
      </div>
      <div style={{ marginTop: 12, color, fontSize: 16, fontWeight: 700 }}>
        You voted {isPass ? 'Pass' : 'Fail'}
      </div>
      <div
        style={{ marginTop: 4, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}
      >
        Your vote has been recorded on-chain
      </div>
      {shortSig && (
        <div
          style={{
            marginTop: 8,
            color: 'rgba(255,255,255,0.2)',
            fontSize: 10,
            fontFamily: 'monospace',
          }}
        >
          Tx: {shortSig}
        </div>
      )}
    </div>
  )
}

function VoteButtons({
  voteCount,
  setVoteCount,
  isVoting,
  votingSide,
  voteError,
  onVote,
}: {
  voteCount: string
  setVoteCount: (v: string) => void
  isVoting: boolean
  votingSide: 'pass' | 'fail' | null
  voteError: string | null
  onVote: (side: 'pass' | 'fail') => void
}) {
  const cost = voteCostUsdc()
  const n = parseInt(voteCount.trim(), 10) || 0
  const totalCost = n * cost
  const fmtCost = (v: number) => (v % 1 === 0 ? v.toString() : v.toFixed(2))

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Signal vote notice */}
      <div style={{
        background: `${C.warn}0d`,
        border: `1px solid ${C.warn}26`,
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 12,
        textAlign: 'left',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: `${C.warn}cc`, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>
          Signal vote
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 1.4 }}>
          Records your position on-chain. For votes that move the market price, use the desktop trading interface.
        </div>
      </div>
      <div
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Cast your vote
      </div>
      <div style={{ color: `${C.market}59`, fontSize: 10, marginTop: 4 }}>
        1 vote = {fmtCost(cost)} USDC
      </div>

      <div className="vote-input-wrap">
        <div className="vote-input-header">
          <span>NO. OF VOTES</span>
          <span style={{ color: `${C.market}80` }}>
            {fmtCost(totalCost)} USDC
          </span>
        </div>
        <input
          className="vote-input"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="Enter votes"
          value={voteCount}
          onChange={(e) => setVoteCount(e.target.value)}
        />
      </div>

      <div className="vote-btn-row">
        <VoteBtn
          label="Vote Pass"
          color={C.success}
          icon={<ThumbsUp size={22} />}
          loading={isVoting && votingSide === 'pass'}
          disabled={isVoting && votingSide !== 'pass'}
          onClick={() => onVote('pass')}
        />
        <VoteBtn
          label="Vote Fail"
          color={C.fail}
          icon={<ThumbsDown size={22} />}
          loading={isVoting && votingSide === 'fail'}
          disabled={isVoting && votingSide !== 'fail'}
          onClick={() => onVote('fail')}
        />
      </div>

      {voteError && <div className="vote-error">{voteError}</div>}
    </div>
  )
}

function VoteBtn({
  label,
  color,
  icon,
  loading,
  disabled,
  onClick,
}: {
  label: string
  color: string
  icon: React.ReactNode
  loading: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      className="vote-action-btn"
      disabled={loading || disabled}
      onClick={onClick}
      style={{
        background: `${color}${loading || disabled ? '0a' : '14'}`,
        border: `1px solid ${color}${disabled ? '1a' : '4d'}`,
        color: disabled ? `${color}4d` : color,
      }}
    >
      {loading ? (
        <Loader2 size={18} className="spin" />
      ) : (
        <>
          {icon}
          <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
        </>
      )}
    </button>
  )
}

function ClosedBanner({ pass }: { pass: boolean }) {
  const color = pass ? C.success : C.fail
  return (
    <div
      className="vote-detail-card"
      style={{
        background: `${color}10`,
        borderColor: `${color}33`,
        textAlign: 'center',
      }}
    >
      {pass ? (
        <CheckCircle2 size={32} style={{ color }} />
      ) : (
        <XCircle size={32} style={{ color }} />
      )}
      <div style={{ marginTop: 10, color, fontSize: 15, fontWeight: 700 }}>
        {pass ? 'Proposal set to pass' : 'Proposal set to fail'}
      </div>
      <div
        style={{ marginTop: 4, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}
      >
        Voting has ended. The proposal will be finalized based on the final
        market prices.
      </div>
    </div>
  )
}

function DetailRow({ item }: { item: DetailItem }) {
  return (
    <div className="vote-detail-item">
      <div className="vote-detail-item-label">{item.label}</div>
      <div className="vote-detail-item-value">
        <span style={{ color: item.valueColor ?? '#fff', fontWeight: 700 }}>
          {item.value}
        </span>
        {item.subValue && (
          <div className="vote-detail-item-sub">{item.subValue}</div>
        )}
        {item.trailing && (
          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              fontWeight: 600,
              color: item.trailingColor ?? 'rgba(255,255,255,0.5)',
            }}
          >
            {item.trailing}
          </div>
        )}
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="vote-stat-row">
      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

// ─── Kind-specific detail builder (mirrors _proposalDetailCard) ───────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function buildDetailCard(
  p: Proposal,
  onchainSupply: number | null
): { title: string; subtitle: string; items: DetailItem[] } {
  const resolved = p.status === 'executed' // web Proposal has no "resolved"/"measured"
  const items: DetailItem[] = []

  switch (p.kind) {
    case 'spend': {
      const d = (p.spend ?? {}) as any
      return {
        title: resolved ? 'What was authorized' : 'What Pass authorizes',
        subtitle:
          'USDC transfer from the DAO treasury to a verified recipient.',
        items: p.spend
          ? [
              { label: 'RECIPIENT', value: d.recipientName ?? '—' },
              {
                label: 'ADDRESS',
                value: truncate(d.recipientAddress),
                valueColor: C.market,
              },
              {
                label: 'AMOUNT',
                value: `$${fmtUsd(d.amountUsd)} ${String(d.asset ?? 'USDC').toUpperCase()}`,
                valueColor: C.success,
              },
              {
                label: 'TREASURY',
                value: `$${fmtUsd(d.treasuryBeforeUsd)} USDC`,
                trailing: `→  $${fmtUsd(d.treasuryAfterUsd)} USDC`,
                trailingColor: C.market,
              },
              ...((d.priorProposalsCount ?? 0) > 0
                ? [
                    {
                      label: 'PRIOR',
                      value: `${d.priorProposalsCount} spend proposal(s) before this`,
                    },
                  ]
                : []),
            ]
          : [],
      }
    }
    case 'param': {
      const d = (p.param ?? {}) as any
      return {
        title: resolved ? 'What was changed' : 'What Pass authorizes',
        subtitle: 'A single DAO parameter, updated atomically.',
        items: p.param
          ? [
              { label: 'PARAMETER', value: formatParamLabel(d.parameterPath) },
              {
                label: 'CURRENT',
                value: formatParamValue(d.parameterPath, d.valueBefore),
              },
              {
                label: 'NEW VALUE',
                value: formatParamValue(d.parameterPath, d.valueAfter),
                valueColor: C.success,
              },
              ...((d.proposalsSinceChange ?? 0) > 0
                ? [
                    {
                      label: 'HISTORY',
                      value: `${d.proposalsSinceChange} proposal(s) since last change`,
                    },
                  ]
                : []),
            ]
          : [],
      }
    }
    case 'mint': {
      const d = (p.mint ?? {}) as any
      if (p.mint) {
        const amount = toNum(d.amount)
        const ticker = d.ticker ?? 'TOKEN'
        const supplyBefore =
          onchainSupply ??
          (toNum(d.supplyBefore) > 0 ? toNum(d.supplyBefore) : null)
        const supplyAfter = supplyBefore != null ? supplyBefore + amount : null
        const dilution =
          supplyBefore != null && supplyBefore > 0
            ? (amount / supplyBefore) * 100
            : null
        items.push({
          label: 'MINT AMOUNT',
          value: `${fmtNum(amount)} ${ticker}`,
          valueColor: C.market,
        })
        if (dilution != null)
          items.push({
            label: 'SUPPLY IMPACT',
            value: `+${dilution.toFixed(2)}%`,
            valueColor: C.warn,
          })
        if (supplyAfter != null)
          items.push({
            label: 'SUPPLY AFTER',
            value: fmtNum(supplyAfter),
            subValue:
              onchainSupply != null ? 'Live from blockchain' : undefined,
          })
        const dist = d.distribution
        if (Array.isArray(dist) && dist.length > 0) {
          items.push({
            label: 'DISTRIBUTION',
            value: `${dist.length} ${dist.length === 1 ? 'recipient' : 'recipients'}`,
          })
          for (const entry of dist) {
            if (entry && typeof entry === 'object') {
              const pct = entry.pct ?? 0
              const tokens = Math.round((amount * Number(pct)) / 100)
              items.push({
                label: truncate(entry.recipient),
                value: `${pct}%  ·  ${fmtNum(tokens)} ${ticker}`,
              })
            }
          }
        }
      }
      return {
        title: resolved ? 'What was minted' : 'What Pass would mint',
        subtitle:
          'New tokens are created and routed to the listed recipients. Existing holders see proportional dilution.',
        items,
      }
    }
    case 'metadata': {
      const d = (p.metadata ?? {}) as any
      if (p.metadata) {
        const before = (
          d.fieldsBefore && typeof d.fieldsBefore === 'object'
            ? d.fieldsBefore
            : {}
        ) as Record<string, any>
        const after = (
          d.fieldsAfter && typeof d.fieldsAfter === 'object'
            ? d.fieldsAfter
            : {}
        ) as Record<string, any>
        const keys = new Set([...Object.keys(before), ...Object.keys(after)])
        for (const key of keys) {
          const b = before[key]?.toString() ?? '—'
          const a = after[key]?.toString() ?? '—'
          if (b !== a)
            items.push({
              label: key.toUpperCase(),
              value: b,
              trailing: `→  ${a}`,
              trailingColor: C.success,
            })
        }
        if (d.newMetadataUri)
          items.push({ label: 'URI', value: truncate(d.newMetadataUri) })
      }
      return {
        title: resolved ? 'What was updated' : 'What Pass authorizes',
        subtitle: 'Update token metadata (name, symbol, image, or URI).',
        items,
      }
    }
    case 'liquidity': {
      const d = (p.liquidity ?? {}) as any
      const provide = d.direction === 'provide'
      if (p.liquidity) {
        const impactBefore = d.priceImpactBeforeBps ?? 0
        const impactAfter = d.priceImpactAfterBps ?? 0
        const depthBefore = toNum(d.poolDepthBeforeUsd)
        const depthAfter = toNum(d.poolDepthAfterUsd)
        const depthPct =
          depthBefore > 0 ? ((depthAfter - depthBefore) / depthBefore) * 100 : 0
        const depthPctStr =
          depthPct >= 0 ? `+${depthPct.toFixed(1)}%` : `${depthPct.toFixed(1)}%`
        items.push({ label: 'POOL', value: d.poolName ?? '—' })
        items.push({
          label: provide ? 'ADDING' : 'WITHDRAWING',
          value: `$${fmtUsd(d.amountUsd)}`,
          valueColor: provide ? C.success : C.fail,
        })
        items.push({
          label: 'POOL DEPTH',
          value: `$${fmtUsd(d.poolDepthBeforeUsd)}`,
          trailing: `→  $${fmtUsd(d.poolDepthAfterUsd)}  (${depthPctStr})`,
          trailingColor: provide ? C.success : C.fail,
        })
        if (impactBefore > 0 || impactAfter > 0)
          items.push({
            label: 'PRICE IMPACT',
            value: `${impactBefore} bps`,
            trailing: `→  ${impactAfter} bps`,
          })
      }
      return {
        title: resolved ? 'What was done' : 'What Pass authorizes',
        subtitle: provide
          ? 'Treasury adds liquidity to the pool. Pool depth grows.'
          : 'Treasury withdraws liquidity from the pool.',
        items,
      }
    }
    case 'perf': {
      const d = (p.perf ?? {}) as any
      const ticker = d.rewardTicker ?? 'TOKEN'
      if (p.perf) {
        items.push({ label: 'RECIPIENT', value: d.recipientName ?? '—' })
        items.push({
          label: 'ADDRESS',
          value: truncate(d.recipientWallet),
          valueColor: C.market,
        })
        items.push({
          label: 'REWARD',
          value: `${fmtNum(toNum(d.rewardAmount))} ${ticker}`,
          valueColor: C.market,
        })
        if (d.twapLengthSeconds != null)
          items.push({
            label: 'TWAP WINDOW',
            value: `${Math.round(Number(d.twapLengthSeconds) / 3600)}h sustained price`,
          })
        if (d.minUnlockTimestamp != null)
          items.push({
            label: 'EARLIEST UNLOCK',
            value: fmtDateShort(d.minUnlockTimestamp),
          })
        if (d.programVersion != null)
          items.push({ label: 'PROGRAM', value: String(d.programVersion) })
        const tranches = d.tranches
        if (Array.isArray(tranches)) {
          tranches.forEach((t: any, i: number) => {
            if (t && typeof t === 'object')
              items.push({
                label: `TRANCHE ${i + 1}`,
                value: `≥ $${fmtUsd(t.priceThreshold)} TWAP`,
                trailing: `${fmtNum(toNum(t.tokenAmount))} ${ticker}`,
                trailingColor: C.market,
              })
          })
        }
      }
      return {
        title: resolved ? 'What was escrowed' : 'What Pass would escrow',
        subtitle:
          'Tokens escrowed in a performance PDA. Tranches unlock when TWAP exceeds each threshold.',
        items,
      }
    }
    default:
      return { title: 'Proposal details', subtitle: '', items: [] }
  }
}

// ─── Formatting helpers (mirror vote_screen.dart) ─────────────────────────────

function truncate(addr: any): string {
  if (addr == null) return ''
  const s = String(addr)
  return s.length <= 12 ? s : `${s.slice(0, 6)}...${s.slice(-4)}`
}

function toNum(v: any): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

function withCommas(s: string): string {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function fmtUsd(v: any): string {
  const n = toNum(v)
  if (n >= 1000) return withCommas(n.toFixed(0))
  return n.toFixed(2)
}

function fmtNum(n: number): string {
  if (n >= 1000) return withCommas(n.toFixed(0))
  if (n === Math.round(n)) return String(Math.round(n))
  return n.toFixed(2)
}

const PARAM_LABELS: Record<string, string> = {
  passThresholdBps: 'Pass Threshold',
  secondsPerProposal: 'Trading Window',
  minQuoteFutarchicLiquidity: 'Min Quote Liquidity',
  minBaseFutarchicLiquidity: 'Min Base Liquidity',
  twapStartDelaySeconds: 'TWAP Start Delay',
  twapWindowHours: 'TWAP Window',
  passMarginPct: 'Pass Margin',
  tradingWindowDays: 'Trading Window',
}

function formatParamLabel(path: any): string {
  if (path == null) return '—'
  return PARAM_LABELS[String(path)] ?? String(path)
}

function fmtDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0h'
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours > 0) parts.push(`${hours}h`)
  if (parts.length === 0 && mins > 0) parts.push(`${mins}m`)
  if (parts.length === 0) parts.push(`${totalSeconds}s`)
  return parts.join(' ')
}

function formatParamValue(path: any, value: any): string {
  if (value == null) return '—'
  const s = String(value)
  const n = parseInt(s, 10)
  if (Number.isNaN(n)) return s
  if (path === 'secondsPerProposal' || path === 'twapStartDelaySeconds')
    return fmtDuration(n)
  if (path === 'passThresholdBps')
    return `${(n / 100).toFixed(n % 100 === 0 ? 0 : 1)}%`
  if (path === 'minQuoteFutarchicLiquidity') return `${fmtNum(n)} USDC`
  if (path === 'minBaseFutarchicLiquidity') return `${fmtNum(n)} tokens`
  if (path === 'twapWindowHours') return `${n}h`
  if (path === 'passMarginPct') return `${(n / 100).toFixed(1)}%`
  if (path === 'tradingWindowDays') return n === 1 ? '1 day' : `${n} days`
  return s
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function fmtDateShort(val: any): string {
  if (val == null) return '—'
  const d = new Date(typeof val === 'number' ? val * 1000 : String(val))
  if (Number.isNaN(d.getTime())) return String(val)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
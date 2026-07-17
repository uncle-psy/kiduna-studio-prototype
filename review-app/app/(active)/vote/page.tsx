'use client'

/**
 * Vote — live proposal list (ports Flutter VoteScreen).
 *
 * Loads the markets the user has joined (getMyMarkets), shows a market
 * selector, and lists that market's LIVE proposals with live prices +
 * countdown. Tapping a proposal opens /vote/{id}?slug={marketSlug}.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Inbox,
  Vote as VoteIcon,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import {
  getMyMarkets,
  getProposals,
  getMarketDetail,
  VOTE_COLORS,
  type MarketSummary,
  type Proposal,
} from '@/lib/vote-api'
import ProposalCard from '@/components/active/vote/ProposalCard'

export default function VotePage() {
  const router = useRouter()

  const [markets, setMarkets] = useState<MarketSummary[]>([])
  const [selected, setSelected] = useState<MarketSummary | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])

  const [marketsLoading, setMarketsLoading] = useState(true)
  const [proposalsLoading, setProposalsLoading] = useState(false)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // DAO address for on-chain price reads — fetched once per selected market
  const [daoAddress, setDaoAddress] = useState<string | null>(null)
  const [usdcMint, setUsdcMint] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // ── Load markets ──────────────────────────────────────────────────────────
  const loadMarkets = useCallback(async () => {
    setMarketsLoading(true)
    setError(false)
    try {
      const mk = await getMyMarkets()
      setMarkets(mk)
      if (mk.length > 0) setSelected((prev) => prev ?? mk[0])
    } catch (err) {
      console.error('[VotePage] loadMarkets error:', err)
      setError(true)
    } finally {
      setMarketsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMarkets()
  }, [loadMarkets])

  // ── Load proposals for selected market (live only) ──────────────────────────
  const loadProposals = useCallback(async (slug: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setProposalsLoading(true)
    try {
      const res = await getProposals(slug, { pageSize: 50 })
      const live = (res?.items ?? []).filter((p) => p.status === 'live')
      setProposals(live)
    } catch (err) {
      console.error('[VotePage] loadProposals error:', err)
      setProposals([])
    } finally {
      setProposalsLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (selected) loadProposals(selected.slug)
  }, [selected, loadProposals])

  // Fetch DAO address once when market changes (for on-chain price reads)
  useEffect(() => {
    if (!selected?.slug) {
      setDaoAddress(null)
      setUsdcMint(null)
      return
    }
    getMarketDetail(selected.slug).then((mk) => {
      if (mk) {
        setDaoAddress((mk as any).daoAddress ?? null)
        setUsdcMint((mk as any).quoteMint ?? null)
      }
    })
  }, [selected?.slug])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [dropdownOpen])

  const openProposal = (p: Proposal) => {
    router.push(
      `/vote/${p.id}?slug=${encodeURIComponent(selected?.slug ?? '')}`
    )
  }

  return (
    <div className="vote-page" style={{ width: '100%' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#03ccd9',
          marginBottom: 8,
        }}
      >
        Active mode
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <h1 className="page-title">Vote</h1>
          <p className="page-subtitle">
            Shape your markets through futarchic governance
          </p>
        </div>
        {selected && (
          <button
            onClick={() => selected && loadProposals(selected.slug, true)}
            title="Refresh"
            className="vote-refresh-btn"
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing
                  ? 'seek-spin 1s linear infinite'
                  : undefined,
              }}
            />
          </button>
        )}
      </div>

      {/* Loading markets */}
      {marketsLoading && (
        <div className="proposals-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="seek-skel" style={{ height: 88 }} />
          ))}
        </div>
      )}

      {/* Error */}
      {!marketsLoading && error && (
        <div className="seek-state">
          <WifiOff size={42} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <div>Could not load your markets</div>
          <button className="seek-retry-btn" onClick={loadMarkets}>
            Retry
          </button>
        </div>
      )}

      {/* No markets */}
      {!marketsLoading && !error && markets.length === 0 && (
        <div className="seek-state">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${VOTE_COLORS.market}10`,
            }}
          >
            <VoteIcon size={28} style={{ color: `${VOTE_COLORS.market}33` }} />
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            No Markets Yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.3)',
              maxWidth: 320,
            }}
          >
            Join a market in the Seek tab to start voting on proposals.
          </div>
        </div>
      )}

      {/* Markets + proposals */}
      {!marketsLoading && !error && markets.length > 0 && (
        <>
          {/* Market selector */}
          <div className="vote-market-selector" ref={dropdownRef}>
            <button
              className="vote-market-current"
              onClick={() => setDropdownOpen((o) => !o)}
            >
              <MarketIcon name={selected?.name ?? '?'} size={28} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div className="vote-market-name">{selected?.name}</div>
                <div className="vote-market-sub">
                  {selected?.openProposalsCount ?? 0} open ·{' '}
                  {selected?.memberCount ?? 0} citizens
                </div>
              </div>
              <ChevronDown
                size={18}
                style={{
                  color: `${VOTE_COLORS.market}99`,
                  transform: dropdownOpen ? 'rotate(180deg)' : undefined,
                  transition: 'transform 0.15s',
                }}
              />
            </button>

            {dropdownOpen && (
              <div className="vote-market-menu">
                {markets.map((m) => {
                  const active = m.slug === selected?.slug
                  return (
                    <button
                      key={m.id}
                      className={`vote-market-item${active ? ' active' : ''}`}
                      onClick={() => {
                        setSelected(m)
                        setDropdownOpen(false)
                      }}
                    >
                      <MarketIcon name={m.name} size={28} />
                      <span
                        className="vote-market-item-name"
                        style={{
                          color: active ? VOTE_COLORS.market : undefined,
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 12,
                          color:
                            m.openProposalsCount > 0
                              ? VOTE_COLORS.live
                              : 'rgba(255,255,255,0.2)',
                        }}
                      >
                        {m.openProposalsCount}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Proposals */}
          {proposalsLoading ? (
            <div className="proposals-list" style={{ marginTop: 16 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="seek-skel" style={{ height: 88 }} />
              ))}
            </div>
          ) : proposals.length === 0 ? (
            <div className="seek-state">
              <Inbox size={44} style={{ color: 'rgba(255,255,255,0.12)' }} />
              <div style={{ fontWeight: 600 }}>No proposals yet</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                Proposals created in {selected?.name ?? 'this market'} will
                appear here.
              </div>
            </div>
          ) : (
            <>
              <div className="seek-section-header" style={{ marginTop: 18 }}>
                <div
                  className="seek-section-bar"
                  style={{ background: VOTE_COLORS.market }}
                />
                <span className="seek-section-label">Proposals</span>
                <span
                  className="seek-section-count"
                  style={{
                    background: `${VOTE_COLORS.market}1f`,
                    color: VOTE_COLORS.market,
                  }}
                >
                  {proposals.length}
                </span>
              </div>
              <div className="proposals-list">
                {proposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    onClick={() => openProposal(p)}
                    daoAddress={daoAddress}
                    usdcMint={usdcMint}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function MarketIcon({ name, size }: { name: string; size: number }) {
  const initial = name ? name[0].toUpperCase() : '?'
  return (
    <div
      className="vote-market-icon"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  )
}
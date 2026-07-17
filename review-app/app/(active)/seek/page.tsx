'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Search, KeyRound, ChevronRight, WifiOff, RefreshCw, ChevronLeft } from 'lucide-react'
import {
  getAllContexts, getPublicAgents,
  isMemberAvatar, isBigAvatar, isActiveAgent,
  displayHandle, avatarCount, getContextById,
  type KinshipContext, type Agent, type CodePreviewResult,
} from '@/lib/seek-api'
import { getLiveMarkets, type MarketSummary } from '@/lib/market-api'
import CodeEntryModal from '@/components/active/seek/CodeEntryModal'
import { listOfferings, type Offering } from '@/lib/offerings-api'

type Filter = 'All' | 'Movements' | 'Members' | 'Markets' | 'Offerings'
const FILTERS: Filter[] = ['All', 'Movements', 'Members', 'Markets', 'Offerings']

const PAGE_SIZE = 9

const MOVEMENT_COLOR = '#EAAA00'
const MEMBER_COLOR   = '#03CCD9'
const MARKET_COLOR   = '#BB86FC'
const OFFERING_COLOR = '#4ADE80'

function match(q: string, text: string) {
  return !q.trim() || text.toLowerCase().includes(q.trim().toLowerCase())
}

// ── FilterTab ────────────────────────────────────────────────────────────────
function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: '36px', padding: '0 20px', borderRadius: '999px',
    fontSize: '12px', fontWeight: 700, letterSpacing: '0.6px',
    textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
    cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: '"Avenir", "Avenir Next", system-ui, sans-serif',
    border: 'none', outline: 'none',
  }
  const style = active
    ? { ...base, background: 'rgba(234,170,0,0.15)', border: '0.5px solid #EAAA00', color: '#EAAA00' }
    : hov
      ? { ...base, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.90)' }
      : { ...base, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)' }
  return (
    <button style={style} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {label}
    </button>
  )
}

// ── GridCard ─────────────────────────────────────────────────────────────────
function GridCard({ badge, badgeColor, title, desc, extra, onClick, image, titleFont }: {
  badge: string; badgeColor: string
  title: string; desc?: string | null
  extra?: React.ReactNode
  onClick: () => void
  image?: string | null
  titleFont?: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#100E59' : '#0A0D33',
        border: `1px solid ${hov ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 14, overflow: 'hidden', padding: '20px 20px 18px',
        cursor: 'pointer', transition: 'all 0.18s',
        display: 'flex', flexDirection: 'column', minHeight: 140,
      }}
    >
      {(badge === 'Offering' || badge === 'Subscription') && (
        <div style={{ margin: '-20px -20px 20px', height: 180, background: '#100E59', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {image
            ? <img src={image} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
            : <span style={{ fontSize: 32, color: '#EAAA00', opacity: 0.3 }}>✦</span>
          }
        </div>
      )}
      <span style={{
        display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
        width: 'fit-content', padding: '3px 10px', borderRadius: 999,
        border: `1px solid ${badgeColor}55`, background: `${badgeColor}22`,
        fontSize: 10, fontWeight: 800, letterSpacing: '0.7px',
        textTransform: 'uppercase', color: badgeColor, marginBottom: 12, flexShrink: 0,
        fontFamily: titleFont ?? '"Avenir", "Avenir Next", system-ui, sans-serif',
      }}>
        {badge}
      </span>
      <div style={{
        fontFamily: titleFont ?? '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
        fontWeight: 600, fontSize: 18, lineHeight: 1.2, color: '#fff',
        marginTop: 8, marginBottom: 2, letterSpacing: '-0.01em',
      }}>
        {title}
      </div>
      {desc && (
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, flex: 1,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          fontFamily: '"Avenir", "Avenir Next", system-ui, sans-serif',
        } as React.CSSProperties}>
          {desc}
        </div>
      )}
      {extra && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, marginTop: 12 }}>
          {extra}
        </div>
      )}
    </div>
  )
}

function VisBadge({ visibility }: { visibility: string }) {
  const v = visibility.toLowerCase()
  if (v === 'public') return null
  const isSecret = v === 'secret'
  const color = isSecret ? '#FF7043' : '#FFD54F'
  return (
    <span style={{ background: `${color}1f`, color, padding: '2px 7px', borderRadius: 5, fontSize: 9.5, fontWeight: 600 }}>
      {isSecret ? 'Secret' : 'Private'}
    </span>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 38, padding: '0 20px', borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent', color: 'rgba(255,255,255,0.65)',
    cursor: 'pointer', transition: 'all 0.15s',
    fontSize: 13, fontWeight: 600,
    fontFamily: '"Avenir","Avenir Next",system-ui,sans-serif',
  }
  const disabledStyle: React.CSSProperties = { ...btnBase, opacity: 0.25, cursor: 'not-allowed' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 36 }}>
      <button
        style={page === 1 ? disabledStyle : btnBase}
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={14} /> Previous
      </button>

      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: '"Avenir","Avenir Next",system-ui,sans-serif' }}>
        {page} / {totalPages}
      </span>

      <button
        style={page === totalPages ? disabledStyle : btnBase}
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next <ChevronRight size={14} />
      </button>
    </div>
  )
}


// ── Main page ────────────────────────────────────────────────────────────────
export default function SeekPage() {
  const router = useRouter()
  const { token, user } = useAuth() as { token: string | null; user: { wallet?: string } | null }

  const [filter, setFilter]               = useState<Filter>('All')
  const [search, setSearch]               = useState('')
  const [page, setPage]                   = useState(1)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [resolvingCode, setResolvingCode] = useState(false)

  const [movements, setMovements] = useState<KinshipContext[]>([])
  const [members,   setMembers]   = useState<Agent[]>([])
  const [markets,   setMarkets]   = useState<MarketSummary[]>([])
  const [offerings, setOfferings] = useState<Offering[]>([])

  const [offeringsLoading, setOfferingsLoading] = useState(true)
  const [offeringsError,   setOfferingsError]   = useState(false)
  const [marketsLoading,   setMarketsLoading]   = useState(true)
  const [marketsError,     setMarketsError]     = useState(false)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(false)
  const [refreshing,       setRefreshing]       = useState(false)

  const loadOfferings = useCallback(async () => {
    setOfferingsLoading(true); setOfferingsError(false)
    try   { setOfferings((await listOfferings(token)).data) }
    catch { setOfferingsError(true) }
    finally { setOfferingsLoading(false) }
  }, [token])

  const loadMarkets = useCallback(async () => {
    setMarketsLoading(true); setMarketsError(false)
    try   { setMarkets(await getLiveMarkets({ pageSize: 50 })) }
    catch { setMarketsError(true) }
    finally { setMarketsLoading(false) }
  }, [])

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setError(false)
    try {
      const [ctx, agents] = await Promise.all([getAllContexts(), getPublicAgents(user?.wallet)])
      setMovements(ctx)
      setMembers(agents.filter(a => isMemberAvatar(a) || isBigAvatar(a)))
    } catch { setError(true) }
    finally { setLoading(false); setRefreshing(false) }
  }, [user?.wallet])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([load(true), loadMarkets(), loadOfferings()])
    setRefreshing(false)
  }, [load, loadMarkets, loadOfferings])

  useEffect(() => { load(); loadMarkets(); loadOfferings() }, [load, loadMarkets, loadOfferings])

  // Reset to page 1 whenever filter or search changes
  useEffect(() => { setPage(1) }, [filter, search])

  const onCodeValid = async (result: CodePreviewResult) => {
    setShowCodeModal(false)
    if (!result.context) return
    setResolvingCode(true)
    const full = await getContextById(result.context.id)
    setResolvingCode(false)
    if (full) router.push(`/seek/movement/${full.id}?code=${encodeURIComponent(result.code)}`)
  }

  const q           = search.trim()
  const isSearching = q.length > 0
  const showMovements = filter === 'All' || filter === 'Movements'
  const showMembers   = filter === 'All' || filter === 'Members'
  const showMarkets   = filter === 'All' || filter === 'Markets'
  const showOfferings = filter === 'All' || filter === 'Offerings'

  const matchedMovements = movements.filter(c => match(q, `${c.name} ${displayHandle(c)} ${c.description}`))
  const matchedMembers   = members.filter(a   => match(q, `${a.name} ${a.handle} ${a.tagline ?? ''} ${a.description ?? ''}`))
  const matchedMarkets   = markets.filter(m   => match(q, `${m.name} ${m.description ?? ''} ${m.tokenTicker ?? ''}`))
  const matchedOfferings = offerings.filter(o => match(q, `${o.name} ${o.description ?? ''} ${o.pricingType}`))

  // Build full flat card list (no pagination yet) — same order as before
  const allCards = useMemo(() => {
    const cards: React.ReactNode[] = []

    if (showMovements) {
      matchedMovements.forEach(c => cards.push(
        <GridCard
          key={`mv-${c.id}`}
          badge="Movement" badgeColor={MOVEMENT_COLOR}
          title={c.name} desc={c.description}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <VisBadge visibility={c.visibility} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{avatarCount(c)} members</span>
            </div>
          }
          onClick={() => router.push(`/seek/movement/${c.id}`)}
        />
      ))
    }

    if (showMembers) {
      matchedMembers.forEach(a => cards.push(
        <GridCard
          key={`mb-${a.id}`}
          badge="Member" badgeColor={MEMBER_COLOR}
          title={a.name} desc={a.tagline || a.description}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {a.handle && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>@{a.handle}</span>}
              {isActiveAgent(a) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }} />}
            </div>
          }
          onClick={() => router.push(`/seek/member/${a.id}`)}
        />
      ))
    }

    if (showMarkets && !marketsLoading && !marketsError) {
      matchedMarkets.forEach(m => cards.push(
        <GridCard
          key={`mk-${m.id}`}
          badge={m.type === 'token-backed' ? 'Token Market' : 'Market'}
          badgeColor={MARKET_COLOR}
          title={m.name} desc={m.description}
          extra={
            <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
              <span>{m.memberCount} members</span>
              {m.tokenTicker && <span>${m.tokenTicker}</span>}
            </div>
          }
          onClick={() => router.push(`/seek/market/${m.slug}`)}
        />
      ))
    }

    if (showOfferings && !offeringsLoading && !offeringsError) {
      matchedOfferings.forEach(o => cards.push(
        <GridCard
          key={`of-${o.id}`}
          badge={o.pricingType === 'subscription' ? 'Subscription' : 'Offering'}
          badgeColor={OFFERING_COLOR}
          title={o.name} desc={o.description} image={o.image}
          titleFont='"Goudy Heavyface","Goudy Old Style",Georgia,serif'
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif', color: 'rgba(255,255,255,0.55)' }}>
              <span style={{ fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif', fontSize: 16, color: '#fff' }}>
                {parseFloat(o.offerPercentage) > 0 && (
                  <span style={{ textDecoration: 'line-through', opacity: 0.35, marginRight: 4, fontSize: 13 }}>
                    ${parseFloat(o.price).toFixed(2)}
                  </span>
                )}
                ${parseFloat(o.offerPercentage) > 0
                  ? (parseFloat(o.price) * (1 - parseFloat(o.offerPercentage) / 100)).toFixed(2)
                  : parseFloat(o.price).toFixed(2)
                }
              </span>
              <span>USDC {o.pricingType === 'subscription' ? '/mo' : ''}</span>
            </div>
          }
          onClick={() => router.push(`/offerings`)}
        />
      ))
    }

    return cards
  }, [
    showMovements, showMembers, showMarkets, showOfferings,
    matchedMovements, matchedMembers, matchedMarkets, matchedOfferings,
    marketsLoading, marketsError, offeringsLoading, offeringsError,
    router,
  ])

  // Paginate the flat list
  const totalPages  = Math.max(1, Math.ceil(allCards.length / PAGE_SIZE))
  const pagedCards  = allCards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const marketsSettled = !marketsLoading && !marketsError
  const nothingFound =
    !loading && !error &&
    (!showMovements || matchedMovements.length === 0) &&
    (!showMembers   || matchedMembers.length   === 0) &&
    (!showMarkets   || !marketsSettled || matchedMarkets.length === 0) &&
    (!showOfferings || offeringsLoading || matchedOfferings.length === 0)

  return (
    <>
      <style>{`
        @keyframes seek-spin    { to { transform: rotate(360deg); } }
        @keyframes seek-shimmer { 100% { transform: translateX(100%); } }
        .s-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }
        @media (max-width: 900px) { .s-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 580px) { .s-grid { grid-template-columns: minmax(0, 1fr); } }
        .s-skel {
          background: #0A0E3F;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          height: 140px;
          position: relative;
          overflow: hidden;
        }
        .s-skel::after {
          content: '';
          position: absolute; inset: 0; transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
          animation: seek-shimmer 1.4s infinite;
        }
      `}</style>

      <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: '#03011B', color: '#EAAA00', fontFamily: '"Avenir","Avenir Next",system-ui,sans-serif' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '30px 30px 80px' }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#03ccd9', marginBottom: 8 }}>
              Active mode
            </div>
            <h1 style={{ fontFamily: '"Goudy Heavyface",Georgia,serif', fontSize: 52, fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.05 }}>
              Seek
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.5 }}>
              Search the DUNAVERSE — movements, members, founders, and proposals.
            </p>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0A0D33', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0 16px', height: 48, marginBottom: 20 }}>
            <Search size={16} style={{ color: 'rgba(255,255,255,0.38)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search movements, members, proposals..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#fff', fontFamily: '"Avenir","Avenir Next",system-ui,sans-serif' }}
            />
            <button onClick={refreshAll} title="Refresh" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <RefreshCw size={14} style={{ animation: refreshing ? 'seek-spin 1s linear infinite' : undefined }} />
            </button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            {FILTERS.map(cat => (
              <FilterTab key={cat} label={cat} active={filter === cat} onClick={() => setFilter(cat)} />
            ))}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="s-grid">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="s-skel" />)}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              <WifiOff size={42} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <div>Could not load data</div>
              <button onClick={() => load()} style={{ padding: '9px 20px', borderRadius: 10, background: 'rgba(234,170,0,0.14)', border: '1px solid rgba(234,170,0,0.4)', color: '#EAAA00', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          {/* Results */}
          {!loading && !error && (
            <>
              {/* Invite code card */}
              {showMovements && (
                <div
                  onClick={() => setShowCodeModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, marginBottom: 20, cursor: 'pointer', background: 'linear-gradient(135deg, rgba(255,41,195,0.08), rgba(255,41,195,0.02))', border: '1px solid rgba(255,41,195,0.20)', transition: 'all 0.15s' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,41,195,0.1)', border: '1px solid rgba(255,41,195,0.25)', color: '#FF29C3', flexShrink: 0 }}>
                    <KeyRound size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#FF29C3', fontSize: 13, fontWeight: 700 }}>Have an invitation code?</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>Enter a code to discover and join a movement</div>
                  </div>
                  <ChevronRight size={18} style={{ color: 'rgba(255,41,195,0.5)' }} />
                </div>
              )}

              {/* Grid — paginated */}
              {pagedCards.length > 0 && (
                <div className="s-grid">{pagedCards}</div>
              )}

              {/* Markets loading inline */}
              {showMarkets && marketsLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${MARKET_COLOR}30`, borderTopColor: MARKET_COLOR, animation: 'seek-spin 0.9s linear infinite' }} />
                </div>
              )}

              {/* Markets error */}
              {showMarkets && !marketsLoading && marketsError && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0', textAlign: 'center' }}>
                  <WifiOff size={20} style={{ color: `${MARKET_COLOR}55` }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Could not load markets</div>
                  <button onClick={loadMarkets} style={{ background: `${MARKET_COLOR}1a`, border: `1px solid ${MARKET_COLOR}55`, color: MARKET_COLOR, borderRadius: 10, padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
                </div>
              )}

              {/* Markets empty */}
              {filter === 'Markets' && !marketsLoading && !marketsError && matchedMarkets.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0', textAlign: 'center' }}>
                  <span style={{ fontSize: 28, opacity: 0.2 }}>🏪</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
                    {isSearching ? `No markets match "${q}"` : 'No live markets yet'}
                  </div>
                </div>
              )}

              {/* Offerings loading */}
              {showOfferings && offeringsLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${OFFERING_COLOR}30`, borderTopColor: OFFERING_COLOR, animation: 'seek-spin 0.9s linear infinite' }} />
                </div>
              )}

              {/* Offerings error */}
              {showOfferings && !offeringsLoading && offeringsError && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0', textAlign: 'center' }}>
                  <WifiOff size={20} style={{ color: `${OFFERING_COLOR}55` }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Could not load offerings</div>
                  <button onClick={loadOfferings} style={{ background: `${OFFERING_COLOR}1a`, border: `1px solid ${OFFERING_COLOR}55`, color: OFFERING_COLOR, borderRadius: 10, padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
                </div>
              )}

              {/* Offerings empty */}
              {filter === 'Offerings' && !offeringsLoading && !offeringsError && matchedOfferings.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0', textAlign: 'center' }}>
                  <span style={{ fontSize: 28, opacity: 0.2 }}>🛍️</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
                    {isSearching ? `No offerings match "${q}"` : 'No offerings yet'}
                  </div>
                </div>
              )}

              {/* Nothing found */}
              {nothingFound && !marketsLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  <Search size={42} style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <div>{isSearching ? `No results for "${q}"` : 'Nothing found'}</div>
                </div>
              )}

              {/* Pagination */}
              {!marketsLoading && !offeringsLoading && (
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Resolving overlay */}
      {resolvingCode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(3,1,27,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <RefreshCw size={30} style={{ color: '#FF29C3', animation: 'seek-spin 1s linear infinite' }} />
          <div style={{ fontWeight: 700, color: '#fff' }}>Opening movement…</div>
        </div>
      )}

      {showCodeModal && (
        <CodeEntryModal onClose={() => setShowCodeModal(false)} onValid={onCodeValid} />
      )}
    </>
  )
}
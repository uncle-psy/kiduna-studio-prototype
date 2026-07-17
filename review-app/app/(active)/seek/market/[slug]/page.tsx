'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, WifiOff, Users, Vote as VoteIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { redeemCode, type CodePreviewResult } from '@/lib/seek-api'
import { getMarketDetail, joinMarket, type MarketDetail } from '@/lib/market-api'
import CodeEntryModal from '@/components/active/seek/CodeEntryModal'

const MARKET_CLR = '#BB86FC'
const MOVE_CLR   = '#00C9A7'
const MEMBER_CLR = '#5B8DEF'
const SUCCESS    = '#4CAF50'
const SPONSOR    = '#FFD54F'
const ACCENT     = '#FF29C3'

function isMemberFn(d: MarketDetail | null)  { return !!d?.myMembership && !d.myMembership.removedAt }
function isSponsorFn(d: MarketDetail | null) { return d?.myMembership?.role === 'sponsor' }

export default function MarketDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const { user } = useAuth()
  const slug     = (params.slug as string) || ''
  const wallet   = user?.wallet || ''

  const [detail,        setDetail]        = useState<MarketDetail | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(false)
  const [joining,       setJoining]       = useState(false)
  const [joinError,     setJoinError]     = useState<string | null>(null)
  const [justJoined,    setJustJoined]    = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    const d = await getMarketDetail(slug)
    if (!d) { setError(true); setLoading(false); return }
    setDetail(d); setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!justJoined) return
    const t = setTimeout(() => setJustJoined(false), 1500)
    return () => clearTimeout(t)
  }, [justJoined])

  const onCodeValid = async (result: CodePreviewResult) => {
    setShowCodeModal(false)
    if (!wallet) return
    setJoining(true); setJoinError(null)
    try {
      const fresh = await getMarketDetail(slug)
      if (fresh && isMemberFn(fresh)) { setDetail(fresh); setJustJoined(true); return }
      const redeem = await redeemCode(result.code, wallet)
      if (!redeem.success) { setJoinError(redeem.message || 'Redemption failed'); return }
      await joinMarket(slug, (result.role as string) || 'member')
      await load()
      setJustJoined(true)
    } catch { setJoinError('Something went wrong. Please try again.') }
    finally  { setJoining(false) }
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="seek-detail-page">
      <button className="seek-back-btn" onClick={() => router.push('/seek')}>
        <ArrowLeft size={14} /> Seek
      </button>
      <div className="seek-skel" style={{ height: 280, marginTop: 18 }} />
      <div className="seek-skel" style={{ height: 56, marginTop: 16 }} />
    </div>
  )

  // ── Error ────────────────────────────────────────────────────────────
  if (error || !detail) return (
    <div className="seek-detail-page">
      <button className="seek-back-btn" onClick={() => router.push('/seek')}>
        <ArrowLeft size={14} /> Seek
      </button>
      <div className="seek-state">
        <WifiOff size={42} style={{ color: 'rgba(255,255,255,0.2)' }} />
        <div>Could not load this market</div>
        <button className="seek-retry-btn" onClick={load}>Retry</button>
      </div>
    </div>
  )

  const member      = isMemberFn(detail)
  const sponsor     = isSponsorFn(detail)
  const tokenBacked = detail.type === 'token-backed'
  const initial     = detail.name ? detail.name[0].toUpperCase() : '?'

  return (
    <div className="seek-detail-page">
      <button className="seek-back-btn" onClick={() => router.push('/seek')}>
        <ArrowLeft size={14} /> Seek
      </button>

      {/* ── Hero Card ── */}
      <div className="seek-hero" style={{ borderColor: `${MARKET_CLR}1f` }}>
        <div className="seek-hero-top" style={{
          background: `linear-gradient(135deg, ${MARKET_CLR}26, ${MARKET_CLR}08)`,
        }}>
          {/* Logo / Initial */}
          <div className="seek-hero-icon" style={{
            background: `linear-gradient(135deg, ${MARKET_CLR}40, ${MARKET_CLR}14)`,
            borderColor: `${MARKET_CLR}59`, color: MARKET_CLR, overflow: 'hidden',
          }}>
            {detail.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={detail.logoUrl} alt={detail.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial
            }
          </div>

          {/* Name */}
          <div className="seek-hero-name">{detail.name}</div>

          {/* Slug — mirrors: Text(m.slug, _kTextTertiary) */}
          <div className="seek-hero-handle">{detail.slug}</div>

          {/* Chips: Simple/Token | $TICKER | Live */}
          <div className="seek-hero-badges">
            <span className="seek-type-badge" style={{
              background: `${tokenBacked ? MARKET_CLR : MOVE_CLR}1f`,
              color: tokenBacked ? MARKET_CLR : MOVE_CLR,
              borderColor: `${tokenBacked ? MARKET_CLR : MOVE_CLR}4d`,
              border: '0.8px solid',
            }}>
              {tokenBacked ? 'Token-Backed' : 'Simple'}
            </span>
            {detail.tokenTicker && (
              <span className="seek-type-badge" style={{
                background: `${MARKET_CLR}1f`, color: MARKET_CLR,
                border: `0.8px solid ${MARKET_CLR}4d`,
              }}>
                ${detail.tokenTicker}
              </span>
            )}
            <span className="seek-type-badge" style={{
              background: `${SUCCESS}1f`, color: SUCCESS,
              border: `0.8px solid ${SUCCESS}4d`,
            }}>
              Live
            </span>
          </div>
        </div>

        <div className="seek-hero-divider" />

        <div className="seek-hero-body">
          {detail.description && (
            <div className="seek-hero-desc">{detail.description}</div>
          )}
          {/* Stats: Citizens | Proposals only (no treasury — mirrors mobile) */}
          <div className="seek-hero-stats" style={{ marginTop: detail.description ? 16 : 0 }}>
            <span style={{ color: `${MEMBER_CLR}b3` }}>
              <Users size={13} style={{ color: `${MEMBER_CLR}99` }} />
              {detail.memberCount} Citizens
            </span>
            <span style={{ color: `${MARKET_CLR}b3` }}>
              <VoteIcon size={13} style={{ color: `${MARKET_CLR}99` }} />
              {detail.openProposalsCount} Proposals
            </span>
          </div>
        </div>
      </div>

      {/* ── Action Button ── */}
      <div style={{ marginTop: 16 }}>
        {sponsor ? (
          // Gold shield — "You own this market"
          <div style={{
            padding: '16px 0', borderRadius: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            background: `${SPONSOR}14`, border: `1px solid ${SPONSOR}4d`,
          }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <span style={{ color: `${SPONSOR}e6`, fontSize: 15, fontWeight: 600 }}>
              You own this market
            </span>
          </div>
        ) : member ? (
          // Green joined
          <div style={{
            padding: '16px 0', borderRadius: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            background: `${SUCCESS}14`, border: `1px solid ${SUCCESS}59`,
          }}>
            <span style={{ color: `${SUCCESS}cc`, fontSize: 18 }}>✓</span>
            <span style={{ color: `${SUCCESS}e6`, fontSize: 15, fontWeight: 600 }}>Joined</span>
          </div>
        ) : !wallet ? (
          <div style={{
            padding: '16px 0', borderRadius: 14, textAlign: 'center',
            color: 'rgba(255,255,255,0.3)', fontSize: 15,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            Sign in to join
          </div>
        ) : (
          <button onClick={() => setShowCodeModal(true)} disabled={joining} style={{
            width: '100%', padding: '16px 0', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: joining ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${ACCENT}33, ${ACCENT}14)`,
            border: `1px solid ${joining ? 'rgba(255,255,255,0.06)' : `${ACCENT}66`}`,
            color: ACCENT, fontSize: 16, fontWeight: 700, cursor: joining ? 'not-allowed' : 'pointer',
          }}>
            {joining
              ? <><Loader2 size={18} className="spin" /> Joining...</>
              : <>👥 Join Market</>
            }
          </button>
        )}

        {joinError && (
          <div style={{
            marginTop: 10, padding: 12, borderRadius: 12, textAlign: 'center',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
            color: '#ef4444', fontSize: 12.5,
          }}>
            {joinError}
          </div>
        )}
      </div>

      {/* ── About / Info ── */}
      <div style={{
        marginTop: 16, background: '#0F0D42', borderRadius: 16, padding: 20,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div className="seek-about-title">About</div>

        {detail.description
          ? <div className="seek-about-text" style={{ marginBottom: 20 }}>{detail.description}</div>
          : <div style={{ color: 'rgba(255,255,255,0.33)', fontSize: 13, marginBottom: 20 }}>No description available.</div>
        }

        {/* Info rows — labels: Citizens / Open Proposals (mirrors mobile exactly) */}
        <InfoRow label="Type"           value={tokenBacked ? 'Token-Backed' : 'Simple'} />
        {detail.tokenTicker && <InfoRow label="Token" value={`$${detail.tokenTicker}`} />}
        <InfoRow label="Citizens"       value={`${detail.memberCount}`} />
        <InfoRow label="Open Proposals" value={`${detail.openProposalsCount}`} />
        {detail.treasuryUsd != null && (
          // mirrors Flutter: '\$${m.treasuryUsd!.toStringAsFixed(0)}' — raw, no k/M
          <InfoRow label="Treasury" value={`$${detail.treasuryUsd.toFixed(0)}`} />
        )}
      </div>

      {/* ── Join success overlay ── */}
      {justJoined && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(9,7,58,0.97)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8, zIndex: 100,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: `${SUCCESS}1a`, border: `2px solid ${SUCCESS}59`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: SUCCESS, fontSize: 38,
          }}>✓</div>
          <div style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginTop: 24 }}>Welcome!</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            You joined {detail.name}
          </div>
        </div>
      )}

      {showCodeModal && (
        <CodeEntryModal
          movementName={detail.name}
          onClose={() => setShowCodeModal(false)}
          onValid={onCodeValid}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, fontSize: 13 }}>
      <span style={{ color: 'rgba(255,255,255,0.33)' }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
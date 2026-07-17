'use client'

/**
 * Join flow — ports Flutter SeekJoinScreen.
 *
 * Loads the user's MEMBER / BIG_AVATAR avatars and lets them pick one (or join
 * as guest if they have none and are on the guest tier). Confirming calls:
 *   - redeemCode(code, wallet)   when an invite ?code= is present (private/secret)
 *   - joinPublic(contextId, wallet)  otherwise (public)
 *
 * Mirrors mobile's public-vs-private decision: isPublicJoin = (contextId && !code).
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Globe,
  CheckCircle2,
  Loader2,
  UserX,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  getContextById,
  getMemberAvatars,
  joinPublic,
  redeemCode,
  parseColor,
  isBigAvatar,
  type Agent,
  type KinshipContext,
} from '@/lib/seek-api'

const FALLBACK = '#00C9A7'
const ACCENT = '#FF29C3'
const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_API_URL || ''

export default function SeekJoinPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const movementId = (params.id as string) || ''
  const code = searchParams.get('code') || null
  const wallet = user?.wallet || ''
  const isPublicJoin = !code

  // Guest = no subscription tier or "guest" (matches auth-context user.subscription).
  const tier = (user?.subscription || '').toLowerCase()
  const isGuest = tier === '' || tier === 'guest'

  const [movement, setMovement] = useState<KinshipContext | null>(null)
  const [avatars, setAvatars] = useState<Agent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [success, setSuccess] = useState(false)

  const color = movement ? parseColor(movement.color, FALLBACK) : FALLBACK

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ctx, list] = await Promise.all([
        getContextById(movementId),
        wallet ? getMemberAvatars(wallet) : Promise.resolve([]),
      ])
      setMovement(ctx)
      setAvatars(list)
      // Auto-select: Big Avatar first, then primary member.
      const big = list.find(isBigAvatar)
      const primary = big ?? list.find((a) => a.isPrimaryMember)
      if (primary) setSelectedId(primary.id)
    } catch {
      setError('Failed to load avatars.')
    } finally {
      setLoading(false)
    }
  }, [movementId, wallet])

  useEffect(() => {
    load()
  }, [load])

  const doJoin = async () => {
    if (!wallet) return
    setJoining(true)
    const result = isPublicJoin
      ? await joinPublic(movementId, wallet)
      : await redeemCode(code!, wallet)
    setJoining(false)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => router.push(`/seek/movement/${movementId}`), 1600)
    } else {
      setError(result.message || 'Failed to join movement.')
    }
  }

  const movementName = movement?.name || 'this movement'

  return (
    <div className="seek-join-page">
      <button
        className="seek-back-btn"
        onClick={() => router.push(`/seek/movement/${movementId}`)}
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Hero */}
      <div className="seek-join-hero">
        <div
          className="seek-hero-icon"
          style={{
            margin: '0 auto',
            background: `linear-gradient(135deg, ${color}40, ${color}14)`,
            borderColor: `${color}59`,
            color,
          }}
        >
          {movement?.icon && movement.icon !== '🎮' ? (
            movement.icon
          ) : (
            <Globe size={28} />
          )}
        </div>
        <div className="seek-join-hero-title">Join {movementName}</div>
        <div className="seek-join-hero-sub">
          {isGuest && avatars.length === 0
            ? "You're joining as a guest"
            : 'Choose which avatar will represent you'}
        </div>
        {(!isGuest || avatars.length > 0) && (
          <div className="seek-join-hero-note">
            Only Member-type avatars are eligible
          </div>
        )}
      </div>

      {/* Body states */}
      {loading ? (
        <div className="seek-info-panel">
          <Loader2 size={26} className="spin" style={{ color: '#5B8DEF' }} />
          <div
            style={{
              marginTop: 14,
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
            }}
          >
            Loading your avatars…
          </div>
        </div>
      ) : error ? (
        <ErrorPanel message={error} onRetry={load} />
      ) : avatars.length === 0 && isGuest ? (
        <GuestJoinPanel color={color} onJoin={doJoin} />
      ) : avatars.length === 0 ? (
        <NoAvatarsPanel />
      ) : (
        <AvatarList
          avatars={avatars}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onConfirm={doJoin}
        />
      )}

      {/* Overlays */}
      {joining && (
        <div className="seek-overlay">
          <Loader2 size={32} className="spin" style={{ color: ACCENT }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>Joining…</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            Joining {movementName}
          </div>
        </div>
      )}
      {success && (
        <div className="seek-overlay">
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(76,175,80,0.1)',
              border: '2px solid rgba(76,175,80,0.35)',
            }}
          >
            <CheckCircle2 size={38} style={{ color: 'rgba(76,175,80,0.9)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Welcome!</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            You joined {movementName}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panels ──────────────────────────────────────────────────────────────────

function AvatarList({
  avatars,
  selectedId,
  onSelect,
  onConfirm,
}: {
  avatars: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
  onConfirm: () => void
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            width: 3,
            height: 14,
            borderRadius: 2,
            background: '#5B8DEF',
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.2,
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          YOUR AVATARS
        </span>
        <span
          className="seek-section-count"
          style={{
            background: 'rgba(91,141,239,0.1)',
            color: 'rgba(91,141,239,0.8)',
          }}
        >
          {avatars.length}
        </span>
      </div>

      {avatars.map((a) => {
        const selected = selectedId === a.id
        const initial = a.name ? a.name[0].toUpperCase() : '?'
        const big = isBigAvatar(a)
        return (
          <div
            key={a.id}
            className={`seek-avatar-card${selected ? ' selected' : ''}`}
            onClick={() => onSelect(a.id)}
          >
            <div className="seek-radio">
              {selected && <div className="seek-radio-dot" />}
            </div>
            <div className="seek-avatar-circle">{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{a.name}</div>
              {a.handle && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.35)',
                    marginTop: 2,
                  }}
                >
                  @{a.handle}
                </div>
              )}
              {(a.tagline || a.description) && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.35)',
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.tagline || a.description}
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'flex-end',
              }}
            >
              <span
                className="seek-type-badge"
                style={{
                  background: big ? '#FBBF241f' : '#5B8DEF14',
                  color: big ? '#FBBF24e6' : '#5B8DEFcc',
                }}
              >
                {big ? 'Big Avatar' : 'Member'}
              </span>
              {a.isPrimaryMember && (
                <span
                  className="seek-type-badge"
                  style={{ background: '#FBBF241f', color: '#FBBF24cc' }}
                >
                  📌 Primary
                </span>
              )}
            </div>
          </div>
        )
      })}

      <button
        className="seek-confirm-btn"
        disabled={!selectedId}
        onClick={onConfirm}
      >
        <CheckCircle2 size={18} /> Confirm &amp; Join
      </button>
    </div>
  )
}

function GuestJoinPanel({
  color,
  onJoin,
}: {
  color: string
  onJoin: () => void
}) {
  return (
    <div className="seek-info-panel" style={{ borderColor: `${color}26` }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${color}14`,
          color,
        }}
      >
        <Globe size={24} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>Join as Guest</div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.6)',
          marginTop: 8,
        }}
      >
        You can join this movement right away. Upgrade your plan later to create
        a member avatar.
      </p>
      <button className="seek-confirm-btn" onClick={onJoin}>
        <CheckCircle2 size={18} /> Join Movement
      </button>
    </div>
  )
}

function NoAvatarsPanel() {
  return (
    <div
      className="seek-info-panel"
      style={{ borderColor: 'rgba(255,224,130,0.15)' }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,224,130,0.08)',
          color: '#FFE082',
        }}
      >
        <UserX size={24} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#FFE082' }}>
        No Member Avatars Found
      </div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.6)',
          marginTop: 8,
        }}
      >
        You need a Member avatar to join a movement. Create one in the Studio
        with subtype &quot;Member&quot;.
      </p>
      {STUDIO_URL && (
        <a
          href={STUDIO_URL}
          target="_blank"
          rel="noreferrer"
          className="seek-retry-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            textDecoration: 'none',
            background: 'rgba(255,138,101,0.08)',
            borderColor: 'rgba(255,138,101,0.3)',
            color: '#FF8A65',
          }}
        >
          <ExternalLink size={14} /> Go to Studio
        </a>
      )}
    </div>
  )
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      className="seek-info-panel"
      style={{ borderColor: 'rgba(239,68,68,0.15)' }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(239,68,68,0.08)',
          color: '#ef4444',
        }}
      >
        <AlertCircle size={24} />
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
        {message}
      </div>
      <button
        className="seek-retry-btn"
        style={{ marginTop: 16 }}
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  )
}

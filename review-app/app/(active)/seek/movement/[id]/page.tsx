'use client'

/**
 * Movement detail — ports Flutter SeekDetailScreen.
 *
 * Hero card + membership-aware Join button + About / Missions / Avatars tabs.
 * Join routing mirrors mobile:
 *   - public            → /seek/movement/{id}/join
 *   - private/secret    → require an invite code (prefilled via ?code= or modal)
 *                         → /seek/movement/{id}/join?code=XXX
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Globe,
  Rocket,
  User,
  UserPlus,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Lock,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  getContextById,
  getNestedMissions,
  checkMembership,
  getAgentById,
  parseColor,
  displayHandle,
  avatarCount,
  isActiveStatus,
  type KinshipContext,
  type NestedContext,
  type CodePreviewResult,
} from '@/lib/seek-api'
import CodeEntryModal from '@/components/active/seek/CodeEntryModal'

const MOVEMENT_FALLBACK = '#00C9A7'
const MISSION_COLOR = '#FFA44F'
const MEMBER_COLOR = '#5B8DEF'

type Tab = 'about' | 'missions' | 'avatars'

export default function MovementDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const movementId = (params.id as string) || ''
  const prefilledCode = searchParams.get('code') || null
  const wallet = user?.wallet || ''

  const [movement, setMovement] = useState<KinshipContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('about')

  const [membershipChecked, setMembershipChecked] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [memberRole, setMemberRole] = useState<string | null>(null)

  const [showCodeModal, setShowCodeModal] = useState(false)

  const color = movement
    ? parseColor(movement.color, MOVEMENT_FALLBACK)
    : MOVEMENT_FALLBACK

  const loadMovement = useCallback(async () => {
    setLoading(true)
    setError(false)
    const ctx = await getContextById(movementId)
    if (!ctx) {
      setError(true)
      setLoading(false)
      return
    }
    // Missions are separate nested-context records, so fetch them explicitly.
    const missions = await getNestedMissions(movementId)
    setMovement({
      ...ctx,
      nestedContexts: missions,
      nestedContextsCount: missions.length || ctx.nestedContextsCount,
    })
    setLoading(false)
  }, [movementId])

  useEffect(() => {
    loadMovement()
  }, [loadMovement])

  // Membership check once wallet + movement are available.
  const runMembershipCheck = useCallback(async () => {
    if (!movement) return
    if (!wallet) {
      setMembershipChecked(true)
      return
    }
    const result = await checkMembership(movement.id, wallet)
    setIsMember(result.isMember)
    setMemberRole(result.role ?? null)
    setMembershipChecked(true)
  }, [movement, wallet])

  useEffect(() => {
    if (movement && !membershipChecked) runMembershipCheck()
  }, [movement, membershipChecked, runMembershipCheck])

  const goToJoin = (code?: string | null) => {
    const base = `/seek/movement/${movementId}/join`
    router.push(code ? `${base}?code=${encodeURIComponent(code)}` : base)
  }

  const onJoinTap = () => {
    if (!movement || !wallet) return
    const isPublic = movement.visibility.toLowerCase() === 'public'
    if (isPublic) {
      goToJoin()
    } else if (prefilledCode) {
      goToJoin(prefilledCode)
    } else {
      setShowCodeModal(true)
    }
  }

  const onCodeValid = (result: CodePreviewResult) => {
    setShowCodeModal(false)
    goToJoin(result.code)
  }

  if (loading) {
    return (
      <div className="seek-detail-page">
        <button className="seek-back-btn" onClick={() => router.push('/seek')}>
          <ArrowLeft size={14} /> Seek
        </button>
        <div className="seek-skel" style={{ height: 280, marginTop: 18 }} />
        <div className="seek-skel" style={{ height: 56, marginTop: 16 }} />
      </div>
    )
  }

  if (error || !movement) {
    return (
      <div className="seek-detail-page">
        <button className="seek-back-btn" onClick={() => router.push('/seek')}>
          <ArrowLeft size={14} /> Seek
        </button>
        <div className="seek-state">
          <WifiOff size={42} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <div>Could not load this movement</div>
          <button className="seek-retry-btn" onClick={loadMovement}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const vis = movement.visibility.toLowerCase()
  const isPrivate = vis !== 'public'
  const isSecret = vis === 'secret'
  const visColor = isSecret ? '#FF7043' : isPrivate ? '#FFD54F' : '#90A4AE'
  const visLabel = isSecret ? 'Secret' : isPrivate ? 'Private' : 'Public'
  const missions = movement.nestedContexts

  return (
    <div className="seek-detail-page">
      <button className="seek-back-btn" onClick={() => router.push('/seek')}>
        <ArrowLeft size={14} /> Seek
      </button>

      {/* Hero */}
      <div className="seek-hero">
        <div
          className="seek-hero-top"
          style={{
            background: `linear-gradient(135deg, ${color}26, ${color}08)`,
          }}
        >
          <div
            className="seek-hero-icon"
            style={{
              background: `linear-gradient(135deg, ${color}40, ${color}14)`,
              borderColor: `${color}59`,
              color,
            }}
          >
            {movement.icon && movement.icon !== '🎮' ? (
              movement.icon
            ) : (
              <Globe size={28} />
            )}
          </div>
          <div className="seek-hero-name">{movement.name}</div>
          <div className="seek-hero-handle">@{displayHandle(movement)}</div>
          <div className="seek-hero-badges">
            <span
              className="seek-type-badge"
              style={{ background: `${color}1f`, color, padding: '4px 10px' }}
            >
              Movement
            </span>
            <span
              className="seek-vis-badge"
              style={{
                background: isPrivate ? `${visColor}1f` : 'transparent',
                color: visColor,
                border: `1px solid ${visColor}33`,
              }}
            >
              <Lock size={9} /> {visLabel}
            </span>
          </div>
        </div>
        <div className="seek-hero-divider" />
        <div className="seek-hero-body">
          {movement.description && (
            <div className="seek-hero-desc">{movement.description}</div>
          )}
          <div className="seek-hero-stats">
            <span style={{ color: MISSION_COLOR }}>
              <Rocket size={13} /> {movement.nestedContextsCount} Missions
            </span>
            <span style={{ color: MEMBER_COLOR }}>
              <User size={13} /> {avatarCount(movement)} Avatars
            </span>
            {isActiveStatus(movement.status) && (
              <span style={{ color: '#4CAF50' }}>● Active</span>
            )}
          </div>
        </div>
      </div>

      {/* Join button */}
      {!membershipChecked ? (
        <div className="seek-join-btn loading">
          <Loader2 size={16} className="spin" />
        </div>
      ) : isMember ? (
        <div className="seek-join-btn joined">
          <CheckCircle2 size={18} />
          Joined
          {memberRole
            ? ` as ${memberRole[0].toUpperCase()}${memberRole.slice(1)}`
            : ''}
        </div>
      ) : !wallet ? (
        <div className="seek-join-btn loading" title="Sign in to join">
          Sign in to join
        </div>
      ) : (
        <div className="seek-join-btn" onClick={onJoinTap}>
          <UserPlus size={18} />
          Join Movement
        </div>
      )}

      {/* Tabs */}
      <div className="seek-tabs">
        <button
          className={`seek-tab${tab === 'about' ? ' active' : ''}`}
          onClick={() => setTab('about')}
        >
          About
        </button>
        <button
          className={`seek-tab${tab === 'missions' ? ' active' : ''}`}
          onClick={() => setTab('missions')}
        >
          Missions ({missions.length})
        </button>
        <button
          className={`seek-tab${tab === 'avatars' ? ' active' : ''}`}
          onClick={() => setTab('avatars')}
        >
          Avatars ({avatarCount(movement)})
        </button>
      </div>

      <div className="seek-tab-body">
        {tab === 'about' && <AboutTab movement={movement} color={color} />}
        {tab === 'missions' && (
          <MissionsTab
            missions={missions}
            onMissionTap={(m) =>
              router.push(`/seek/movement/${movement.id}/mission/${m.id}`)
            }
          />
        )}
        {tab === 'avatars' && <AvatarsTab presenceIds={movement.presenceIds} />}
      </div>

      {showCodeModal && (
        <CodeEntryModal
          movementName={movement.name}
          onClose={() => setShowCodeModal(false)}
          onValid={onCodeValid}
        />
      )}
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function AboutTab({
  movement,
  color,
}: {
  movement: KinshipContext
  color: string
}) {
  return (
    <div>
      <div className="seek-about-title">
        <span
          style={{ width: 3, height: 14, borderRadius: 2, background: color }}
        />
        About
      </div>
      <p className="seek-about-text">
        {movement.description || 'No description available.'}
      </p>
      {movement.contextType && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            padding: '8px 12px',
            borderRadius: 10,
            background: '#14114A',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 12,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Type:</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
            {movement.contextType}
          </span>
        </div>
      )}
    </div>
  )
}

function MissionsTab({
  missions,
  onMissionTap,
}: {
  missions: NestedContext[]
  onMissionTap: (m: NestedContext) => void
}) {
  if (missions.length === 0) {
    return (
      <div className="seek-tab-empty">
        <Rocket size={28} style={{ color: `${MISSION_COLOR}40` }} />
        No missions yet
      </div>
    )
  }
  return (
    <div>
      {missions.map((m) => (
        <div
          key={m.id}
          className="seek-mini-card"
          onClick={() => onMissionTap(m)}
        >
          <div
            className="seek-mini-icon"
            style={{
              background: `${MISSION_COLOR}14`,
              border: `1px solid ${MISSION_COLOR}33`,
              color: MISSION_COLOR,
            }}
          >
            {m.icon && m.icon !== '📁' ? m.icon : <Rocket size={18} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="seek-mini-name">{m.name}</div>
            {m.description && (
              <div className="seek-mini-desc">{m.description}</div>
            )}
            {m.presenceIds.length > 0 && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: `${MISSION_COLOR}aa`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <User size={11} /> {m.presenceIds.length} avatar
                {m.presenceIds.length === 1 ? '' : 's'}
              </div>
            )}
          </div>
          <ChevronRight size={20} style={{ color: 'rgba(255,255,255,0.25)' }} />
        </div>
      ))}
    </div>
  )
}

function AvatarsTab({ presenceIds }: { presenceIds: string[] }) {
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const entries: Record<string, string> = {}
      for (const pid of presenceIds) {
        const agent = await getAgentById(pid)
        if (agent && active) {
          entries[pid] = agent.name
          setNames((prev) => ({ ...prev, [pid]: agent.name }))
        }
      }
      void entries
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [presenceIds])

  if (presenceIds.length === 0) {
    return (
      <div className="seek-tab-empty">
        <User size={28} style={{ color: `${MEMBER_COLOR}40` }} />
        No avatars assigned
      </div>
    )
  }

  return (
    <div>
      {presenceIds.map((pid) => {
        const name = names[pid]
        const display = name || (loading ? 'Loading…' : pid)
        const initial = name ? name[0].toUpperCase() : '?'
        return (
          <div key={pid} className="seek-mini-card static">
            <div
              className="seek-avatar-circle"
              style={{ width: 44, height: 44, fontSize: 16 }}
            >
              {name ? initial : <User size={18} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="seek-mini-name"
                style={{ color: name ? '#fff' : 'rgba(255,255,255,0.4)' }}
              >
                {display}
              </div>
              {name && (
                <div
                  className="seek-mini-desc"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pid}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
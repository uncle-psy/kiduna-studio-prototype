'use client'

/**
 * Mission detail — ports Flutter SeekMissionDetailScreen.
 *
 * Loads the parent movement by id, finds the nested mission by missionId, and
 * shows About / Movement (parent) / Avatars tabs.
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Rocket,
  Globe,
  User,
  ChevronRight,
  WifiOff,
} from 'lucide-react'
import {
  getContextById,
  getNestedMissions,
  getAgentById,
  parseColor,
  displayHandle,
  type KinshipContext,
  type NestedContext,
} from '@/lib/seek-api'

const MISSION_FALLBACK = '#FFA44F'
const MOVEMENT_COLOR = '#00C9A7'
const MEMBER_COLOR = '#5B8DEF'

type Tab = 'about' | 'movement' | 'avatars'

export default function MissionDetailPage() {
  const params = useParams()
  const router = useRouter()

  const movementId = (params.id as string) || ''
  const missionId = (params.missionId as string) || ''

  const [movement, setMovement] = useState<KinshipContext | null>(null)
  const [mission, setMission] = useState<NestedContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('about')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const ctx = await getContextById(movementId)
    const missions = await getNestedMissions(movementId)
    const m = missions.find((n) => n.id === missionId) ?? null
    if (!ctx || !m) {
      setError(true)
      setLoading(false)
      return
    }
    setMovement(ctx)
    setMission(m)
    setLoading(false)
  }, [movementId, missionId])

  useEffect(() => {
    load()
  }, [load])

  const backToMovement = () => router.push(`/seek/movement/${movementId}`)

  if (loading) {
    return (
      <div className="seek-detail-page">
        <button className="seek-back-btn" onClick={backToMovement}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="seek-skel" style={{ height: 240, marginTop: 18 }} />
      </div>
    )
  }

  if (error || !movement || !mission) {
    return (
      <div className="seek-detail-page">
        <button className="seek-back-btn" onClick={backToMovement}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="seek-state">
          <WifiOff size={42} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <div>Could not load this mission</div>
          <button className="seek-retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const color = parseColor(mission.color, MISSION_FALLBACK)

  return (
    <div className="seek-detail-page">
      <button className="seek-back-btn" onClick={backToMovement}>
        <ArrowLeft size={14} /> Back
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
            {mission.icon && mission.icon !== '📁' ? (
              mission.icon
            ) : (
              <Rocket size={28} />
            )}
          </div>
          <div className="seek-hero-name">{mission.name}</div>
          <div className="seek-hero-handle">@{displayHandle(mission)}</div>
          <div className="seek-hero-badges">
            <span
              className="seek-type-badge"
              style={{ background: `${color}1f`, color, padding: '4px 10px' }}
            >
              Mission
            </span>
          </div>
        </div>
        <div className="seek-hero-divider" />
        <div className="seek-hero-body">
          {mission.description && (
            <div className="seek-hero-desc">{mission.description}</div>
          )}
          <div className="seek-hero-stats">
            <span style={{ color: MEMBER_COLOR }}>
              <User size={13} /> {mission.presenceIds.length} Avatars
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="seek-tabs">
        <button
          className={`seek-tab${tab === 'about' ? ' active' : ''}`}
          onClick={() => setTab('about')}
        >
          About
        </button>
        <button
          className={`seek-tab${tab === 'movement' ? ' active' : ''}`}
          onClick={() => setTab('movement')}
        >
          Movement
        </button>
        <button
          className={`seek-tab${tab === 'avatars' ? ' active' : ''}`}
          onClick={() => setTab('avatars')}
        >
          Avatars ({mission.presenceIds.length})
        </button>
      </div>

      <div className="seek-tab-body">
        {tab === 'about' && (
          <div>
            <div className="seek-about-title">
              <span
                style={{
                  width: 3,
                  height: 14,
                  borderRadius: 2,
                  background: color,
                }}
              />
              About
            </div>
            <p className="seek-about-text">
              {mission.description || 'No description available.'}
            </p>
          </div>
        )}

        {tab === 'movement' && (
          <div className="seek-mini-card" onClick={backToMovement}>
            <div
              className="seek-mini-icon"
              style={{
                background: `${MOVEMENT_COLOR}14`,
                border: `1px solid ${MOVEMENT_COLOR}33`,
                color: MOVEMENT_COLOR,
              }}
            >
              {movement.icon && movement.icon !== '🎮' ? (
                movement.icon
              ) : (
                <Globe size={18} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="seek-mini-name">{movement.name}</div>
              <div className="seek-mini-desc">
                Parent movement · @{displayHandle(movement)}
              </div>
            </div>
            <ChevronRight
              size={20}
              style={{ color: 'rgba(255,255,255,0.25)' }}
            />
          </div>
        )}

        {tab === 'avatars' && (
          <MissionAvatars presenceIds={mission.presenceIds} />
        )}
      </div>
    </div>
  )
}

function MissionAvatars({ presenceIds }: { presenceIds: string[] }) {
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      for (const pid of presenceIds) {
        const agent = await getAgentById(pid)
        if (agent && active)
          setNames((prev) => ({ ...prev, [pid]: agent.name }))
      }
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
            </div>
          </div>
        )
      })}
    </div>
  )
}
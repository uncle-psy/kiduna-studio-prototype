'use client'

/**
 * Member detail — web port of Flutter MemberDetailScreen.
 *
 * Reached from the Seek list (member card). Shows the member hero + a
 * Connect / Disconnect control backed by the shared ConnectionsProvider
 * (same connection endpoints as mobile). A member only appears in the Chat
 * list AFTER it is connected here — exactly like mobile.
 *
 * Disconnect confirmation uses a WV DUNA custom modal matching mobile exactly:
 *   backgroundColor: #14114A  (Color(0xFF14114A) from mobile)
 *   borderRadius:    16px
 *   Title:           white #FFFFFF, 17px, 700
 *   Message:         rgba(255,255,255,0.60), 14px
 *   Cancel:          rgba(255,255,255,0.50)
 *   Disconnect btn:  #FF5252 (Colors.redAccent), 600
 *   Backdrop:        rgba(3,1,27,0.70) blur(8px)  ← same as .seek-modal-backdrop
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  Loader2,
  WifiOff,
  EyeOff,
  Eye,
  Info,
} from 'lucide-react'
import { getAgentById, isActiveAgent, type Agent } from '@/lib/seek-api'
import { useConnections } from '@/lib/connections-context'

const MEMBER_COLOR = '#5B8DEF'
const SUCCESS = '#4CAF50'

function displaySubtype(sub?: string | null): string {
  switch (sub?.toUpperCase()) {
    case 'MEMBER':   return 'Member'
    case 'MOVEMENT': return 'Movement'
    case 'MISSION':  return 'Mission'
    case 'PROPOSAL': return 'Proposal'
    default: return sub ?? ''
  }
}

function displayTone(tone?: string): string {
  if (!tone) return ''
  return tone.charAt(0).toUpperCase() + tone.slice(1).toLowerCase()
}

// ─────────────────────────────────────────────────────────────────────────────
// DisconnectModal — pixel-accurate port of the mobile AlertDialog
//
// Mobile source (member_detail_screen.dart):
//   AlertDialog(
//     backgroundColor: Color(0xFF14114A),
//     shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
//     title: Text('Disconnect', color: _kTextPrimary, fontSize: 17, fontWeight: w700)
//     content: Text('This member will be removed from your chat list.',
//                   color: _kTextSecondary (#99FFFFFF = rgba(255,255,255,.60)), fontSize: 14)
//     actions: [
//       TextButton('Cancel',     color: rgba(255,255,255,.50))
//       TextButton('Disconnect', color: Colors.redAccent (#FF5252), fontWeight: w600)
//     ]
//   )
// ─────────────────────────────────────────────────────────────────────────────
interface DisconnectModalProps {
  open:      boolean
  loading:   boolean
  onCancel:  () => void
  onConfirm: () => void
}

function DisconnectModal({ open, loading, onCancel, onConfirm }: DisconnectModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    /* Backdrop — rgba(3,1,27,0.70) blur(8px), same as .seek-modal-backdrop */
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(3,1,27,0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/*
        Dialog card — Color(0xFF14114A), borderRadius 16,
        matches .seek-modal but with exact mobile colors
      */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 340,
          background: '#14114A',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '24px 24px 16px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          animation: 'disc-modal-in 0.18s ease-out',
        }}
      >
        {/* Title — _kTextPrimary #FFFFFF, 17px, w700 */}
        <h3
          style={{
            fontFamily: 'var(--font-sans, "Avenir", system-ui, sans-serif)',
            fontSize: 17, fontWeight: 700,
            color: '#FFFFFF',
            margin: '0 0 10px',
            lineHeight: 1.2,
          }}
        >
          Disconnect
        </h3>

        {/* Content — _kTextSecondary rgba(255,255,255,0.60), 14px */}
        <p
          style={{
            fontFamily: 'var(--font-sans, "Avenir", system-ui, sans-serif)',
            fontSize: 14,
            color: 'rgba(255,255,255,0.60)',
            margin: '0 0 20px',
            lineHeight: 1.5,
          }}
        >
          This member will be removed from your chat list.
        </p>

        {/* Actions row — mirrors Flutter Row of TextButtons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 4,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 12,
            marginTop: 4,
          }}
        >
          {/* Cancel — rgba(255,255,255,0.50) */}
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              fontFamily: 'var(--font-sans, "Avenir", system-ui, sans-serif)',
              fontSize: 14, fontWeight: 500,
              color: 'rgba(255,255,255,0.50)',
              background: 'transparent',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.80)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.50)'
            }}
          >
            Cancel
          </button>

          {/* Disconnect — Colors.redAccent = #FF5252, fontWeight w600 */}
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              fontFamily: 'var(--font-sans, "Avenir", system-ui, sans-serif)',
              fontSize: 14, fontWeight: 600,
              color: loading ? 'rgba(255,82,82,0.50)' : '#FF5252',
              background: 'transparent',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,82,82,0.10)'
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            {loading
              ? <><Loader2 size={13} style={{ animation: 'disc-spin 1s linear infinite' }} /> Disconnecting…</>
              : 'Disconnect'
            }
          </button>
        </div>
      </div>

      {/* Modal entrance animation + spinner */}
      <style>{`
        @keyframes disc-modal-in {
          from { opacity: 0; transform: scale(0.94) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes disc-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function MemberDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const agentId = (params.id as string) || ''

  const { isConnected, isHidden, connect, disconnect, hide, unhide } = useConnections()

  const [agent,   setAgent]   = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [busy,    setBusy]    = useState(false)

  // Modal state — replaces window.confirm entirely
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [disconnecting,       setDisconnecting]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const a = await getAgentById(agentId)
    if (!a) { setError(true); setLoading(false); return }
    setAgent(a)
    setLoading(false)
  }, [agentId])

  useEffect(() => { load() }, [load])

  const connected = agent ? isConnected(agent.id) : false
  const hidden    = agent ? isHidden(agent.id)    : false

  const onConnect = async () => {
    if (!agent || busy) return
    setBusy(true)
    await connect(agent)
    setBusy(false)
  }

  // Step 1: open the WV DUNA modal (no window.confirm)
  const onDisconnectClick = () => {
    if (!agent || busy) return
    setShowDisconnectModal(true)
  }

  // Step 2: user confirmed in modal → run existing disconnect logic unchanged
  const onDisconnectConfirm = async () => {
    if (!agent) return
    setDisconnecting(true)
    await disconnect(agent.id)
    setDisconnecting(false)
    setShowDisconnectModal(false)
  }

  const onDisconnectCancel = () => {
    if (disconnecting) return   // don't close mid-request
    setShowDisconnectModal(false)
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="seek-detail-page">
        <button className="seek-back-btn" onClick={() => router.push('/seek')}>
          <ArrowLeft size={14} /> Seek
        </button>
        <div className="seek-skel" style={{ height: 240, marginTop: 18 }} />
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error || !agent) {
    return (
      <div className="seek-detail-page">
        <button className="seek-back-btn" onClick={() => router.push('/seek')}>
          <ArrowLeft size={14} /> Seek
        </button>
        <div className="seek-state">
          <WifiOff size={42} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <div>Could not load this member</div>
          <button className="seek-retry-btn" onClick={load}>Retry</button>
        </div>
      </div>
    )
  }

  const initial = agent.name ? agent.name[0].toUpperCase() : '?'

  return (
    <div className="seek-detail-page">
      {/* WV DUNA Disconnect confirmation modal */}
      <DisconnectModal
        open={showDisconnectModal}
        loading={disconnecting}
        onCancel={onDisconnectCancel}
        onConfirm={onDisconnectConfirm}
      />

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="seek-back-btn" onClick={() => router.push('/seek')}>
          <ArrowLeft size={14} /> Seek
        </button>
        <button
          className="seek-back-btn"
          onClick={() => (hidden ? unhide(agent.id) : hide(agent.id))}
          title={hidden ? 'Unhide member' : 'Hide member'}
        >
          {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
          {hidden ? 'Unhide' : 'Hide'}
        </button>
      </div>

      {/* Hero */}
      <div className="seek-hero" style={{ padding: 24, borderColor: `${MEMBER_COLOR}1f` }}>
        <div className="seek-hero-top" style={{ background: 'transparent', paddingBottom: 0 }}>
          <div
            className="seek-avatar-circle"
            style={{ width: 72, height: 72, fontSize: 28, color: MEMBER_COLOR }}
          >
            {initial}
          </div>
          <div className="seek-hero-name">{agent.name}</div>
          {agent.handle && (
            <div className="seek-hero-handle" style={{ color: `${MEMBER_COLOR}b3` }}>
              @{agent.handle}
            </div>
          )}
          <div className="seek-hero-badges" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Badge 1: Member — always shown */}
            <span className="seek-type-badge" style={{ background: `${MEMBER_COLOR}1f`, color: MEMBER_COLOR, padding: '4px 10px' }}>
              Member
            </span>

            {/* Badge 2: Status (Published / Active / Draft…) — mirrors mobile middle badge */}
            {agent.status && (() => {
              const s = agent.status.toUpperCase()
              const isPublished = s === 'PUBLISHED'
              const isActive    = s === 'ACTIVE'
              const isDraft     = s === 'DRAFT'
              // colour logic mirrors mobile: green for published/active, amber for draft, muted for others
              const color = isPublished || isActive ? SUCCESS
                : isDraft ? '#F59E0B'
                : 'rgba(255,255,255,0.45)'
              const bg = isPublished || isActive ? `${SUCCESS}1f`
                : isDraft ? 'rgba(245,158,11,0.15)'
                : 'rgba(255,255,255,0.06)'
              return (
                <span
                  className="seek-type-badge"
                  style={{ background: bg, color, padding: '4px 10px' }}
                >
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1).toLowerCase()}
                </span>
              )
            })()}

            {/* Badge 3: Tone (Friendly…) — always last */}
            {agent.tone && (
              <span className="seek-type-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', padding: '4px 10px' }}>
                {displayTone(agent.tone)}
              </span>
            )}
          </div>
          {agent.tagline && (
            <div className="seek-hero-desc" style={{ marginTop: 14 }}>
              {agent.tagline}
            </div>
          )}
        </div>
      </div>

      {/* Connect / Disconnect */}
      {connected ? (
        <div className="seek-join-btn joined" style={{ justifyContent: 'center', gap: 14 }}>
          <CheckCircle2 size={18} /> Connected
          <button
            onClick={onDisconnectClick}
            disabled={busy || disconnecting}
            style={{
              marginLeft: 6,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,82,82,0.12)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#FF5252'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          className="seek-join-btn"
          onClick={onConnect}
          disabled={busy}
          style={{ width: '100%' }}
        >
          {busy ? <Loader2 size={18} className="spin" /> : <UserPlus size={18} />}
          Connect
        </button>
      )}

      {/* About */}
      <div className="seek-hero" style={{ marginTop: 12, padding: 20 }}>
        <div className="seek-about-title">
          <Info size={16} style={{ color: `${MEMBER_COLOR}99` }} />
          About
        </div>
        {agent.description && (
          <p className="seek-about-text" style={{ marginBottom: 14 }}>
            {agent.description}
          </p>
        )}
        <InfoRow label="Type"   value={displaySubtype(agent.presenceSubtype)} />
        <InfoRow label="Tone"   value={displayTone(agent.tone)} />
        <InfoRow label="Status" value={agent.status} />
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 10 }}>
      <span style={{ width: 80, flexShrink: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
        {value}
      </span>
    </div>
  )
}
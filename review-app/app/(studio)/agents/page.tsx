'use client'

import { useState, useEffect, useCallback } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { Icon } from '@iconify/react'

import { useStudio } from '@/lib/studio-context'

import { useAuth } from '@/lib/auth-context'

import { CreateAgentChoiceModal } from '@/components/AgentModals'

import type { Presence } from '@/lib/agent-types'

import { PRESENCE_SUBTYPES } from '@/lib/agent-types'

import {
  listAgents,
  listAccessibleAgents,
  deleteAgent as deleteAgentApi,
} from '@/lib/agents-api'


export default function AgentsPage() {
  const router = useRouter()

  const searchParams = useSearchParams()

  const viewParam = searchParams.get('view')

  const isPersonalView = viewParam === 'personal'

  const isPolicyView = viewParam === 'policy'

  const isFilteredView = isPersonalView || isPolicyView

  const { currentPlatform } = useStudio()

  const { user } = useAuth()

  const [agents, setAgents] = useState<Presence[]>([])

  const [loading, setLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modal states

  const [showChoiceModal, setShowChoiceModal] = useState(false)

  // Delete state

  const [agentToDelete, setAgentToDelete] = useState<Presence | null>(null)

  const [deleting, setDeleting] = useState(false)

  // Drafts from localStorage

  const [drafts, setDrafts] = useState<
    {
      key: string
      type: 'Avatar' | 'Performer'
      name: string
      savedAt: number
    }[]
  >([])

  const draftWallet = user?.wallet || ''

  useEffect(() => {
    if (!draftWallet) return
    const found: typeof drafts = []

    try {
      const pd = localStorage.getItem(`kinship_presence_draft_${draftWallet}`)
      if (pd) {
        const d = JSON.parse(pd)
        if (d.savedAt && Date.now() - d.savedAt < 24 * 60 * 60 * 1000) {
          found.push({
            key: `kinship_presence_draft_${draftWallet}`,
            type: 'Avatar',
            name: d.name || 'Untitled Avatar',
            savedAt: d.savedAt,
          })
        }
      }
    } catch { }

    try {
      const wd = localStorage.getItem(`kinship_worker_draft_${draftWallet}`)
      if (wd) {
        const d = JSON.parse(wd)
        if (d.savedAt && Date.now() - d.savedAt < 24 * 60 * 60 * 1000) {
          found.push({
            key: `kinship_worker_draft_${draftWallet}`,
            type: 'Performer',
            name: d.name || 'Untitled Performer',
            savedAt: d.savedAt,
          })
        }
      }
    } catch { }

    try { localStorage.removeItem('kinship_presence_draft') } catch { }
    try { localStorage.removeItem('kinship_worker_draft') } catch { }

    setDrafts(found)
  }, [draftWallet])

  function deleteDraft(key: string) {
    try {
      localStorage.removeItem(key)
    } catch { }

    setDrafts((prev) => prev.filter((d) => d.key !== key))
  }

  function resumeDraft(key: string) {
    if (key.startsWith('kinship_presence_draft')) {
      router.push('/agents/create/avatar')
    } else {
      router.push('/agents/create/performer')
    }
  }

  const fetchAgents = useCallback(async () => {
    if (!user?.wallet) return

    setLoading(true)

    try {
      const [ownResult, accessibleResult] = await Promise.all([
        listAgents({
          wallet: user.wallet,

          platformId: currentPlatform?.id,

          includeWorkers: true,
        }).catch(() => ({ agents: [] })),

        listAccessibleAgents({
          wallet: user.wallet,
          excludePublic: true,
        }).catch(() => ({ agents: [] })),
      ])

      const ownAgents = ownResult.agents || []

      const accessibleAgents = (accessibleResult.agents || []) as Presence[]

      const ownIds = new Set(ownAgents.map((a: Presence) => a.id))

      const merged = [
        ...ownAgents,

        ...accessibleAgents.filter((a: Presence) => !ownIds.has(a.id)),
      ]

      setAgents(merged)
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPlatform?.id, user?.wallet])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  async function handleDeleteAgent() {
    if (!agentToDelete) return

    setDeleting(true)

    try {
      await deleteAgentApi(agentToDelete.id)

      setAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id))

      setAgentToDelete(null)
    } catch (error) {
      console.error('Error deleting agent:', error)
    } finally {
      setDeleting(false)
    }
  }

  // Pre-filter by view (from URL ?view= param)

  const viewAgents = isPersonalView
    ? agents.filter(
      (a) =>
        a.type === 'PRESENCE' &&
        (['member', 'big_avatar'].includes(
          a.presenceSubtype?.toLowerCase() || ''
        ) ||
          !a.presenceSubtype)
    )
    : isPolicyView
      ? agents.filter(
        (a) =>
          a.type === 'PRESENCE' &&
          a.presenceSubtype?.toLowerCase() === 'proposal'
      )
      : agents

  const tabFiltered =
    statusFilter === 'all'
      ? viewAgents
      : statusFilter === 'kiduna'
        ? viewAgents.filter(
          (a) =>
            a.presenceSubtype?.toLowerCase() === 'big_avatar' ||
            a.presenceSubtype?.toLowerCase() === 'movement'
        )
        : statusFilter === 'mission'
          ? viewAgents.filter(
            (a) => a.presenceSubtype?.toLowerCase() === 'mission'
          )
          : statusFilter === 'policy'
            ? viewAgents.filter(
              (a) => a.presenceSubtype?.toLowerCase() === 'proposal'
            )
            : statusFilter === 'personal'
              ? viewAgents.filter(
                (a) =>
                  ['member', 'big_avatar'].includes(
                    a.presenceSubtype?.toLowerCase() || ''
                  ) || !a.presenceSubtype
              )
              : statusFilter === 'operator'
                ? viewAgents.filter(
                  (a) => a.presenceSubtype?.toLowerCase() === 'operator'
                )
                : statusFilter === 'elector'
                  ? viewAgents.filter(
                    (a) => a.presenceSubtype?.toLowerCase() === 'elector'
                  )
                  : statusFilter === 'ally'
                    ? viewAgents.filter(
                      (a) => a.presenceSubtype?.toLowerCase() === 'ally'
                    )
                    : viewAgents

  const filtered = tabFiltered

  const presences = agents.filter((a) => a.type === 'PRESENCE')

  const pageTitle = isPersonalView
    ? 'Personal Agents'
    : isPolicyView
      ? 'Policy Agents'
      : 'Allies'

  // WV DUNA badge colors

  type BadgeStyle = { background: string; color: string; border?: string }

  const badgeStyles: Record<string, BadgeStyle> = {
    PRIMARY: { background: '#EAAA00', color: '#09073A' },

    'DUNA ALLY': {
      background: 'rgba(234,170,0,0.18)',
      color: '#EAAA00',
      border: '1px solid rgba(234,170,0,0.35)',
    },

    DUNA: {
      background: 'rgba(234,170,0,0.18)',
      color: '#EAAA00',
      border: '1px solid rgba(234,170,0,0.35)',
    },

    PUBLISHED: {
      background: 'rgba(0,235,117,0.15)',
      color: '#00EB75',
      border: '1px solid rgba(0,235,117,0.3)',
    },

    TESTING: {
      background: 'rgba(3,204,217,0.15)',
      color: '#03CCD9',
      border: '1px solid rgba(3,204,217,0.3)',
    },

    DRAFT: {
      background: 'rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.55)',
      border: '1px solid rgba(255,255,255,0.15)',
    },

    PERSONAL: {
      background: 'rgba(101,54,187,0.2)',
      color: '#a07aee',
      border: '1px solid rgba(101,54,187,0.35)',
    },

    ALLIANCE: {
      background: 'rgba(3,204,217,0.12)',
      color: '#03CCD9',
      border: '1px solid rgba(3,204,217,0.25)',
    },

    PUBLIC: {
      background: 'rgba(0,235,117,0.12)',
      color: '#00EB75',
      border: '1px solid rgba(0,235,117,0.25)',
    },

    PRIVATE: {
      background: 'rgba(3,204,217,0.12)',
      color: '#03CCD9',
      border: '1px solid rgba(255,255,255,0.18)',
    },

    SECRET: {
      background: 'rgba(255,58,58,0.12)',
      color: '#a855f7',
      border: '1px solid rgba(255,58,58,0.25)',
    },
  }

  function getBadge(label: string) {
    const s: BadgeStyle = badgeStyles[label.toUpperCase()] ?? {
      background: 'rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.55)',
    }

    return (
      <span
        key={label}
        style={{
          background: s.background,

          color: s.color,

          border: s.border,

          fontSize: 10,

          fontWeight: 700,

          letterSpacing: '0.1em',

          textTransform: 'uppercase' as const,

          padding: '2px 8px',

          borderRadius: 999,

          display: 'inline-block',

          lineHeight: 1.6,

          whiteSpace: 'nowrap' as const,
        }}
      >
        {label}
      </span>
    )
  }

  return (
    <div className="-mt-2 sm:-mt-3 md:-mt-4 lg:-mt-5" style={{ position: 'relative' }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 8 }}>
        {/* eyebrow */}
        <p
          style={{
            fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',

            fontSize: '0.66rem',

            fontWeight: 700,

            letterSpacing: '0.16em',

            textTransform: 'uppercase' as const,

            color: '#03CCD9',

            marginBottom: 8,
          }}
        >
          Building mode · Agents
        </p>
        <h1
          style={{
            fontFamily: '"Goudy Heavyface", "Goudy Old Style", Georgia, serif',

            fontWeight: 400,

            fontSize: '2.1rem',

            lineHeight: 1,

            color: '#ffffff',

            marginBottom: 6,

            letterSpacing: 0,
          }}
        >
          {pageTitle}
        </h1>
        <p
          style={{
            fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',

            fontSize: '0.9rem',

            color: 'rgba(255,255,255,0.6)',

            lineHeight: 1.55,

            maxWidth: '1200px',

            margin: '0 0 18px',
          }}
        >
          Allies are intelligent agents that represent people, organizations,
          programs, and alliances. They communicate, coordinate, and act on
          behalf of their principals, carrying the identity, authority, and
          permissions needed to operate safely across the network.
        </p>

        {!isFilteredView && (
          <button
            onClick={() => setShowChoiceModal(true)}
            style={{
              fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',

              background: '#EAAA00',

              color: '#09073A',

              padding: '0.7rem 1.25rem',

              borderRadius: 6,

              border: 'none',

              cursor: 'pointer',

              fontSize: '0.92rem',

              fontWeight: 700,

              letterSpacing: '0.01em',

              display: 'inline-flex',

              alignItems: 'center',

              gap: 8,

              transition: '160ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#FFC229')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#EAAA00')}
          >
            + Create a new Ally
          </button>
        )}
      </div>

      {/* ── Description types line ── */}

      {!isFilteredView && (
        <>
          <p
            style={{
              fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
              fontSize: 15,
              color: '#CDCDCD',
              lineHeight: 1.7,
              marginTop: 22,
              marginBottom: 14,
            }}
          >
            There are five types of Allies —{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>
              DUNA Allies
            </strong>
            ,{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>
              Personal Allies
            </strong>{' '}
            (member allies),{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>
              Alliances
            </strong>
            ,{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>Sponsors</strong>
            , and{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>Programs</strong>
            . Any one can be the{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>Primary</strong>{' '}
            for its principal. Each Ally is{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>Draft</strong>,{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>Testing</strong>,
            or{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>
              Published
            </strong>
            .
          </p>

          {/* ── Visibility line ── */}
          <p
            style={{
              fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
              fontSize: 15,
              color: '#CDCDCD',
              lineHeight: 1.7,
              marginBottom: 28,
            }}
          >
            Every Ally also has a visibility —{' '}
            <span
              style={{
                background: 'rgba(0,235,117,0.15)',

                color: '#00EB75',

                border: '1px solid rgba(0,235,117,0.4)',

                fontSize: 11,

                fontWeight: 700,

                padding: '2px 7px',

                borderRadius: 4,

                letterSpacing: '0.04em',
              }}
            >
              Public 
            </span> ,{' '}
            <span
              style={{
                background: 'rgba(3,204,217,0.12)',

                color: '#03CCD9',

                border: '1px solid rgba(3,204,217,0.25)',

                fontSize: 11,

                fontWeight: 700,

                padding: '2px 7px',

                borderRadius: 4,

                marginLeft: 4,

                letterSpacing: '0.04em',
              }}
            >
              Private
            </span>
            , or{' '}
            <span
              style={{
                background: 'rgba(168,85,247,0.13)',

                color: '#a855f7',

                border: '1px solid rgba(255,58,58,0.3)',

                fontSize: 11,

                fontWeight: 700,

                padding: '2px 7px',

                marginLeft: 4,

                letterSpacing: '0.04em',
              }}
            >
              Secret
            </span>
            . Codes are always exchanged when two allies connect; the difference
            is who may initiate.{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>Public</strong>{' '}
            allies accept connections from any ally and are listed in Seek.{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>Private</strong>{' '}
            allies are listed in Seek but require a Code with a matching entry
            Claim to connect.{' '}
            <strong style={{ color: '#fff', fontWeight: 700 }}>Secret</strong>{' '}
            allies are not listed in Seek — they&apos;re reachable only by
            entering the secret Code in a search box, a DUNA ally, or anywhere
            else that can read and decipher Codes.
          </p>
        </>
      )}

      {/* ── Filter tabs ── */}

      {!loading && !isFilteredView && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
            flexWrap: 'wrap' as const,
          }}
        >
          {[
            { value: 'all', label: 'ALL' },

            { value: 'kiduna', label: 'KIDUNA' },

            { value: 'mission', label: 'MISSION' },

            { value: 'policy', label: 'POLICY' },

            { value: 'personal', label: 'PERSONAL' },

            { value: 'operator', label: 'OPERATOR' },

            { value: 'elector', label: 'ELECTOR' },

            { value: 'ally', label: 'ALLY' },
          ].map((tab) => {
            const isActive = statusFilter === tab.value

            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                style={{
                  fontFamily:
                    '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',

                  background: isActive ? 'rgba(180,100,0,0.18)' : '#0D1B3E',

                  color: isActive ? '#EAAA00' : 'rgba(255,255,255,0.75)',

                  border: isActive
                    ? '1px solid rgba(234,170,0,0.6)'
                    : '1px solid rgba(255,255,255,0.14)',

                  padding: '7px 14px',

                  borderRadius: 9999,

                  fontSize: 12,

                  fontWeight: 700,

                  letterSpacing: '0.08em',

                  textTransform: 'uppercase' as const,

                  cursor: 'pointer',

                  transition: '160ms',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      'rgba(255,255,255,0.35)'
                      ; (e.currentTarget as HTMLButtonElement).style.background =
                        '#162040'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      'rgba(255,255,255,0.14)'
                      ; (e.currentTarget as HTMLButtonElement).style.background =
                        '#0D1B3E'
                  }
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Drafts ── */}

      {drafts.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3 flex items-center gap-2"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <Icon icon="lucide:file-edit" width={12} height={12} />
            Unsaved Drafts
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {drafts.map((draft) => (
              <div
                key={draft.key}
                className="flex-shrink-0 rounded-xl p-4 min-w-[220px] max-w-[280px]"
                style={{
                  background: '#0A0D33',
                  border: '1px dashed rgba(234,170,0,0.35)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    icon={
                      draft.type === 'Avatar' ? 'lucide:crown' : 'lucide:bot'
                    }
                    width={14}
                    height={14}
                    style={{ color: '#EAAA00' }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(234,170,0,0.15)',
                      color: '#EAAA00',
                    }}
                  >
                    {draft.type}
                  </span>
                </div>
                <p className="text-sm font-medium text-white truncate mb-1">
                  {draft.name}
                </p>
                <p
                  className="text-[10px] mb-3"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Saved {new Date(draft.savedAt).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resumeDraft(draft.key)}
                    className="flex-1 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    style={{
                      background: 'rgba(234,170,0,0.12)',
                      color: '#EAAA00',
                      border: '1px solid rgba(234,170,0,0.3)',
                    }}
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => deleteDraft(draft.key)}
                    className="text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    style={{
                      background: 'rgba(255,58,58,0.10)',
                      color: '#ff6b6b',
                      border: '1px solid rgba(255,58,58,0.2)',
                    }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ── */}

      {loading && (
        <div className="text-center py-16">
          <Icon
            icon="lucide:loader-2"
            width={36}
            height={36}
            className="mx-auto mb-3 animate-spin"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          />
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading allies…</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECTION: Your Allies (agent grid)
          ══════════════════════════════════════════════════════════════════ */}

      {!loading && filtered.length > 0 && !isFilteredView && (
        <p style={{
          fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.35)',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon icon="lucide:crown" width={11} height={11} /> Your Allies
        </p>
      )}

      {/* ── Agent grid ── */}

      {!loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((agent) => {
            const isPrimary = !!(agent as any)?.isPrimaryMember || !!(agent as any)?.is_primary_member

            const isPresence = agent.type?.toLowerCase() === 'presence'

            const status = (agent.status || 'ACTIVE').toUpperCase()

            const visibility = agent.accessLevel?.toUpperCase() || 'PRIVATE'

            return (
              <div
                key={agent.id}
                className="group relative transition-all cursor-pointer"
                style={{
                  background: '#0A0D33',

                  border: '1px solid rgba(255,255,255,0.12)',

                  borderRadius: 14,

                  overflow: 'hidden',

                  boxShadow: '0 6px 20px rgba(3,1,27,0.45)',

                  transition: '160ms',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')
                }
                onClick={() => router.push(`/agent/${agent.id}`)}
              >
                <div style={{ padding: '20px 20px 16px' }}>
                  {/* Badges row top-right */}
                  <div className="flex items-center justify-between mb-3">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{
                        background: 'rgba(101,54,187,0.25)',
                        border: '1px solid rgba(101,54,187,0.4)',
                      }}
                    >
                      {isPresence ? (
                        <Icon
                          icon="lucide:crown"
                          width={20}
                          height={20}
                          style={{ color: '#EAAA00' }}
                        />
                      ) : (
                        <Icon
                          icon="lucide:bot"
                          width={20}
                          height={20}
                          style={{ color: '#a07aee' }}
                        />
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap justify-end gap-1 ml-2">
                      {isPrimary && getBadge('PRIMARY')}

                      {isPresence && agent.presenceSubtype?.toLowerCase() === 'ally' && getBadge('DUNA ALLY')}

                      {status === 'PUBLISHED' && getBadge('PUBLISHED')}

                      {status === 'TESTING' && getBadge('TESTING')}

                      {status === 'DRAFT' && getBadge('DRAFT')}

                      {(() => {
                        const st = agent.presenceSubtype
                          ? PRESENCE_SUBTYPES.find(
                            (s) =>
                              s.value === agent.presenceSubtype?.toLowerCase()
                          )
                          : null

                        if (!st) return null
                        if (st.value === 'ally') return null

                        return getBadge(st.label.toUpperCase())
                      })()}

                      {visibility === 'PUBLIC' && getBadge('PUBLIC')}

                      {visibility === 'PRIVATE' && getBadge('PRIVATE')}

                      {visibility === 'SECRET' && getBadge('SECRET')}
                    </div>
                  </div>

                  {/* Name */}
                  <h3
                    style={{
                      fontFamily:
                        '"Goudy Heavyface", "Goudy Old Style", Georgia, serif',

                      fontWeight: 600,

                      fontSize: 18,

                      lineHeight: 1.2,

                      color: '#ffffff',

                      marginBottom: 2,

                      marginTop: 8,
                    }}
                  >
                    {agent.name}
                  </h3>

                  {/* Handle */}

                  {agent.handle && (
                    <p
                      style={{
                        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.45)',
                        marginBottom: 2,
                      }}
                    >
                      @{agent.handle}
                    </p>
                  )}

                  {/* Tagline */}

                  {(agent.tagline || agent.briefDescription) && (
                    <p
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 14,
                        fontStyle: 'italic',
                        color: 'rgba(255,255,255,0.5)',
                        marginBottom: 8,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical' as const,
                      }}
                    >
                      &ldquo;{agent.tagline || agent.briefDescription}&rdquo;
                    </p>
                  )}

                  {/* Description */}

                  {agent.description ? (
                    <p
                      style={{
                        fontFamily:
                          '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.65)',
                        lineHeight: 1.55,
                        marginBottom: 12,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}
                    >
                      {agent.description}
                    </p>
                  ) : (
                    <p
                      style={{
                        fontFamily:
                          '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
                        fontSize: 14,
                        fontStyle: 'italic',
                        color: 'rgba(255,255,255,0.28)',
                        marginBottom: 16,
                      }}
                    >
                      No description yet
                    </p>
                  )}

                  {/* Footer — KB · Prompt · date */}
                  <div
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.07)',
                      paddingTop: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      fontFamily:
                        '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {agent.knowledgeBaseIds &&
                        agent.knowledgeBaseIds.length > 0 && (
                          <span>{agent.knowledgeBaseIds.length} KB</span>
                        )}

                      {agent.promptId && (
                        <>
                          {agent.knowledgeBaseIds &&
                            agent.knowledgeBaseIds.length > 0 && (
                              <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                                ·
                              </span>
                            )}
                          <span>Prompt</span>
                        </>
                      )}
                    </div>
                    <span
                      style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                    >
                      Updated{' '}
                      {new Date(agent.updatedAt).toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Create new tile — only in main Allies view */}

          {!isFilteredView && (
            <button
              onClick={() => setShowChoiceModal(true)}
              style={{
                background: '#0A0D33',

                border: '1px dashed rgba(255,255,255,0.18)',

                borderRadius: 14,

                display: 'flex',

                flexDirection: 'column',

                alignItems: 'center',

                justifyContent: 'center',

                gap: 12,

                minHeight: 240,

                cursor: 'pointer',

                transition: '160ms',

                width: '100%',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(234,170,0,0.5)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')
              }
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: '#1a2a5e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 300,
                  lineHeight: 1,
                  color: '#EAAA00',
                  marginBottom: 4,
                }}
              >
                +
              </div>
              <div>
                <p
                  style={{
                    fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 16,
                    margin: 0,
                    textAlign: 'center',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Create a new Ally
                </p>
                <p
                  style={{
                    fontFamily:
                      '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.45)',
                    marginTop: 5,
                    textAlign: 'center',
                    fontWeight: 400,
                  }}
                >
                  Options depend on your level.
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ── Filtered view empty state ── */}

      {!loading && isFilteredView && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,

              background: isPolicyView
                ? 'rgba(59,130,246,0.12)'
                : 'rgba(234,170,0,0.12)',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              margin: '0 auto 16px',
            }}
          >
            <Icon
              icon={isPolicyView ? 'lucide:file-text' : 'lucide:user-round'}
              width={28}
              height={28}
              style={{ color: isPolicyView ? '#6aa6ff' : '#EAAA00' }}
            />
          </div>
          <p
            style={{
              fontFamily: '"Goudy Heavyface", Georgia, serif',
              fontSize: 18,
              fontWeight: 400,
              color: '#fff',
              marginBottom: 8,
            }}
          >
            {isPolicyView ? 'No policy agents' : 'No personal agents'}
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              maxWidth: 380,
              margin: '0 auto',
            }}
          >
            {isPolicyView
              ? 'Policy agents represent governance proposals. Create one from the Allies page.'
              : 'Personal agents are your member allies. Create one from the Allies page.'}
          </p>
        </div>
      )}

      {/* ── Modals ── */}

      {showChoiceModal && (
        <CreateAgentChoiceModal
          onClose={() => setShowChoiceModal(false)}
          onChoosePresence={() => {
            setShowChoiceModal(false)
            router.push('/agents/create/avatar')
          }}
          onChooseAgent={() => {
            setShowChoiceModal(false)
            router.push('/agents/create/performer')
          }}
          presences={presences}
        />
      )}

{/* ── Delete modal ── */}

      {agentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setAgentToDelete(null)}
          />
          <div
            className="relative w-full max-w-md p-6 rounded-xl shadow-2xl"
            style={{
              background: '#0A0D33',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,58,58,0.12)' }}
              >
                <Icon
                  icon="lucide:alert-triangle"
                  width={24}
                  height={24}
                  className="text-red-400"
                />
              </div>
              <div>
                <h3
                  className="text-lg text-white"
                  style={{
                    fontFamily: '"Goudy Heavyface", Georgia, serif',
                    fontWeight: 400,
                  }}
                >
                  Delete Ally
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p
              className="text-sm mb-6"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white">
                {agentToDelete.name}
              </span>
              {agentToDelete.handle && (
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {' '}
                  (@{agentToDelete.handle})
                </span>
              )}
              ?
              {agentToDelete.type?.toLowerCase() === 'presence' && (
                <span className="block mt-2 text-xs text-amber-400">
                  ⚠️ Deleting your Avatar will also remove all associated
                  Performers.
                </span>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setAgentToDelete(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                style={{
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAgent}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Icon
                      icon="lucide:loader-2"
                      width={16}
                      height={16}
                      className="animate-spin"
                    />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:trash-2" width={16} height={16} />
                    Delete 
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getSystemAlly } from '@/lib/agents-api'
import type { Presence } from '@/lib/agent-types'

/**
 * AskDunaTab — global contextual chat dock.
 *
 * Resolves the system-wide ally agent via GET /api/agents/ally (the single
 * agent with is_ally=true), then streams chat through the same orchestrator
 * endpoint used by the main chat page.  All display values — name, initials,
 * seed greeting — come from the resolved agent; nothing is hardcoded.
 *
 * PAGE CONTEXT: The current route is automatically prepended to every message
 * as a system-level hint so the Ally can provide contextual guidance.
 * This is Ally-only behavior — normal chat (ChatWindow) is not affected.
 */

const AGENTS_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

// ── Route → friendly page name mapping ──────────────────────────────────────
// Used to give the Ally agent human-readable page context.
const PAGE_NAMES: Record<string, string> = {
  '/agents': 'Allies — manage your AI agents (Avatars and Performers)',
  '/knowledge': 'Inform — create and manage knowledge bases for your agents',
  '/prompts': 'Instruct — create and manage stances (system prompts) for your agents',
  '/empower': 'Empower — connect external tools (Bluesky, Google, Solana, Telegram) to your Performers',
  '/align': 'Enact — create automated skills (event, time, condition, or command triggers)',
  '/approve': 'Actions — review and approve actions your agents have taken',
  '/offerings': 'Offerings — manage platform offerings',
  '/coins': 'Coins — view and manage token information',
  '/codes': 'Codes — create and manage invitation codes for access control',
  '/team': 'Team — manage team members',
  '/wallet': 'Wallet — manage your Solana wallet, token balances, and transactions',
  '/games': 'Gatherings — create and manage gathering events',
  '/assets': 'Library — browse and manage uploaded assets',
  '/assets/upload': 'Upload — upload new assets to the platform',
  '/objectives': 'Objectives — create strategic objectives with dimensions and weights',
  '/markets': 'Markets — manage futarchy governance markets',
  '/electors': 'Electors — manage voting agents for governance',
  '/launchpad': 'Launchpad — launch new markets with ICO flow',
  '/context': 'Kiduna — create and manage movements (organizational containers)',
  '/dashboard': 'Dashboard — platform overview and statistics',
  '/onboarding': 'Onboarding — first-time setup wizard',
  '/chat': 'Chat — conversation with your agents',
  '/seek': 'Seek — discover movements, members, and markets',
  '/vote': 'Vote — vote on active governance proposals',
  '/earn': 'Earn — view earning opportunities and rewards',
  '/vibe': 'Vibe — share mood and sentiment signals',
  '/directory': 'Directory — browse all members and agents',
  '/market': 'Market Dashboard — governance stats and open proposals',
  '/market/proposals': 'Proposals — view all governance proposals with lifecycle status',
  '/market/treasury': 'Treasury — view treasury balances and fund movements',
  '/market/electors': 'Market Electors — manage electors participating in this market',
  '/market/tokens': 'Tokens — view token supply and vesting schedules',
  '/market/objectives': 'Market Objectives — manage objectives within this market',
  '/market/create-start': 'Create Proposal — choose a proposal type to create',
  '/market/create-spend': 'Create Spend Proposal — send funds from treasury',
  '/market/create-param': 'Create Param Proposal — change a DAO setting',
  '/market/create-mint': 'Create Mint Proposal — issue new tokens',
  '/market/create-metadata': 'Create Metadata Proposal — update token metadata',
  '/market/create-liquidity': 'Create Liquidity Proposal — adjust treasury pool liquidity',
  '/market/create-perf': 'Create Performance Proposal — conditional reward grant',
}

/**
 * Resolve a human-readable page description from the current pathname.
 * Handles dynamic routes like /agent/[id] and /codes/[id].
 */
function getPageContext(pathname: string): string {
  // Exact match first
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname]

  // Dynamic route patterns
  if (pathname.startsWith('/agent/')) return 'Agent Detail — viewing and editing a specific agent'
  if (pathname.startsWith('/knowledge/') && pathname.includes('/edit')) return 'Knowledge Base Editor — editing a knowledge base'
  if (pathname.startsWith('/knowledge/')) return 'Knowledge Base Detail — viewing a knowledge base'
  if (pathname.startsWith('/prompts/') && pathname !== '/prompts/create') return 'Stance Detail — viewing a system prompt'
  if (pathname === '/prompts/create') return 'Create Stance — creating a new system prompt'
  if (pathname.startsWith('/codes/create')) return 'Create Code — creating a new invitation code'
  if (pathname.startsWith('/codes/')) return 'Code Detail — viewing an invitation code'
  if (pathname.startsWith('/context/') && pathname.includes('/project/')) return 'Kiduna Project Detail — viewing a project within a movement'
  if (pathname.startsWith('/context/')) return 'Kiduna Detail — viewing and editing a specific movement'
  if (pathname.startsWith('/align/trace/')) return 'Skill Trace — viewing execution trace of a skill'
  if (pathname.startsWith('/align/')) return 'Skill Detail — viewing and editing a specific skill'
  if (pathname.startsWith('/market/proposals/')) return 'Proposal Detail — viewing a specific governance proposal'
  if (pathname.startsWith('/market/settings/')) return 'Market Settings — configuring market identity and parameters'
  if (pathname.startsWith('/seek/movement/')) return 'Movement Detail — viewing a movement in Seek'
  if (pathname.startsWith('/seek/member/')) return 'Member Profile — viewing a member in Seek'
  if (pathname.startsWith('/vote/')) return 'Vote on Proposal — voting on a specific governance proposal'
  if (pathname === '/setup-ally') return 'Setup Ally — wizard to create your Ally agent'

  // Fallback: use the pathname itself
  return `Page: ${pathname}`
}

interface DockMessage {
  id: number
  role: 'ally' | 'me'
  text: string
  streaming?: boolean
}

/** Extract the first two uppercase letters for the avatar circle. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/**
 * Lightweight Markdown → React renderer for ally chat bubbles.
 * Supports: **bold**, `code`, numbered lists (1. 2. 3.), bullet lists (- ),
 * and line breaks. No external dependencies.
 */
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  function parseInline(line: string): React.ReactNode[] {
    const parts: React.ReactNode[] = []
    // Match **bold**, `code`, or plain text
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(line)) !== null) {
      // Plain text before the match
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index))
      }
      const token = match[0]
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={`b${key++}`} style={{ color: '#EAAA00', fontWeight: 600 }}>
            {token.slice(2, -2)}
          </strong>
        )
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={`c${key++}`} style={{
            background: 'rgba(255,255,255,0.08)', padding: '1px 5px',
            borderRadius: 4, fontSize: '0.82em', fontFamily: 'monospace',
          }}>
            {token.slice(1, -1)}
          </code>
        )
      }
      lastIndex = match.index + token.length
    }
    // Remaining plain text
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex))
    }
    return parts
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Empty line → spacing
    if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 6 }} />)
      continue
    }

    // Numbered list item: "1. ", "2. ", etc.
    const numMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (numMatch) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 6, marginLeft: 4, marginBottom: 2 }}>
          <span style={{ color: '#EAAA00', fontWeight: 600, minWidth: 18, textAlign: 'right' }}>
            {numMatch[1]}.
          </span>
          <span>{parseInline(numMatch[2])}</span>
        </div>
      )
      continue
    }

    // Bullet list item: "- "
    if (line.match(/^-\s+/)) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 6, marginLeft: 4, marginBottom: 2 }}>
          <span style={{ color: '#EAAA00', fontWeight: 600, minWidth: 12 }}>•</span>
          <span>{parseInline(line.replace(/^-\s+/, ''))}</span>
        </div>
      )
      continue
    }

    // Regular paragraph
    elements.push(<div key={key++} style={{ marginBottom: 2 }}>{parseInline(line)}</div>)
  }

  return <>{elements}</>
}

function extractJSON(line: string): string | null {
  let s = line.trim()
  while (s.startsWith('data:')) s = s.slice(5).trim()
  return s.startsWith('{') ? s : null
}

interface AskDunaTabProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function AskDunaTab(props: AskDunaTabProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const [internalOpen, setInternalOpen] = useState(false)
  const open = props.open ?? internalOpen
  const setOpen = (v: boolean) => {
    setInternalOpen(v)
    props.onOpenChange?.(v)
  }
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<DockMessage[]>([])
  const [sending, setSending] = useState(false)

  // The system-wide ally agent — resolved on mount
  const [ally, setAlly] = useState<Presence | null>(null)
  const [allyLoading, setAllyLoading] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)
  const accumulatedRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)

  // ── Abort streaming on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // ── Resolve the system-wide ally from the backend ──────────────────────────
  const resolveAlly = useCallback(async () => {
    setAllyLoading(true)
    try {
      const agent = await getSystemAlly()
      setAlly(agent)
      if (agent) {
        // Set the seed greeting dynamically from the resolved ally
        setMessages([{
          id: 0,
          role: 'ally',
          text: `Hi — I'm ${agent.name}. Ask me anything and I'll help you out.`,
        }])
      }
    } catch {
      // non-fatal — dock will show a helpful message on send
    } finally {
      setAllyLoading(false)
    }
  }, [])

  useEffect(() => { resolveAlly() }, [resolveAlly])

  useEffect(() => {
    const onAllyUpdated = () => { resolveAlly() }
    window.addEventListener('chat-agent-updated', onAllyUpdated)
    return () => window.removeEventListener('chat-agent-updated', onAllyUpdated)
  }, [resolveAlly])

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  // ── Close on Escape ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // ── Send ───────────────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim()
    if (!text || sending) return

    const meId = nextId.current++
    const allyId = nextId.current++
    setMessages(prev => [
      ...prev,
      { id: meId, role: 'me', text },
      { id: allyId, role: 'ally', text: '', streaming: true },
    ])
    setInput('')
    setSending(true)
    accumulatedRef.current = ''

    // Guard: ally not yet resolved
    if (!ally) {
      setMessages(prev => prev.map(m =>
        m.id === allyId
          ? { ...m, text: 'No ally is configured yet. Please ask an admin to set one up.', streaming: false }
          : m
      ))
      setSending(false)
      return
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    try {
      // Prepend page context so the Ally knows which page the user is on.
      // This is Ally-only behavior — normal chat (ChatWindow) does not do this.
      const pageContext = getPageContext(pathname)
      const contextualMessage = `[User is currently on: ${pageContext}]\n\n${text}`

      const abortController = new AbortController()
      abortRef.current = abortController

      const res = await fetch(`/api/chatmessages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          presenceId: ally.id,
          targetPresenceId: ally.id,
          message: contextualMessage,
          userId: user?.id || 'anonymous',
          userWallet: user?.wallet || 'anonymous',
        }),
        signal: abortController.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // ── TRUE STREAMING: read chunks incrementally via ReadableStream ──
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No readable stream')

      const decoder = new TextDecoder()
      let sseBuffer = ''
      let finalResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode the chunk and add to SSE buffer
        sseBuffer += decoder.decode(value, { stream: true })

        // Process all complete lines (SSE lines end with \n)
        const lines = sseBuffer.split('\n')
        sseBuffer = lines.pop() || '' // retain incomplete last line

        for (const line of lines) {
          if (!line.trim()) continue
          const jsonStr = extractJSON(line)
          if (!jsonStr) continue
          try {
            const evt = JSON.parse(jsonStr)
            if (evt.event === 'token' && evt.token) {
              accumulatedRef.current += evt.token
              setMessages(prev => prev.map(m =>
                m.id === allyId ? { ...m, text: accumulatedRef.current } : m
              ))
            } else if (evt.event === 'done') {
              finalResponse = evt.fullResponse || accumulatedRef.current
            } else if (evt.event === 'error') {
              finalResponse = evt.error || 'Something went wrong. Please try again.'
            }
          } catch { /* skip malformed JSON */ }
        }
      }

      if (!finalResponse) finalResponse = accumulatedRef.current
      if (!finalResponse) finalResponse = "Sorry, I didn't get a response. Please try again."

      setMessages(prev => prev.map(m =>
        m.id === allyId ? { ...m, text: finalResponse, streaming: false } : m
      ))
    } catch (err) {
      // AbortError = user closed dock mid-stream — silent, no error message
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === allyId
            ? { ...m, text: accumulatedRef.current || 'Cancelled.', streaming: false }
            : m
        ))
      } else {
        setMessages(prev => prev.map(m =>
          m.id === allyId
            ? { ...m, text: 'Something went wrong. Please try again.', streaming: false }
            : m
        ))
      }
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Derived display values — all from the resolved ally, nothing hardcoded
  const allyName = ally?.name || 'Chat'
  const allyInitials = ally ? initials(ally.name) : '?'
  const allySubtitle = ally?.tagline || (ally ? 'Contextual help' : 'Choose an avatar first')

  if (allyLoading) return null

  const tabLabel = ally ? `Ask ${allyName}` : 'Setup Chat'
  const tabZIndex = 300
  const dockZIndex = 350

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Animation keyframes */}
      <style>{`
        @keyframes wvBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes wvDotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {/* Side tab */}
      {!open && (
        <div style={{ position: 'fixed', right: 0, top: 120, zIndex: tabZIndex }}>
          <button
            onClick={() => setOpen(true)}
            style={{
              writingMode: 'vertical-rl',
              background: ally ? '#EAAA00' : 'rgba(234,170,0,0.55)',
              color: '#09073A',
              fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, system-ui, sans-serif',
              fontWeight: 700, fontSize: 10, letterSpacing: '0.16em',
              textTransform: 'uppercase', padding: '14px 7px',
              border: 'none', borderRadius: '8px 0 0 8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              userSelect: 'none' as const, boxShadow: '-2px 0 12px rgba(0,0,0,0.3)',
            }}
            aria-label={tabLabel}
          >
            <span style={{ fontSize: 14, lineHeight: 1, transform: 'rotate(180deg)', display: 'inline-block' }}>+</span>
            {tabLabel}
          </button>
        </div>
      )}

      {/* Chat dock */}
      <aside
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(360px, 92vw)',
          background: 'rgba(3,1,27,0.85)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 18px 48px rgba(3,1,27,0.55)',
          display: 'flex', flexDirection: 'column', zIndex: dockZIndex,
          transform: open ? 'none' : 'translateX(100%)',
          transition: 'transform 0.26s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-display)', fontSize: '0.78rem',
            background: '#EAAA00', color: '#09073A', flex: '0 0 auto',
          }}>
            {allyInitials}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{allyName}</div>
            <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.6)' }}>{allySubtitle}</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 0, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}
            aria-label="Collapse"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {!ally ? (
            <div style={{
              background: '#0A0D33', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '14px 14px', color: '#fff', fontSize: '0.88rem', lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#EAAA00' }}>No chat agent yet</div>
              <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.75)' }}>
                Open an Avatar in Enact and click <strong style={{ color: '#EAAA00' }}>Set as Chat Agent</strong>.
                Then come back here to chat while you work in Studio.
              </p>
              <button
                onClick={() => router.push('/agents')}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(234,170,0,0.35)',
                  background: 'rgba(234,170,0,0.12)', color: '#EAAA00', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Go to Avatars →
              </button>
            </div>
          ) : messages.map(m =>
            m.role === 'me' ? (
              <div key={m.id} style={{
                alignSelf: 'flex-end', maxWidth: '85%',
                background: '#EAAA00', color: '#09073A',
                borderRadius: 12, borderTopRightRadius: 4,
                padding: '11px 13px', fontSize: '0.88rem', lineHeight: 1.5, fontWeight: 500,
              }}>
                {m.text}
              </div>
            ) : (
              <div key={m.id} style={{
                alignSelf: 'flex-start', maxWidth: '85%',
                background: '#0A0D33', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', borderRadius: 12, borderTopLeftRadius: 4,
                padding: '11px 13px', fontSize: '0.88rem', lineHeight: 1.5,
              }}>
                {m.text ? (
                  <>
                    {renderMarkdown(m.text)}
                    {m.streaming && (
                      <span style={{ display: 'inline-block', width: 2, height: 14, background: '#EAAA00', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'wvBlink 0.6s step-end infinite' }} />
                    )}
                  </>
                ) : m.streaming ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 2px' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#EAAA00',
                        animation: `wvDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>…</span>
                )}
              </div>
            )
          )}
        </div>

        {/* Compose */}
        {ally && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about this page…"
            disabled={sending}
            style={{
              flex: 1, resize: 'none',
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#0A0D33', color: '#fff',
              borderRadius: 6, fontFamily: 'var(--font-sans)',
              fontSize: '0.88rem', padding: '8px 10px',
              maxHeight: 100, outline: 'none',
              opacity: sending ? 0.6 : 1,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#EAAA00')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            aria-label="Send"
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 0,
              background: sending || !input.trim() ? 'rgba(234,170,0,0.4)' : '#EAAA00',
              color: '#09073A',
              cursor: sending || !input.trim() ? 'default' : 'pointer',
              flex: '0 0 auto', display: 'grid', placeItems: 'center',
              transition: 'background 0.15s',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12l16-8-6 16-3-6-7-2z" />
            </svg>
          </button>
        </div>
        )}
      </aside>
    </>
  )
}
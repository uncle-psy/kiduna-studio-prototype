'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, Send, Mic, Plus, Menu, X, ChevronDown, Users,RotateCcw, Check, Zap, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useConnections } from '@/lib/connections-context'
import {
  fetchMyPresences,
  type MovementPresences,
  type PresenceInfo,
} from '@/lib/seek-api'
import { fetchTokenUsage } from '@/lib/usage-api'
import { tierLabel, monthlyTokenAllocation } from '@/lib/tier-utils'

const AGENTS_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

interface Agent {
  id: string; name: string; handle: string; type: string; status: string
  description?: string; tagline?: string; presenceSubtype?: string
  accessLevel: string; tone: string; isPublic: boolean; wallet?: string
  platformId?: string; parentId?: string; isPrimaryMember: boolean
  createdAt: string; updatedAt: string
  // Bot configuration — populated when the agent is an Ally with saved config
  promptId?: string        // Stance (system prompt template)
  knowledgeBaseIds?: string[] // Inform (connected knowledge bases)
  systemPrompt?: string    // Resolved system prompt content (Stance + Instruct)
}
interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; createdAt: string
}

function extractJSON(line: string): string | null {
  let s = line.trim()
  while (s.startsWith('data:')) s = s.slice(5).trim()
  return s.startsWith('{') ? s : null
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}
// ── Markdown renderer — same as AskDunaTab, no external deps ────────────────
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  function parseInline(line: string): React.ReactNode[] {
    const parts: React.ReactNode[] = []
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index))
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
            borderRadius: 4, fontSize: '0.87em', fontFamily: 'monospace',
          }}>
            {token.slice(1, -1)}
          </code>
        )
      }
      lastIndex = match.index + token.length
    }
    if (lastIndex < line.length) parts.push(line.slice(lastIndex))
    return parts
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 8 }} />)
      continue
    }
    const numMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (numMatch) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 8, marginLeft: 4, marginBottom: 3 }}>
          <span style={{ color: '#EAAA00', fontWeight: 700, minWidth: 20, textAlign: 'right', flexShrink: 0 }}>
            {numMatch[1]}.
          </span>
          <span style={{ lineHeight: 1.65 }}>{parseInline(numMatch[2])}</span>
        </div>
      )
      continue
    }
    if (line.match(/^-\s+/)) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 8, marginLeft: 4, marginBottom: 3 }}>
          <span style={{ color: '#EAAA00', fontWeight: 700, minWidth: 14, flexShrink: 0 }}>•</span>
          <span style={{ lineHeight: 1.65 }}>{parseInline(line.replace(/^-\s+/, ''))}</span>
        </div>
      )
      continue
    }
    elements.push(<div key={key++} style={{ lineHeight: 1.7, marginBottom: 2 }}>{parseInline(line)}</div>)
  }
  return <>{elements}</>
}

function presenceToAgent(p: PresenceInfo): Agent {
  return {
    id: p.id, name: p.name, handle: p.handle ?? '', type: 'PRESENCE',
    status: 'ACTIVE', description: p.description ?? undefined,
    tagline: p.tagline ?? undefined, presenceSubtype: p.presenceSubtype ?? undefined,
    accessLevel: 'PUBLIC', tone: 'FRIENDLY', isPublic: true,
    isPrimaryMember: false, createdAt: '', updatedAt: '',
  }
}

// ── User avatar (gold — stays gold, it's the user) ──────────────────────────
function UserAvatar({ name, size = 36 }: { name?: string; size?: number }) {
  const letter = name?.[0]?.toUpperCase() || 'Y'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#EAAA00', color: '#09073A',
      fontSize: 13, fontWeight: 700,
      flexShrink: 0, marginTop: 2,
      fontFamily: '"Avenir", system-ui, sans-serif',
    }}>
      {letter}
    </div>
  )
}

// ── Agent/assistant avatar — #09073A bg with gold border + gold text ────────
// Matches reference: dark navy circle, gold letter, gold ring
function AgentAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const letter = initials(name) || name[0]?.toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#09073A',                           /* ← dark navy, not gold */
      color: '#EAAA00',                                /* ← gold letter */
      fontSize: size <= 36 ? 13 : 14, fontWeight: 700,
      flexShrink: 0,
      fontFamily: '"Avenir", system-ui, sans-serif',
    }}>
      {letter}
    </div>
  )
}

// ── Sidebar chat-list avatar (gold — stays gold for list items) ─────────────
function ChatAvatar({ name, size = 38 }: { name: string; size?: number }) {
  const letter = initials(name) || name[0]?.toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#EAAA00', color: '#09073A',
      fontSize: 13, fontWeight: 700,
      flexShrink: 0, userSelect: 'none',
      fontFamily: '"Avenir", system-ui, sans-serif',
    }}>
      {letter}
    </div>
  )
}

type ModelOption = 'Auto' | 'GPT' | 'Claude' | 'Llama (on-prem)'
const MODEL_OPTIONS: { value: ModelOption; tag?: string }[] = [
  { value: 'Auto',          tag: 'recommended' },
  { value: 'GPT'                               },
  { value: 'Claude'                            },
  { value: 'Llama (on-prem)'                  },
]

function ModelSelector() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ModelOption>('Auto')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 6, padding: '5px 10px',
        fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
        cursor: 'pointer', fontFamily: '"Avenir", system-ui, sans-serif', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.22)'}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.10)'}
      >
        {selected}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
          minWidth: 220, background: '#0E0C3A',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(3,1,27,0.65)', padding: '10px 8px 8px',
          animation: 'wvDropIn 0.13s ease-out',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', padding: '0 10px 8px' }}>Model</div>
          {MODEL_OPTIONS.map(opt => {
            const active = opt.value === selected
            return (
              <button key={opt.value}
                onClick={() => { setSelected(opt.value); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 10px', border: 'none', borderRadius: 8,
                  background: 'transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                  fontFamily: '"Avenir", system-ui, sans-serif',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 15, fontWeight: 500, color: '#FFFFFF' }}>{opt.value}</span>
                {opt.tag && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 400 }}>{opt.tag}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AvatarDropdown({ presences, selectedId, onSelect }: {
  presences: PresenceInfo[]; selectedId: string | null; onSelect: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const isAll = selectedId === null
  const selectedName = isAll ? 'All' : (presences.find(p => p.id === selectedId)?.name ?? presences[0].name)
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', marginTop: 2 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 6, padding: '3px 8px',
        fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
        cursor: 'pointer', fontFamily: '"Avenir", system-ui, sans-serif', maxWidth: 140,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedName}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          minWidth: 164, background: '#0A0D33',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
          boxShadow: '0 6px 20px rgba(3,1,27,0.55)', padding: 4,
          animation: 'wvDropIn 0.12s ease-out',
        }}>
          <button onClick={() => { onSelect(null); setOpen(false) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 'none', borderRadius: 6, background: isAll ? 'rgba(234,170,0,0.10)' : 'transparent', cursor: 'pointer', fontFamily: '"Avenir", system-ui, sans-serif', transition: 'background 0.12s' }}
            onMouseEnter={e => { if (!isAll) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { if (!isAll) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
            <span style={{ fontSize: 12, fontWeight: isAll ? 700 : 500, color: isAll ? '#EAAA00' : '#fff', flex: 1, textAlign: 'left' }}>All</span>
            {isAll && <Check size={12} style={{ color: '#EAAA00' }} />}
          </button>
          <div style={{ margin: '2px 8px', height: 1, background: 'rgba(255,255,255,0.06)' }} />
          {presences.map(p => {
            const isSel = selectedId === p.id
            return (
              <button key={p.id} onClick={() => { onSelect(p.id); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 'none', borderRadius: 6, background: isSel ? 'rgba(234,170,0,0.10)' : 'transparent', cursor: 'pointer', fontFamily: '"Avenir", system-ui, sans-serif', transition: 'background 0.12s' }}
                onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: isSel ? '#EAAA00' : 'rgba(255,255,255,0.06)', color: isSel ? '#09073A' : 'rgba(255,255,255,0.7)' }}>{p.name[0]?.toUpperCase() ?? '?'}</div>
                <span style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: isSel ? '#EAAA00' : '#fff', flex: 1, textAlign: 'left' }}>{p.name}</span>
                {isSel && <Check size={12} style={{ color: '#EAAA00' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', opacity: 0.5 - i * 0.1, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 10, width: '55%', borderRadius: 3, background: 'rgba(255,255,255,0.07)', marginBottom: 7 }} />
            <div style={{ height: 9, width: '78%', borderRadius: 3, background: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Token / membership — UI ONLY. Mock data, no API, no real billing/metering.
// ─────────────────────────────────────────────────────────────────────────
// Live token usage — `used`/`total` come from the agent backend
// (GET /api/usage/{wallet}); `tier` is the display label. `total` is the
// membership's monthly allocation. See lib/usage-api.ts + lib/tier-utils.ts.
interface TokenUsage { tier: string; used: number; total: number }

interface PlanRow { name: string; price: string; tokens: string; msgs: string; current?: boolean; highlight?: boolean }
const MEMBERSHIP_PLANS: PlanRow[] = [
  { name: 'Guest',    price: 'Free',       tokens: '0',    msgs: 'No AI access' },
  { name: 'Member',   price: '$10',        tokens: '1M',   msgs: '~200 messages',    current: true },
  { name: 'Founder',  price: '$100',       tokens: '3M',   msgs: '~600 messages',    highlight: true },
  { name: 'Builder',  price: '$1,000',     tokens: '10M',  msgs: '~2,000 messages' },
  { name: 'Sponsor',  price: '$10,000',    tokens: '32M',  msgs: '~6,400 messages' },
  { name: 'Catalyst', price: '$100,000',   tokens: '100M', msgs: '~20,000 messages' },
  { name: 'Luminary', price: '$1,000,000', tokens: '320M', msgs: '~64,000 messages' },
]

interface PackRow { name: string; price: string; tokens: string; rate: string; bonus?: string; highlight?: boolean }
const TOPUP_PACKS: PackRow[] = [
  { name: 'Mini',     price: '$5',   tokens: '500K',  rate: '$10.00 / 1M' },
  { name: 'Standard', price: '$10',  tokens: '1M',    rate: '$10.00 / 1M' },
  { name: 'Plus',     price: '$25',  tokens: '2.75M', rate: '$9.09 / 1M', bonus: '+10%', highlight: true },
  { name: 'Pro',      price: '$50',  tokens: '6M',    rate: '$8.33 / 1M', bonus: '+20%' },
  { name: 'Max',      price: '$100', tokens: '13M',   rate: '$7.69 / 1M', bonus: '+30%' },
]

// Top-up pack cards shown in the low-token banner's modal (UI only — static/mock)
// Listed in ascending price order; only the $10 pack is flagged "Most Popular".
interface TopupPack { tokens: string; price: string; highlight?: boolean }
const TOPUP_PACK_OPTIONS: TopupPack[] = [
  { tokens: '2M',  price: '$5'                    },
  { tokens: '5M',  price: '$10', highlight: true  },
  { tokens: '15M', price: '$25'                   },
  { tokens: '35M', price: '$50'                   },
  { tokens: '80M', price: '$100'                  },
]

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return `${n}`
}

// ── Always-on token usage card — sits in the chat header, opens the plans modal.
// Premium SaaS-style meter: used / total tokens with a slim progress bar. ──
function TokenMeter({ usage, onClick }: { usage: TokenUsage; onClick: () => void }) {
  const remaining = Math.max(0, usage.total - usage.used)
  const pct = usage.total > 0 ? Math.min(100, Math.round((usage.used / usage.total) * 100)) : 100
  return (
    <button onClick={onClick} title={`${formatTokens(remaining)} tokens left this month`}
      className="wv-token-meter"
      style={{
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch',
        background: '#0A0D33', border: '1px solid rgba(234,170,0,0.35)',
        borderRadius: 10, padding: '8px 13px', cursor: 'pointer', minWidth: 152, flexShrink: 0,
        fontFamily: '"Avenir", system-ui, sans-serif',
        boxShadow: '0 2px 12px rgba(3,1,27,0.35)', transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{formatTokens(usage.used)}</span>
        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)' }}>/ {formatTokens(usage.total)}</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.42)', marginLeft: 1 }}>Tokens</span>
      </div>
      <div style={{ width: '100%', height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.09)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#EAAA00', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </button>
  )
}

// ── Plans & top-up popup — opened by the meter or the warning banner ────────
function PlansModal({ open, onClose, usage }: { open: boolean; onClose: () => void; usage: TokenUsage }) {
  const [tab, setTab] = useState<'plans' | 'topup'>('plans')
  if (!open) return null
  const remaining = Math.max(0, usage.total - usage.used)
  const pct = usage.total > 0 ? Math.min(100, Math.round((usage.used / usage.total) * 100)) : 100
  const low = pct >= 80
  const empty = remaining <= 0
  const accent = empty ? '#FF5A5F' : low ? '#FFC229' : '#EAAA00'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)' }} />
      <div className="wv-scroll" style={{
        position: 'relative', width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto',
        borderRadius: 18, background: '#0D1140', border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 24px 80px rgba(3,1,27,0.7)', fontFamily: '"Avenir", system-ui, sans-serif',
      }}>
        {/* Header + live usage summary */}
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(135deg, rgba(234,170,0,0.14) 0%, transparent 62%)', position: 'sticky', top: 0, backdropFilter: 'blur(8px)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h3 style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400, fontSize: 20, color: '#fff', margin: 0 }}>Plans &amp; Tokens</h3>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>You&apos;re on the <strong style={{ color: accent }}>{usage.tier}</strong> plan</p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                <strong style={{ color: '#fff', fontSize: 15 }}>{formatTokens(remaining)}</strong> tokens left this month
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{formatTokens(usage.used)} / {formatTokens(usage.total)} used</span>
            </div>
            <div style={{ width: '100%', height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: accent, borderRadius: 4 }} />
            </div>
            {low && (
              <p style={{ fontSize: 11.5, color: accent, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={12} />
                {empty ? 'You’re out of tokens — upgrade or top up to keep chatting.' : 'Running low — upgrade your plan or grab a top-up pack.'}
              </p>
            )}
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {(['plans', 'topup'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                fontSize: 12.5, fontWeight: 700, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${tab === t ? 'rgba(234,170,0,0.45)' : 'rgba(255,255,255,0.10)'}`,
                background: tab === t ? 'rgba(234,170,0,0.12)' : 'transparent',
                color: tab === t ? '#EAAA00' : 'rgba(255,255,255,0.5)', fontFamily: '"Avenir", system-ui, sans-serif',
              }}>
                {t === 'plans' ? 'Membership Plans' : 'Top-up Packs'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 26px 6px' }}>
          {tab === 'plans' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {MEMBERSHIP_PLANS.map(p => (
                <div key={p.name} style={{
                  borderRadius: 12, padding: '16px 16px 14px', position: 'relative',
                  background: p.current ? 'rgba(234,170,0,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${p.current ? 'rgba(234,170,0,0.45)' : p.highlight ? 'rgba(0,235,117,0.30)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  {p.current && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#09073A', background: '#EAAA00', padding: '2px 7px', borderRadius: 9999 }}>Current</span>}
                  {!p.current && p.highlight && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#00EB75', background: 'rgba(0,235,117,0.12)', padding: '2px 7px', borderRadius: 9999 }}>Popular</span>}
                  <div style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontSize: 16, color: '#fff', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 }}>{p.price}<span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>{p.price !== 'Free' ? ' one-time' : ''}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Zap size={12} style={{ color: '#EAAA00' }} fill="#EAAA00" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#EAAA00' }}>{p.tokens}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>/ mo</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>{p.msgs}</div>
                  <button disabled={p.current} style={{
                    width: '100%', fontSize: 12.5, fontWeight: 700, padding: '9px', borderRadius: 8, border: 'none',
                    cursor: p.current ? 'default' : 'pointer',
                    background: p.current ? 'rgba(255,255,255,0.06)' : '#EAAA00',
                    color: p.current ? 'rgba(255,255,255,0.35)' : '#09073A',
                  }}>
                    {p.current ? 'Current plan' : p.name === 'Guest' ? 'Downgrade' : 'Upgrade'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(178px, 1fr))', gap: 12 }}>
              {TOPUP_PACKS.map(p => (
                <div key={p.name} style={{
                  borderRadius: 12, padding: '16px', position: 'relative',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${p.highlight ? 'rgba(234,170,0,0.40)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  {p.bonus && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 800, color: '#00EB75', background: 'rgba(0,235,117,0.12)', padding: '2px 7px', borderRadius: 9999 }}>{p.bonus}</span>}
                  <div style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontSize: 16, color: '#fff', marginBottom: 8 }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Zap size={13} style={{ color: '#EAAA00' }} fill="#EAAA00" />
                    <span style={{ fontSize: 17, fontWeight: 800, color: '#EAAA00' }}>{p.tokens}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>{p.rate}</div>
                  <button style={{ width: '100%', fontSize: 13, fontWeight: 800, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#FFC229', color: '#09073A' }}>
                    Buy {p.price}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 26px 22px', textAlign: 'center' }}>
          <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', margin: 0 }}>UI preview — billing &amp; token metering not yet connected</p>
        </div>
      </div>
    </div>
  )
}

// ── Top-up Packs modal — opened by the low-token banner (UI only, static data)
// Shows ONLY top-up pack cards: no membership plans, current plan, progress bar,
// usage summary or upgrade cards.
function TopupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(5px)', animation: 'wvFadeIn 0.2s ease-out both' }} />
      <div className="wv-scroll" style={{
        position: 'relative', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto',
        borderRadius: 20, background: '#0B0E38', border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 28px 90px rgba(3,1,27,0.72)', fontFamily: '"Avenir", system-ui, sans-serif',
        animation: 'wvModalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Header + divider */}
        <div style={{ padding: '26px 30px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h3 style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400, fontSize: 23, color: '#fff', margin: 0, letterSpacing: '0.01em' }}>Top-up Packs</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0', lineHeight: 1.5 }}>Purchase additional tokens to continue chatting without interruption.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="wv-modal-close" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Body — vertical flow with generous spacing */}
        <div style={{ padding: '24px 30px 6px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Information card */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '16px 18px', borderRadius: 14, background: '#0A0D33', border: '1px solid rgba(234,170,0,0.38)' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(234,170,0,0.13)', border: '1px solid rgba(234,170,0,0.32)' }}>
              <AlertTriangle size={18} style={{ color: '#EAAA00' }} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Your monthly token balance is running low.</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>Purchase a top-up pack to continue using your AI assistant without interruption.</div>
            </div>
          </div>

          {/* Top-up pack cards — stacked vertically */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {TOPUP_PACK_OPTIONS.map(p => (
              <div key={p.tokens} className="wv-topup-card" style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
                padding: '22px 24px', borderRadius: 16,
                background: p.highlight ? 'rgba(234,170,0,0.055)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${p.highlight ? 'rgba(234,170,0,0.45)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: p.highlight ? '0 10px 34px rgba(234,170,0,0.10)' : '0 4px 18px rgba(3,1,27,0.32)',
              }}>
                {/* Left — icon + token amount + description */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, flex: 1, minWidth: 200 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(234,170,0,0.12)', border: '1px solid rgba(234,170,0,0.28)' }}>
                    <Zap size={21} style={{ color: '#EAAA00' }} fill="#EAAA00" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{p.tokens} tokens</span>
                      {p.highlight && (
                        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#09073A', background: '#EAAA00', padding: '3px 9px', borderRadius: 9999, whiteSpace: 'nowrap' }}>Most Popular</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>Instant token credit</div>
                  </div>
                </div>

                {/* Center — price + label */}
                <div style={{ textAlign: 'right', minWidth: 96 }}>
                  <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>{p.price}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>One-time purchase</div>
                </div>

                {/* Right — Buy Now */}
                <button className="wv-topup-btn" style={{ flexShrink: 0, padding: '11px 24px', borderRadius: 11, border: 'none', cursor: 'pointer', background: '#FFC229', color: '#09073A', fontSize: 13, fontWeight: 800, transition: 'background 0.15s, transform 0.15s' }}>
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div style={{ padding: '20px 30px 26px', textAlign: 'center' }}>
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.5 }}>Top-up packs are added instantly to your available monthly token balance.</p>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { user } = useAuth()
  const { connectedMembers, loading: connectionsLoading, refresh: refreshConnections } = useConnections()

  const [movements, setMovements] = useState<MovementPresences[]>([])
  const [movementsLoading, setMovementsLoading] = useState(true)
  const [listError, setListError] = useState(false)
  const [search, setSearch] = useState('')
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [activeMovement, setActiveMovement] = useState<MovementPresences | null>(null)
  const [selectedPresenceId, setSelectedPresenceId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Token/plans popup
  const [showPlans, setShowPlans] = useState(false)
  // Top-up packs popup, opened from the low-token banner above the input
  const [showTopup, setShowTopup] = useState(false)
  // Live monthly token usage (fetched from the agent backend)
  const [usage, setUsage] = useState<TokenUsage | null>(null)
  // Holds the resolved bot config (Stance system prompt) for the active agent
  const [botSystemPrompt, setBotSystemPrompt] = useState<string | null>(null)

  // ── Member tool mapping (connected users pick their own Google account) ──
  const [showToolPicker, setShowToolPicker] = useState(false)
  const [toolMappingChecked, setToolMappingChecked] = useState(false)
  const [hasToolMapping, setHasToolMapping] = useState(false)
  const [userGoogleAccounts, setUserGoogleAccounts] = useState<any[]>([])
  const [selectedToolAccount, setSelectedToolAccount] = useState('')
  const [toolPickerSaving, setToolPickerSaving] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const accumulatedRef = useRef('')

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamingContent])

  // ── Token usage — fetch the wallet's monthly consumption + allocation.
  // Falls back to a tier-derived allocation if the backend is unreachable.
  const refreshUsage = useCallback(async () => {
    if (!user?.wallet) { setUsage(null); return }
    const summary = await fetchTokenUsage(user.wallet)
    if (summary) {
      setUsage({ tier: tierLabel(summary.tier), used: summary.used, total: summary.total })
    } else {
      setUsage({ tier: tierLabel(user.subscription), used: 0, total: monthlyTokenAllocation(user.subscription) })
    }
  }, [user?.wallet, user?.subscription])

  useEffect(() => { refreshUsage() }, [refreshUsage])

  const loadMovements = useCallback(async () => {
    if (!user?.wallet) { setMovements([]); setMovementsLoading(false); return }
    setMovementsLoading(true); setListError(false)
    try { setMovements(await fetchMyPresences(user.wallet)) }
    catch { setListError(true) }
    finally { setMovementsLoading(false) }
  }, [user?.wallet])

  useEffect(() => { loadMovements() }, [loadMovements])

  useEffect(() => {
    if (activeAgent) return
    // Try to restore the last active chat from localStorage
    let restored = false
    try {
      const saved = localStorage.getItem('kinship_active_chat')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.type === 'member' && parsed.agentId) {
          const member = (connectedMembers as Agent[]).find(a => a.id === parsed.agentId)
          if (member) { setActiveAgent(member); setActiveMovement(null); setSelectedPresenceId(null); restored = true }
        } else if (parsed.type === 'movement' && parsed.contextId) {
          const mov = movements.find(m => m.contextId === parsed.contextId && m.presences.length > 0)
          if (mov) {
            const pres = parsed.presenceId ? mov.presences.find(p => p.id === parsed.presenceId) : null
            setActiveAgent(presenceToAgent(pres || mov.presences[0])); setActiveMovement(mov); setSelectedPresenceId(pres ? pres.id : null); restored = true
          }
        }
      }
    } catch {}
    if (restored) return
    // Fallback: pick the first available
    if (connectedMembers.length > 0) {
      setActiveAgent(connectedMembers[0] as Agent); setActiveMovement(null); setSelectedPresenceId(null); return
    }
    const first = movements.find(m => m.presences.length > 0)
    if (first) { setActiveAgent(presenceToAgent(first.presences[0])); setActiveMovement(first); setSelectedPresenceId(null) }
  }, [connectedMembers, movements, activeAgent])

  const fetchHistory = useCallback(async (presenceId: string) => {
    if (!user?.wallet) return
    setLoadingHistory(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`${AGENTS_API_URL}/api/conversations/${presenceId}/${user.wallet}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 404) { setMessages([]); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessages((data.messages || []).map((m: any) => ({
        id: m.id || `msg_${Date.now()}_${Math.random()}`,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content ?? '',
        createdAt: m.timestamp ?? new Date().toISOString(),
      })))
    } catch { setMessages([]) }
    finally { setLoadingHistory(false) }
  }, [user?.wallet])

  useEffect(() => { if (activeAgent) fetchHistory(activeAgent.id) }, [activeAgent, fetchHistory])

  /**
   * loadBotConfig — fetches the full agent record from the backend whenever
   * the active agent changes, then resolves:
   *   1. Stance  → the prompt content stored at agent.promptId
   *   2. Inform  → knowledge base IDs (passed to the backend via knowledgeBaseIds)
   *   3. Instruct / description → appended to the system prompt
   *
   * The resulting system prompt string is stored in `botSystemPrompt` and
   * injected into every subsequent stream request for this agent.
   */
  const loadBotConfig = useCallback(async (agent: Agent) => {
    setBotSystemPrompt(null)
    try {
      // 1. Fetch the full agent record (includes promptId, knowledgeBaseIds, description)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const agentRes = await fetch(`${AGENTS_API_URL}/api/agents/${agent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!agentRes.ok) return
      // Backend may return { agent: {...} } or the object directly
      const agentData = await agentRes.json()
      const fullAgent: Record<string, unknown> = agentData.agent ?? agentData

      const promptId = fullAgent.promptId ?? fullAgent.prompt_id
      const description = (fullAgent.description as string | undefined) ?? ''
      const kbIds = (fullAgent.knowledgeBaseIds ?? fullAgent.knowledge_base_ids ?? []) as string[]

      let systemPrompt = ''

      // 2. Resolve the Stance: fetch the prompt content by promptId
      if (promptId) {
        const promptRes = await fetch(`${AGENTS_API_URL}/api/prompts/${promptId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (promptRes.ok) {
          const promptData = await promptRes.json()
          const content = (promptData.content ?? promptData.prompt?.content ?? '') as string
          if (content) systemPrompt += content
        }
      }

      // 3. Append the agent description as instructional context (Instruct layer)
      if (description && description.trim()) {
        systemPrompt += systemPrompt ? `\n\n${description.trim()}` : description.trim()
      }

      // 4. Store resolved knowledgeBaseIds on the agent object for the stream call
      agent.knowledgeBaseIds = kbIds

      if (systemPrompt.trim()) {
        setBotSystemPrompt(systemPrompt.trim())
      }
    } catch { /* non-fatal — bot will use default behaviour */ }
  }, [])

  useEffect(() => {
    if (activeAgent) loadBotConfig(activeAgent)
  }, [activeAgent, loadBotConfig])

  // ── Check tool mapping for connected users on exec avatars ──
  useEffect(() => {
    if (!activeAgent || !user?.wallet) { setToolMappingChecked(false); return }
    // Only check if user is NOT the owner
    if (activeAgent.wallet === user.wallet) { setToolMappingChecked(true); setHasToolMapping(true); return }
    // Check for exec avatar template (try multiple field names + fallback to description)
    const tplIds = (activeAgent as any).templateIds || (activeAgent as any).template_ids || []
    const isExec = tplIds.includes('platform_executive_avatar')
      || (activeAgent.description || '').toLowerCase().includes('executive assistant')
      || (activeAgent.tagline || '').toLowerCase().includes('managing')
    console.log('[ToolMapping] Agent:', activeAgent.name, 'templateIds:', tplIds, 'isExec:', isExec, 'owner:', activeAgent.wallet, 'user:', user.wallet)
    if (!isExec) { setToolMappingChecked(true); setHasToolMapping(true); return }

    const checkMapping = async () => {
      try {
        // Check if user already has a tool mapping
        const mappingUrl = `${AGENTS_API_URL}/api/agents/members/${activeAgent.id}/tool-mapping?wallet=${encodeURIComponent(user.wallet)}`
        console.log('[ToolMapping] Checking mapping:', mappingUrl)
        const res = await fetch(mappingUrl)
        console.log('[ToolMapping] Mapping response status:', res.status)
        if (res.ok) {
          const data = await res.json()
          console.log('[ToolMapping] Mapping data:', data)
          if (data.mappings && data.mappings.length > 0) {
            setHasToolMapping(true); setToolMappingChecked(true); return
          }
        }
        // No mapping — load user's Google accounts for picker
        const toolsUrl = `${AGENTS_API_URL}/api/tools/saved?wallet=${encodeURIComponent(user.wallet)}`
        console.log('[ToolMapping] Loading user tools:', toolsUrl)
        const toolsRes = await fetch(toolsUrl)
        if (toolsRes.ok) {
          const toolsData = await toolsRes.json()
          const googleAccounts = (toolsData.tools || []).filter((t: any) => t.tool_name === 'google')
          console.log('[ToolMapping] Google accounts found:', googleAccounts.length, googleAccounts.map((a: any) => a.external_handle))
          setUserGoogleAccounts(googleAccounts)
          if (googleAccounts.length === 0) {
            setHasToolMapping(false); setToolMappingChecked(true)
          } else if (googleAccounts.length === 1) {
            console.log('[ToolMapping] Auto-selecting single account:', googleAccounts[0].id)
            await saveToolMapping(activeAgent.id, user.wallet, googleAccounts[0].id)
            setHasToolMapping(true); setToolMappingChecked(true)
          } else {
            console.log('[ToolMapping] Multiple accounts — showing picker')
            setShowToolPicker(true); setToolMappingChecked(true)
          }
        } else {
          console.log('[ToolMapping] Tools fetch failed:', toolsRes.status)
          setToolMappingChecked(true)
        }
      } catch (err) {
        console.error('[ToolMapping] Error:', err)
        setToolMappingChecked(true)
      }
    }
    checkMapping()
  }, [activeAgent?.id, user?.wallet])

  const saveToolMapping = async (agentId: string, wallet: string, gtaId: string) => {
    try {
      await fetch(`${AGENTS_API_URL}/api/agents/members/${agentId}/tool-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, gta_id: gtaId, tool_name: 'google' }),
      })
    } catch { /* best effort */ }
  }

  const handleToolPickerConfirm = async () => {
    if (!selectedToolAccount || !activeAgent || !user?.wallet) return
    setToolPickerSaving(true)
    await saveToolMapping(activeAgent.id, user.wallet, selectedToolAccount)
    setHasToolMapping(true); setShowToolPicker(false); setToolPickerSaving(false)
  }

  const handlePresenceSelect = useCallback((presenceId: string | null) => {
    if (!activeMovement) return
    setSelectedPresenceId(presenceId)
    const target = presenceId === null ? activeMovement.presences[0]
      : activeMovement.presences.find(p => p.id === presenceId) ?? activeMovement.presences[0]
    if (target) {
      setActiveAgent(presenceToAgent(target))
      try { localStorage.setItem('kinship_active_chat', JSON.stringify({ type: 'movement', contextId: activeMovement.contextId, presenceId: target.id })) } catch {}
    }
  }, [activeMovement])

  const sendMessage = async () => {
    if (!message.trim() || !activeAgent || sending) return
    const content = message.trim()
    setMessage(''); setSending(true); setStreamingContent(''); accumulatedRef.current = ''
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    setMessages(prev => [...prev, { id: `user_${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() }])
    try {
      const res = await fetch(`${AGENTS_API_URL}/api/chatmessages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          presenceId: activeAgent.id,
          message: content,
          userId: user?.id || 'anonymous',
          userWallet: user?.wallet || 'anonymous',
          // Inject bot configuration so the backend uses the saved Stance/Inform/Instruct
          ...(botSystemPrompt ? { systemPrompt: botSystemPrompt } : {}),
          ...(activeAgent.knowledgeBaseIds?.length ? { knowledgeBaseIds: activeAgent.knowledgeBaseIds } : {}),
        }),
      })
      // Monthly token limit reached — server rejects before streaming.
      if (res.status === 402) {
        let limitUsage: { tier?: string; used?: number; total?: number } | null = null
        try { const j = await res.json(); limitUsage = j?.detail?.usage ?? null } catch { /* ignore */ }
        if (limitUsage && typeof limitUsage.total === 'number' && typeof limitUsage.used === 'number') {
          setUsage({ tier: tierLabel(limitUsage.tier), used: limitUsage.used, total: limitUsage.total })
        } else {
          refreshUsage()
        }
        setStreamingContent('')
        setMessages(prev => [...prev, { id: `limit_${Date.now()}`, role: 'assistant', content: 'You’ve reached your monthly token limit. Purchase a top-up pack to keep chatting.', createdAt: new Date().toISOString() }])
        return
      }
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const text = await res.text()
      let finalResponse = ''
      let doneUsage: { totalTokens?: number } | null = null
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        const jsonStr = extractJSON(line)
        if (!jsonStr) continue
        try {
          const evt = JSON.parse(jsonStr)
          if (evt.event === 'token' && evt.token) { accumulatedRef.current += evt.token; setStreamingContent(accumulatedRef.current) }
          else if (evt.event === 'done') { finalResponse = evt.fullResponse || accumulatedRef.current; if (evt.usage) doneUsage = evt.usage }
        } catch { /* skip */ }
      }
      if (!finalResponse) finalResponse = accumulatedRef.current
      setStreamingContent('')
      if (finalResponse) setMessages(prev => [...prev, { id: `assistant_${Date.now()}`, role: 'assistant', content: finalResponse, createdAt: new Date().toISOString() }])

      // Deduct this request's tokens: optimistic update now, then reconcile
      // with the server (which records usage once the stream fully closes).
      const spent = doneUsage?.totalTokens ?? 0
      if (spent > 0) setUsage(prev => prev ? { ...prev, used: prev.used + spent } : prev)
      setTimeout(() => { refreshUsage() }, 1200)
    } catch {
      setStreamingContent('')
      setMessages(prev => [...prev, { id: `error_${Date.now()}`, role: 'assistant', content: 'Something went wrong. Please try again.', createdAt: new Date().toISOString() }])
    } finally { setSending(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const refreshList = () => { refreshConnections(); loadMovements() }

  const openMovement = (m: MovementPresences) => {
    if (m.presences.length === 0) return
    setActiveMovement(m); setSelectedPresenceId(null); setActiveAgent(presenceToAgent(m.presences[0])); setSidebarOpen(false)
    try { localStorage.setItem('kinship_active_chat', JSON.stringify({ type: 'movement', contextId: m.contextId, presenceId: m.presences[0].id })) } catch {}
  }
  const openMember = (agent: Agent) => {
    setActiveAgent(agent); setActiveMovement(null); setSelectedPresenceId(null); setSidebarOpen(false)
    try { localStorage.setItem('kinship_active_chat', JSON.stringify({ type: 'member', agentId: agent.id })) } catch {}
  }

  const q = search.toLowerCase()
  const filteredMembers = (connectedMembers as Agent[]).filter(a => !q || a.name.toLowerCase().includes(q) || a.handle.toLowerCase().includes(q) || (a.tagline || '').toLowerCase().includes(q))
  const filteredMovements = movements.filter(m => !q || m.contextName.toLowerCase().includes(q) || m.presences.some(p => p.name.toLowerCase().includes(q) || (p.handle || '').toLowerCase().includes(q)))
  const listLoading = connectionsLoading || movementsLoading
  const listEmpty = !listLoading && !listError && filteredMembers.length === 0 && filteredMovements.length === 0
  // ── Derived token state (drives the meter, banner, and hard input gate) ──
  const tokenTotal = usage?.total ?? 0
  const tokenUsed = usage?.used ?? 0
  const tokenRemaining = Math.max(0, tokenTotal - tokenUsed)
  const tokenExhausted = usage != null && tokenRemaining <= 0
  const tokenLow = usage != null && (tokenTotal > 0 ? tokenUsed / tokenTotal >= 0.8 : true)

  const canSend = !sending && message.trim().length > 0 && !tokenExhausted
  const showDropdown = activeMovement !== null && activeMovement.presences.length > 1

  const sidebarPanel = (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#03011B', borderRight: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <span style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontSize: 18, fontWeight: 400, color: 'white', lineHeight: 1 }}>Chat</span>
        <button onClick={refreshList} style={{
          width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)',
          border: 'none', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'white'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
        >
         <Plus size={16} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.10)', position: 'relative' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"
          style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0A0D33', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 6, padding: '9px 12px 9px 36px',
            fontSize: 13, color: '#ffffff', outline: 'none', transition: 'border 0.15s',
            fontFamily: '"Avenir", system-ui, sans-serif',
          }}
          onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#EAAA00'}
          onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.10)'}
        />
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {listLoading ? <SkeletonRows /> : listError ? (
          <div style={{ padding: '24px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>Couldn&apos;t load chats</p>
            <button onClick={refreshList} style={{ fontSize: 11.5, fontWeight: 700, color: '#EAAA00', background: 'rgba(234,170,0,0.08)', border: '1px solid rgba(234,170,0,0.25)', borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>Retry</button>
          </div>
        ) : listEmpty ? (
          <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            {search ? 'No results.' : 'No chats yet. Join a movement in Seek.'}
          </div>
        ) : (
          <>
            {filteredMembers.map(agent => {
              const isActive = activeAgent?.id === agent.id && !activeMovement
              return (
                <div key={`m_${agent.id}`} onClick={() => openMember(agent)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer',
                    background: isActive ? 'rgba(28,18,4,0.92)' : 'transparent',
                    borderLeft: isActive ? '2px solid #EAAA00' : '2px solid transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <ChatAvatar name={agent.name} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(() => { const t = agent.tagline || agent.description || "Your Host's Ally"; return t.length > 40 ? t.slice(0, 40) + "…" : t; })()}
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredMovements.map(m => {
              const isActive = activeMovement?.contextId === m.contextId
              const count = m.presences.length
              return (
                <div key={`mv_${m.contextId}`} onClick={() => openMovement(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer',
                    background: isActive ? 'rgba(28,18,4,0.92)' : 'transparent',
                    borderLeft: isActive ? '2px solid #EAAA00' : '2px solid transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <ChatAvatar name={m.contextName} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.contextName}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={10} />
                      {count === 1 ? m.presences[0].name : `${count} avatars available`}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes wvDropIn { from { opacity:0; transform:translateY(-4px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes wvDot { 0%,60%,100% { transform:translateY(0); opacity:.35 } 30% { transform:translateY(-4px); opacity:1 } }
        @keyframes wvBlink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes wvAlertIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes wvFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes wvModalIn { from { opacity:0; transform:translateY(8px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        .wv-token-alert { transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease }
        .wv-token-alert:hover { transform: translateY(-1px); border-color: rgba(234,170,0,0.75); box-shadow: 0 10px 32px rgba(234,170,0,0.14) }
        .wv-topup-btn:hover { background:#FFC229 !important; transform: translateY(-1px) }
        .wv-topup-card { transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease }
        .wv-topup-card:hover { transform: translateY(-2px); border-color: rgba(234,170,0,0.5); box-shadow: 0 12px 34px rgba(3,1,27,0.5) }
        .wv-modal-close { transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease }
        .wv-modal-close:hover { background: rgba(255,255,255,0.12) !important; color: #fff !important; border-color: rgba(255,255,255,0.18) !important }
        .wv-token-meter:hover { border-color: rgba(234,170,0,0.6) !important; box-shadow: 0 4px 16px rgba(234,170,0,0.12) !important }
        @media (max-width:560px) { .wv-token-alert-desc { display:none } }
        .wv-scroll::-webkit-scrollbar { width:4px }
        .wv-scroll::-webkit-scrollbar-track { background:transparent }
        .wv-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px }
        .wv-chat-sidebar { display:flex!important; }
        @media (max-width:768px) { .wv-chat-sidebar { display:none!important; } .wv-mobile-btn { display:flex!important; } }
        input::placeholder { color:rgba(255,255,255,0.45)!important }
      `}</style>

      <div style={{
        display: 'flex', height: '100%', width: '100%', minHeight: 0,
        fontFamily: '"Avenir", "Avenir Next", system-ui, sans-serif',
        color: '#FFFFFF', overflow: 'hidden', background: '#03011B',
      }}>

        {/* Sidebar */}
        <div className="wv-chat-sidebar" style={{ width: 319, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {sidebarPanel}
        </div>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <>
            <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(3,1,27,0.72)', backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'fixed', inset: '0 auto 0 0', zIndex: 50, width: 280, display: 'flex', flexDirection: 'column' }}>{sidebarPanel}</div>
          </>
        )}

        {/* Main chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: '#03011B' }}>

          {/* Chat header */}
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#03011B', flexShrink: 0,
          }}>
            <button className="wv-mobile-btn" onClick={() => setSidebarOpen(true)} style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>
              <Menu size={15} />
            </button>

            {activeAgent ? (
              <>
                {/* Header agent avatar — also uses AgentAvatar style (#09073A + gold border) */}
                <AgentAvatar name={activeAgent.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontSize: 14, fontWeight: 400, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeAgent.name}
                  </div>
                  {showDropdown ? (
                    <AvatarDropdown presences={activeMovement!.presences} selectedId={selectedPresenceId} onSelect={handlePresenceSelect} />
                  ) : (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, maxWidth: 320 }}>
                      {(() => { const t = activeAgent.tagline || activeAgent.description || "Your Host's Ally · WV DUNA"; return t.length > 60 ? t.slice(0, 60) + "…" : t; })()}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>Select a chat</div>
            )}
            {/* Right cluster — token usage card, then the model selector (Token Usage | Auto ▼) */}
            {usage && <TokenMeter usage={usage} onClick={() => setShowPlans(true)} />}
            {activeAgent && <ModelSelector />}
          </div>

          {/* Messages */}
          <div className="wv-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: '#03011B' }}>
            <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '32px clamp(24px, 6%, 80px) 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {!activeAgent ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(234,170,0,0.08)', border: '1px solid rgba(234,170,0,0.18)', fontSize: 20 }}>✦</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', maxWidth: 260, lineHeight: 1.6, margin: 0 }}>Connect a member or join a movement in Seek to start chatting.</p>
                </div>
              ) : loadingHistory ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'rgba(255,255,255,0.40)', fontSize: 13 }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
                </div>
              ) : messages.length === 0 && !streamingContent ? (
                /* Welcome state — agent avatar here stays with AgentAvatar style too */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: '40px 20px', textAlign: 'center' }}>
                  <AgentAvatar name={activeAgent.name} size={48} />
                  <div>
                    <div style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontSize: 18, fontWeight: 400, color: '#fff', marginBottom: 6 }}>{activeAgent.name}</div>
                    {(activeAgent.tagline || activeAgent.description) && (
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 14, lineHeight: 1.55, maxWidth: 320, margin: '0 auto 14px' }}>
                        {(() => { const t = activeAgent.tagline || activeAgent.description || ''; return t.length > 20 ? t.slice(0, 80) + '…' : t; })()}
                      </div>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 9999, background: 'rgba(0,235,117,0.12)', border: '1px solid rgba(0,235,117,0.22)', color: '#00EB75' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00EB75' }} /> Ready
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isUser = msg.role === 'user'
                    const prevMsg = messages[i - 1]
                    const showLabel = !isUser && (i === 0 || prevMsg?.role === 'user')
                    return (
                      <div key={msg.id}>
                        {isUser ? (
                          /* User bubble — gold, right-aligned */
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 12, marginBottom: 36 }}>
                            <div style={{ maxWidth: 'min(560px, 72%)', display: 'grid', gap: 4 }}>
                              <div style={{
                                padding: '16px 20px', fontSize: 15, lineHeight: 1.7,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                background: '#EAAA00', color: '#09073A', fontWeight: 600,
                                borderRadius: '14px 4px 14px 14px',
                              }}>
                                {msg.content}
                              </div>
                              <div style={{ fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <UserAvatar name={user?.name || user?.wallet?.slice(0, 1)} size={36} />
                          </div>
                        ) : (
                          /* Assistant bubble — dark navy avatar (#09073A) */
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 36 }}>
                            {showLabel
                              ? <AgentAvatar name={activeAgent.name} size={36} />  /* ← #09073A + gold border */
                              : <div style={{ width: 36, flexShrink: 0 }} />
                            }
                            <div style={{ maxWidth: 'min(820px, 88%)', display: 'grid', gap: 4 }}>
                              {showLabel && (
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EAAA00' }}>{activeAgent.name}</div>
                              )}
                              <div style={{
                                background: '#0A0D33', border: '1px solid rgba(255,255,255,0.10)',
                                borderRadius: 14, borderTopLeftRadius: 4,
                                padding: '16px 20px', fontSize: 15, color: '#ffffff', lineHeight: 1.7,
                                wordBreak: 'break-word',
                              }}>
                                {renderMarkdown(msg.content)}
                              </div>
                              <div style={{ fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Streaming bubble */}
                  {streamingContent && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 36 }}>
                      <AgentAvatar name={activeAgent!.name} size={36} />
                      <div style={{ maxWidth: 'min(820px, 88%)', display: 'grid', gap: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EAAA00' }}>{activeAgent!.name}</div>
                        <div style={{ background: '#0A0D33', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, borderTopLeftRadius: 4, padding: '16px 20px', fontSize: 15, color: '#ffffff', lineHeight: 1.7, wordBreak: 'break-word' }}>
                          {renderMarkdown(streamingContent)}<span style={{ display: 'inline-block', width: 2, height: 13, background: '#EAAA00', marginLeft: 2, verticalAlign: 'sub', animation: 'wvBlink 0.7s step-end infinite' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Typing dots */}
                  {sending && !streamingContent && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 36 }}>
                      <AgentAvatar name={activeAgent!.name} size={36} />
                      <div style={{ background: '#0A0D33', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, borderTopLeftRadius: 4, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {[0, 0.18, 0.36].map((d, i) => <span key={i} style={{ display: 'block', width: 6, height: 6, borderRadius: '50%', background: '#EAAA00', animation: `wvDot 1.2s ease-in-out ${d}s infinite` }} />)}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} style={{ height: 4 }} />
                </>
              )}
            </div>
          </div>

          {/* Input footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', background: '#03011B', flexShrink: 0 }}>
            <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '14px clamp(24px, 6%, 80px)' }}>

              {/* Low-token notification banner — fixed just above the input.
                  Click anywhere on it, or the button, to open the Top-up Packs modal. */}
              {tokenLow && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowTopup(true)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowTopup(true) } }}
                    className="wv-token-alert"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                      padding: '16px 20px', marginBottom: 14, borderRadius: 16, cursor: 'pointer',
                      background: '#0A0D33',
                      border: '1px solid rgba(234,170,0,0.32)',
                      boxShadow: '0 10px 30px rgba(3,1,27,0.45)',
                      animation: 'wvAlertIn 0.45s cubic-bezier(0.22,1,0.36,1) both',
                      fontFamily: '"Avenir", system-ui, sans-serif',
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(234,170,0,0.12)', border: '1px solid rgba(234,170,0,0.30)',
                    }}>
                      <AlertTriangle size={20} style={{ color: '#EAAA00' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '0.01em' }}>
                        {tokenExhausted ? 'You’ve reached your monthly token limit' : `Only ${formatTokens(tokenRemaining)} tokens left this month`}
                      </div>
                      <div className="wv-token-alert-desc" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                        {tokenExhausted
                          ? 'You’re out of tokens. Purchase a top-up pack to continue chatting without interruption.'
                          : 'You’re running low on tokens. Purchase a top-up pack to continue chatting without interruption.'}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setShowTopup(true) }}
                      className="wv-topup-btn"
                      style={{
                        flexShrink: 0, padding: '11px 20px', borderRadius: 11, border: 'none',
                        background: '#EAAA00', color: '#09073A',
                        fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                        fontFamily: '"Avenir", system-ui, sans-serif',
                        transition: 'background 0.15s, transform 0.15s',
                      }}
                    >
                      View Top-up Packs
                    </button>
                  </div>
              )}

              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 6, padding: '8px 12px' }}
                onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#EAAA00'}
                onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.10)'}
              >
                <input
                  value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={
                    !activeAgent ? 'Select a chat...'
                      : tokenExhausted ? 'Monthly token limit reached — add a top-up pack'
                      : `Message ${activeAgent.name}...`
                  }
                  disabled={sending || !activeAgent || tokenExhausted}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13.5, color: '#ffffff',
                    fontFamily: '"Avenir", system-ui, sans-serif',
                    opacity: (!activeAgent || tokenExhausted) ? 0.4 : 1,
                  }}
                />
                <button
                  style={{ width: 36, height: 36, borderRadius: '50%', background: '#100E59', border: 'none', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ffffff'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'}
                >
                  <Mic size={15} />
                </button>
                <button
                  onClick={sendMessage} disabled={!canSend}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
                    background: canSend ? '#FFC229' : 'rgba(255,255,255,0.06)',
                    color: canSend ? '#09073A' : 'rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: canSend ? 'pointer' : 'not-allowed', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLButtonElement).style.background = '#EAAA00' }}
                  onMouseLeave={e => { if (canSend) (e.currentTarget as HTMLButtonElement).style.background = '#FFC229' }}
                >
                  {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                </button>
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 8 }}>
                Agents act for your DUNA under real identity, authority, and accountability
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Google Account Picker Modal (for connected users on exec avatars) ── */}
      {showToolPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 420, borderRadius: 16, background: '#0D1140', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(135deg, rgba(66,133,244,0.15) 0%, transparent 60%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(66,133,244,0.2)', border: '1.5px solid rgba(66,133,244,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20 }}>📧</span>
                </div>
                <div>
                  <h3 style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400, fontSize: 18, color: '#fff', margin: 0 }}>Select Your Google Account</h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                    This agent will use your own Gmail to send emails
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px 24px' }}>
              {userGoogleAccounts.map((acct: any) => {
                const isSelected = selectedToolAccount === acct.id
                return (
                  <button key={acct.id} onClick={() => setSelectedToolAccount(acct.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8, borderRadius: 10, cursor: 'pointer', textAlign: 'left' as const, background: isSelected ? 'rgba(66,133,244,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isSelected ? 'rgba(66,133,244,0.4)' : 'rgba(255,255,255,0.08)'}`, transition: '160ms' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(66,133,244,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 14 }}>📧</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acct.external_handle || 'Google Account'}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Gmail · Calendar · Meet</p>
                    </div>
                    {isSelected && <Check size={18} style={{ color: '#4285F4', flexShrink: 0 }} />}
                  </button>
                )
              })}
              <button onClick={handleToolPickerConfirm} disabled={!selectedToolAccount || toolPickerSaving}
                style={{ width: '100%', marginTop: 12, fontSize: 14, fontWeight: 700, padding: '11px 20px', borderRadius: 10, border: 'none', background: selectedToolAccount ? '#EAAA00' : 'rgba(255,255,255,0.08)', color: selectedToolAccount ? '#09073A' : 'rgba(255,255,255,0.25)', cursor: !selectedToolAccount ? 'not-allowed' : 'pointer' }}>
                {toolPickerSaving ? 'Saving...' : selectedToolAccount ? 'Continue to Chat →' : 'Select an account above'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Plans & Top-up popup (UI only — mock data, no checkout) ── */}
      <PlansModal open={showPlans} onClose={() => setShowPlans(false)} usage={usage ?? { tier: '', used: 0, total: 0 }} />
      {/* ── Top-up Packs popup, opened from the low-token banner (UI only) ── */}
      <TopupModal open={showTopup} onClose={() => setShowTopup(false)} />
    </>
  )
}
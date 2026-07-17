'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useStudio } from '@/lib/studio-context'
import { useAuth } from '@/lib/auth-context'
import type { Presence } from '@/lib/agent-types'
import { PRESENCE_SUBTYPES, suggestHandle } from '@/lib/agent-types'
import {
  listAgents,
  listAccessibleAgents,
  deleteAgent as deleteAgentApi,
  createPresenceAgent,
  createWorkerAgent,
} from '@/lib/agents-api'

import { PREDEFINED_AVATARS, CHARACTER_PRESETS, CHARACTER_PERSONALITIES, AUTOMATION_CATEGORIES, EXEC_AUTOMATION_CATEGORIES, buildDefaultAutomationState, buildDefaultExecAutomationState, generateApprovalRulesText, type ApprovalState } from '@/lib/predefined-avatars'

// ─── Types ──────────────────────────────────────────────

export type AgentKind = 'avatar' | 'performer'

interface AgentsListPageProps {
  kind: AgentKind
}

// ─── Constants ──────────────────────────────────────────

const KIND_CONFIG = {
  avatar: {
    pageTitle: 'Allies',
    description:
      'Allies are intelligent agents that represent people, organizations, programs, and alliances. They communicate, coordinate, and act on behalf of their principals, carrying the identity, authority, and permissions needed to operate safely across the network.',
    createLabel: '+ Create a new Ally',
    createRoute: '/agents/create/avatar',
    emptyTitle: 'No avatars yet',
    emptyDescription:
      'Avatars are supervisor agents that coordinate performers. Create your first one to get started.',
    emptyIcon: 'lucide:crown',
    filterFn: (a: Presence) => a.type?.toLowerCase() === 'presence',
    draftKey: 'kinship_presence_draft',
    draftType: 'Avatar' as const,
    draftLabel: 'Untitled Avatar',
    draftRoute: '/agents/create/avatar',
  },
  performer: {
    pageTitle: 'Performers',
    description:
      'Performers are specialized worker agents that execute tasks and can be equipped with tools. Each Performer operates under an Avatar.',
    createLabel: '+ Create a new Performer',
    createRoute: '/agents/create/performer',
    emptyTitle: 'No performers yet',
    emptyDescription:
      'Performers are worker agents that execute tasks under an Avatar. Create an Avatar first, then add Performers.',
    emptyIcon: 'lucide:bot',
    filterFn: (a: Presence) => a.type?.toLowerCase() === 'worker',
    draftKey: 'kinship_worker_draft',
    draftType: 'Performer' as const,
    draftLabel: 'Untitled Performer',
    draftRoute: '/agents/create/performer',
  },
} as const

// ─── Pagination ─────────────────────────────────────────
const PAGE_SIZE = 9

// ─── Badge styles (shared) ──────────────────────────────

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
  BLUESKY: {
    background: 'rgba(0,133,255,0.15)',
    color: '#4da6ff',
    border: '1px solid rgba(0,133,255,0.3)',
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

// ─── Avatar filter tabs ─────────────────────────────────

const AVATAR_TABS = [
  { value: 'all', label: 'ALL' },
  { value: 'template', label: 'TEMPLATE' },
  { value: 'kiduna', label: 'KIDUNA' },
  { value: 'mission', label: 'MISSION' },
  { value: 'policy', label: 'POLICY' },
  { value: 'personal', label: 'PERSONAL' },
  { value: 'operator', label: 'OPERATOR' },
  { value: 'elector', label: 'ELECTOR' },
  { value: 'ally', label: 'ALLY' },
]

function applyAvatarSubtypeFilter(agents: Presence[], filter: string): Presence[] {
  if (filter === 'all') return agents
  if (filter === 'kiduna')
    return agents.filter(
      (a) =>
        a.presenceSubtype?.toLowerCase() === 'big_avatar' ||
        a.presenceSubtype?.toLowerCase() === 'movement'
    )
  if (filter === 'mission')
    return agents.filter((a) => a.presenceSubtype?.toLowerCase() === 'mission')
  if (filter === 'policy')
    return agents.filter((a) => a.presenceSubtype?.toLowerCase() === 'proposal')
  if (filter === 'personal')
    return agents.filter(
      (a) =>
        ['member', 'big_avatar'].includes(a.presenceSubtype?.toLowerCase() || '') ||
        !a.presenceSubtype
    )
  if (filter === 'operator')
    return agents.filter((a) => a.presenceSubtype?.toLowerCase() === 'operator')
  if (filter === 'elector')
    return agents.filter((a) => a.presenceSubtype?.toLowerCase() === 'elector')
  if (filter === 'ally')
    return agents.filter((a) => a.presenceSubtype?.toLowerCase() === 'ally')
  return agents
}

// ─── Component ──────────────────────────────────────────

export default function AgentsListPage({ kind }: AgentsListPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const isPersonalView = viewParam === 'personal'
  const isPolicyView = viewParam === 'policy'
  const isFilteredView = isPersonalView || isPolicyView

  const { currentPlatform } = useStudio()
  const { user } = useAuth()

  const config = KIND_CONFIG[kind]

  const [allAgents, setAllAgents] = useState<Presence[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [page, setPage] = useState(1)

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

  // ── Predefined Bluesky Avatar (only for avatar kind) ────────────────
  const [bskyModal, setBskyModal] = useState(false)
  const [bskyAccounts, setBskyAccounts] = useState<any[]>([])
  const [bskyCreating, setBskyCreating] = useState(false)
  const [bskyForm, setBskyForm] = useState({ name: '', selectedAccountId: '', selectedCharacter: '', customCharacterText: '', systemPrompt: '', selectedKbIds: [] as string[] })
  const [bskyShowApprovalConfig, setBskyShowApprovalConfig] = useState(false)
  const [bskyEditSection, setBskyEditSection] = useState<'system' | 'knowledge' | null>(null)
  const [bskyGenerating, setBskyGenerating] = useState(false)
  const [automationState, setAutomationState] = useState<Record<string, ApprovalState>>(buildDefaultAutomationState())
  const [bskyError, setBskyError] = useState('')
  const [bskyShowForm, setBskyShowForm] = useState(false)
  const [bskyWhatsIncluded, setBskyWhatsIncluded] = useState(false)
  const [bskyOpenCat, setBskyOpenCat] = useState<number | null>(null)
  const [bskyPausingId, setBskyPausingId] = useState<string | null>(null)
  const [bskySuccess, setBskySuccess] = useState('')
  const [bskyConfirm, setBskyConfirm] = useState<{ presenceId: string; name: string; action: 'pause' | 'resume' | 'remove' } | null>(null)
  const [bskyEmpowerAccounts, setBskyEmpowerAccounts] = useState<any[]>([])
  const [userKBs, setUserKBs] = useState<any[]>([])
  const [showCreateChoice, setShowCreateChoice] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [bskyKbPage, setBskyKbPage] = useState(1)
  const BSKY_KB_PAGE_SIZE = 3
  const [bskyIncludeWisdom, setBskyIncludeWisdom] = useState(true)
  const [bskyWisdomExpanded, setBskyWisdomExpanded] = useState(false)
  const [bskyWisdomContent, setBskyWisdomContent] = useState(
    `# Bluesky Platform Knowledge\n\n` +
    `## Post Rules\n` +
    `- Text posts have a 300-byte limit (approximately 300 ASCII characters, fewer for emoji/unicode).\n` +
    `- Posts exceeding 300 bytes should be split into threads using 🧵 markers.\n` +
    `- Rich text facets are used for @mentions, #hashtags, and links — they are byte-indexed.\n\n` +
    `## Content Types\n` +
    `- Text posts (plain or with facets for links, mentions, hashtags)\n` +
    `- Image posts (up to 4 images per post, with alt text)\n` +
    `- Video posts (uploaded and processed asynchronously)\n` +
    `- Link card posts (external URL with title, description, thumbnail)\n` +
    `- Quote posts (embed another post inside yours)\n` +
    `- Threads (chained reply posts for long-form content)\n\n` +
    `## Threading\n` +
    `- Threads are created by replying to your own post in sequence.\n` +
    `- Use 🧵1 of N, 🧵2 of N markers for clarity.\n` +
    `- Thread gates control who can reply (everyone, mentioned users, followers, specific lists).\n\n` +
    `## Engagement\n` +
    `- Like: acknowledges a post. Likes are public.\n` +
    `- Repost: shares a post to your followers' timelines.\n` +
    `- Quote post: shares with your commentary added.\n` +
    `- Reply: responds in the thread. Maintains conversation context.\n\n` +
    `## Handles and Identity\n` +
    `- Default handles are username.bsky.social.\n` +
    `- Custom domain handles are supported (e.g., alice.example.com).\n` +
    `- Every account has a DID (Decentralized Identifier) which is the permanent identity.\n\n` +
    `## Direct Messages\n` +
    `- DMs use the chat.bsky.convo namespace.\n` +
    `- DM policy can be set to: everyone, followers only, or nobody.\n` +
    `- Conversation requests need to be accepted before messaging.\n\n` +
    `## Best Practices\n` +
    `- Post at consistent times for better engagement.\n` +
    `- Use hashtags sparingly — 1-3 per post maximum.\n` +
    `- Alt text on images is important for accessibility.\n` +
    `- Engage with your community — reply to replies, like mentions.\n` +
    `- Threads work well for educational or long-form content.\n` +
    `- Don't mass-follow or mass-like — it's considered spam.`
  )


  // ── Predefined Executive Avatar (only for avatar kind) ─────────────
  const [execModal, setExecModal] = useState(false)
  const [execAccounts, setExecAccounts] = useState<any[]>([])
  const [execCreating, setExecCreating] = useState(false)
  const [execError, setExecError] = useState('')
  const [execShowForm, setExecShowForm] = useState(false)
  const [execWhatsIncluded, setExecWhatsIncluded] = useState(false)
  const [execOpenCat, setExecOpenCat] = useState<number | null>(null)
  const [execPausingId, setExecPausingId] = useState<string | null>(null)
  const [execSuccess, setExecSuccess] = useState('')
  const [execConfirm, setExecConfirm] = useState<{ presenceId: string; name: string; action: 'pause' | 'resume' | 'remove' } | null>(null)
  const [execEmpowerAccounts, setExecEmpowerAccounts] = useState<any[]>([])
  const [execTelegramAccounts, setExecTelegramAccounts] = useState<any[]>([])
  const execAvatar = PREDEFINED_AVATARS.find(a => a.id === 'executive-avatar')!
  const [execForm, setExecForm] = useState({
    name: '',
    selectedAccountId: '',
    selectedTelegramId: '',
    selectedCharacter: '',
    customCharacterText: '',
    systemPrompt: '',
    selectedKbIds: [] as string[],
  })
  const [execEditSection, setExecEditSection] = useState<'system' | 'knowledge' | null>(null)
  const [execShowApprovalConfig, setExecShowApprovalConfig] = useState(false)
  const [execAutomationState, setExecAutomationState] = useState<Record<string, ApprovalState>>(buildDefaultExecAutomationState())
  const [execGenerating, setExecGenerating] = useState(false)

  const bskyAvatar = PREDEFINED_AVATARS.find(a => a.id === 'bluesky')!
  const API_BASE = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

  const buildSystemPrompt = useCallback((handle: string, personality: string, approvalRules: string, safety: string) => {
    return `You are a Bluesky social media agent managing the account @${handle}.

## Personality
${personality}

## On-Demand Behavior
When the user asks you to do something (post, like, follow, search, etc.), delegate to your worker immediately. Don't ask unnecessary confirmation for routine actions.

## Automation Approval Rules
${approvalRules}

## Safety Boundaries
${safety}`
  }, [])

  const DEFAULT_SAFETY = `- Always disclose you are an AI agent when directly asked.
- Never post harmful, discriminatory, or misleading content.
- Don't engage with trolls or toxic threads. Disengage silently.
- Don't repost content you haven't analyzed.
- Don't share the user's private information.
- Ask for confirmation before changing profile, blocking users, or posting controversial opinions.`

  const loadBskyAccounts = useCallback(async () => {
    if (!user?.wallet || kind !== 'avatar') return
    try {
      const res = await fetch(`${API_BASE}/api/agents/predefined/bluesky/accounts?wallet=${encodeURIComponent(user.wallet)}`)
      if (res.ok) { const data = await res.json(); setBskyAccounts(data.accounts || []) }
    } catch {}
    try {
      const res = await fetch(`${API_BASE}/api/tools/saved?wallet=${encodeURIComponent(user.wallet)}`)
      if (res.ok) {
        const data = await res.json()
        setBskyEmpowerAccounts((data.tools || []).filter((t: any) => t.tool_name === 'bluesky'))
      }
    } catch {}
    // Fetch user's knowledge bases
    try {
      const res = await fetch(`${API_BASE}/api/knowledge?wallet=${encodeURIComponent(user.wallet)}&limit=50`)
      if (res.ok) { const data = await res.json(); setUserKBs(data.knowledgeBases || data.items || data.knowledge_bases || []) }
    } catch {}
  }, [user?.wallet, API_BASE, kind])

  useEffect(() => { loadBskyAccounts() }, [loadBskyAccounts])


  const loadExecAccounts = useCallback(async () => {
    if (!user?.wallet || kind !== 'avatar') return
    try {
      const res = await fetch(`${API_BASE}/api/agents/predefined/executive-avatar/accounts?wallet=${encodeURIComponent(user.wallet)}`)
      if (res.ok) { const data = await res.json(); setExecAccounts(data.accounts || []) }
    } catch {}
    try {
      const res = await fetch(`${API_BASE}/api/tools/saved?wallet=${encodeURIComponent(user.wallet)}`)
      if (res.ok) {
        const data = await res.json()
        setExecEmpowerAccounts((data.tools || []).filter((t: any) => t.tool_name === 'google'))
        setExecTelegramAccounts((data.tools || []).filter((t: any) => t.tool_name === 'telegram'))
      }
    } catch {}
  }, [user?.wallet, API_BASE, kind])

  const handleExecCreate = async () => {
    if (!user?.wallet) return
    const trimmedName = execForm.name.trim()
    if (!trimmedName) { setExecError('Assistant name is required'); return }
    if (trimmedName.length < 2) { setExecError('Name must be at least 2 characters'); return }
    if (!execForm.selectedAccountId) { setExecError('Please select a Google account'); return }
    if (!execForm.selectedTelegramId) { setExecError('Please select a Telegram bot'); return }
    if (!execForm.selectedCharacter) { setExecError('Please choose a character'); return }
    if (execForm.selectedCharacter === 'custom' && !execForm.customCharacterText.trim()) { setExecError('Please describe your custom personality'); return }
    setExecCreating(true); setExecError('')
    try {
      const email = execEmpowerAccounts.find((a: any) => a.id === execForm.selectedAccountId)?.external_handle || ''

      // Gather tool account IDs: selected Google + selected Telegram bot
      const allToolIds = [execForm.selectedAccountId]
      if (execForm.selectedTelegramId) {
        allToolIds.push(execForm.selectedTelegramId)
      }

      // Build system prompt from character if not customized
      let systemPrompt = execForm.systemPrompt.trim()
      if (!systemPrompt) {
        const preset = CHARACTER_PRESETS.find((p: any) => p.id === execForm.selectedCharacter)
        const charName = preset?.name || execForm.selectedCharacter
        systemPrompt = `You are a ${charName} AI executive assistant managing ${email}.\n\n## Autonomous Behavior\n1. Meeting Scheduler — detects meeting requests, checks conflicts, suggests alternatives\n2. Daily Briefing — sends morning email with today's schedule\n3. Smart Inbox Labeler — auto-labels emails\n4. Telegram Notifications — sends alerts via Telegram\n5. Group Chat Monitor — watches Telegram groups for mentions and requests\n\n## Safety Boundaries\n- Never auto-confirm meetings without approval\n- Never send emails without approval (except briefings)\n- Never share private calendar details`
      }

      // Step 1: Create presence via standard API
      const presenceHandle = suggestHandle(trimmedName)
      const newPresence = await createPresenceAgent({
        name: trimmedName,
        handle: presenceHandle,
        briefDescription: `AI executive assistant for ${email}`,
        tagline: `Managing ${email}`,
        tone: 'professional',
        presenceSubtype: 'member',
        wallet: user.wallet,
        platformId: currentPlatform?.id,
        tools: allToolIds,
        templateIds: ['platform_executive_avatar'],
        knowledgeBaseIds: execForm.selectedKbIds.length ? execForm.selectedKbIds : undefined,
      })

      // Step 2: Create worker via standard API
      if (newPresence?.id) {
        try {
          const workerHandle = suggestHandle(`${trimmedName} worker`)
          await createWorkerAgent({
            name: `${trimmedName} Worker`,
            handle: workerHandle,
            briefDescription: `Email, calendar, and Telegram management for ${email}`,
            role: 'Email, calendar, and Telegram management',
            wallet: user.wallet,
            platformId: currentPlatform?.id,
            parentId: newPresence.id,
            tools: allToolIds,
            systemPrompt,
          })
        } catch (workerErr) {
          console.warn('Worker creation failed, can be added manually:', workerErr)
        }
      }

      setExecForm({ name: '', selectedAccountId: '', selectedTelegramId: '', selectedCharacter: '', customCharacterText: '', systemPrompt: '', selectedKbIds: [] as string[] })
      setExecShowForm(false)
      setExecSuccess('Executive Avatar created! Automations are now active.')
      await fetchAgents()
      setTimeout(() => { setExecModal(false); setExecSuccess(''); setExecWhatsIncluded(false); setExecOpenCat(null) }, 1500)
    } catch (e: any) { setExecError(e.message) } finally { setExecCreating(false) }
  }

  const handleExecGenerateCustomCharacter = async () => {
    const charName = execForm.customCharacterText.trim()
    if (!charName) return
    setExecGenerating(true); setExecError('')
    try {
      const res = await fetch(`${API_BASE}/api/prompts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: `Generate a 3-4 sentence personality description for an AI executive assistant with the personality of: "${charName}". Describe how it manages emails, schedules meetings, handles conflicts, and communicates. Keep it practical. Return only the personality description.`,
          name: `${charName} Executive Assistant`,
        })
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      const personality = data.content || ''
      if (personality) {
        const email = execEmpowerAccounts.find((a: any) => a.id === execForm.selectedAccountId)?.external_handle || 'your@email.com'
        const fullPrompt = `You are a ${charName} AI executive assistant managing ${email}.\n\n## Personality\n${personality}\n\n## Autonomous Behavior\n1. Meeting Scheduler — detects meeting requests, checks conflicts, suggests alternatives\n2. Daily Briefing — sends morning email with today's schedule\n3. Smart Inbox Labeler — auto-labels emails\n4. Bill Tracker — creates calendar reminders for due dates\n\n## Safety Boundaries\n- Never auto-confirm meetings without approval\n- Never send emails without approval (except briefings)\n- Never share private calendar details`
        setExecForm(prev => ({ ...prev, systemPrompt: fullPrompt }))
      } else { setExecError('Could not generate personality.') }
    } catch { setExecError('Failed to generate personality.') } finally { setExecGenerating(false) }
  }

  const handleExecPauseResume = async (presenceId: string, currentStatus: string) => {
    if (!user?.wallet) return
    setExecPausingId(presenceId)
    setExecConfirm(null)
    try {
      const action = currentStatus === 'active' ? 'pause' : 'resume'
      await fetch(`${API_BASE}/api/agents/${presenceId}/${action}?wallet=${encodeURIComponent(user.wallet)}`, { method: 'POST' })
      setExecSuccess(action === 'pause' ? 'All automations paused.' : 'All automations resumed!')
      setTimeout(() => setExecSuccess(''), 4000)
      await loadExecAccounts()
    } catch {} finally { setExecPausingId(null) }
  }

  const handleExecRemove = async (presenceId: string) => {
    if (!user?.wallet) return
    setExecPausingId(presenceId)
    setExecConfirm(null)
    try {
      const res = await fetch(`${API_BASE}/api/agents/${presenceId}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setExecSuccess('Account removed successfully.')
        setTimeout(() => setExecSuccess(''), 4000)
        await loadExecAccounts(); await fetchAgents()
      } else { setExecError('Failed to remove account') }
    } catch { setExecError('Failed to remove account') } finally { setExecPausingId(null) }
  }

  useEffect(() => { loadExecAccounts() }, [loadExecAccounts])

  const handleGenerateCustomCharacter = async () => {
    const charName = bskyForm.customCharacterText.trim()
    if (!charName) return
    setBskyGenerating(true); setBskyError('')
    try {
      const res = await fetch(`${API_BASE}/api/prompts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: `Generate a 3-4 sentence personality description for a Bluesky social media agent with the personality of: "${charName}". Describe how it speaks, what tone it uses, how it engages with people on social media, and what makes it distinctive. Keep it practical — this will be used as the agent's personality section in its system prompt. Return only the personality description, nothing else.`,
          name: `${charName} Bluesky Agent`,
        })
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      const personality = data.content || ''
      if (personality) {
        const handle = bskyEmpowerAccounts.find((a: any) => a.id === bskyForm.selectedAccountId)?.external_handle?.replace('@', '') || 'yourhandle'
        const approvalRules = generateApprovalRulesText(automationState)
        const fullPrompt = buildSystemPrompt(handle, personality, approvalRules, DEFAULT_SAFETY)
        setBskyForm(prev => ({ ...prev, systemPrompt: fullPrompt }))
      } else { setBskyError('Could not generate personality. Please try again.') }
    } catch { setBskyError('Failed to generate personality. Please try again.') } finally { setBskyGenerating(false) }
  }

  const handleBskyCreate = async () => {
    if (!user?.wallet) return
    const trimmedName = bskyForm.name.trim()
    if (!trimmedName) { setBskyError('Avatar name is required'); return }
    if (trimmedName.length < 2) { setBskyError('Avatar name must be at least 2 characters'); return }
    if (trimmedName.length > 30) { setBskyError('Avatar name must be 30 characters or less'); return }
    if (!bskyForm.selectedAccountId) { setBskyError('Please select a Bluesky account'); return }
    if (!bskyForm.selectedCharacter) { setBskyError('Please choose a character for your avatar'); return }
    if (bskyForm.selectedCharacter === 'custom' && !bskyForm.systemPrompt.trim()) { setBskyError('Please click Generate to create your custom personality first'); return }
    if (!bskyForm.selectedKbIds.length && !bskyIncludeWisdom) {
      setBskyError('Please select at least one Knowledge Base or include the default Bluesky Knowledge');
      return;
    }
    setBskyCreating(true); setBskyError('')
    try {
      const res = await fetch(`${API_BASE}/api/agents/predefined/bluesky`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: user.wallet,
          globalToolAccountId: bskyForm.selectedAccountId,
          name: trimmedName,
          characterPreset: bskyForm.selectedCharacter,
          customCharacterText: bskyForm.selectedCharacter === 'custom' ? bskyForm.customCharacterText.trim() : undefined,
          customSystemPrompt: bskyForm.systemPrompt.trim() || undefined,
          knowledgeBaseIds: bskyForm.selectedKbIds.length ? bskyForm.selectedKbIds : undefined,
          includeWisdom: bskyIncludeWisdom,
          wisdomContent: bskyIncludeWisdom ? bskyWisdomContent.trim() : undefined,
        }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Failed to create') }
      const created = await res.json()

      // ── Sync approval overrides to the created skills ──────────────
      // The user toggled auto/approval on the configure screen.
      // The creation endpoint uses template defaults. Now we PATCH
      // each skill to match the user's actual choices.
      if (created.presenceId) {
        try {
          const AUTOMATION_ID_TO_SKILL_NAME: Record<string, string> = {
            reply_to_mentions: 'Reply to Mentions',
            like_mentions: 'Like Mentions',
            continue_reply_threads: 'Continue Reply Threads',
            like_replies: 'Like Replies',
            follow_back: 'Follow Back New Followers',
            welcome_dm: 'Welcome New Followers (DM)',
            auto_respond_dms: 'Auto-Respond to DMs',
          }
          const skillsRes = await fetch(
            `${API_BASE}/api/skills?presence_id=${created.presenceId}&wallet=${encodeURIComponent(user.wallet)}&include_templates=true`
          )
          if (skillsRes.ok) {
            const skillsData = await skillsRes.json()
            const skills = skillsData.skills || skillsData.items || []
            for (const skill of skills) {
              const matchedAutoId = Object.entries(AUTOMATION_ID_TO_SKILL_NAME).find(
                ([, name]) => name === skill.name
              )?.[0]
              if (matchedAutoId && automationState[matchedAutoId]) {
                const userWantsApproval = automationState[matchedAutoId] === 'approval'
                const currentApproval = skill.requires_approval || skill.requiresApproval || false
                if (userWantsApproval !== currentApproval) {
                  await fetch(`${API_BASE}/api/skills/${skill.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requires_approval: userWantsApproval }),
                  })
                }
              }
            }
          }
        } catch (e) {
          console.warn('[AgentsListPage] Failed to sync approval overrides:', e)
        }
      }

      setBskyForm({ name: '', selectedAccountId: '', selectedCharacter: '', customCharacterText: '', systemPrompt: '', selectedKbIds: [] as string[] })
      setBskyShowForm(false)
      setBskyModal(false)
      try { localStorage.removeItem(BSKY_DRAFT_KEY) } catch {}
      setDrafts(prev => prev.filter(d => d.key !== BSKY_DRAFT_KEY))
      // Navigate immediately to detail page — no flash
      if (created.presenceId) {
        router.push(`/agent/${created.presenceId}`)
      }
    } catch (e: any) { setBskyError(e.message) } finally { setBskyCreating(false) }
  }

  const handleBskyPauseResume = async (presenceId: string, currentStatus: string) => {
    if (!user?.wallet) return
    setBskyPausingId(presenceId)
    setBskyConfirm(null)
    try {
      const action = currentStatus === 'active' ? 'pause' : 'resume'
      await fetch(`${API_BASE}/api/agents/${presenceId}/${action}?wallet=${encodeURIComponent(user.wallet)}`, { method: 'POST' })
      setBskySuccess(action === 'pause' ? 'All automations paused.' : 'All automations resumed!')
      setTimeout(() => setBskySuccess(''), 4000)
      await loadBskyAccounts()
    } catch {} finally { setBskyPausingId(null) }
  }

  const handleBskyRemove = async (presenceId: string) => {
    if (!user?.wallet) return
    setBskyPausingId(presenceId)
    setBskyConfirm(null)
    try {
      const res = await fetch(`${API_BASE}/api/agents/${presenceId}?preserveKb=true`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setBskySuccess('Account removed successfully.')
        setTimeout(() => setBskySuccess(''), 4000)
        await loadBskyAccounts(); await fetchAgents()
      } else { setBskyError('Failed to remove account') }
    } catch { setBskyError('Failed to remove account') } finally { setBskyPausingId(null) }
  }

  const BSKY_DRAFT_KEY = 'kinship_bluesky_draft'

  useEffect(() => {
    const found: typeof drafts = []
    const wallet = user?.wallet || ''
    const walletDraftKey = wallet ? `${config.draftKey}_${wallet}` : ''
    // Check wallet-specific draft key first, fall back to generic key
    const keysToCheck = walletDraftKey ? [walletDraftKey, config.draftKey] : [config.draftKey]
    for (const draftKey of keysToCheck) {
      try {
        const raw = localStorage.getItem(draftKey)
        if (raw) {
          const d = JSON.parse(raw)
          if (d.savedAt && Date.now() - d.savedAt < 24 * 60 * 60 * 1000) {
            found.push({
              key: draftKey,
              type: config.draftType,
              name: d.name || config.draftLabel,
              savedAt: d.savedAt,
            })
            break
          }
        }
      } catch {}
    }
    // Also check for Bluesky template drafts
    if (kind === 'avatar') {
      try {
        const raw = localStorage.getItem(BSKY_DRAFT_KEY)
        if (raw) {
          const d = JSON.parse(raw)
          if (d.savedAt && Date.now() - d.savedAt < 24 * 60 * 60 * 1000) {
            found.push({
              key: BSKY_DRAFT_KEY,
              type: 'Template' as any,
              name: d.name || 'Bluesky Avatar Draft',
              savedAt: d.savedAt,
            })
          }
        }
      } catch {}
    }
    setDrafts(found)
  }, [config.draftKey, config.draftType, config.draftLabel, kind, user?.wallet])

  function deleteDraft(key: string) {
    try {
      localStorage.removeItem(key)
    } catch {}
    setDrafts((prev) => prev.filter((d) => d.key !== key))
  }

  function resumeDraft(key: string) {
    if (key === BSKY_DRAFT_KEY) {
      // Resume Bluesky template draft — load form data and open modal
      try {
        const raw = localStorage.getItem(BSKY_DRAFT_KEY)
        if (raw) {
          const d = JSON.parse(raw)
          setBskyForm({
            name: d.name || '',
            selectedAccountId: d.selectedAccountId || '',
            selectedCharacter: d.selectedCharacter || '',
            customCharacterText: d.customCharacterText || '',
            systemPrompt: d.systemPrompt || '',
            selectedKbIds: d.selectedKbIds || [],
          })
        }
      } catch {}
      setBskyModal(true)
      setBskyShowForm(true)
    } else {
      router.push(config.draftRoute)
    }
  }

  // Auto-save Bluesky form as draft when user types
  function saveBskyDraft() {
    if (!bskyForm.name.trim()) return // Don't save empty drafts
    try {
      localStorage.setItem(BSKY_DRAFT_KEY, JSON.stringify({
        ...bskyForm,
        savedAt: Date.now(),
      }))
    } catch {}
  }

  // Auto-save on form change (debounced via bskyShowForm check)
  useEffect(() => {
    if (bskyShowForm && bskyForm.name.trim()) saveBskyDraft()
  }, [bskyForm, bskyShowForm])

  // Reset to page 1 whenever filter changes
  useEffect(() => { setPage(1) }, [statusFilter, kind])

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
      setAllAgents(merged)
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
      setAllAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id))
      setAgentToDelete(null)
    } catch (error) {
      console.error('Error deleting agent:', error)
    } finally {
      setDeleting(false)
    }
  }

  // ── Filter by kind (avatar=PRESENCE, performer=WORKER) ──
  // Workers auto-created by predefined avatars (Bluesky, Executive) are
  // internal implementation details — hide them from the standalone Performer list.
  const templatePresenceIds = new Set(
    allAgents
      .filter((a: any) => (a.templateIds || a.template_ids || []).some((t: string) => t?.startsWith('platform_')))
      .map((a: Presence) => a.id)
  )
  const kindAgents = allAgents.filter((a: any) => {
    if (!config.filterFn(a)) return false
    if (kind === 'performer') {
      const parentIds: string[] = a.parentIds || a.parent_ids || []
      // Only hide workers whose parent is a platform template (Bluesky, Executive)
      // Do NOT hide based on empty parentIds — API may not always return parentIds
      const belongsToTemplate = parentIds.some((pid) => templatePresenceIds.has(pid))
      if (belongsToTemplate) return false
    }
    return true
  })

  // ── Pre-filter by view param for avatar page ──
  const viewAgents =
    kind === 'avatar'
      ? isPersonalView
        ? kindAgents.filter(
            (a) =>
              ['member', 'big_avatar'].includes(a.presenceSubtype?.toLowerCase() || '') ||
              !a.presenceSubtype
          )
        : isPolicyView
          ? kindAgents.filter((a) => a.presenceSubtype?.toLowerCase() === 'proposal')
          : kindAgents
      : kindAgents

  // ── Apply subtype filter tabs (avatar only) ──
  const filtered =
    kind === 'avatar' && !isFilteredView
      ? applyAvatarSubtypeFilter(viewAgents, statusFilter)
      : viewAgents

  // Page title override for filtered views
  const pageTitle = isPersonalView
    ? 'Personal Agents'
    : isPolicyView
      ? 'Policy Agents'
      : config.pageTitle

  return (
    <div className="mt-3 sm:mt-1 md:mt-2" style={{ position: 'relative' }}>
      <style>{`@keyframes skel-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 8 }}>
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
          {config.description}
        </p>

        {!isFilteredView && (
          <button
            onClick={() => kind === 'avatar' ? setShowCreateChoice(true) : router.push(config.createRoute)}
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
              marginBottom: 24,
              transition: '160ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#FFC229')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#EAAA00')}
          >
            {config.createLabel}
          </button>
        )}
      </div>

      {/* ── Description types and visibility (avatar page only) ── */}
      {kind === 'avatar' && !isFilteredView && (
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
            </span>{' '}
            ,{' '}
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

      {/* ── Filter tabs (avatar only, not in filtered view) ── */}
      {kind === 'avatar' && !loading && !isFilteredView && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
            marginTop: 22,
            flexWrap: 'wrap' as const,
          }}
        >
          {AVATAR_TABS.map((tab) => {
            const isActive = statusFilter === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                style={{
                  fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
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
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                      'rgba(255,255,255,0.35)'
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#162040'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                      'rgba(255,255,255,0.14)'
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#0D1B3E'
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
                    icon={draft.type === 'Avatar' ? 'lucide:crown' : 'lucide:bot'}
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

      {/* ── Loading skeleton ── */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: '#0A0D33',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                overflow: 'hidden',
                padding: '20px 20px 16px',
                minHeight: 200,
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                  animation: 'skel-shimmer 1.4s ease-in-out infinite',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 52, height: 20, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ width: 44, height: 20, borderRadius: 99, background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
              <div style={{ height: 20, width: '60%', borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
              <div style={{ height: 14, width: '35%', borderRadius: 6, background: 'rgba(255,255,255,0.04)', marginBottom: 6 }} />
              <div style={{ height: 14, width: '50%', borderRadius: 6, background: 'rgba(255,255,255,0.04)', marginBottom: 14 }} />
              <div style={{ height: 12, width: '90%', borderRadius: 6, background: 'rgba(255,255,255,0.04)', marginBottom: 6 }} />
              <div style={{ height: 12, width: '70%', borderRadius: 6, background: 'rgba(255,255,255,0.04)', marginBottom: 20 }} />
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ height: 12, width: '25%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ height: 12, width: '20%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
              </div>
            </div>
          ))}
        </div>
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
          {statusFilter !== 'template' && filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((agent) => {
            const isPrimary =
              !!(agent as any)?.isPrimaryMember || !!(agent as any)?.is_primary_member
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
                      {isPresence &&
                        agent.presenceSubtype?.toLowerCase() === 'ally' &&
                        getBadge('DUNA ALLY')}
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

                  {/* Used by — show parent Presence name for workers */}
                  {!isPresence && (() => {
                    const parentIds: string[] = (agent as any).parentIds || (agent as any).parent_ids || []
                    if (parentIds.length === 0) return null
                    const parentNames = parentIds
                      .map((pid: string) => allAgents.find((a) => a.id === pid)?.name)
                      .filter(Boolean)
                    if (parentNames.length === 0) return null
                    return (
                      <p style={{
                        fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
                        fontSize: 12, color: '#EAAA00', marginBottom: 4, fontWeight: 600,
                      }}>
                        Used by {parentNames.join(', ')}
                      </p>
                    )
                  })()}

                  {/* Tagline */}
                  {(agent.tagline || agent.briefDescription) && (
                    <p
                      style={{
                        fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif',
                        fontSize: 13,
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

          {/* ── Bluesky Avatars — individual cards per account ── */}
          {kind === 'avatar' && !isFilteredView && (statusFilter === 'all' || statusFilter === 'template') && bskyAccounts.map((acct: any) => (
            <div
              key={acct.presenceId}
              className="group relative transition-all cursor-pointer"
              style={{ background: '#0A0D33', border: '1px solid rgba(0,133,255,0.25)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 6px 20px rgba(3,1,27,0.45)', transition: '160ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(0,133,255,0.5)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(0,133,255,0.25)')}
              onClick={() => router.push(`/agent/${acct.presenceId}`)}
            >
              <div style={{ padding: '20px 20px 16px' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,133,255,0.15)', border: '1px solid rgba(0,133,255,0.3)' }}>
                    <Icon icon="simple-icons:bluesky" width={20} height={20} style={{ color: '#0085FF' }} />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1 ml-2">
                    {getBadge('TEMPLATE')}
                    <span style={{ background: acct.status === 'active' ? 'rgba(0,235,117,0.15)' : 'rgba(255,255,255,0.06)', color: acct.status === 'active' ? '#00EB75' : 'rgba(255,255,255,0.4)', border: `1px solid ${acct.status === 'active' ? 'rgba(0,235,117,0.3)' : 'rgba(255,255,255,0.1)'}`, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 999, lineHeight: 1.6, whiteSpace: 'nowrap' as const }}>
                      {acct.status === 'active' ? '● ACTIVE' : '○ PAUSED'}
                    </span>
                  </div>
                </div>
                <h3 style={{ fontFamily: '"Goudy Heavyface", "Goudy Old Style", Georgia, serif', fontWeight: 600, fontSize: 18, lineHeight: 1.2, color: '#ffffff', marginBottom: 2, marginTop: 8 }}>{acct.name}</h3>
                <p style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 13, color: 'rgba(0,133,255,0.6)', marginBottom: 2 }}>@{acct.blueskyHandle}</p>
                <p style={{ fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                  Autonomous Bluesky agent · {acct.skillCount} automations
                </p>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, sans-serif' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{acct.activeSkillCount ?? acct.skillCount} active · Bluesky</span>
                  <span style={{ color: '#4da6ff', fontSize: 12, fontWeight: 600 }}>Manage →</span>
                </div>
              </div>
            </div>
          ))}


          {/* ── Executive Avatars now display as individual cards in the grid above ── */}

          {/* Create new tile */}
          {!isFilteredView && statusFilter !== 'template' && (
            <button
              onClick={() => kind === 'avatar' ? setShowCreateChoice(true) : router.push(config.createRoute)}
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
                  Create a new {kind === 'avatar' ? 'Avatar' : 'Performer'}
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
                  {kind === 'avatar'
                    ? 'Options depend on your level.'
                    : 'Requires an Avatar as parent.'}
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && filtered.length > PAGE_SIZE && statusFilter !== 'template' && (() => {
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
        if (totalPages <= 1) return null
        const btnBase: React.CSSProperties = {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          height: 38, padding: '0 20px', borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'transparent', color: 'rgba(255,255,255,0.65)',
          cursor: 'pointer', transition: 'all 0.15s',
          fontSize: 13, fontWeight: 600,
          fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif',
        }
        const disabledBtn: React.CSSProperties = { ...btnBase, opacity: 0.25, cursor: 'not-allowed' }
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
            <button
              style={page === 1 ? disabledBtn : btnBase}
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif' }}>
              {page} / {totalPages}
            </span>
            <button
              style={page === totalPages ? disabledBtn : btnBase}
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )
      })()}

      {/* ── Empty state for filtered views ── */}
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
              ? 'Policy agents represent governance proposals. Create one from the Avatars page.'
              : 'Personal agents are your member allies. Create one from the Avatars page.'}
          </p>
        </div>
      )}

      {/* ── Template tab empty state — no accounts connected ── */}
      {!loading && kind === 'avatar' && !isFilteredView && statusFilter === 'template' && bskyAccounts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(0,133,255,0.08)', border: '1px solid rgba(0,133,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon icon="lucide:layout-template" width={28} height={28} style={{ color: 'rgba(0,133,255,0.5)' }} />
          </div>
          <p style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontSize: 18, fontWeight: 400, color: '#fff', marginBottom: 8 }}>
            No templates selected
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 380, margin: '0 auto 20px' }}>
            You haven&apos;t set up any predefined avatar yet. Use a template to create an agent instantly.
          </p>
          <button onClick={() => setShowTemplatePicker(true)}
            style={{ fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontSize: 13, fontWeight: 700, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#EAAA00', color: '#09073A', cursor: 'pointer' }}>
            + Use a Template
          </button>
        </div>
      )}

      {/* ── Empty state when no agents of this kind ── */}
      {!loading && !isFilteredView && statusFilter !== 'template' && filtered.length === 0 && !(kind === 'avatar' && bskyAccounts.length > 0) && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'rgba(234,170,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Icon
              icon={config.emptyIcon}
              width={28}
              height={28}
              style={{ color: '#EAAA00' }}
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
            {config.emptyTitle}
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              maxWidth: 380,
              margin: '0 auto',
            }}
          >
            {config.emptyDescription}
          </p>
        </div>
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
                  Delete {kind === 'avatar' ? 'Avatar' : 'Performer'}
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

      {/* ── Create Choice Modal (Template vs Custom) ── */}
      {kind === 'avatar' && showCreateChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateChoice(false)} />
          <div className="relative w-full max-w-lg rounded-xl shadow-2xl" style={{ background: '#0A0D33', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400, fontSize: 20, color: '#fff', margin: 0 }}>Create a New Ally</h3>
              <button onClick={() => setShowCreateChoice(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Icon icon="lucide:x" width={18} height={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
            <p style={{ padding: '8px 24px 0', fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Choose how you want to create your agent</p>
            <div style={{ padding: '20px 24px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Template option */}
              <button
                onClick={() => { setShowCreateChoice(false); setShowTemplatePicker(true) }}
                style={{ background: 'rgba(0,133,255,0.06)', border: '1px solid rgba(0,133,255,0.25)', borderRadius: 12, padding: '20px 16px', cursor: 'pointer', textAlign: 'left', transition: '160ms' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,133,255,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,133,255,0.25)')}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,133,255,0.15)', border: '1px solid rgba(0,133,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon icon="lucide:sparkles" width={20} height={20} style={{ color: '#4da6ff' }} />
                </div>
                <p style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400, fontSize: 16, color: '#fff', margin: '0 0 6px' }}>Use a Template</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>Pre-built agent with automations ready to go. Just select your account.</p>
              </button>
              {/* Custom option */}
              <button
                onClick={() => { setShowCreateChoice(false); router.push(config.createRoute) }}
                style={{ background: 'rgba(234,170,0,0.06)', border: '1px solid rgba(234,170,0,0.25)', borderRadius: 12, padding: '20px 16px', cursor: 'pointer', textAlign: 'left', transition: '160ms' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(234,170,0,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(234,170,0,0.25)')}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(234,170,0,0.15)', border: '1px solid rgba(234,170,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon icon="lucide:pencil" width={20} height={20} style={{ color: '#EAAA00' }} />
                </div>
                <p style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400, fontSize: 16, color: '#fff', margin: '0 0 6px' }}>Create from Scratch</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>Full control over every detail. Name, personality, tools, skills — all custom.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Picker Modal ── */}
      {kind === 'avatar' && showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplatePicker(false)} />
          <div className="relative w-full max-w-lg rounded-2xl shadow-2xl" style={{ background: '#0D1140', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Header */}
            <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400, fontSize: 20, color: '#fff', margin: 0 }}>Choose a Template</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Select the type of avatar you want to create</p>
              </div>
              <button onClick={() => setShowTemplatePicker(false)} className="rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon="lucide:x" width={16} height={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Template list */}
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Bluesky Avatar — active */}
              <button
                onClick={() => { setShowTemplatePicker(false); setBskyModal(true); setBskyShowForm(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, cursor: 'pointer', background: 'rgba(0,133,255,0.08)', border: '1px solid rgba(0,133,255,0.25)', textAlign: 'left', transition: '160ms' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,133,255,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,133,255,0.25)')}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(0,133,255,0.15)', border: '1px solid rgba(0,133,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon icon="simple-icons:bluesky" width={22} height={22} style={{ color: '#0085FF' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff', margin: 0 }}>Bluesky Avatar</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '3px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>7 automations · Mentions, engagement, follower management</p>
                </div>
                <Icon icon="lucide:chevron-right" width={18} height={18} style={{ color: 'rgba(0,133,255,0.6)', flexShrink: 0 }} />
              </button>


              <button
                  onClick={() => { setShowTemplatePicker(false); setExecModal(true); setExecShowForm(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, cursor: 'pointer', background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.25)', textAlign: 'left', transition: '160ms', width: '100%' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(66,133,244,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(66,133,244,0.25)')}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon icon="lucide:briefcase" width={22} height={22} style={{ color: '#4285F4' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff', margin: 0 }}>Executive Avatar</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '3px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>4 automations · Gmail, Calendar, Meet scheduling</p>
                  </div>
                  <Icon icon="lucide:chevron-right" width={18} height={18} style={{ color: 'rgba(66,133,244,0.6)', flexShrink: 0 }} />
                </button>

              {/* Other templates */}
              {[
                { name: 'Operator Avatar', icon: 'lucide:settings-2', description: 'Creates and manages proposals within your DUNA' },
                { name: 'Elector Avatar', icon: 'lucide:vote', description: 'Manages voting, governance, and proposal decisions' },
              ].map(tpl => (
                <div key={tpl.name}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', cursor: 'default', transition: '160ms' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon icon={tpl.icon} width={22} height={22} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff', margin: 0 }}>{tpl.name}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '3px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>{tpl.description}</p>
                  </div>
                  <Icon icon="lucide:chevron-right" width={18} height={18} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                </div>
              ))}

            </div>
          </div>
        </div>
      )}

      {/* ── Bluesky Avatar Modal ── */}
      {kind === 'avatar' && bskyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setBskyModal(false); setBskyWhatsIncluded(false); setBskyOpenCat(null); setBskyError(''); setBskyShowForm(false) }} />
          <div className="relative w-full max-w-lg rounded-2xl shadow-2xl" style={{ background: '#0D1140', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '88vh', overflowY: 'auto' }}>

            {/* Header with gradient accent */}
            <div style={{ background: 'linear-gradient(135deg, rgba(0,133,255,0.15) 0%, transparent 60%)', borderRadius: '16px 16px 0 0', padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,133,255,0.2)', border: '1.5px solid rgba(0,133,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon icon="simple-icons:bluesky" width={22} height={22} style={{ color: '#0085FF' }} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400, fontSize: 20, color: '#fff', margin: 0, lineHeight: 1.2 }}>Bluesky Avatar</h3>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                      {bskyAccounts.length > 0
                        ? `${bskyAccounts.length} account${bskyAccounts.length > 1 ? 's' : ''} connected · 7 automations each`
                        : '7 automations · Full Bluesky access'}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setBskyModal(false); setBskyWhatsIncluded(false); setBskyOpenCat(null); setBskyError(''); setBskyShowForm(false) }}
                  className="rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon="lucide:x" width={16} height={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 24px 24px' }}>

              {/* Success banner */}
              {bskySuccess && (
                <div style={{ background: 'rgba(0,235,117,0.08)', border: '1px solid rgba(0,235,117,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon icon="lucide:check-circle-2" width={18} height={18} style={{ color: '#00EB75', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: '#00EB75', margin: 0, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>{bskySuccess}</p>
                </div>
              )}

              {/* Connected accounts */}
              {bskyAccounts.length > 0 && !bskyShowForm && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Connected Accounts</p>
                  {bskyAccounts.map((acct: any) => (
                    <div key={acct.presenceId} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', marginBottom: 8, transition: '160ms' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,133,255,0.12)', border: '1px solid rgba(0,133,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon icon="simple-icons:bluesky" width={14} height={14} style={{ color: '#4da6ff' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: 14, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{acct.name}</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>@{acct.blueskyHandle}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 12, whiteSpace: 'nowrap' as const, padding: '3px 8px', borderRadius: 6, background: acct.status === 'active' ? 'rgba(0,235,117,0.1)' : 'rgba(255,255,255,0.06)', color: acct.status === 'active' ? '#00EB75' : 'rgba(255,255,255,0.4)', border: `1px solid ${acct.status === 'active' ? 'rgba(0,235,117,0.25)' : 'rgba(255,255,255,0.1)'}` }}>
                          {acct.status === 'active' ? '● Active' : '○ Paused'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => setBskyConfirm({ presenceId: acct.presenceId, name: acct.name, action: acct.status === 'active' ? 'pause' : 'resume' })} disabled={bskyPausingId === acct.presenceId}
                          style={{ fontSize: 12, fontWeight: 600, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', color: acct.status === 'active' ? '#ffaa00' : '#00EB75', opacity: bskyPausingId === acct.presenceId ? 0.4 : 1, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                          {bskyPausingId === acct.presenceId ? '...' : acct.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                        </button>
                        <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 16 }}>·</span>
                        <button onClick={() => setBskyConfirm({ presenceId: acct.presenceId, name: acct.name, action: 'remove' })} disabled={bskyPausingId === acct.presenceId}
                          style={{ fontSize: 12, fontWeight: 600, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,100,100,0.8)', opacity: bskyPausingId === acct.presenceId ? 0.4 : 1, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Another Avatar button */}
              {bskyAccounts.length > 0 && !bskyShowForm && (
                <button onClick={() => setBskyShowForm(true)}
                  className="w-full transition-colors"
                  style={{ fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontSize: 13, fontWeight: 600, padding: '11px 16px', borderRadius: 10, border: '1px dashed rgba(0,133,255,0.3)', background: 'transparent', color: '#4da6ff', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon icon="lucide:plus" width={14} height={14} /> Add Another Account
                </button>
              )}

              {/* Setup form */}
              {(bskyAccounts.length === 0 || bskyShowForm) && (
                <div>
                  {bskyAccounts.length > 0 && bskyShowForm && (
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', marginBottom: 14, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Add New Account</p>
                  )}

                  {bskyEmpowerAccounts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 16px', background: 'rgba(0,133,255,0.04)', border: '1px solid rgba(0,133,255,0.12)', borderRadius: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,133,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <Icon icon="lucide:plug" width={22} height={22} style={{ color: '#4da6ff' }} />
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 6px', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>No Bluesky accounts connected</p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 18px', lineHeight: 1.5, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Go to Empower to connect your Bluesky account first, then come back here to set up your avatar.</p>
                      <button onClick={() => router.push('/empower')}
                        style={{ fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontSize: 13, fontWeight: 700, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#EAAA00', color: '#09073A', cursor: 'pointer' }}>
                        Go to Empower →
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Avatar Name <span style={{ color: '#ff6b6b' }}>*</span></label>
                        <input type="text" value={bskyForm.name} onChange={e => setBskyForm({ ...bskyForm, name: e.target.value })} placeholder="e.g. My Personal Bluesky" maxLength={30} autoComplete="off"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none', fontFamily: '"Avenir", ui-sans-serif, sans-serif', transition: '160ms' }}
                          onFocus={e => (e.target.style.borderColor = 'rgba(0,133,255,0.5)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                          <span style={{ fontSize: 11, color: bskyForm.name.trim().length > 0 && bskyForm.name.trim().length < 2 ? '#ff6b6b' : 'transparent' }}>Min 2 characters</span>
                          <span style={{ fontSize: 11, color: bskyForm.name.length >= 25 ? '#ffaa00' : 'rgba(255,255,255,0.25)' }}>{bskyForm.name.length}/30</span>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Select Bluesky Account <span style={{ color: '#ff6b6b' }}>*</span></label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {bskyEmpowerAccounts.map((acct: any) => {
                            const alreadyUsed = bskyAccounts.some((a: any) => a.blueskyHandle === (acct.external_handle || '').replace('@', ''))
                            const isSelected = bskyForm.selectedAccountId === acct.id
                            return (
                              <label key={acct.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: alreadyUsed ? 'not-allowed' : 'pointer', background: isSelected ? 'rgba(0,133,255,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${isSelected ? 'rgba(0,133,255,0.5)' : 'rgba(255,255,255,0.08)'}`, opacity: alreadyUsed ? 0.4 : 1, transition: '160ms' }}>
                                <input type="radio" name="bskyAccount" value={acct.id} disabled={alreadyUsed} checked={isSelected} onChange={() => setBskyForm({ ...bskyForm, selectedAccountId: bskyForm.selectedAccountId === acct.id ? '' : acct.id })} style={{ accentColor: '#0085FF', width: 16, height: 16 }} />
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: 14, color: '#fff', margin: 0, fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontWeight: 500 }}>{acct.external_handle || acct.id}</p>
                                </div>
                                {alreadyUsed && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Already in use</span>}
                                {isSelected && !alreadyUsed && <Icon icon="lucide:check-circle-2" width={16} height={16} style={{ color: '#0085FF' }} />}
                              </label>
                            )
                          })}
                        </div>
                        <button onClick={() => router.push('/empower')}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#4da6ff', fontSize: 12, fontWeight: 600, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                          <Icon icon="lucide:plus-circle" width={13} height={13} /> Add account on Empower
                        </button>
                      </div>

                      {/* Character selection */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Choose Character <span style={{ color: '#ff6b6b' }}>*</span></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {CHARACTER_PRESETS.map(preset => {
                            const isSelected = bskyForm.selectedCharacter === preset.id
                            return (
                              <button key={preset.id} onClick={() => {
                                const handle = bskyEmpowerAccounts.find((a: any) => a.id === bskyForm.selectedAccountId)?.external_handle?.replace('@', '') || 'yourhandle'
                                const personality = CHARACTER_PERSONALITIES[preset.id] || ''
                                const approvalRules = generateApprovalRulesText(automationState)
                                const fullPrompt = preset.id !== 'custom'
                                  ? buildSystemPrompt(handle, personality, approvalRules, DEFAULT_SAFETY)
                                  : ''
                                setBskyForm({ ...bskyForm, selectedCharacter: preset.id, customCharacterText: '', systemPrompt: fullPrompt })
                              }}
                                style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: isSelected ? 'rgba(0,133,255,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${isSelected ? 'rgba(0,133,255,0.5)' : 'rgba(255,255,255,0.08)'}`, transition: '160ms' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <span style={{ fontSize: 16 }}>{preset.icon}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>{preset.name}</span>
                                  {isSelected && <Icon icon="lucide:check-circle-2" width={13} height={13} style={{ color: '#0085FF', marginLeft: 'auto' }} />}
                                </div>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>{preset.description}</p>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Custom character input + Generate */}
                      {bskyForm.selectedCharacter === 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input type="text" value={bskyForm.customCharacterText}
                            onChange={e => setBskyForm({ ...bskyForm, customCharacterText: e.target.value })}
                            placeholder="e.g. Angry, Sarcastic, Motivational Coach..."
                            style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, outline: 'none', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}
                            onFocus={e => (e.target.style.borderColor = 'rgba(0,133,255,0.5)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                          <button onClick={handleGenerateCustomCharacter} disabled={bskyGenerating || !bskyForm.customCharacterText.trim()}
                            style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: bskyGenerating || !bskyForm.customCharacterText.trim() ? 'rgba(0,133,255,0.3)' : '#0085FF', color: '#fff', fontSize: 13, fontWeight: 600, cursor: bskyGenerating ? 'wait' : 'pointer', fontFamily: '"Avenir", ui-sans-serif, sans-serif', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' as const }}>
                            {bskyGenerating ? <><Icon icon="lucide:loader-2" width={13} height={13} className="animate-spin" /> Generating…</> : <><Icon icon="lucide:sparkles" width={13} height={13} /> Generate</>}
                          </button>
                        </div>
                      )}

                      {/* System Prompt — always visible, structured sections */}
                      {bskyForm.systemPrompt && bskyForm.selectedCharacter && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>

                          {/* System Prompt block */}
                          <div style={{ borderRadius: 12, border: `1px solid ${bskyEditSection === 'system' ? 'rgba(0,133,255,0.45)' : 'rgba(255,255,255,0.1)'}`, overflow: 'hidden' }}>
                            <button onClick={() => setBskyEditSection(bskyEditSection === 'system' ? null : 'system')}
                              style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon icon="lucide:file-text" width={13} height={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>System Prompt</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                  {bskyEditSection === 'system' ? 'Close' : 'Edit'}
                                </span>
                                <Icon icon="lucide:pencil" width={13} height={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                              </div>
                            </button>

                            {bskyEditSection !== 'system' ? (
                              /* Closed — show automation config button + summary */
                              <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {/* Automation configure button */}
                                <button onClick={() => setBskyShowApprovalConfig(!bskyShowApprovalConfig)}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: `1px solid ${bskyShowApprovalConfig ? 'rgba(255,170,0,0.4)' : 'rgba(255,170,0,0.2)'}`, background: bskyShowApprovalConfig ? 'rgba(255,170,0,0.1)' : 'rgba(255,170,0,0.05)', cursor: 'pointer' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Icon icon="lucide:settings-2" width={14} height={14} style={{ color: '#ffaa00' }} />
                                    <div style={{ textAlign: 'left' }}>
                                      <p style={{ fontSize: 13, fontWeight: 600, color: '#ffaa00', margin: 0, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Configure Automations</p>
                                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                        Choose which actions run automatically and which ask for your approval first
                                      </p>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: '"Avenir", ui-sans-serif, sans-serif', whiteSpace: 'nowrap' as const }}>
                                      {Object.values(automationState).filter(s => s === 'auto').length} auto · {Object.values(automationState).filter(s => s === 'approval').length} ask me
                                    </span>
                                    <Icon icon={bskyShowApprovalConfig ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={14} height={14} style={{ color: '#ffaa00' }} />
                                  </div>
                                </button>

                                {/* Automation chips — only when expanded */}
                                {bskyShowApprovalConfig && (
                                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.15)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, fontSize: 11, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.5)' }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00EB75', display: 'inline-block' }} />Auto — runs on its own
                                      </span>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.5)' }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffaa00', display: 'inline-block' }} />Ask Me — asks before acting
                                      </span>
                                    </div>
                                    {AUTOMATION_CATEGORIES.map(cat => (
                                      <div key={cat.id} style={{ marginBottom: 12 }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', margin: '0 0 7px', fontFamily: '"Avenir", ui-sans-serif, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{cat.icon} {cat.name}</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                                          {cat.automations.map(auto => {
                                            const st = automationState[auto.id] || 'approval'
                                            const isAuto = st === 'auto'
                                            return (
                                              <button key={auto.id}
                                                onClick={() => {
                                                  const ns = { ...automationState, [auto.id]: (isAuto ? 'approval' : 'auto') as ApprovalState }
                                                  setAutomationState(ns)
                                                  const nr = generateApprovalRulesText(ns)
                                                  const up = bskyForm.systemPrompt.replace(/(## Automation Approval Rules\n)([\s\S]*?)(\n## Safety)/, `$1${nr}$3`)
                                                  setBskyForm(prev => ({ ...prev, systemPrompt: up }))
                                                }}
                                                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: '"Avenir", ui-sans-serif, sans-serif', transition: '160ms', background: isAuto ? 'rgba(0,235,117,0.12)' : 'rgba(255,170,0,0.1)', color: isAuto ? '#00EB75' : '#ffaa00', border: `1px solid ${isAuto ? 'rgba(0,235,117,0.3)' : 'rgba(255,170,0,0.25)'}` }}>
                                                {auto.name}
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Open — full editable textarea */
                              <textarea
                                autoFocus
                                value={bskyForm.systemPrompt}
                                onChange={e => setBskyForm({ ...bskyForm, systemPrompt: e.target.value })}
                                rows={12}
                                style={{ width: '100%', padding: '14px', background: 'rgba(0,0,0,0.2)', border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: 12, outline: 'none', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', resize: 'none', lineHeight: 1.7 }} />
                            )}
                          </div>

                          {/* Knowledge Base selector */}
                          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon icon="lucide:book-open" width={13} height={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Knowledge Base <span style={{ color: '#ff6b6b' }}>*</span></span>
                              </div>
                              <button onClick={() => router.push('/knowledge')}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                <Icon icon="lucide:plus" width={11} height={11} />
                                Add Knowledge
                              </button>
                            </div>
                            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>

                              {/* Default Bluesky Platform Knowledge — always visible, pre-checked */}
                              <div style={{ marginBottom: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', background: bskyIncludeWisdom ? 'rgba(0,133,255,0.08)' : 'transparent', border: `1px solid ${bskyIncludeWisdom ? 'rgba(0,133,255,0.3)' : 'rgba(255,255,255,0.06)'}`, transition: '160ms' }}>
                                  <input type="checkbox" checked={bskyIncludeWisdom} onChange={() => setBskyIncludeWisdom(!bskyIncludeWisdom)} style={{ accentColor: '#0085FF' }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: bskyIncludeWisdom ? '#fff' : 'rgba(255,255,255,0.6)', margin: 0, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Bluesky Platform Knowledge</p>
                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Default · Post rules, engagement, threading, best practices</p>
                                  </div>
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBskyWisdomExpanded(!bskyWisdomExpanded) }}
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: '"Avenir", ui-sans-serif, sans-serif', flexShrink: 0 }}>
                                    {bskyWisdomExpanded ? 'Close' : 'Preview & Edit'}
                                  </button>
                                </label>
                                {bskyWisdomExpanded && (
                                  <div style={{ marginTop: 6, borderRadius: 8, border: '1px solid rgba(0,133,255,0.2)', overflow: 'hidden' }}>
                                    <textarea
                                      value={bskyWisdomContent}
                                      onChange={(e) => setBskyWisdomContent(e.target.value)}
                                      rows={10}
                                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 11, outline: 'none', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', resize: 'vertical', lineHeight: 1.6, minHeight: 120 }}
                                    />
                                    <div style={{ padding: '6px 12px', background: 'rgba(0,133,255,0.04)', borderTop: '1px solid rgba(0,133,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>{bskyWisdomContent.length} characters</span>
                                      <span style={{ fontSize: 10, color: 'rgba(0,133,255,0.5)', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Editable — changes apply to this avatar only</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* User's existing KBs — paginated (3 per page) */}
                              {userKBs.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.25)', margin: '8px 0 6px', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Your Knowledge Bases</p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {userKBs.slice((bskyKbPage - 1) * BSKY_KB_PAGE_SIZE, bskyKbPage * BSKY_KB_PAGE_SIZE).map((kb: any) => (
                                      <label key={kb.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', background: bskyForm.selectedKbIds.includes(kb.id) ? 'rgba(0,133,255,0.08)' : 'transparent', border: `1px solid ${bskyForm.selectedKbIds.includes(kb.id) ? 'rgba(0,133,255,0.3)' : 'rgba(255,255,255,0.06)'}`, transition: '160ms' }}>
                                        <input type="checkbox" name="bskyKb" value={kb.id} checked={bskyForm.selectedKbIds.includes(kb.id)}
                                          onChange={() => {
                                            const ids = bskyForm.selectedKbIds.includes(kb.id)
                                              ? bskyForm.selectedKbIds.filter((id: string) => id !== kb.id)
                                              : [...bskyForm.selectedKbIds, kb.id]
                                            setBskyForm({ ...bskyForm, selectedKbIds: ids })
                                          }} style={{ accentColor: '#0085FF' }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <p style={{ fontSize: 13, fontWeight: 600, color: bskyForm.selectedKbIds.includes(kb.id) ? '#fff' : 'rgba(255,255,255,0.6)', margin: 0, fontFamily: '"Avenir", ui-sans-serif, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{kb.name}</p>
                                          {kb.description && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{kb.description}</p>}
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                  {/* Pagination — only when more than 3 KBs */}
                                  {userKBs.length > BSKY_KB_PAGE_SIZE && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                      <button
                                        disabled={bskyKbPage === 1}
                                        onClick={() => setBskyKbPage(p => Math.max(1, p - 1))}
                                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: bskyKbPage === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', cursor: bskyKbPage === 1 ? 'not-allowed' : 'pointer', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                        ← Prev
                                      </button>
                                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                        {bskyKbPage} / {Math.ceil(userKBs.length / BSKY_KB_PAGE_SIZE)}
                                      </span>
                                      <button
                                        disabled={bskyKbPage >= Math.ceil(userKBs.length / BSKY_KB_PAGE_SIZE)}
                                        onClick={() => setBskyKbPage(p => Math.min(Math.ceil(userKBs.length / BSKY_KB_PAGE_SIZE), p + 1))}
                                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: bskyKbPage >= Math.ceil(userKBs.length / BSKY_KB_PAGE_SIZE) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', cursor: bskyKbPage >= Math.ceil(userKBs.length / BSKY_KB_PAGE_SIZE) ? 'not-allowed' : 'pointer', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                        Next →
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {userKBs.length === 0 && !bskyIncludeWisdom && (
                                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 6px', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>No additional knowledge bases</p>
                                  <button onClick={() => router.push('/knowledge')}
                                    style={{ fontSize: 12, fontWeight: 600, color: '#4da6ff', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                    Create one on the Knowledge page →
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      )}

                                            {bskyError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,58,58,0.08)', border: '1px solid rgba(255,58,58,0.2)', borderRadius: 8 }}>
                          <Icon icon="lucide:alert-circle" width={14} height={14} style={{ color: '#ff6b6b', flexShrink: 0 }} />
                          <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>{bskyError}</p>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
                        {bskyShowForm && bskyAccounts.length > 0 && (
                          <button onClick={() => { setBskyShowForm(false); setBskyError(''); setBskyForm({ name: '', selectedAccountId: '', selectedCharacter: '', customCharacterText: '', systemPrompt: '', selectedKbIds: [] as string[] }) }}
                            style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                            Cancel
                          </button>
                        )}
                        <button onClick={handleBskyCreate} disabled={bskyCreating || !bskyForm.name.trim() || !bskyForm.selectedAccountId || !bskyForm.selectedCharacter || (bskyForm.selectedCharacter === 'custom' && !bskyForm.systemPrompt.trim())}
                          style={{ flex: 1, fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontSize: 14, fontWeight: 700, padding: '11px 28px', borderRadius: 10, border: 'none', background: '#EAAA00', color: '#09073A', cursor: bskyCreating ? 'wait' : 'pointer', opacity: (!bskyForm.name.trim() || !bskyForm.selectedAccountId || !bskyForm.selectedCharacter || (bskyForm.selectedCharacter === 'custom' && !bskyForm.systemPrompt.trim())) ? 0.45 : 1, transition: '160ms' }}>
                          {bskyCreating ? 'Setting up…' : 'Use Template'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* View Automations toggle */}
              <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <button onClick={() => { setBskyWhatsIncluded(!bskyWhatsIncluded); setBskyOpenCat(null) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4da6ff', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>{bskyWhatsIncluded ? 'Hide Automations' : 'View Automations'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>7 automations</span>
                    <Icon icon={bskyWhatsIncluded ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={14} height={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                </button>
              </div>
              {bskyWhatsIncluded && (
                <div style={{ marginTop: 10, padding: '4px 0' }}>
                  {bskyAvatar.categories.map((cat, i) => (
                    <div key={cat.name} style={{ borderBottom: i < bskyAvatar.categories.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <button onClick={() => setBskyOpenCat(bskyOpenCat === i ? null : i)}
                        style={{ width: '100%', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{cat.icon} {cat.name} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>({cat.count})</span></span>
                        <Icon icon={bskyOpenCat === i ? 'lucide:chevron-down' : 'lucide:chevron-right'} width={13} height={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                      {bskyOpenCat === i && (
                        <div style={{ paddingBottom: 10, paddingLeft: 26 }}>
                          {cat.skills.map(s => (<p key={s.name} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '5px 0', lineHeight: 1.5, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>• {s.description}</p>))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bluesky Confirm Popup ── */}
      {bskyConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBskyConfirm(null)} />
          <div className="relative w-full max-w-md p-6 rounded-xl shadow-2xl" style={{ background: '#0A0D33', border: '1px solid rgba(255,255,255,0.12)' }}>
            <h3 className="text-lg text-white mb-2" style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400 }}>
              {bskyConfirm.action === 'pause' ? 'Pause Automations?' : bskyConfirm.action === 'resume' ? 'Resume Automations?' : 'Remove Account?'}
            </h3>
            <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {bskyConfirm.action === 'pause'
                ? <>&ldquo;{bskyConfirm.name}&rdquo; automations will be paused. You can still chat with this agent.</>
                : bskyConfirm.action === 'resume'
                  ? <>&ldquo;{bskyConfirm.name}&rdquo; automations will be resumed. All 7 skills will start running again.</>
                  : <>&ldquo;{bskyConfirm.name}&rdquo; will be permanently removed. This cannot be undone.</>}
            </p>
            {bskyConfirm.action === 'remove' && (<span className="block mb-4 text-xs text-amber-400">⚠️ This will also remove the associated Performer and all automations.</span>)}
            <div className="flex gap-3">
              <button onClick={() => setBskyConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm transition-colors" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>Cancel</button>
              {bskyConfirm.action === 'remove' ? (
                <button onClick={() => handleBskyRemove(bskyConfirm.presenceId)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"><Icon icon="lucide:trash-2" width={16} height={16} /> Delete</button>
              ) : bskyConfirm.action === 'pause' ? (
                <button onClick={() => handleBskyPauseResume(bskyConfirm.presenceId, 'active')} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2" style={{ background: '#EAAA00' }} onMouseEnter={e => (e.currentTarget.style.background = '#d49a00')} onMouseLeave={e => (e.currentTarget.style.background = '#EAAA00')}><Icon icon="lucide:pause" width={16} height={16} /> Pause</button>
              ) : (
                <button onClick={() => handleBskyPauseResume(bskyConfirm.presenceId, 'paused')} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2" style={{ background: '#22c55e' }} onMouseEnter={e => (e.currentTarget.style.background = '#16a34a')} onMouseLeave={e => (e.currentTarget.style.background = '#22c55e')}><Icon icon="lucide:play" width={16} height={16} /> Resume</button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ── Executive Avatar Modal ── */}
      {kind === 'avatar' && execModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setExecModal(false); setExecWhatsIncluded(false); setExecOpenCat(null); setExecError(''); setExecShowForm(false) }} />
          <div className="relative w-full max-w-lg rounded-2xl shadow-2xl" style={{ background: '#0D1140', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '88vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, rgba(66,133,244,0.15) 0%, transparent 60%)', borderRadius: '16px 16px 0 0', padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(66,133,244,0.2)', border: '1.5px solid rgba(66,133,244,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon icon="lucide:briefcase" width={22} height={22} style={{ color: '#4285F4' }} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400, fontSize: 20, color: '#fff', margin: 0, lineHeight: 1.2 }}>Executive Avatar</h3>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                      {execAccounts.length > 0
                        ? `${execAccounts.length} account${execAccounts.length > 1 ? 's' : ''} connected · 4 automations each`
                        : '4 automations · Gmail, Calendar, Meet'}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setExecModal(false); setExecWhatsIncluded(false); setExecOpenCat(null); setExecError(''); setExecShowForm(false) }}
                  className="rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon="lucide:x" width={16} height={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 24px 24px' }}>
              {execSuccess && (
                <div style={{ background: 'rgba(0,235,117,0.08)', border: '1px solid rgba(0,235,117,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon icon="lucide:check-circle-2" width={18} height={18} style={{ color: '#00EB75', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: '#00EB75', margin: 0, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>{execSuccess}</p>
                </div>
              )}

              {execAccounts.length > 0 && !execShowForm && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Connected Accounts</p>
                  {execAccounts.map((acct: any) => (
                    <div key={acct.presenceId} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon icon="lucide:mail" width={14} height={14} style={{ color: '#4285F4' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: 14, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{acct.name}</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>{acct.email}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 12, whiteSpace: 'nowrap' as const, padding: '3px 8px', borderRadius: 6, background: acct.status === 'active' ? 'rgba(0,235,117,0.1)' : 'rgba(255,255,255,0.06)', color: acct.status === 'active' ? '#00EB75' : 'rgba(255,255,255,0.4)', border: `1px solid ${acct.status === 'active' ? 'rgba(0,235,117,0.25)' : 'rgba(255,255,255,0.1)'}` }}>
                          {acct.status === 'active' ? '● Active' : '○ Paused'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => setExecConfirm({ presenceId: acct.presenceId, name: acct.name, action: acct.status === 'active' ? 'pause' : 'resume' })} disabled={execPausingId === acct.presenceId}
                          style={{ fontSize: 12, fontWeight: 600, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', color: acct.status === 'active' ? '#ffaa00' : '#00EB75', opacity: execPausingId === acct.presenceId ? 0.4 : 1 }}>
                          {execPausingId === acct.presenceId ? '...' : acct.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                        </button>
                        <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 16 }}>·</span>
                        <button onClick={() => setExecConfirm({ presenceId: acct.presenceId, name: acct.name, action: 'remove' })} disabled={execPausingId === acct.presenceId}
                          style={{ fontSize: 12, fontWeight: 600, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,100,100,0.8)', opacity: execPausingId === acct.presenceId ? 0.4 : 1 }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {execAccounts.length > 0 && !execShowForm && (
                <button onClick={() => setExecShowForm(true)} className="w-full transition-colors"
                  style={{ fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontSize: 13, fontWeight: 600, padding: '11px 16px', borderRadius: 10, border: '1px dashed rgba(66,133,244,0.3)', background: 'transparent', color: '#4285F4', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon icon="lucide:plus" width={14} height={14} /> Add Another Account
                </button>
              )}

              {(execAccounts.length === 0 || execShowForm) && (
                <div>
                  {execAccounts.length > 0 && execShowForm && (
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>Add New Account</p>
                  )}
                  {execEmpowerAccounts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 16px', background: 'rgba(66,133,244,0.04)', border: '1px solid rgba(66,133,244,0.12)', borderRadius: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(66,133,244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <Icon icon="lucide:plug" width={22} height={22} style={{ color: '#4285F4' }} />
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>No Google accounts connected</p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 18px', lineHeight: 1.5 }}>Go to Empower to connect your Google account first.</p>
                      <button onClick={() => router.push('/empower')} style={{ fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontSize: 13, fontWeight: 700, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#EAAA00', color: '#09073A', cursor: 'pointer' }}>Go to Empower →</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Assistant Name <span style={{ color: '#ff6b6b' }}>*</span></label>
                        <input type="text" value={execForm.name} onChange={e => setExecForm({ ...execForm, name: e.target.value })} placeholder="e.g. My Work Assistant" maxLength={30} autoComplete="off"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}
                          onFocus={e => (e.target.style.borderColor = 'rgba(66,133,244,0.5)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
                          <span style={{ fontSize: 11, color: execForm.name.length >= 25 ? '#ffaa00' : 'rgba(255,255,255,0.25)' }}>{execForm.name.length}/30</span>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>Select Google Account <span style={{ color: '#ff6b6b' }}>*</span></label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {execEmpowerAccounts.map((acct: any) => {
                            const alreadyUsed = execAccounts.some((a: any) => a.email === (acct.external_handle || ''))
                            const isSelected = execForm.selectedAccountId === acct.id
                            return (
                              <label key={acct.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: alreadyUsed ? 'not-allowed' : 'pointer', background: isSelected ? 'rgba(66,133,244,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${isSelected ? 'rgba(66,133,244,0.5)' : 'rgba(255,255,255,0.08)'}`, opacity: alreadyUsed ? 0.4 : 1 }}>
                                <input type="radio" name="execAccount" value={acct.id} disabled={alreadyUsed} checked={isSelected} onChange={() => setExecForm({ ...execForm, selectedAccountId: acct.id })} style={{ accentColor: '#4285F4', width: 16, height: 16 }} />
                                <p style={{ fontSize: 14, color: '#fff', margin: 0, flex: 1 }}>{acct.external_handle || acct.id}</p>
                                {alreadyUsed && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Already in use</span>}
                                {isSelected && !alreadyUsed && <Icon icon="lucide:check-circle-2" width={16} height={16} style={{ color: '#4285F4' }} />}
                              </label>
                            )
                          })}
                        </div>
                        <button onClick={() => router.push('/empower')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#4285F4', fontSize: 12, fontWeight: 600 }}>
                          <Icon icon="lucide:plus-circle" width={13} height={13} /> Add account on Empower
                        </button>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>Select Telegram Bot <span style={{ color: '#ff6b6b' }}>*</span></label>
                        {execTelegramAccounts.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {execTelegramAccounts.map((acct: any) => {
                              const isSelected = execForm.selectedTelegramId === acct.id
                              return (
                                <label key={acct.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', background: isSelected ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${isSelected ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                                  <input type="radio" name="execTelegram" value={acct.id} checked={isSelected} onChange={() => setExecForm({ ...execForm, selectedTelegramId: isSelected ? '' : acct.id })} style={{ accentColor: '#60a5fa', width: 16, height: 16 }} />
                                  <Icon icon="simple-icons:telegram" width={18} height={18} style={{ color: '#60a5fa' }} />
                                  <p style={{ fontSize: 14, color: '#fff', margin: 0, flex: 1 }}>{acct.external_handle || acct.id}</p>
                                  {isSelected && <Icon icon="lucide:check-circle-2" width={16} height={16} style={{ color: '#60a5fa' }} />}
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0' }}>No Telegram bots connected. Add one on Empower to enable Telegram notifications.</p>
                        )}
                        <button onClick={() => router.push('/empower')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>
                          <Icon icon="lucide:plus-circle" width={13} height={13} /> Add Telegram bot on Empower
                        </button>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>Choose Character <span style={{ color: '#ff6b6b' }}>*</span></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          {CHARACTER_PRESETS.map(preset => {
                            const isSelected = execForm.selectedCharacter === preset.id
                            return (
                              <button key={preset.id} onClick={() => {
                                  const email = execEmpowerAccounts.find((a: any) => a.id === execForm.selectedAccountId)?.external_handle || 'your@email.com'
                                  const stance = preset.id !== 'custom'
                                    ? `You are a ${preset.name.toLowerCase()} AI executive assistant managing ${email}.

## Personality
${preset.description}

## Autonomous Behavior
1. Meeting Scheduler — detects meeting requests, checks conflicts, suggests alternatives
2. Daily Briefing — sends morning email with today's schedule
3. Smart Inbox Labeler — auto-labels emails
4. Bill Tracker — creates calendar reminders for due dates

## Safety Boundaries
- Never auto-confirm meetings without approval
- Never send emails without approval (except briefings)
- Never share private calendar details`
                                    : ''
                                  setExecForm({ ...execForm, selectedCharacter: preset.id, customCharacterText: '', systemPrompt: stance })
                                }}
                                style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: isSelected ? 'rgba(66,133,244,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${isSelected ? 'rgba(66,133,244,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <span style={{ fontSize: 16 }}>{preset.icon}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)' }}>{preset.name}</span>
                                  {isSelected && <Icon icon="lucide:check-circle-2" width={13} height={13} style={{ color: '#4285F4', marginLeft: 'auto' }} />}
                                </div>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>{preset.description}</p>
                              </button>
                            )
                          })}
                        </div>
                        {execForm.selectedCharacter === 'custom' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input type="text" value={execForm.customCharacterText}
                              onChange={e => setExecForm({ ...execForm, customCharacterText: e.target.value })}
                              placeholder="e.g. Angry, Sarcastic, Motivational Coach..."
                              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, outline: 'none', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}
                              onFocus={e => (e.target.style.borderColor = 'rgba(66,133,244,0.5)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                            <button onClick={handleExecGenerateCustomCharacter} disabled={execGenerating || !execForm.customCharacterText.trim()}
                              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: execGenerating || !execForm.customCharacterText.trim() ? 'rgba(66,133,244,0.3)' : '#4285F4', color: '#fff', fontSize: 13, fontWeight: 600, cursor: execGenerating ? 'wait' : 'pointer', fontFamily: '"Avenir", ui-sans-serif, sans-serif', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' as const }}>
                              {execGenerating ? <><Icon icon="lucide:loader-2" width={13} height={13} className="animate-spin" /> Generating…</> : <><Icon icon="lucide:sparkles" width={13} height={13} /> Generate</>}
                            </button>
                          </div>
                        )}
                      </div>
                      {execForm.systemPrompt && execForm.selectedCharacter && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                          <div style={{ borderRadius: 12, border: `1px solid ${execEditSection === 'system' ? 'rgba(66,133,244,0.45)' : 'rgba(255,255,255,0.1)'}`, overflow: 'hidden' }}>
                            <button onClick={() => setExecEditSection(execEditSection === 'system' ? null : 'system')}
                              style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon icon="lucide:file-text" width={13} height={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Stance</span>
                              </div>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{execEditSection === 'system' ? 'Close' : 'Edit'}</span>
                            </button>
                            {execEditSection === 'system' ? (
                              <textarea autoFocus value={execForm.systemPrompt} onChange={e => setExecForm({ ...execForm, systemPrompt: e.target.value })} rows={10}
                                style={{ width: '100%', padding: '14px', background: 'rgba(0,0,0,0.2)', border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: 12, outline: 'none', fontFamily: 'ui-monospace, monospace', resize: 'none', lineHeight: 1.7 }} />
                            ) : (
                                <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  <button onClick={(e) => { e.stopPropagation(); setExecShowApprovalConfig(!execShowApprovalConfig) }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: `1px solid ${execShowApprovalConfig ? 'rgba(255,170,0,0.4)' : 'rgba(255,170,0,0.2)'}`, background: execShowApprovalConfig ? 'rgba(255,170,0,0.1)' : 'rgba(255,170,0,0.05)', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <Icon icon="lucide:settings-2" width={14} height={14} style={{ color: '#ffaa00' }} />
                                      <div style={{ textAlign: 'left' }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#ffaa00', margin: 0, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Configure Automations</p>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                          Choose which actions run automatically and which ask for your approval first
                                        </p>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: '"Avenir", ui-sans-serif, sans-serif', whiteSpace: 'nowrap' as const }}>
                                        {Object.values(execAutomationState).filter(s => s === 'auto').length} auto · {Object.values(execAutomationState).filter(s => s === 'approval').length} ask me
                                      </span>
                                      <Icon icon={execShowApprovalConfig ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={14} height={14} style={{ color: '#ffaa00' }} />
                                    </div>
                                  </button>
                                  {execShowApprovalConfig && (
                                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.15)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, fontSize: 11, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.5)' }}>
                                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00EB75', display: 'inline-block' }} />Auto — runs on its own
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.5)' }}>
                                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffaa00', display: 'inline-block' }} />Ask Me — asks before acting
                                        </span>
                                      </div>
                                      {EXEC_AUTOMATION_CATEGORIES.map(cat => (
                                        <div key={cat.id} style={{ marginBottom: 12 }}>
                                          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', margin: '0 0 7px', fontFamily: '"Avenir", ui-sans-serif, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{cat.icon} {cat.name}</p>
                                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                                            {cat.automations.map(auto => {
                                              const st = execAutomationState[auto.id] || 'approval'
                                              const isAuto = st === 'auto'
                                              return (
                                                <button key={auto.id}
                                                  onClick={(e) => { e.stopPropagation(); setExecAutomationState(prev => ({ ...prev, [auto.id]: isAuto ? 'approval' : 'auto' })) }}
                                                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: '"Avenir", ui-sans-serif, sans-serif', transition: '160ms', background: isAuto ? 'rgba(0,235,117,0.12)' : 'rgba(255,170,0,0.1)', color: isAuto ? '#00EB75' : '#ffaa00', border: `1px solid ${isAuto ? 'rgba(0,235,117,0.3)' : 'rgba(255,170,0,0.25)'}` }}>
                                                  {auto.name}
                                                </button>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon icon="lucide:book-open" width={13} height={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>Knowledge Base</span>
                                {execForm.selectedKbIds.length > 0 && <span style={{ fontSize: 11, color: 'rgba(52,211,153,0.8)', marginLeft: 4 }}>{execForm.selectedKbIds.length} selected</span>}
                              </div>
                              <button onClick={() => router.push('/knowledge')}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                <Icon icon="lucide:plus" width={11} height={11} />
                                Add Knowledge
                              </button>
                            </div>
                            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
                              {userKBs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 6px', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>No knowledge bases yet</p>
                                  <button onClick={() => router.push('/knowledge')}
                                    style={{ fontSize: 12, fontWeight: 600, color: '#4da6ff', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: '"Avenir", ui-sans-serif, sans-serif' }}>
                                    Create one on the Knowledge page →
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {userKBs.map((kb: any) => (
                                    <label key={kb.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', background: execForm.selectedKbIds.includes(kb.id) ? 'rgba(0,133,255,0.08)' : 'transparent', border: `1px solid ${execForm.selectedKbIds.includes(kb.id) ? 'rgba(0,133,255,0.3)' : 'rgba(255,255,255,0.06)'}`, transition: '160ms' }}>
                                      <input type="checkbox" name="execKb" value={kb.id} checked={execForm.selectedKbIds.includes(kb.id)}
                                        onChange={() => {
                                          const ids = execForm.selectedKbIds.includes(kb.id)
                                            ? execForm.selectedKbIds.filter((id: string) => id !== kb.id)
                                            : [...execForm.selectedKbIds, kb.id]
                                          setExecForm({ ...execForm, selectedKbIds: ids })
                                        }} style={{ accentColor: '#0085FF' }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: execForm.selectedKbIds.includes(kb.id) ? '#fff' : 'rgba(255,255,255,0.6)', margin: 0, fontFamily: '"Avenir", ui-sans-serif, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{kb.name}</p>
                                        {kb.description && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', fontFamily: '"Avenir", ui-sans-serif, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{kb.description}</p>}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {execError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,58,58,0.08)', border: '1px solid rgba(255,58,58,0.2)', borderRadius: 8 }}>
                          <Icon icon="lucide:alert-circle" width={14} height={14} style={{ color: '#ff6b6b' }} />
                          <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>{execError}</p>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
                        {execShowForm && execAccounts.length > 0 && (
                          <button onClick={() => { setExecShowForm(false); setExecError(''); setExecForm({ name: '', selectedAccountId: '', selectedTelegramId: '', selectedCharacter: '', customCharacterText: '', systemPrompt: '', selectedKbIds: [] as string[] }) }}
                            style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                            Cancel
                          </button>
                        )}
                        <button onClick={handleExecCreate} disabled={execCreating || !execForm.name.trim() || !execForm.selectedAccountId || !execForm.selectedTelegramId || !execForm.selectedCharacter || (execForm.selectedCharacter === 'custom' && !execForm.customCharacterText.trim())}
                          style={{ flex: 1, fontFamily: '"Avenir", ui-sans-serif, sans-serif', fontSize: 14, fontWeight: 700, padding: '11px 28px', borderRadius: 10, border: 'none', background: '#EAAA00', color: '#09073A', cursor: execCreating ? 'wait' : 'pointer', opacity: (!execForm.name.trim() || !execForm.selectedAccountId || !execForm.selectedTelegramId || !execForm.selectedCharacter || (execForm.selectedCharacter === 'custom' && !execForm.customCharacterText.trim())) ? 0.45 : 1 }}>
                          {execCreating ? 'Setting up…' : 'Use Template'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <button onClick={() => { setExecWhatsIncluded(!execWhatsIncluded); setExecOpenCat(null) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4285F4' }}>{execWhatsIncluded ? 'Hide Automations' : 'View Automations'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>4 automations</span>
                    <Icon icon={execWhatsIncluded ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={14} height={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                </button>
              </div>
              {execWhatsIncluded && execAvatar && (
                <div style={{ marginTop: 10, padding: '4px 0' }}>
                  {execAvatar.categories.map((cat, i) => (
                    <div key={cat.name} style={{ borderBottom: i < execAvatar.categories.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <button onClick={() => setExecOpenCat(execOpenCat === i ? null : i)}
                        style={{ width: '100%', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{cat.icon} {cat.name} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>({cat.count})</span></span>
                        <Icon icon={execOpenCat === i ? 'lucide:chevron-down' : 'lucide:chevron-right'} width={13} height={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                      {execOpenCat === i && (
                        <div style={{ paddingBottom: 10, paddingLeft: 26 }}>
                          {cat.skills.map(s => (<p key={s.name} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '5px 0', lineHeight: 1.5 }}>• {s.description}</p>))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Executive Avatar Confirm Popup ── */}
      {execConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setExecConfirm(null)} />
          <div className="relative w-full max-w-md p-6 rounded-xl shadow-2xl" style={{ background: '#0A0D33', border: '1px solid rgba(255,255,255,0.12)' }}>
            <h3 className="text-lg text-white mb-2" style={{ fontFamily: '"Goudy Heavyface", Georgia, serif', fontWeight: 400 }}>
              {execConfirm.action === 'pause' ? 'Pause Automations?' : execConfirm.action === 'resume' ? 'Resume Automations?' : 'Remove Account?'}
            </h3>
            <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {execConfirm.action === 'pause'
                ? <>&ldquo;{execConfirm.name}&rdquo; automations will be paused.</>
                : execConfirm.action === 'resume'
                  ? <>&ldquo;{execConfirm.name}&rdquo; automations will be resumed.</>
                  : <>&ldquo;{execConfirm.name}&rdquo; will be permanently removed.</>}
            </p>
            {execConfirm.action === 'remove' && (<span className="block mb-4 text-xs text-amber-400">⚠️ This will also remove the associated Performer and all automations.</span>)}
            <div className="flex gap-3">
              <button onClick={() => setExecConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>Cancel</button>
              {execConfirm.action === 'remove' ? (
                <button onClick={() => handleExecRemove(execConfirm.presenceId)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center justify-center gap-2"><Icon icon="lucide:trash-2" width={16} height={16} /> Delete</button>
              ) : execConfirm.action === 'pause' ? (
                <button onClick={() => handleExecPauseResume(execConfirm.presenceId, 'active')} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2" style={{ background: '#EAAA00' }}><Icon icon="lucide:pause" width={16} height={16} /> Pause</button>
              ) : (
                <button onClick={() => handleExecPauseResume(execConfirm.presenceId, 'paused')} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2" style={{ background: '#22c55e' }}><Icon icon="lucide:play" width={16} height={16} /> Resume</button>
              )}
            </div>
          </div>
        </div>
      )}

        </div>
      )}
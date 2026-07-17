'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from '@iconify/react'
import {
  suggestHandle,
  isValidHandle,
  HANDLE_MAX,
  WORKER_ACCESS_LEVELS,
  PRESENCE_SUBTYPES,
} from '@/lib/agent-types'
import type { Presence, WorkerAccessLevel, AgentTone, PresenceSubtype } from '@/lib/agent-types'
import { createPresenceAgent, createWorkerAgent, checkHandleAvailability } from '@/lib/agents-api'
import { verifyToolCredentials, listSavedTools, type SavedTool } from '@/lib/tools-api'
import SkillTemplateDrawer from '@/components/SkillTemplateDrawer'
import { TEMPLATES_BY_ID } from '@/lib/skill-templates'
import { useAuth } from '@/lib/auth-context'

// ─────────────────────────────────────────────────────────────────────────────
// Auto-Save Draft Storage
// ─────────────────────────────────────────────────────────────────────────────

const PRESENCE_DRAFT_KEY_PREFIX = 'kinship_presence_draft_'
const WORKER_DRAFT_KEY_PREFIX = 'kinship_worker_draft_'
function getPresenceDraftKey(w: string): string { return w ? `${PRESENCE_DRAFT_KEY_PREFIX}${w}` : '' }
function getWorkerDraftKey(w: string): string { return w ? `${WORKER_DRAFT_KEY_PREFIX}${w}` : '' }
const AUTO_SAVE_DEBOUNCE_MS = 500

interface PresenceDraft {
  name: string
  handle: string
  briefDescription: string
  tagline: string
  tone: AgentTone
  presenceSubtype: PresenceSubtype
  isPrimaryMember: boolean
  selectedKnowledgeIds: string[]
  selectedPromptId: string | null
  selectedSkillIds: string[]
  selectedTemplateIds: string[]
  currentStep: number
  savedAt: number
}

interface WorkerDraft {
  name: string
  description: string
  tagline: string
  role: string
  accessLevel: WorkerAccessLevel
  parentPresenceId: string
  connectedTools: ConnectedTool[]
  selectedPromptId: string | null
  selectedSkillIds: string[]
  selectedTemplateIds: string[]
  currentStep: number
  savedAt: number
}

// Utility: Debounce function for auto-save
function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedFn
}

// Save draft to localStorage
function savePresenceDraft(draft: PresenceDraft, wallet: string): void {
  const key = getPresenceDraftKey(wallet)
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify(draft)) } catch (e) { console.warn('Failed to save presence draft:', e) }
}

function loadPresenceDraft(wallet: string): PresenceDraft | null {
  const key = getPresenceDraftKey(wallet)
  if (!key) return null
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const draft = JSON.parse(stored) as PresenceDraft
      if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) return draft
      localStorage.removeItem(key)
    }
  } catch (e) { console.warn('Failed to load presence draft:', e) }
  return null
}

function clearPresenceDraft(wallet: string): void {
  const key = getPresenceDraftKey(wallet)
  if (!key) return
  try { localStorage.removeItem(key) } catch (e) { console.warn('Failed to clear presence draft:', e) }
  try { localStorage.removeItem('kinship_presence_draft') } catch { }
}

function saveWorkerDraft(draft: WorkerDraft, wallet: string): void {
  const key = getWorkerDraftKey(wallet)
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify(draft)) } catch (e) { console.warn('Failed to save worker draft:', e) }
}

function loadWorkerDraft(wallet: string): WorkerDraft | null {
  const key = getWorkerDraftKey(wallet)
  if (!key) return null
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const draft = JSON.parse(stored) as WorkerDraft
      if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) return draft
      localStorage.removeItem(key)
    }
  } catch (e) { console.warn('Failed to load worker draft:', e) }
  return null
}

function clearWorkerDraft(wallet: string): void {
  const key = getWorkerDraftKey(wallet)
  if (!key) return
  try { localStorage.removeItem(key) } catch (e) { console.warn('Failed to clear worker draft:', e) }
  try { localStorage.removeItem('kinship_worker_draft') } catch { }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface KnowledgeBase {
  id: string
  name: string
  description?: string
}

interface Prompt {
  id: string
  name: string
  content?: string
  type?: string
}

interface Tool {
  id: string
  name: string
  description: string
  icon: string
  authType: string
  instructions?: string
}

// Connected tool with verified credentials
interface ConnectedTool {
  toolName: string
  credentials: Record<string, string>
  externalHandle?: string
  verified: boolean
}

// Available tools for Performer
const AVAILABLE_TOOLS: Tool[] = [
  {
    id: 'bluesky',
    name: 'Bluesky',
    description: 'Post, reply, and engage on Bluesky social network',
    icon: 'lucide:cloud',
    authType: 'app_password',
    instructions:
      "1. Go to Bluesky → Settings → App Passwords\n2. Click 'Add App Password'\n3. Name it 'Kinship Agent'\n4. Copy the generated password",
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Send messages and manage Telegram bots',
    icon: 'lucide:send',
    authType: 'bot_token',
    instructions:
      '1. Open Telegram and search for @BotFather\n2. Send /newbot and follow instructions\n3. Copy the Bot Token provided',
  },
  {
    id: 'solana',
    name: 'Solana',
    description: 'Connect external wallet for blockchain interactions',
    icon: 'simple-icons:solana',
    authType: 'wallet',
    instructions:
      '1. Get an RPC URL from Helius, QuickNode, or Alchemy\n2. Paste the full URL below (including API key)\n3. Your agents will use this endpoint for all blockchain interactions',
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Access Google services (Calendar, Drive, Gmail)',
    icon: 'mdi:google',
    authType: 'oauth2',
    instructions: "Click 'Sign in with Google' to authorize access via OAuth",
  }
]

// Tools that are currently enabled for connection
const ENABLED_TOOLS = ['bluesky', 'telegram', 'solana', 'google']

// Google tools to be sent as array instead of single "google"
const GOOGLE_TOOLS = [
  'google_gmail_tool',
  'google_calendar_tool',
  'google_meet_tool',
]

// Available tones for Presence agents
export const AGENT_TONES: {
  value: AgentTone
  label: string
  description: string
  icon: string
}[] = [
    {
      value: 'neutral',
      label: 'Neutral',
      description: 'Balanced and helpful',
      icon: 'lucide:minus',
    },
    {
      value: 'friendly',
      label: 'Friendly',
      description: 'Warm and approachable',
      icon: 'lucide:smile',
    },
    {
      value: 'professional',
      label: 'Professional',
      description: 'Formal and business-like',
      icon: 'lucide:briefcase',
    },
    {
      value: 'strict',
      label: 'Strict',
      description: 'Direct and authoritative',
      icon: 'lucide:shield-alert',
    },
    {
      value: 'cool',
      label: 'Cool',
      description: 'Laid-back and casual',
      icon: 'lucide:glasses',
    },
    {
      value: 'angry',
      label: 'Angry',
      description: 'Assertive and intense',
      icon: 'lucide:flame',
    },
    {
      value: 'playful',
      label: 'Playful',
      description: 'Fun and whimsical',
      icon: 'lucide:sparkles',
    },
    {
      value: 'wise',
      label: 'Wise',
      description: 'Thoughtful and philosophical',
      icon: 'lucide:graduation-cap',
    },
  ]

// ─────────────────────────────────────────────────────────────────────────────
// Choice Modal - Select Presence or Worker Agent
// ─────────────────────────────────────────────────────────────────────────────

interface CreateAgentChoiceModalProps {
  onClose: () => void
  onChoosePresence: () => void
  onChooseAgent: () => void
  presences: Presence[]
}

export function CreateAgentChoiceModal({
  onClose,
  onChoosePresence,
  onChooseAgent,
  presences,
}: CreateAgentChoiceModalProps) {
  const hasPresences = presences.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      <div className="relative bg-card border border-card-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-card-border">
          <div>
            <h2 className="text-xl font-bold text-white">Create New Agent</h2>
            <p className="text-sm text-muted mt-1">
              Choose what kind of agent to create
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors cursor-pointer"
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 gap-3 sm:gap-4">
          {/* Avatar (presence/supervisor) */}
          <button
            onClick={onChoosePresence}
            className="group text-left bg-background border border-card-border rounded-xl p-4 sm:p-5 transition-all hover:border-accent/60 hover:bg-accent/5"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/15 group-hover:bg-accent/25 flex items-center justify-center flex-shrink-0 transition-colors">
                <Icon
                  icon="lucide:crown"
                  width={22}
                  height={22}
                  className="text-accent"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-white font-semibold text-base">
                    Avatar
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/20 text-accent">
                    Supervisor
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  A top-level orchestrator that coordinates Performer agents
                  and serves as the primary interface.
                </p>
              </div>
              <Icon
                icon="lucide:chevron-right"
                width={18}
                height={18}
                className="text-muted group-hover:text-accent transition-colors flex-shrink-0 mt-3"
              />
            </div>
          </button>

          {/* Performer (worker) */}
          <button
            onClick={hasPresences ? onChooseAgent : undefined}
            disabled={!hasPresences}
            className={`group text-left bg-background border border-card-border rounded-xl p-4 sm:p-5 transition-all ${hasPresences
                ? 'hover:border-accent/60 hover:bg-accent/5 cursor-pointer'
                : 'cursor-not-allowed opacity-60'
              }`}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${hasPresences
                  ? 'bg-white/[0.06] group-hover:bg-white/[0.1]'
                  : 'bg-white/[0.03]'
                }`}>
                <Icon
                  icon="lucide:bot"
                  width={22}
                  height={22}
                  className={hasPresences ? 'text-white/70' : 'text-white/40'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className={`font-semibold text-base ${hasPresences ? 'text-white' : 'text-white/50'}`}>Performer</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.08] text-white/60">
                    Worker
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${hasPresences ? 'text-muted' : 'text-muted/70'}`}>
                  A specialized worker agent that executes tasks and can be
                  equipped with tools.
                </p>
                {!hasPresences && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <Icon icon="lucide:alert-triangle" width={12} height={12} />
                    Create an Avatar first to enable Performer creation
                  </p>
                )}
              </div>
              <Icon
                icon="lucide:chevron-right"
                width={18}
                height={18}
                className={`transition-colors flex-shrink-0 mt-3 ${hasPresences ? 'text-muted group-hover:text-accent' : 'text-white/20'
                  }`}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Avatar Modal (Presence/Supervisor) - 3 Steps
// Steps: 1. Basic Info → 2. Inform → 3. Stance
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePresenceModalProps {
  onClose: () => void
  onCreate: (presence: Presence) => void
  platformId?: string
  wallet: string

}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions for Presence Step 1
// ─────────────────────────────────────────────────────────────────────────────

const PRESENCE_NAME_MAX = 25
const PRESENCE_DESCRIPTION_MIN = 50
const PRESENCE_DESCRIPTION_MAX = 5000
const PRESENCE_TAGLINE_MAX = 255

function validatePresenceName(name: string): string | null {
  if (!name) return null
  if (name.trim().length === 0) return 'Name is required'
  if (name.length > PRESENCE_NAME_MAX)
    return `Max ${PRESENCE_NAME_MAX} characters`
  return null
}

function validatePresenceTagline(tagline: string): string | null {
  if (!tagline) return null
  if (tagline.length > PRESENCE_TAGLINE_MAX)
    return `Max ${PRESENCE_TAGLINE_MAX} characters`
  return null
}

function validatePresenceHandle(h: string): string | null {
  if (!h) return null
  if (!isValidHandle(h))
    return 'Only letters, numbers, underscores, and periods allowed'
  if (h.length > HANDLE_MAX) return `Max ${HANDLE_MAX} characters`
  return null
}

function validatePresenceDescription(desc: string): string | null {
  if (!desc) return null
  if (desc.trim().length === 0) return 'Description is required'
  if (desc.trim().length < PRESENCE_DESCRIPTION_MIN)
    return `At least ${PRESENCE_DESCRIPTION_MIN} characters required`
  if (desc.length > PRESENCE_DESCRIPTION_MAX)
    return `Max ${PRESENCE_DESCRIPTION_MAX} characters`
  return null
}

const PRESENCE_STEPS = [
  { id: 1, name: 'Basic Info', icon: 'lucide:user' },
  { id: 2, name: 'Inform', icon: 'lucide:brain' },
  { id: 3, name: 'Stance', icon: 'lucide:message-square-code' },
  { id: 4, name: 'Skills', icon: 'lucide:zap' },
]

export function CreatePresenceModal({
  onClose,
  onCreate,
  platformId,
  wallet,

}: CreatePresenceModalProps) {
  // Load draft from localStorage on mount
  const initialDraft = loadPresenceDraft(wallet)
  const { user } = useAuth()
  const isWizard = user?.role === 'wizard'

  const [currentStep, setCurrentStep] = useState(initialDraft?.currentStep || 1)

  // Step 1: Basic Info
  const [name, setName] = useState(initialDraft?.name || '')
  const [nameTouched, setNameTouched] = useState(false)
  const [handle, setHandle] = useState(initialDraft?.handle || '')
  const [handleTouched, setHandleTouched] = useState(false)
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [handleSuggestion, setHandleSuggestion] = useState<string | null>(null)
  const [handleChecking, setHandleChecking] = useState(false)
  const handleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCheckVersion = useRef(0) // tracks latest check to discard stale results
  const [briefDescription, setBriefDescription] = useState(
    initialDraft?.briefDescription || ''
  )
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [tagline, setTagline] = useState(initialDraft?.tagline || '')
  const [taglineTouched, setTaglineTouched] = useState(false)
  const [tone, setTone] = useState<AgentTone>(initialDraft?.tone || 'friendly')
  const [presenceSubtype, setPresenceSubtype] = useState<PresenceSubtype>(
    initialDraft?.presenceSubtype || 'member'
  )
  const [isPrimaryMember, setIsPrimaryMember] = useState(
    initialDraft?.isPrimaryMember || false
  )

  // Step 2: Inform
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>(
    initialDraft?.selectedKnowledgeIds || []
  )
  const [loadingKB, setLoadingKB] = useState(false)

  // Step 3: Stance
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(
    initialDraft?.selectedPromptId || null
  )
  const [loadingPrompts, setLoadingPrompts] = useState(false)

  // Step 4: Skills
  const [skills, setSkills] = useState<any[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
    initialDraft?.selectedSkillIds || []
  )
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    initialDraft?.selectedTemplateIds || []
  )
  const [loadingSkills, setLoadingSkills] = useState(false)
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false)

  // General state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLParagraphElement>(null)

  // Auto-save debounced function
  const saveDraft = useCallback(() => {
    const draft: PresenceDraft = {
      name,
      handle,
      briefDescription,
      tagline,
      tone,
      presenceSubtype,
      isPrimaryMember,
      selectedKnowledgeIds,
      selectedPromptId,
      selectedSkillIds,
      selectedTemplateIds,
      currentStep,
      savedAt: Date.now(),
    }
    savePresenceDraft(draft, wallet)
  }, [
    name,
    handle,
    briefDescription,
    tagline,
    tone,
    presenceSubtype,
    isPrimaryMember,
    selectedKnowledgeIds,
    selectedPromptId,
    selectedSkillIds,
    selectedTemplateIds,
    currentStep,
  ])

  const debouncedSaveDraft = useDebounce(saveDraft, AUTO_SAVE_DEBOUNCE_MS)

  // Auto-save on field changes
  useEffect(() => {
    // Only save if there's meaningful data
    if (
      name ||
      handle ||
      briefDescription ||
      tagline ||
      selectedKnowledgeIds.length > 0 ||
      selectedPromptId ||
      selectedSkillIds.length > 0 ||
      selectedTemplateIds.length > 0
    ) {
      debouncedSaveDraft()
    }
  }, [
    name,
    handle,
    briefDescription,
    tagline,
    tone,
    presenceSubtype,
    selectedKnowledgeIds,
    selectedPromptId,
    selectedSkillIds,
    selectedTemplateIds,
    debouncedSaveDraft,
  ])

  // Save draft immediately on step change
  useEffect(() => {
    if (name || handle || briefDescription) {
      saveDraft()
    }
  }, [currentStep])

  // Auto-scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])

  // Check handle availability on mount if restoring from draft
  useEffect(() => {
    if (handle && !handleAvailable && !handleChecking) {
      scheduleHandleCheck(handle)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStep === 2 && knowledgeBases.length === 0) {
      fetchKnowledgeBases()
    }
  }, [currentStep])

  useEffect(() => {
    if (currentStep === 3 && prompts.length === 0) {
      fetchPrompts()
      fetchPresenceAgentPromptMap()
    }
  }, [currentStep])

  // Step 4: Fetch skills
  useEffect(() => {
    if (currentStep === 4 && skills.length === 0) {
      fetchSkills()
    }
  }, [currentStep])

  async function fetchSkills() {
    setLoadingSkills(true)
    try {
      const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const params = new URLSearchParams({ page: '1', page_size: '100' })
      if (wallet) params.set('wallet', wallet)
      const res = await fetch(`${AGENT_API}/api/skills?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSkills(data.skills || [])
      }
    } catch (e) {
      console.error('Failed to fetch skills:', e)
    } finally {
      setLoadingSkills(false)
    }
  }

  function toggleSkill(id: string) {
    setSelectedSkillIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // Map of promptId → agent name (for locking assigned prompts)
  const [agentPromptMap, setAgentPromptMap] = useState<Record<string, string>>({})

  async function fetchPresenceAgentPromptMap() {
    try {
      const params = new URLSearchParams()
      if (wallet) params.set('wallet', wallet)
      if (platformId) params.set('platformId', platformId)
      params.set('includeWorkers', 'true')
      const res = await fetch(`/api/agents?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const agents = data.agents || []
        const map: Record<string, string> = {}
        for (const a of agents) {
          const pid = a.promptId || a.prompt_id
          if (pid) map[pid] = a.name
        }
        setAgentPromptMap(map)
      }
    } catch { }
  }

  async function fetchKnowledgeBases() {
    setLoadingKB(true)
    try {
      const AGENT_API_URL =
        process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const params = new URLSearchParams()
      if (wallet) params.set('wallet', wallet)
      if (platformId) params.set('platformId', platformId)
      const res = await fetch(
        `${AGENT_API_URL}/api/knowledge?${params.toString()}`
      )
      if (res.ok) {
        const data = await res.json()
        setKnowledgeBases(data.knowledgeBases || [])
      }
    } catch (error) {
      console.error('Error fetching knowledge bases:', error)
    } finally {
      setLoadingKB(false)
    }
  }

  async function fetchPrompts() {
    setLoadingPrompts(true)
    try {
      const AGENT_API_URL =
        process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const params = new URLSearchParams()
      if (wallet) params.set('wallet', wallet)
      if (platformId) params.set('platformId', platformId)
      const res = await fetch(
        `${AGENT_API_URL}/api/prompts?${params.toString()}`
      )
      if (res.ok) {
        const data = await res.json()
        setPrompts(data.prompts || [])
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoadingPrompts(false)
    }
  }

  // Debounced handle availability check
  function scheduleHandleCheck(h: string) {
    // Clear any pending check
    if (handleCheckTimer.current) {
      clearTimeout(handleCheckTimer.current)
    }
    // Reset state while waiting
    setHandleAvailable(null)
    setHandleSuggestion(null)

    // Don't check empty or format-invalid handles
    if (!h || validatePresenceHandle(h)) {
      setHandleChecking(false)
      return
    }

    setHandleChecking(true)
    const version = ++handleCheckVersion.current

    handleCheckTimer.current = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(h)
        // Discard if a newer check was started
        if (version !== handleCheckVersion.current) return
        setHandleAvailable(result.available)
        setHandleSuggestion(result.suggestion || null)
      } catch {
        if (version !== handleCheckVersion.current) return
        // On network error, don't block — just reset
        setHandleAvailable(null)
        setHandleSuggestion(null)
      } finally {
        if (version === handleCheckVersion.current) {
          setHandleChecking(false)
        }
      }
    }, 400)
  }

  function onNameChange(val: string) {
    setName(val)
    if (!val.trim()) {
      // Name was cleared — release handle ownership so auto-fill resumes
      setHandle('')
      setHandleTouched(false)
      setHandleAvailable(null)
      setHandleSuggestion(null)
      setHandleChecking(false)
    } else if (!handleTouched) {
      const suggested = suggestHandle(val)
      setHandle(suggested)
      scheduleHandleCheck(suggested)
    }
  }

  function onHandleChange(val: string) {
    const cleaned = val.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, HANDLE_MAX)
    setHandle(cleaned)
    if (cleaned === '') {
      setHandleTouched(false)
      setHandleAvailable(null)
      setHandleSuggestion(null)
      setHandleChecking(false)
    } else {
      setHandleTouched(true)
      scheduleHandleCheck(cleaned)
    }
  }

  function acceptHandleSuggestion() {
    if (handleSuggestion) {
      setHandle(handleSuggestion)
      setHandleTouched(true)
      setHandleSuggestion(null)
      scheduleHandleCheck(handleSuggestion)
    }
  }

  function toggleKnowledgeBase(id: string) {
    setSelectedKnowledgeIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    )
  }

  // Inline validation errors (only show after field is touched)
  const inlineNameError = nameTouched ? validatePresenceName(name) : null
  const inlineHandleFormatError = handleTouched
    ? validatePresenceHandle(handle)
    : null
  // Availability error: only show if format is valid and check is complete
  const inlineHandleAvailError =
    handle && !inlineHandleFormatError && handleAvailable === false
      ? `@${handle} is already taken`
      : null
  const inlineHandleError = inlineHandleFormatError || inlineHandleAvailError
  const inlineDescriptionError = descriptionTouched
    ? validatePresenceDescription(briefDescription)
    : null

  // Can proceed only if all fields are valid and handle is confirmed available
  const canProceedStep1 =
    name.trim() &&
    handle.trim() &&
    briefDescription.trim() &&
    !validatePresenceName(name) &&
    !validatePresenceHandle(handle) &&
    !validatePresenceDescription(briefDescription) &&
    handleAvailable === true &&
    !handleChecking

  function nextStep() {
    // Enforce Step 1 validation before proceeding
    if (currentStep === 1 && !canProceedStep1) {
      return
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Skip step and clear any data selected in the current step
  function skipStep() {
    if (currentStep === 2) {
      // Step 2: Inform - clear selected knowledge bases
      setSelectedKnowledgeIds([])
    } else if (currentStep === 3) {
      // Step 3: Stance - clear selected prompt
      setSelectedPromptId(null)
    } else if (currentStep === 4) {
      // Step 4: Skills - clear selected skills
      setSelectedSkillIds([])
    }
    nextStep()
  }

  async function handleSubmit() {
    if (!canProceedStep1) return
    setLoading(true)
    setError('')
    try {
      const agent = await createPresenceAgent({
        name: name.trim(),
        handle: handle.trim(),
        briefDescription: briefDescription.trim(),
        tagline: tagline.trim() || undefined,
        tone,
        presenceSubtype,
        role: user?.subscription || 'member',
        isPrimaryMember: presenceSubtype === 'member' ? isPrimaryMember : false,
        wallet,
        platformId,
        knowledgeBaseIds: selectedKnowledgeIds,
        promptId: selectedPromptId || undefined,
        skillIds: selectedSkillIds,
        templateIds: selectedTemplateIds,
      })
      // Clear draft on successful creation
      clearPresenceDraft(wallet)
      onCreate(agent)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      // Detect handle conflict — the API returns 409 with "handle" and "taken" in the message
      if (message.toLowerCase().includes('handle') && message.toLowerCase().includes('taken')) {
        setHandleAvailable(false)
        setHandleSuggestion(null)
        setCurrentStep(1)
        setError(`The handle @${handle} was claimed while you were setting up. Please pick a new one.`)
        // Re-check to get a fresh suggestion
        scheduleHandleCheck(handle)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - clicking outside does NOT close the modal to prevent data loss */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-card-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[0.68rem] tracking-[0.16em] uppercase text-accent font-bold mb-1">Create your ally</p>
              <h2 className="text-[1.6rem] font-display italic text-white m-0 leading-none">Make it yours</h2>
              <p className="text-muted text-[0.82rem] mt-1">{"Four short steps. Stop anytime \u2014 you can always just chat."}</p>
            </div>
            <button
              onClick={onClose}
              className="font-sans font-bold text-[0.78rem] px-4 py-2 rounded-lg border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
            >
              {"Skip \u2014 just chat"}
            </button>
          </div>

          {/* Step tabs */}
          <div className="flex mt-3 border-b border-card-border">
            {PRESENCE_STEPS.map((step) => {
              const isActive = currentStep === step.id
              const isDone = currentStep > step.id
              return (
                <button
                  key={step.id}
                  onClick={() => { if (isDone) setCurrentStep(step.id) }}
                  className={`flex-1 pb-3 text-center text-[0.68rem] tracking-[0.14em] uppercase font-bold transition-colors cursor-pointer bg-transparent border-0 ${
                    isActive ? 'text-accent' : isDone ? 'text-green-400' : 'text-muted'
                  }`}
                  style={{
                    borderBottom: isActive ? '3px solid var(--accent, #EAAA00)' : isDone ? '3px solid rgba(74,222,128,0.5)' : '3px solid transparent',
                    marginBottom: '-1px',
                  }}
                >
                  {step.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-background/30 border border-card-border rounded-xl p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="mb-2">
                <p className="text-[0.68rem] tracking-[0.16em] uppercase text-accent font-bold mb-2">{"Step 1 \u00B7 " + PRESENCE_STEPS[0].name}</p>
                <h3 className="text-[1.3rem] font-bold text-white m-0">What should your Ally know?</h3>
                <p className="text-muted text-[0.85rem] mt-1">Start from you, pull in shared knowledge, or begin with a blank slate.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Avatar Name <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only letters (a-z, A-Z) and numbers (0-9)
                      const filteredValue = value.replace(/[^a-zA-Z0-9 ]/g, '');
                      onNameChange(filteredValue);
                    }}
                    onBlur={() => setNameTouched(true)}
                    placeholder="e.g. Emma the English Teacher"
                    maxLength={PRESENCE_NAME_MAX}
                    autoFocus
                    className={`w-full bg-input border rounded-xl px-4 pr-14 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${inlineNameError
                      ? 'border-red-500/50 focus:border-red-500/70'
                      : 'border-card-border focus:border-accent/50'
                      }`}
                  />
                  <span
                    className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs tabular-nums ${name.length >= PRESENCE_NAME_MAX ? 'text-red-400' : 'text-muted'}`}
                  >
                    {name.length}/{PRESENCE_NAME_MAX}
                  </span>
                </div>
                {inlineNameError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" width={12} height={12} />
                    {inlineNameError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Handle <span className="text-accent">*</span>
                  <span className="text-muted font-normal ml-1">
                    (unique identifier)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm select-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => onHandleChange(e.target.value)}
                    onBlur={() => setHandleTouched(true)}
                    placeholder="emma_english"
                    maxLength={HANDLE_MAX}
                    className={`w-full bg-input border rounded-xl pl-8 pr-14 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${inlineHandleError
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : handleAvailable === true && handle
                          ? 'border-green-500/50 focus:border-green-500/70'
                          : 'border-card-border focus:border-accent/50'
                      }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {handleChecking && handle && !inlineHandleFormatError && (
                      <Icon icon="lucide:loader-2" width={14} height={14} className="text-muted animate-spin" />
                    )}
                    {!handleChecking && handleAvailable === true && handle && !inlineHandleFormatError && (
                      <Icon icon="lucide:check-circle-2" width={14} height={14} className="text-green-400" />
                    )}
                    <span className={`text-xs tabular-nums ${handle.length >= HANDLE_MAX ? 'text-red-400' : 'text-muted'}`}>
                      {handle.length}/{HANDLE_MAX}
                    </span>
                  </span>
                </div>
                {inlineHandleFormatError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" width={12} height={12} />
                    {inlineHandleFormatError}
                  </p>
                )}
                {inlineHandleAvailError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" width={12} height={12} />
                    {inlineHandleAvailError}
                    {handleSuggestion && (
                      <>
                        {' · '}
                        <button
                          type="button"
                          onClick={acceptHandleSuggestion}
                          className="text-accent hover:underline cursor-pointer"
                        >
                          Use @{handleSuggestion}?
                        </button>
                      </>
                    )}
                  </p>
                )}
                {!inlineHandleError && handleAvailable === true && handle && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <Icon icon="lucide:check-circle-2" width={12} height={12} />
                    Handle is available
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Tagline
                  <span className="text-muted font-normal ml-1">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    onBlur={() => setTaglineTouched(true)}
                    placeholder="e.g. Your social voice, amplified"
                    maxLength={PRESENCE_TAGLINE_MAX}
                    className={`w-full bg-input border rounded-xl px-4 pr-14 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${taglineTouched && validatePresenceTagline(tagline)
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : 'border-card-border focus:border-accent/50'
                      }`}
                  />
                  <span
                    className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs tabular-nums ${tagline.length >= PRESENCE_TAGLINE_MAX ? 'text-red-400' : 'text-muted'}`}
                  >
                    {tagline.length}/{PRESENCE_TAGLINE_MAX}
                  </span>
                </div>
                {taglineTouched && validatePresenceTagline(tagline) && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" width={12} height={12} />
                    {validatePresenceTagline(tagline)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <textarea
                    value={briefDescription}
                    onChange={(e) => setBriefDescription(e.target.value)}
                    onBlur={() => setDescriptionTouched(true)}
                    placeholder="Describe this avatar in detail — personality, appearance, behavior, expertise. Minimum 50 characters."
                    maxLength={PRESENCE_DESCRIPTION_MAX}
                    rows={6}
                    className={`w-full bg-input border rounded-xl px-4 py-3 pr-14 text-foreground placeholder:text-muted focus:outline-none text-sm resize-none transition-colors ${inlineDescriptionError
                      ? 'border-red-500/50 focus:border-red-500/70'
                      : 'border-card-border focus:border-accent/50'
                      }`}
                  />
                  <span
                    className={`absolute right-4 bottom-3 text-xs tabular-nums ${briefDescription.length >= PRESENCE_DESCRIPTION_MAX
                        ? 'text-red-400'
                        : briefDescription.length > 0 && briefDescription.length < PRESENCE_DESCRIPTION_MIN
                          ? 'text-amber-400'
                          : 'text-muted'
                      }`}
                  >
                    {briefDescription.length}/{PRESENCE_DESCRIPTION_MAX}
                  </span>
                </div>
                {inlineDescriptionError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" width={12} height={12} />
                    {inlineDescriptionError}
                  </p>
                )}
              </div>

              {/* Type Selector */}
              {(
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Type <span className="text-accent">*</span>
                </label>
                <p className="text-xs text-muted mb-3">
                  What kind of Avatar is this?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESENCE_SUBTYPES.filter((st) => st.value !== 'big_avatar' && (st.value !== 'ally' || isWizard)).map((st) => {
                    const isLocked = false
                    return (
                    <button
                      key={st.value}
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (isLocked) return
                        setPresenceSubtype(st.value)
                        if (st.value !== 'member') setIsPrimaryMember(false)
                      }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        isLocked
                          ? 'border-card-border opacity-30 cursor-not-allowed'
                          : presenceSubtype === st.value
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-card-border hover:border-white/30 hover:bg-white/[0.02] text-muted'
                        }`}
                    >
                      <Icon
                        icon={st.icon}
                        width={20}
                        height={20}
                        className={
                          isLocked ? 'text-muted' : presenceSubtype === st.value ? 'text-accent' : 'text-muted'
                        }
                      />
                      <span
                        className={`text-xs font-medium ${isLocked ? 'text-muted' : presenceSubtype === st.value ? 'text-accent' : 'text-foreground'}`}
                      >
                        {st.label}
                      </span>
                    </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted/70 mt-2 text-center">
                  {PRESENCE_SUBTYPES.find((st) => st.value === presenceSubtype)?.description}
                </p>
              </div>
              )}

              {/* Primary Member Toggle (only for personal/member type) */}
              {presenceSubtype === 'member' && (
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:pin" width={16} height={16} className="text-amber-400" />
                    <div>
                      <div className="text-sm font-medium text-white">Primary Member</div>
                      <div className="text-xs text-muted">Auto-selected when joining movements</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrimaryMember(!isPrimaryMember)}
                    style={{
                      position: 'relative',
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      backgroundColor: isPrimaryMember ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                      transition: 'background-color 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: 3,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        transition: 'transform 0.2s ease',
                        transform: isPrimaryMember ? 'translateX(20px)' : 'translateX(0)',
                      }}
                    />
                  </button>
                </div>
              )}

              {/* Tone Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Personality Tone
                </label>
                <p className="text-xs text-muted mb-3">
                  Choose how your Avatar communicates
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AGENT_TONES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTone(t.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${tone === t.value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-card-border hover:border-white/30 hover:bg-white/[0.02] text-muted'
                        }`}
                    >
                      <Icon
                        icon={t.icon}
                        width={20}
                        height={20}
                        className={
                          tone === t.value ? 'text-accent' : 'text-muted'
                        }
                      />
                      <span
                        className={`text-xs font-medium ${tone === t.value ? 'text-accent' : 'text-foreground'}`}
                      >
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted/70 mt-2 text-center">
                  {AGENT_TONES.find((t) => t.value === tone)?.description}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Inform */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">
                    Select Inform
                  </h3>
                  <p className="text-sm text-muted">
                    Choose what your Avatar knows about
                  </p>
                </div>
                <a
                  href="/knowledge"
                  className="text-sm text-accent hover:underline flex items-center gap-1"
                >
                  <Icon icon="lucide:plus" width={14} height={14} />
                  Create New
                </a>
              </div>

              {loadingKB ? (
                <div className="flex items-center justify-center py-8">
                  <Icon
                    icon="lucide:loader-2"
                    width={24}
                    height={24}
                    className="animate-spin text-accent"
                  />
                </div>
              ) : knowledgeBases.length === 0 ? (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
                  <Icon
                    icon="lucide:brain"
                    width={32}
                    height={32}
                    className="mx-auto text-muted mb-2"
                  />
                  <p className="text-muted">No inform found</p>
                  <p className="text-sm text-muted/70">
                    You can skip this step and add later
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {knowledgeBases.map((kb) => (
                    <label
                      key={kb.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedKnowledgeIds.includes(kb.id)
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-card-border hover:border-white/20 hover:bg-white/[0.02]'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedKnowledgeIds.includes(kb.id)}
                        onChange={() => toggleKnowledgeBase(kb.id)}
                        className="mt-1 accent-accent"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-white font-medium">
                          {kb.name}
                        </span>
                        {kb.description && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">
                            {kb.description}
                          </p>
                        )}
                      </div>
                      <Icon
                        icon="lucide:brain"
                        width={16}
                        height={16}
                        className="text-muted flex-shrink-0"
                      />
                    </label>
                  ))}
                </div>
              )}

              {selectedKnowledgeIds.length > 0 && (
                <p className="text-sm text-accent flex items-center gap-1">
                  <Icon icon="lucide:check-circle" width={14} height={14} />
                  {selectedKnowledgeIds.length} knowledge base(s) selected
                </p>
              )}
            </div>
          )}

          {/* Step 3: Stance */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">
                    Select Stance
                  </h3>
                  <p className="text-sm text-muted">
                    Define how your Presence behaves
                  </p>
                </div>
                <a
                  href="/prompts"
                  className="text-sm text-accent hover:underline flex items-center gap-1"
                >
                  <Icon icon="lucide:plus" width={14} height={14} />
                  Create New
                </a>
              </div>

              {loadingPrompts ? (
                <div className="flex items-center justify-center py-8">
                  <Icon
                    icon="lucide:loader-2"
                    width={24}
                    height={24}
                    className="animate-spin text-accent"
                  />
                </div>
              ) : prompts.length === 0 ? (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
                  <Icon
                    icon="lucide:message-square-code"
                    width={32}
                    height={32}
                    className="mx-auto text-muted mb-2"
                  />
                  <p className="text-muted">No stances found</p>
                  <p className="text-sm text-muted/70">
                    You can skip this step and add later
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {prompts.map((prompt) => {
                    const assignedTo = agentPromptMap[prompt.id]
                    const isLocked = !!assignedTo
                    return (
                      <div
                        key={prompt.id}
                        onClick={() => !isLocked &&
                          setSelectedPromptId(
                            selectedPromptId === prompt.id ? null : prompt.id
                          )
                        }
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${isLocked
                            ? 'border-card-border bg-white/[0.01] opacity-50 cursor-not-allowed'
                            : selectedPromptId === prompt.id
                              ? 'border-accent/50 bg-accent/5 cursor-pointer'
                              : 'border-card-border hover:border-white/20 hover:bg-white/[0.02] cursor-pointer'
                          }`}
                      >
                        <div
                          className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isLocked ? 'border-muted/30' : selectedPromptId === prompt.id ? 'border-accent bg-accent' : 'border-muted'
                            }`}
                        >
                          {selectedPromptId === prompt.id && !isLocked && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                          {isLocked && (
                            <Icon icon="lucide:lock" width={8} height={8} className="text-muted/50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={isLocked ? 'text-muted font-medium' : 'text-white font-medium'}>
                            {prompt.name}
                          </span>
                          {isLocked && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Assigned to {assignedTo}
                            </span>
                          )}
                          {prompt.type && !isLocked && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-muted">
                              {prompt.type}
                            </span>
                          )}
                          {prompt.content && (
                            <p className="text-xs text-muted mt-0.5 line-clamp-2">
                              {prompt.content}
                            </p>
                          )}
                        </div>
                        <Icon
                          icon={isLocked ? 'lucide:lock' : 'lucide:message-square-code'}
                          width={16}
                          height={16}
                          className="text-muted flex-shrink-0"
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedPromptId && (
                <p className="text-sm text-accent flex items-center gap-1">
                  <Icon icon="lucide:check-circle" width={14} height={14} />
                  Prompt selected
                </p>
              )}
            </div>
          )}

          {/* Step 4: Skills */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-medium">Attach Skills</h3>
                <p className="text-sm text-muted mt-0.5">
                  Select skills to automate — your agent will run them in the background
                </p>
              </div>

              {/* Select Predefined Template */}
              <button
                type="button"
                onClick={() => setShowTemplateDrawer(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-card-border hover:border-accent/40 hover:bg-white/[0.02] transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:layout-template" width={15} height={15} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Select Predefined Template</p>
                  <p className="text-xs text-muted mt-0.5">Browse ready-made skill workflows</p>
                </div>
                <Icon icon="lucide:chevron-right" width={15} height={15} className="text-muted/50 shrink-0" />
              </button>

              <SkillTemplateDrawer
                open={showTemplateDrawer}
                onClose={() => setShowTemplateDrawer(false)}
                attachedTemplateIds={selectedTemplateIds}
                connectedServices={[]}
                isCreationFlow={true}
                onAttach={(templateId) => {
                  if (!selectedTemplateIds.includes(templateId)) {
                    setSelectedTemplateIds(prev => [...prev, templateId])
                  }
                }}
              />

              {loadingSkills ? (
                <div className="flex items-center justify-center py-8">
                  <Icon
                    icon="lucide:loader-2"
                    width={24}
                    height={24}
                    className="animate-spin text-accent"
                  />
                </div>
              ) : skills.length === 0 ? (
                <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
                  <Icon
                    icon="lucide:zap"
                    width={32}
                    height={32}
                    className="mx-auto text-muted mb-2"
                  />
                  <p className="text-muted">No skills found</p>
                  <p className="text-sm text-muted/70">
                    You can skip this step and add skills later
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {skills.map((skill: any) => {
                    const isSelected = selectedSkillIds.includes(skill.id)
                    const triggerType = (skill.triggerType || skill.trigger_type || 'event').toLowerCase()
                    const status = (skill.status || '').toLowerCase()
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-accent bg-accent/10'
                            : 'border-card-border hover:border-accent/50 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'border-accent bg-accent' : 'border-muted'
                          }`}
                        >
                          {isSelected && (
                            <Icon icon="lucide:check" width={12} height={12} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {skill.name}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              triggerType === 'event' ? 'bg-green-500/15 text-green-400'
                              : triggerType === 'time' ? 'bg-blue-400/15 text-blue-400'
                              : triggerType === 'command' ? 'bg-orange-400/15 text-orange-400'
                              : 'bg-yellow-400/15 text-yellow-400'
                            }`}>
                              {triggerType === 'event' ? 'EVENT' : triggerType === 'time' ? 'SCHEDULE' : triggerType === 'command' ? 'COMMAND' : 'CONDITION'}
                            </span>
                            {status === 'paused' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400">
                                PAUSED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted mt-0.5 truncate">
                            {skill.whenText || skill.when_text || ''} → {skill.thenText || skill.then_text || ''}
                          </p>
                        </div>
                        <Icon
                          icon="lucide:zap"
                          width={16}
                          height={16}
                          className={isSelected ? 'text-accent' : 'text-muted'}
                        />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Selected template chips */}
              {selectedTemplateIds.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted">Predefined templates selected</p>
                  {selectedTemplateIds.map((tplId) => {
                    const tpl = TEMPLATES_BY_ID[tplId]
                    if (!tpl) return null
                    return (
                      <div key={tplId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                        <Icon icon="lucide:layout-template" width={13} height={13} className="text-accent shrink-0" />
                        <span className="text-xs font-medium text-white flex-1 truncate">{tpl.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTemplateIds(prev => prev.filter(id => id !== tplId))}
                          className="text-muted hover:text-white transition-colors shrink-0"
                        >
                          <Icon icon="lucide:x" width={12} height={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedSkillIds.length > 0 && (
                <p className="text-sm text-accent flex items-center gap-1">
                  <Icon icon="lucide:check-circle" width={14} height={14} />
                  {selectedSkillIds.length} skill{selectedSkillIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {error && (
            <p
              ref={errorRef}
              className="text-sm text-red-400 flex items-center gap-1.5 mt-4"
            >
              <Icon icon="lucide:alert-circle" width={14} height={14} />
              {error}
            </p>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-card-border">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="font-sans font-bold text-[0.85rem] px-4 py-2 rounded-lg border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
              >
                {"\u2190 Back"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(currentStep === 2 || currentStep === 3 || currentStep === 4) && (
              <button
                type="button"
                onClick={skipStep}
                className="font-sans text-[0.82rem] px-4 py-2 text-muted hover:text-white transition-colors cursor-pointer bg-transparent border-0"
              >
                Skip
              </button>
            )}
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={currentStep === 1 && !canProceedStep1}
                className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-bold text-[0.9rem] px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer border-0"
              >
                {"Continue \u2192"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !canProceedStep1}
                className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-bold text-[0.9rem] px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer border-0"
              >
                {loading ? (
                  <Icon
                    icon="lucide:loader-2"
                    width={16}
                    height={16}
                    className="animate-spin"
                  />
                ) : (
                  <Icon icon="lucide:check" width={16} height={16} />
                )}
                {loading ? 'Creating…' : 'Create Avatar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Worker Agent Modal - Multi-Step Wizard
// Steps: 1. Basic Info → 2. Performer (Connect Abilities) → 3. Stance
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions for Worker Step 1
// ─────────────────────────────────────────────────────────────────────────────

const WORKER_NAME_MAX = 25
const WORKER_ROLE_MAX = 100
const WORKER_DESCRIPTION_MIN = 50
const WORKER_DESCRIPTION_MAX = 5000
const WORKER_TAGLINE_MAX = 255

function validateWorkerName(name: string): string | null {
  if (!name) return null
  if (name.trim().length === 0) return 'Name is required'
  if (name.length > WORKER_NAME_MAX) return `Max ${WORKER_NAME_MAX} characters`
  return null
}

function validateWorkerTagline(tagline: string): string | null {
  if (!tagline) return null
  if (tagline.length > WORKER_TAGLINE_MAX)
    return `Max ${WORKER_TAGLINE_MAX} characters`
  return null
}

function validateWorkerRole(role: string): string | null {
  if (!role) return null
  if (role.trim().length === 0) return 'Role is required'
  if (role.length > WORKER_ROLE_MAX) return `Max ${WORKER_ROLE_MAX} characters`
  return null
}

function validateWorkerDescription(desc: string): string | null {
  if (!desc) return null
  if (desc.trim().length === 0) return 'Description is required'
  if (desc.trim().length < WORKER_DESCRIPTION_MIN)
    return `At least ${WORKER_DESCRIPTION_MIN} characters required`
  if (desc.length > WORKER_DESCRIPTION_MAX)
    return `Max ${WORKER_DESCRIPTION_MAX} characters`
  return null
}

interface CreateWorkerAgentModalProps {
  onClose: () => void
  onCreated: (agent: Presence) => void
  platformId?: string
  wallet: string
}

const WORKER_STEPS = [
  { id: 1, name: 'Basic Info', icon: 'lucide:user' },
  { id: 2, name: 'Performer', icon: 'lucide:zap' },
  { id: 3, name: 'Stance', icon: 'lucide:message-square-code' },
  { id: 4, name: 'Skills', icon: 'lucide:zap' },
]

export function CreateWorkerAgentModal({
  onClose,
  onCreated,
  platformId,
  wallet,
}: CreateWorkerAgentModalProps) {
  // Load draft from localStorage on mount
  const initialDraft = loadWorkerDraft(wallet)

  const [currentStep, setCurrentStep] = useState(initialDraft?.currentStep || 1)

  // Step 1: Basic Info
  const [workerHandle, setWorkerHandle] = useState(initialDraft?.name || '')
  const [workerHandleTouched, setWorkerHandleTouched] = useState(false)
  const [workerHandleAvailable, setWorkerHandleAvailable] = useState<boolean | null>(null)
  const [workerHandleSuggestion, setWorkerHandleSuggestion] = useState<string | null>(null)
  const [workerHandleChecking, setWorkerHandleChecking] = useState(false)
  const workerHandleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const workerHandleCheckVersion = useRef(0)
  const [description, setDescription] = useState(
    initialDraft?.description || ''
  )
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [tagline, setTagline] = useState(initialDraft?.tagline || '')
  const [taglineTouched, setTaglineTouched] = useState(false)
  const [role, setRole] = useState(initialDraft?.role || '')
  const [roleTouched, setRoleTouched] = useState(false)
  const [accessLevel, setAccessLevel] = useState<WorkerAccessLevel>(
    initialDraft?.accessLevel || 'public'
  )

  // Parent Presence (required)
  const [parentPresenceId, setParentPresenceId] = useState(initialDraft?.parentPresenceId || '')
  const [presences, setPresences] = useState<Presence[]>([])
  const [loadingPresences, setLoadingPresences] = useState(true)
  const [presenceDropdownOpen, setPresenceDropdownOpen] = useState(false)
  const presenceDropdownRef = useRef<HTMLDivElement>(null)

  // Step 2: Performer (Select Empower Tools)
  const [connectedTools, setConnectedTools] = useState<ConnectedTool[]>(
    initialDraft?.connectedTools || []
  )
  const [connectingTool, setConnectingTool] = useState<Tool | null>(null)
  const [empowerTools, setEmpowerTools] = useState<SavedTool[]>([])
  const [empowerToolsLoading, setEmpowerToolsLoading] = useState(false)
  const [selectedEmpowerTools, setSelectedEmpowerTools] = useState<string[]>([])

  // Step 3: Stance
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(
    initialDraft?.selectedPromptId || null
  )
  const [loadingPrompts, setLoadingPrompts] = useState(false)

  // Step 4: Skills
  const [skills, setSkills] = useState<any[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
    initialDraft?.selectedSkillIds || []
  )
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    initialDraft?.selectedTemplateIds || []
  )
  const [loadingSkills, setLoadingSkills] = useState(false)
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false)

  // General state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLDivElement>(null)

  // Auto-save debounced function
  const saveDraft = useCallback(() => {
    const draft: WorkerDraft = {
      name: workerHandle,
      description,
      tagline,
      role,
      accessLevel,
      parentPresenceId,
      connectedTools,
      selectedPromptId,
      selectedSkillIds,
      selectedTemplateIds,
      currentStep,
      savedAt: Date.now(),
    }
    saveWorkerDraft(draft, wallet)
  }, [
    workerHandle,
    description,
    tagline,
    role,
    accessLevel,
    parentPresenceId,
    connectedTools,
    selectedPromptId,
    selectedSkillIds,
    selectedTemplateIds,
    currentStep,
  ])

  const debouncedSaveDraft = useDebounce(saveDraft, AUTO_SAVE_DEBOUNCE_MS)

  // Auto-save on field changes
  useEffect(() => {
    // Only save if there's meaningful data
    if (
      workerHandle ||
      description ||
      tagline ||
      role ||
      parentPresenceId ||
      connectedTools.length > 0 ||
      selectedPromptId ||
      selectedSkillIds.length > 0 ||
      selectedTemplateIds.length > 0
    ) {
      debouncedSaveDraft()
    }
  }, [
    workerHandle,
    description,
    tagline,
    role,
    accessLevel,
    parentPresenceId,
    connectedTools,
    selectedPromptId,
    selectedSkillIds,
    selectedTemplateIds,
    debouncedSaveDraft,
  ])

  // Save draft immediately on step change
  useEffect(() => {
    if (workerHandle || description || role) {
      saveDraft()
    }
  }, [currentStep])

  // Step 4: Fetch skills
  useEffect(() => {
    if (currentStep === 4 && skills.length === 0) {
      fetchWorkerSkills()
    }
  }, [currentStep])

  async function fetchWorkerSkills() {
    setLoadingSkills(true)
    try {
      const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const params = new URLSearchParams({ page: '1', page_size: '100' })
      if (wallet) params.set('wallet', wallet)
      const res = await fetch(`${AGENT_API_URL}/api/skills?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSkills(data.skills || [])
      }
    } catch (e) {
      console.error('Failed to fetch skills:', e)
    } finally {
      setLoadingSkills(false)
    }
  }

  function toggleWorkerSkill(id: string) {
    setSelectedSkillIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // Auto-scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])

  // Debounced handle availability check for Worker
  function scheduleWorkerHandleCheck(h: string) {
    if (workerHandleCheckTimer.current) {
      clearTimeout(workerHandleCheckTimer.current)
    }
    setWorkerHandleAvailable(null)
    setWorkerHandleSuggestion(null)

    const trimmed = h.trim().toLowerCase()
    if (!trimmed || validateWorkerHandleFormat(trimmed)) {
      setWorkerHandleChecking(false)
      return
    }

    setWorkerHandleChecking(true)
    const version = ++workerHandleCheckVersion.current

    workerHandleCheckTimer.current = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(trimmed)
        if (version !== workerHandleCheckVersion.current) return
        setWorkerHandleAvailable(result.available)
        setWorkerHandleSuggestion(result.suggestion || null)
      } catch {
        if (version !== workerHandleCheckVersion.current) return
        setWorkerHandleAvailable(null)
        setWorkerHandleSuggestion(null)
      } finally {
        if (version === workerHandleCheckVersion.current) {
          setWorkerHandleChecking(false)
        }
      }
    }, 400)
  }

  // Check handle availability on mount if restoring from draft
  useEffect(() => {
    if (workerHandle && !workerHandleAvailable && !workerHandleChecking) {
      scheduleWorkerHandleCheck(workerHandle)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function acceptWorkerHandleSuggestion() {
    if (workerHandleSuggestion) {
      setWorkerHandle(workerHandleSuggestion)
      setWorkerHandleTouched(true)
      setWorkerHandleSuggestion(null)
      scheduleWorkerHandleCheck(workerHandleSuggestion)
    }
  }

  // Inline validation errors (only show after field is touched)
  function validateWorkerHandleFormat(h: string): string | null {
    if (!h) return 'Handle is required'
    if (!isValidHandle(h)) return 'Only letters, numbers, _ and . allowed'
    if (h.length > HANDLE_MAX) return `Max ${HANDLE_MAX} characters`
    return null
  }
  function validateWorkerHandle(h: string): string | null {
    return validateWorkerHandleFormat(h)
  }
  const inlineHandleFormatError = workerHandleTouched ? validateWorkerHandleFormat(workerHandle) : null
  const inlineHandleAvailError =
    workerHandle && !inlineHandleFormatError && workerHandleAvailable === false
      ? `@${workerHandle} is already taken`
      : null
  const inlineHandleError = inlineHandleFormatError || inlineHandleAvailError
  const inlineRoleError = roleTouched ? validateWorkerRole(role) : null
  const inlineDescriptionError = descriptionTouched
    ? validateWorkerDescription(description)
    : null

  // Can proceed only if all fields are valid and handle is confirmed available
  const canProceedStep1 =
    workerHandle.trim() &&
    role.trim() &&
    description.trim() &&
    parentPresenceId.trim() &&
    !validateWorkerHandle(workerHandle) &&
    !validateWorkerRole(role) &&
    !validateWorkerDescription(description) &&
    workerHandleAvailable === true &&
    !workerHandleChecking

  // Fetch presences on mount
  useEffect(() => {
    async function fetchPresences() {
      setLoadingPresences(true)
      try {
        const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
        const res = await fetch(
          `${AGENT_API_URL}/api/agents?wallet=${encodeURIComponent(wallet)}&includeWorkers=false`
        )
        if (res.ok) {
          const data = await res.json()
          const presenceList = (data.agents || []).filter((a: Presence) => a.type === 'PRESENCE')
          setPresences(presenceList)
        }
      } catch (err) {
        console.error('Error fetching presences:', err)
      } finally {
        setLoadingPresences(false)
      }
    }
    fetchPresences()
  }, [wallet])

  // Close presence dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (presenceDropdownRef.current && !presenceDropdownRef.current.contains(e.target as Node)) {
        setPresenceDropdownOpen(false)
      }
    }
    if (presenceDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [presenceDropdownOpen])

  useEffect(() => {
    if (currentStep === 3 && prompts.length === 0) {
      fetchPrompts()
      fetchWorkerAgentPromptMap()
    }
  }, [currentStep])

  // Map of promptId → agent name (for locking assigned prompts)
  const [agentPromptMap, setAgentPromptMap] = useState<Record<string, string>>({})

  async function fetchWorkerAgentPromptMap() {
    try {
      const params = new URLSearchParams()
      if (wallet) params.set('wallet', wallet)
      if (platformId) params.set('platformId', platformId)
      params.set('includeWorkers', 'true')
      const res = await fetch(`/api/agents?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const agents = data.agents || []
        const map: Record<string, string> = {}
        for (const a of agents) {
          const pid = a.promptId || a.prompt_id
          if (pid) map[pid] = a.name
        }
        setAgentPromptMap(map)
      }
    } catch { }
  }

  async function fetchPrompts() {
    setLoadingPrompts(true)
    try {
      const AGENT_API_URL =
        process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const params = new URLSearchParams()
      if (wallet) params.set('wallet', wallet)
      if (platformId) params.set('platformId', platformId)
      const res = await fetch(
        `${AGENT_API_URL}/api/prompts?${params.toString()}`
      )
      if (res.ok) {
        const data = await res.json()
        setPrompts(data.prompts || [])
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoadingPrompts(false)
    }
  }

  function isToolConnected(toolName: string): boolean {
    return connectedTools.some((t) => t.toolName === toolName && t.verified)
  }

  function getConnectedTool(toolName: string): ConnectedTool | undefined {
    return connectedTools.find((t) => t.toolName === toolName)
  }

  function handleToolConnected(
    toolName: string,
    credentials: Record<string, string>,
    externalHandle?: string
  ) {
    setConnectedTools((prev) => {
      const filtered = prev.filter((t) => t.toolName !== toolName)
      return [
        ...filtered,
        { toolName, credentials, externalHandle, verified: true },
      ]
    })
    setConnectingTool(null)
  }

  function handleDisconnectTool(toolName: string) {
    setConnectedTools((prev) => prev.filter((t) => t.toolName !== toolName))
  }

  function nextStep() {
    // Enforce Step 1 validation before proceeding
    if (currentStep === 1 && !canProceedStep1) {
      return
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Skip step and clear any data selected in the current step
  function skipStep() {
    if (currentStep === 2) {
      // Step 2: Performer - clear all connected tools
      setConnectedTools([])
    } else if (currentStep === 3) {
      // Step 3: Stance - clear selected prompt
      setSelectedPromptId(null)
    } else if (currentStep === 4) {
      // Step 4: Skills - clear selected skills and templates
      setSelectedSkillIds([])
      setSelectedTemplateIds([])
    }
    nextStep()
  }

  async function handleCreate() {
    if (!canProceedStep1) return
    setSaving(true)
    setError('')

    try {
      // Phase 1: Create the Worker agent
      const agent = await createWorkerAgent({
        name: `@${workerHandle.trim()}`,
        handle: workerHandle.trim().toLowerCase(),
        briefDescription: description.trim(),
        tagline: tagline.trim() || undefined,
        role: role.trim(),
        accessLevel,
        wallet,
        platformId,
        parentId: parentPresenceId || undefined,
        // Tools list from connected tools in Step 2
        tools: connectedTools
          .filter(ct => ct.verified && ct.toolName !== 'telegram')
          .flatMap(ct => ct.toolName === 'google' ? GOOGLE_TOOLS : [ct.toolName]),
        promptId: selectedPromptId,
        skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        templateIds: selectedTemplateIds.length > 0 ? selectedTemplateIds : undefined,
      })

      // Phase 2: Save per-performer tool credentials using the new worker's ID
      const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      for (const ct of connectedTools) {
        if (!ct.verified || !ct.credentials) continue
        try {
          await fetch(`${AGENT_API_URL}/api/tools/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet,
              worker_id: agent.id,
              tool_name: ct.toolName,
              credentials: ct.credentials,
            }),
          })
        } catch {
          // Non-fatal — tool can be reconnected via Empower page
        }
      }

      clearWorkerDraft(wallet)
      onCreated(agent)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      if (message.toLowerCase().includes('handle') && message.toLowerCase().includes('taken')) {
        setWorkerHandleAvailable(false)
        setWorkerHandleSuggestion(null)
        setCurrentStep(1)
        setError(`The handle @${workerHandle} was claimed while you were setting up. Please pick a new one.`)
        scheduleWorkerHandleCheck(workerHandle)
      } else {
        setError(message)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop - clicking outside does NOT close the modal to prevent data loss */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative bg-card border border-card-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-5 pb-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[0.68rem] tracking-[0.16em] uppercase text-accent font-bold mb-1">Create performer</p>
                <h2 className="text-[1.6rem] font-display italic text-white m-0 leading-none">Build your agent</h2>
                <p className="text-muted text-[0.82rem] mt-1">{"Three steps to a working performer."}</p>
              </div>
              <button
                onClick={onClose}
                className="font-sans font-bold text-[0.78rem] px-4 py-2 rounded-lg border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
              >
                skip - just chat
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-white transition-colors cursor-pointer"
            >
              <Icon icon="lucide:x" width={20} height={20} />
            </button>
          </div>

          {/* Step Indicators */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-card-border bg-background/50">
            <div className="relative flex items-start justify-between">
              {/* Connector lines - positioned at vertical center with small gaps from circles */}
              {/* Line 1: from circle 1 to circle 2 */}
              <div
                className={`absolute h-[2px] rounded-full ${currentStep > 1 ? 'bg-green-500/50' : 'bg-white/[0.1]'}`}
                style={{
                  top: '15px',
                  left: 'calc(12.5% + 24px)',
                  right: 'calc(62.5% + 24px)',
                }}
              />
              {/* Line 2: from circle 2 to circle 3 */}
              <div
                className={`absolute h-[2px] rounded-full ${currentStep > 2 ? 'bg-green-500/50' : 'bg-white/[0.1]'}`}
                style={{
                  top: '15px',
                  left: 'calc(37.5% + 24px)',
                  right: 'calc(37.5% + 24px)',
                }}
              />
              {/* Line 3: from circle 3 to circle 4 */}
              <div
                className={`absolute h-[2px] rounded-full ${currentStep > 3 ? 'bg-green-500/50' : 'bg-white/[0.1]'}`}
                style={{
                  top: '15px',
                  left: 'calc(62.5% + 24px)',
                  right: 'calc(12.5% + 24px)',
                }}
              />

              {/* Step circles */}
              {WORKER_STEPS.map((step) => (
                <div
                  key={step.id}
                  className="flex flex-col items-center z-10"
                  style={{ width: '25%' }}
                >
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${currentStep === step.id
                      ? 'bg-accent text-white'
                      : currentStep > step.id
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-card text-muted border border-white/[0.1]'
                      }`}
                  >
                    {currentStep > step.id ? ( 
                      <Icon icon="lucide:check" width={18} height={18} />
                    ) : (
                      <Icon icon={step.icon} width={18} height={18} />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 whitespace-nowrap ${currentStep === step.id ? 'text-accent font-medium' : 'text-muted'}`}
                  >
                    {step.name}
                  </span>
                </div>
              )
            )}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="bg-background/30 border border-card-border rounded-xl p-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <p className="text-[0.68rem] tracking-[0.16em] uppercase text-accent font-bold mb-2">{"Step 1 \u00B7 " + WORKER_STEPS[0].name}</p>
                  <h3 className="text-[1.3rem] font-bold text-white m-0">Set up your performer</h3>
                  <p className="text-muted text-[0.85rem] mt-1">Pick an avatar, name it, and describe what it does.</p>
                </div>
                {/* Parent Avatar (Required) */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Select Avatar <span className="text-accent">*</span>
                  </label>
                  <div className="relative" ref={presenceDropdownRef}>
                    <button
                      type="button"
                      autoFocus
                      disabled={loadingPresences}
                      onClick={() => setPresenceDropdownOpen((o) => !o)}
                      className={`w-full bg-input border rounded-xl px-4 py-3 text-left focus:outline-none cursor-pointer disabled:opacity-50 flex items-center justify-between gap-2 transition-colors hover:border-accent/40 ${parentPresenceId ? 'border-accent/50' : 'border-card-border'
                        }`}
                    >
                      <span className={parentPresenceId ? 'text-accent' : 'text-muted'}>
                        {loadingPresences
                          ? 'Loading avatars...'
                          : parentPresenceId
                            ? presences.find((p) => p.id === parentPresenceId)?.name || 'Select an avatar...'
                            : 'Select an avatar...'}
                      </span>
                      <Icon
                        icon={loadingPresences ? 'lucide:loader-2' : presenceDropdownOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                        width={16}
                        height={16}
                        className={`flex-shrink-0 ${loadingPresences ? 'animate-spin text-muted' : parentPresenceId ? 'text-accent' : 'text-muted'}`}
                      />
                    </button>

                    {presenceDropdownOpen && !loadingPresences && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-accent/30 rounded-xl shadow-2xl overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                          {presences.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-muted">
                              No avatars found. Create an avatar first.
                            </div>
                          ) : (
                            <>
                              {/* Select avatar option (to unselect) */}
                              <button
                                type="button"
                                onClick={() => { setParentPresenceId(''); setPresenceDropdownOpen(false) }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${!parentPresenceId
                                    ? 'bg-accent/20 text-accent'
                                    : 'text-muted hover:bg-accent/10 hover:text-accent'
                                  }`}
                              >
                                <span>Select an avatar...</span>
                                {!parentPresenceId && (
                                  <Icon icon="lucide:check" width={14} height={14} className="text-accent flex-shrink-0" />
                                )}
                              </button>
                              {presences.map((presence) => {
                                const isSelected = parentPresenceId === presence.id
                                return (
                                  <button
                                    key={presence.id}
                                    type="button"
                                    onClick={() => { setParentPresenceId(presence.id); setPresenceDropdownOpen(false) }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${isSelected
                                        ? 'bg-accent/20 text-accent'
                                        : 'text-foreground hover:bg-accent/10 hover:text-accent'
                                      }`}
                                  >
                                    <span>
                                      {presence.name}
                                      {presence.handle && (
                                        <span className={`ml-1 text-xs ${isSelected ? 'text-accent/70' : 'text-muted'}`}>
                                          @{presence.handle}
                                        </span>
                                      )}
                                    </span>
                                    {isSelected && (
                                      <Icon icon="lucide:check" width={14} height={14} className="text-accent flex-shrink-0" />
                                    )}
                                  </button>
                                )
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {presences.length === 0 && !loadingPresences && (
                    <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                      <Icon icon="lucide:alert-triangle" width={12} height={12} />
                      Create a Presence agent first to assign as parent
                    </p>
                  )}
                </div>

                {/* Handle */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Handle <span className="text-accent">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-muted text-sm pointer-events-none">@</span>
                    <input
                      value={workerHandle}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, HANDLE_MAX).toLowerCase()
                        setWorkerHandle(cleaned)
                        setWorkerHandleTouched(true)
                        if (cleaned === '') {
                          setWorkerHandleAvailable(null)
                          setWorkerHandleSuggestion(null)
                          setWorkerHandleChecking(false)
                        } else {
                          scheduleWorkerHandleCheck(cleaned)
                        }
                      }}
                      onBlur={() => setWorkerHandleTouched(true)}
                      maxLength={HANDLE_MAX}
                      placeholder="e.g. bluesky_agent"
                      className={`w-full bg-input border rounded-xl pl-8 pr-20 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${inlineHandleError
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : workerHandleAvailable === true
                          ? 'border-green-500/50 focus:border-green-500/70'
                          : 'border-card-border focus:border-accent/50'
                        }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                      {workerHandleChecking && (
                        <Icon icon="lucide:loader-2" width={12} height={12} className="text-muted animate-spin" />
                      )}
                      {!workerHandleChecking && workerHandleAvailable === true && workerHandle.trim() && (
                        <Icon icon="lucide:check-circle" width={12} height={12} className="text-green-400" />
                      )}
                      <span
                        className={`text-xs tabular-nums ${workerHandle.length >= HANDLE_MAX ? 'text-red-400' : 'text-muted'}`}
                      >
                        {workerHandle.length}/{HANDLE_MAX}
                      </span>
                    </span>
                  </div>
                  {inlineHandleError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <Icon icon="lucide:alert-circle" width={12} height={12} />
                      {inlineHandleError}
                      {workerHandleSuggestion && (
                        <>
                          {' · '}
                          <button
                            type="button"
                            onClick={acceptWorkerHandleSuggestion}
                            className="text-accent hover:underline cursor-pointer"
                          >
                            Use @{workerHandleSuggestion}?
                          </button>
                        </>
                      )}
                    </p>
                  )}
                  {!inlineHandleError && workerHandleAvailable === true && workerHandle.trim() && (
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <Icon icon="lucide:check-circle" width={12} height={12} />
                      Handle is available
                    </p>
                  )}
                </div>

                {/* Specialization / Role */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Specialization / Role <span className="text-accent">*</span>
                  </label>
                  <div className="relative">
                    <input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      onBlur={() => setRoleTouched(true)}
                      maxLength={WORKER_ROLE_MAX}
                      placeholder="e.g. Web research, Copywriting, Data extraction"
                      className={`w-full bg-input border rounded-xl px-4 pr-16 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${inlineRoleError
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : 'border-card-border focus:border-accent/50'
                        }`}
                    />
                    <span
                      className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs tabular-nums ${role.length >= WORKER_ROLE_MAX ? 'text-red-400' : 'text-muted'}`}
                    >
                      {role.length}/{WORKER_ROLE_MAX}
                    </span>
                  </div>
                  {inlineRoleError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <Icon icon="lucide:alert-circle" width={12} height={12} />
                      {inlineRoleError}
                    </p>
                  )}
                </div>

                {/* Access Level
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Access Level <span className="text-accent">*</span>
                  </label>
                  <div className="space-y-2">
                    {WORKER_ACCESS_LEVELS.map((level) => (
                      <label
                        key={level.value}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${accessLevel === level.value
                            ? "border-accent/50 bg-accent/5"
                            : "border-card-border hover:border-white/20 hover:bg-white/[0.02]"
                          }`}
                      >
                        <input
                          type="radio"
                          name="accessLevel"
                          value={level.value}
                          checked={accessLevel === level.value}
                          onChange={() => setAccessLevel(level.value)}
                          className="mt-0.5 accent-accent"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${accessLevel === level.value ? "text-white" : "text-foreground"}`}>
                            {level.label}
                          </span>
                          <p className="text-xs text-muted mt-0.5">{level.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div> */}

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Description <span className="text-accent">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={() => setDescriptionTouched(true)}
                      maxLength={WORKER_DESCRIPTION_MAX}
                      placeholder="Describe what this agent does in detail — its tasks, capabilities, and behavior. Minimum 50 characters."
                      rows={6}
                      className={`w-full bg-input border rounded-xl px-4 py-3 pr-16 text-foreground placeholder:text-muted focus:outline-none resize-none transition-colors ${inlineDescriptionError
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : 'border-card-border focus:border-accent/50'
                        }`}
                    />
                    <span
                      className={`absolute right-4 bottom-3 text-xs tabular-nums ${description.length >= WORKER_DESCRIPTION_MAX
                          ? 'text-red-400'
                          : description.length > 0 && description.length < WORKER_DESCRIPTION_MIN
                            ? 'text-amber-400'
                            : 'text-muted'
                        }`}
                    >
                      {description.length}/{WORKER_DESCRIPTION_MAX}
                    </span>
                  </div>
                  {inlineDescriptionError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <Icon icon="lucide:alert-circle" width={12} height={12} />
                      {inlineDescriptionError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Connect Tools for this Performer */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-medium">Connect Tools</h3>
                  <p className="text-sm text-muted">
                    Connect tools for this performer. Each performer uses its own credentials — you can also configure this later on the Empower page.
                  </p>
                </div>

                <div className="space-y-2">
                  {AVAILABLE_TOOLS.map((tool) => {
                    const connected = connectedTools.find(ct => ct.toolName === tool.id && ct.verified)
                    const isEnabled = ENABLED_TOOLS.includes(tool.id)
                    return (
                      <div
                        key={tool.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                          connected
                            ? 'border-accent/40 bg-accent/[0.04]'
                            : 'border-card-border bg-white/[0.01]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          connected ? 'bg-accent/20' : 'bg-white/[0.06]'
                        }`}>
                          <Icon
                            icon={tool.icon}
                            width={20}
                            height={20}
                            className={connected ? 'text-accent' : 'text-muted'}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${connected ? 'text-accent' : 'text-white'}`}>
                            {tool.name}
                          </p>
                          <p className="text-xs text-muted/60 truncate">
                            {connected
                              ? (connected.externalHandle || 'Connected')
                              : tool.description}
                          </p>
                        </div>
                        {connected ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                              Connected
                            </span>
                            <button
                              onClick={() => handleDisconnectTool(tool.id)}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ) : isEnabled ? (
                          <button
                            onClick={() => setConnectingTool(tool)}
                            className="px-3 py-1.5 rounded-[4px] text-xs font-semibold bg-accent hover:bg-accent-dark text-white transition-colors shrink-0"
                          >
                            Connect
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] text-muted cursor-not-allowed shrink-0">
                            Soon
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {connectedTools.filter(ct => ct.verified).length > 0 && (
                  <p className="text-xs text-accent">
                    {connectedTools.filter(ct => ct.verified).length} tool{connectedTools.filter(ct => ct.verified).length !== 1 ? 's' : ''} connected
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Stance */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">
                      Select Stance
                    </h3>
                    <p className="text-sm text-muted">
                      Choose a pre-defined prompt to guide agent behavior
                    </p>
                  </div>
                  <a
                    href="/prompts"
                    className="text-sm text-accent hover:underline flex items-center gap-1"
                  >
                    <Icon icon="lucide:plus" width={14} height={14} />
                    Create New
                  </a>
                </div>

                {loadingPrompts ? (
                  <div className="flex items-center justify-center py-8">
                    <Icon
                      icon="lucide:loader-2"
                      width={24}
                      height={24}
                      className="animate-spin text-accent"
                    />
                  </div>
                ) : prompts.length === 0 ? (
                  <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
                    <Icon
                      icon="lucide:message-square-code"
                      width={32}
                      height={32}
                      className="mx-auto text-muted mb-2"
                    />
                    <p className="text-muted">No stances found</p>
                    <p className="text-sm text-muted/70 mt-1">
                      Create prompts in the{' '}
                      <a
                        href="/prompts"
                        className="text-accent hover:underline"
                      >
                        Instruct
                      </a>{' '}
                      section
                    </p>
                    <p className="text-xs text-muted/50 mt-2">
                      You can skip this step and add later
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prompts.map((prompt) => {
                      const assignedTo = agentPromptMap[prompt.id]
                      const isLocked = !!assignedTo
                      return (
                        <div
                          key={prompt.id}
                          onClick={() => !isLocked &&
                            setSelectedPromptId(
                              selectedPromptId === prompt.id ? null : prompt.id
                            )
                          }
                          className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${isLocked
                              ? 'border-card-border bg-white/[0.01] opacity-50 cursor-not-allowed'
                              : selectedPromptId === prompt.id
                                ? 'border-accent/50 bg-accent/5 cursor-pointer'
                                : 'border-card-border hover:border-white/20 hover:bg-white/[0.02] cursor-pointer'
                            }`}
                        >
                          <div
                            className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isLocked ? 'border-muted/30' : selectedPromptId === prompt.id ? 'border-accent bg-accent' : 'border-muted'
                              }`}
                          >
                            {selectedPromptId === prompt.id && !isLocked && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                            {isLocked && (
                              <Icon icon="lucide:lock" width={8} height={8} className="text-muted/50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={isLocked ? 'text-muted font-medium' : 'text-white font-medium'}>
                              {prompt.name}
                            </span>
                            {isLocked && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Assigned to {assignedTo}
                              </span>
                            )}
                            {prompt.content && (
                              <p className="text-xs text-muted mt-0.5 line-clamp-2">
                                {prompt.content}
                              </p>
                            )}
                          </div>
                          <Icon
                            icon={isLocked ? 'lucide:lock' : 'lucide:message-square-code'}
                            width={16}
                            height={16}
                            className="text-muted flex-shrink-0"
                          />
                        </div>
                      )
                    })}
                  </div>
                )}

                {selectedPromptId && (
                  <p className="text-sm text-accent flex items-center gap-1">
                    <Icon icon="lucide:check-circle" width={14} height={14} />
                    Prompt selected
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Skills */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-medium">Attach Skills</h3>
                  <p className="text-sm text-muted mt-0.5">
                    Select skills this performer can activate
                  </p>
                </div>

                {/* Select Predefined Template */}
                <button
                  type="button"
                  onClick={() => setShowTemplateDrawer(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-card-border hover:border-accent/40 hover:bg-white/[0.02] transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:layout-template" width={15} height={15} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Select Predefined Template</p>
                    <p className="text-xs text-muted mt-0.5">Browse ready-made skill workflows</p>
                  </div>
                  <Icon icon="lucide:chevron-right" width={15} height={15} className="text-muted/50 shrink-0" />
                </button>

                <SkillTemplateDrawer
                  open={showTemplateDrawer}
                  onClose={() => setShowTemplateDrawer(false)}
                  attachedTemplateIds={selectedTemplateIds}
                  connectedServices={[]}
                  isCreationFlow={true}
                  onAttach={(templateId) => {
                    if (!selectedTemplateIds.includes(templateId)) {
                      setSelectedTemplateIds(prev => [...prev, templateId])
                    }
                  }}
                />

                {loadingSkills ? (
                  <div className="flex items-center justify-center py-8">
                    <Icon
                      icon="lucide:loader-2"
                      width={24}
                      height={24}
                      className="animate-spin text-accent"
                    />
                  </div>
                ) : skills.length === 0 ? (
                  <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
                    <Icon
                      icon="lucide:zap"
                      width={32}
                      height={32}
                      className="mx-auto text-muted mb-2"
                    />
                    <p className="text-muted">No skills found</p>
                    <p className="text-sm text-muted/70 mt-1">
                      You can skip this step and add skills later
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {skills.map((skill: any) => {
                      const isSelected = selectedSkillIds.includes(skill.id)
                      const triggerType = (skill.triggerType || skill.trigger_type || 'event').toLowerCase()
                      const status = (skill.status || '').toLowerCase()
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleWorkerSkill(skill.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'border-accent bg-accent/10'
                              : 'border-card-border hover:border-accent/50 hover:bg-white/[0.02]'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'border-accent bg-accent' : 'border-muted'
                            }`}
                          >
                            {isSelected && (
                              <Icon icon="lucide:check" width={12} height={12} className="text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">
                                {skill.name}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                triggerType === 'event' ? 'bg-green-500/15 text-green-400'
                                : triggerType === 'time' ? 'bg-blue-400/15 text-blue-400'
                                : triggerType === 'command' ? 'bg-orange-400/15 text-orange-400'
                                : 'bg-yellow-400/15 text-yellow-400'
                              }`}>
                                {triggerType === 'event' ? 'EVENT' : triggerType === 'time' ? 'SCHEDULE' : triggerType === 'command' ? 'COMMAND' : 'CONDITION'}
                              </span>
                              {status === 'paused' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400">
                                  PAUSED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted mt-0.5 truncate">
                              {skill.whenText || skill.when_text || ''} → {skill.thenText || skill.then_text || ''}
                            </p>
                          </div>
                          <Icon
                            icon="lucide:zap"
                            width={16}
                            height={16}
                            className={isSelected ? 'text-accent' : 'text-muted'}
                          />
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Selected template chips */}
                {selectedTemplateIds.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted">Predefined templates selected</p>
                    {selectedTemplateIds.map((tplId) => {
                      const tpl = TEMPLATES_BY_ID[tplId]
                      if (!tpl) return null
                      return (
                        <div key={tplId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                          <Icon icon="lucide:layout-template" width={13} height={13} className="text-accent shrink-0" />
                          <span className="text-xs font-medium text-white flex-1 truncate">{tpl.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTemplateIds(prev => prev.filter(id => id !== tplId))}
                            className="text-muted hover:text-white transition-colors shrink-0"
                          >
                            <Icon icon="lucide:x" width={12} height={12} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {selectedSkillIds.length > 0 && (
                  <p className="text-sm text-accent flex items-center gap-1">
                    <Icon icon="lucide:check-circle" width={14} height={14} />
                    {selectedSkillIds.length} skill{selectedSkillIds.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {error && (
              <p
                ref={errorRef}
                className="text-sm text-red-400 flex items-center gap-1.5 mt-4"
              >
                <Icon icon="lucide:alert-circle" width={14} height={14} />
                {error}
              </p>
            )}
          </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-5 border-t border-card-border">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="font-sans font-bold text-[0.85rem] px-4 py-2 rounded-lg border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {"\u2190 Back"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Skip button for steps 2, 3, 4 */}
              {(currentStep === 2 || currentStep === 3 || currentStep === 4) && (
                <button
                  type="button"
                  onClick={skipStep}
                  className="font-sans text-[0.82rem] px-4 py-2 text-muted hover:text-white transition-colors cursor-pointer bg-transparent border-0"
                >
                  Skip
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={currentStep === 1 && !canProceedStep1}
                  className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-bold text-[0.9rem] px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer border-0"
                >
                  {"Continue \u2192"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving || !canProceedStep1}
                  className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-bold text-[0.9rem] px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer border-0"
                >
                  {saving && (
                    <Icon
                      icon="lucide:loader-2"
                      width={16}
                      height={16}
                      className="animate-spin"
                    />
                  )}
                  {saving ? 'Creating...' : 'Create Ability'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tool Connection Modal */}
      {connectingTool && (
        <ToolConnectModal
          tool={connectingTool}
          onClose={() => setConnectingTool(null)}
          onConnected={(credentials, externalHandle) => {
            handleToolConnected(connectingTool.id, credentials, externalHandle)
          }}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Connection Modal
// ─────────────────────────────────────────────────────────────────────────────

interface ToolConnectModalProps {
  tool: Tool
  onClose: () => void
  onConnected: (
    credentials: Record<string, string>,
    externalHandle?: string
  ) => void
}

function ToolConnectModal({
  tool,
  onClose,
  onConnected,
}: ToolConnectModalProps) {
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Bluesky
  const [blueskyHandle, setBlueskyHandle] = useState('')
  const [blueskyAppPassword, setBlueskyAppPassword] = useState('')

  // Telegram
  const [telegramBotToken, setTelegramBotToken] = useState('')

  // Solana
  const [solanaRpcUrl, setSolanaRpcUrl] = useState('')

  // Google OAuth popup
  const [oauthPopup, setOauthPopup] = useState<Window | null>(null)

  // Listen for OAuth popup messages
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Only handle messages from our popup
      if (
        event.data?.type === 'oauth_success' &&
        event.data?.provider === tool.id
      ) {
        const { credentials, displayName } = event.data
        const email = credentials?.email || displayName || 'Connected'
        setVerifying(false)
        setOauthPopup(null)
        onConnected(
          { ...credentials, external_handle: email },
          email
        )
      } else if (
        event.data?.type === 'oauth_error' &&
        event.data?.provider === tool.id
      ) {
        setError(event.data.error || 'OAuth failed')
        setVerifying(false)
        setOauthPopup(null)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [tool.id, onConnected])

  // Check if popup was closed without completing OAuth
  useEffect(() => {
    if (!oauthPopup) return

    const checkPopup = setInterval(() => {
      if (oauthPopup.closed) {
        setVerifying(false)
        setOauthPopup(null)
        clearInterval(checkPopup)
      }
    }, 500)

    return () => clearInterval(checkPopup)
  }, [oauthPopup])

  function handleGoogleOAuth() {
    setVerifying(true)
    setError(null)

    // Open popup for Google OAuth - use backend URL (no OAuth logic in frontend)
    const backendUrl =
      process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      `${backendUrl}/api/oauth/google/init?popup=true`,
      'google_oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    )

    if (popup) {
      setOauthPopup(popup)
      popup.focus()
    } else {
      setError('Popup blocked. Please allow popups for this site.')
      setVerifying(false)
    }
  }

  async function handleVerifyAndConnect() {
    setVerifying(true)
    setError(null)

    try {
      if (tool.id === 'bluesky') {
        if (!blueskyHandle.trim() || !blueskyAppPassword.trim()) {
          setError('Please enter both handle and app password')
          setVerifying(false)
          return
        }

        const cleanHandle = blueskyHandle.trim().replace(/[\u200B-\u200D\u202A-\u202E\uFEFF\u00AD\u2060\u2069@]/g, '')
        // Verify with backend API (not directly with Bluesky)
        const result = await verifyToolCredentials('bluesky', {
          handle: cleanHandle,
          app_password: blueskyAppPassword.trim(),
        })

        if (!result.success) {
          setError(result.error || 'Invalid credentials — check your handle and app password')
          setVerifying(false)
          return
        }

        onConnected(
          {
            ...(result.credentials || { handle: cleanHandle, app_password: blueskyAppPassword.trim() }),
            external_handle: result.externalHandle || cleanHandle,
            external_user_id: result.externalUserId || '',
          },
          result.externalHandle
        )
      } else if (tool.id === 'telegram') {
        if (!telegramBotToken.trim()) {
          setError('Please enter the bot token')
          setVerifying(false)
          return
        }

        // Verify with backend API (not directly with Telegram)
        const result = await verifyToolCredentials('telegram', {
          bot_token: telegramBotToken.trim(),
        })

        if (!result.success) {
          setError(result.error || 'Invalid bot token')
          setVerifying(false)
          return
        }

        onConnected(
          {
            ...(result.credentials || { bot_token: telegramBotToken.trim() }),
            external_handle: result.externalHandle || '',
            external_user_id: result.externalUserId || '',
          },
          result.externalHandle
        )
      } else if (tool.id === 'google') {
        // Google uses popup OAuth - handled by handleGoogleOAuth
        handleGoogleOAuth()
        return
      } else if (tool.id === 'solana') {
        if (!solanaRpcUrl.trim()) {
          setError('Please enter an RPC URL')
          setVerifying(false)
          return
        }

        try {
          new URL(solanaRpcUrl.trim())
        } catch {
          setError('Please enter a valid URL')
          setVerifying(false)
          return
        }

        const result = await verifyToolCredentials('solana', {
          rpc_url: solanaRpcUrl.trim(),
        })
        if (!result.success) {
          setError(result.error || 'Failed to connect Solana')
          setVerifying(false)
          return
        }
        onConnected(
          result.credentials || { rpc_url: solanaRpcUrl.trim(), external_handle: solanaRpcUrl.trim(), external_user_id: '' },
          solanaRpcUrl.trim()
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      if (tool.id !== 'google') {
        setVerifying(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop - clicking outside does NOT close the modal to prevent data loss */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <form
        noValidate
        onSubmit={(e) => { e.preventDefault(); handleVerifyAndConnect() }}
        className="relative bg-card border border-card-border rounded-2xl w-full max-w-md shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-card-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Icon
                icon={tool.icon}
                width={20}
                height={20}
                className="text-accent"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Connect {tool.name}
              </h2>
              <p className="text-xs text-muted">{tool.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors cursor-pointer"
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Instructions */}
          {tool.instructions && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-6">
              <h4 className="text-sm font-medium text-accent flex items-center gap-2 mb-2">
                <Icon icon="lucide:info" width={14} height={14} />
                How to get credentials
              </h4>
              <p className="text-xs text-muted whitespace-pre-line">
                {tool.instructions}
              </p>
            </div>
          )}

          {/* Bluesky Form */}
          {tool.id === 'bluesky' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bluesky Handle
                </label>
                <input
                  type="text"
                  inputMode="text"
                  value={blueskyHandle}
                  onChange={(e) => setBlueskyHandle(e.target.value)}
                  placeholder="username.bsky.social"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  data-lpignore="true"
                  className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  App Password
                </label>
                <input
                  type="password"
                  value={blueskyAppPassword}
                  onChange={(e) => setBlueskyAppPassword(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  autoComplete="new-password"
                  data-form-type="other"
                  className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
            </div>
          )}

          {/* Telegram Form */}
          {tool.id === 'telegram' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bot Token
                </label>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Solana Form */}
          {tool.id === 'solana' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  RPC URL
                </label>
                <input
                  type="text"
                  value={solanaRpcUrl}
                  onChange={(e) => setSolanaRpcUrl(e.target.value)}
                  placeholder="https://mainnet.helius-rpc.com/?api-key=..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Google OAuth */}
          {tool.id === 'google' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-3">
                  <Icon icon="logos:google-icon" width={28} height={28} />
                </div>
                <p className="text-sm text-foreground mb-1">
                  Connect your Google account
                </p>
                <p className="text-xs text-muted">
                  Access Gmail, Calendar, and Drive
                </p>
              </div>

              {verifying && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted">
                  <Icon
                    icon="lucide:loader-2"
                    width={16}
                    height={16}
                    className="animate-spin"
                  />
                  Waiting for authorization...
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <Icon icon="lucide:alert-circle" width={14} height={14} />
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-card-border bg-background/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-foreground hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={verifying}
            className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-[4px] transition-colors flex items-center gap-2"
          >
            {verifying ? (
              <>
                <Icon
                  icon="lucide:loader-2"
                  width={16}
                  height={16}
                  className="animate-spin"
                />
                {tool.id === 'google' ? 'Authorizing...' : 'Verifying...'}
              </>
            ) : tool.id === 'google' ? (
              <>
                <Icon icon="logos:google-icon" width={16} height={16} />
                Sign in with Google
              </>
            ) : (
              <>
                <Icon icon="lucide:link" width={16} height={16} />
                Connect
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
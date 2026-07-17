'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@iconify/react'
import {
  suggestHandle,
  isValidHandle,
  HANDLE_MAX,
  PRESENCE_SUBTYPES,
} from '@/lib/agent-types'
import type { Presence, AgentTone, PresenceSubtype } from '@/lib/agent-types'
import { createPresenceAgent, checkHandleAvailability, listUnassignedWorkers, updateAgent, listAgents } from '@/lib/agents-api'
import { useAuth } from '@/lib/auth-context'
import { useStudio } from '@/lib/studio-context'
import { listSavedTools, type SavedTool } from '@/lib/tools-api'
import { getMissingSkillTools, getMissingSkillProviders } from '@/lib/skill-tools'
import ToolAccountSelector from '@/components/ToolAccountSelector'

// ─── Draft storage (same keys as the modal) ───────────────────────────────────

const PRESENCE_DRAFT_KEY_PREFIX = 'kinship_presence_draft_'
function getPresenceDraftKey(w: string): string { return w ? `${PRESENCE_DRAFT_KEY_PREFIX}${w}` : '' }
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
  selectedAccountIds: string[]
  selectedSkillIds: string[]
  selectedPerformerIds: string[]
  currentStep: number
  savedAt: number
}

function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => { callback(...args) }, delay)
    },
    [callback, delay]
  ) as T
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])
  return debouncedFn
}

function savePresenceDraft(draft: PresenceDraft, wallet: string): void {
  const key = getPresenceDraftKey(wallet)
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify(draft)) } catch { }
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
  } catch { }
  return null
}
function clearPresenceDraft(wallet: string): void {
  const key = getPresenceDraftKey(wallet)
  if (!key) return
  try { localStorage.removeItem(key) } catch { }
  try { localStorage.removeItem('kinship_presence_draft') } catch { }
}

// ─── Validation ────────────────────────────────────────────────────────────────

const PRESENCE_NAME_MAX = 25
const PRESENCE_DESCRIPTION_MIN = 50
const PRESENCE_DESCRIPTION_MAX = 5000
const PRESENCE_TAGLINE_MAX = 255

function validatePresenceName(name: string): string | null {
  if (!name) return null
  if (name.trim().length === 0) return 'Name is required'
  if (name.length > PRESENCE_NAME_MAX) return `Max ${PRESENCE_NAME_MAX} characters`
  return null
}
function validatePresenceTagline(tagline: string): string | null {
  if (!tagline) return null
  if (tagline.length > PRESENCE_TAGLINE_MAX) return `Max ${PRESENCE_TAGLINE_MAX} characters`
  return null
}
function validatePresenceHandle(h: string): string | null {
  if (!h) return null
  if (!isValidHandle(h)) return 'Only letters, numbers, underscores, and periods allowed'
  if (h.length > HANDLE_MAX) return `Max ${HANDLE_MAX} characters`
  return null
}
function validatePresenceDescription(desc: string): string | null {
  if (!desc) return null
  if (desc.trim().length === 0) return 'Description is required'
  if (desc.trim().length < PRESENCE_DESCRIPTION_MIN) return `At least ${PRESENCE_DESCRIPTION_MIN} characters required`
  if (desc.length > PRESENCE_DESCRIPTION_MAX) return `Max ${PRESENCE_DESCRIPTION_MAX} characters`
  return null
}

const PRESENCE_STEPS = [
  { id: 1, name: 'Basic Info', icon: 'lucide:user' },
  { id: 2, name: 'Tools', icon: 'lucide:wrench' },
  { id: 3, name: 'Inform', icon: 'lucide:brain' },
  { id: 4, name: 'Stance', icon: 'lucide:message-square-code' },
  { id: 5, name: 'Skills', icon: 'lucide:zap' },
  { id: 6, name: 'Performers', icon: 'lucide:bot' },
]
const ALLY_STEP_IDS = [1, 3, 4] 

const AGENT_TONES: { value: AgentTone; label: string; description: string; icon: string }[] = [
  { value: 'neutral',      label: 'Neutral',      description: 'Balanced and helpful',          icon: 'lucide:minus' },
  { value: 'friendly',     label: 'Friendly',     description: 'Warm and approachable',         icon: 'lucide:smile' },
  { value: 'professional', label: 'Professional', description: 'Formal and business-like',      icon: 'lucide:briefcase' },
  { value: 'strict',       label: 'Strict',       description: 'Direct and authoritative',      icon: 'lucide:shield-alert' },
  { value: 'cool',         label: 'Cool',         description: 'Laid-back and casual',          icon: 'lucide:glasses' },
  { value: 'angry',        label: 'Angry',        description: 'Assertive and intense',         icon: 'lucide:flame' },
  { value: 'playful',      label: 'Playful',      description: 'Fun and whimsical',             icon: 'lucide:sparkles' },
  { value: 'wise',         label: 'Wise',         description: 'Thoughtful and philosophical',  icon: 'lucide:graduation-cap' },
]

interface KnowledgeBase { id: string; name: string; description?: string }
interface Prompt { id: string; name: string; content?: string; type?: string }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateAvatarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type') as PresenceSubtype | null
  const { user } = useAuth()
  const { currentPlatform } = useStudio()

  const wallet = user?.wallet || ''
  const platformId = currentPlatform?.id

  const initialDraft = typeof window !== 'undefined' && wallet ? loadPresenceDraft(wallet) : null

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
  const handleCheckVersion = useRef(0)
  const [briefDescription, setBriefDescription] = useState(initialDraft?.briefDescription || '')
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [tagline, setTagline] = useState(initialDraft?.tagline || '')
  const [taglineTouched, setTaglineTouched] = useState(false)
  const [tone, setTone] = useState<AgentTone>(initialDraft?.tone || 'friendly')
  const [presenceSubtype, setPresenceSubtype] = useState<PresenceSubtype>(typeParam || initialDraft?.presenceSubtype || 'member')
  const [isPrimaryMember, setIsPrimaryMember] = useState(initialDraft?.isPrimaryMember || false)

  // Step 2: Inform
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>(initialDraft?.selectedKnowledgeIds || [])
  const [loadingKB, setLoadingKB] = useState(false)

  // Step 3: Stance
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(initialDraft?.selectedPromptId || null)
  const [loadingPrompts, setLoadingPrompts] = useState(false)

  // Step 4: Skills
  const [skills, setSkills] = useState<any[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(initialDraft?.selectedSkillIds || [])
  const [loadingSkills, setLoadingSkills] = useState(false)

  // Step 2: Tools
  const [globalTools, setGlobalTools] = useState<SavedTool[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(initialDraft?.selectedAccountIds || [])
  const [loadingTools, setLoadingTools] = useState(false)

  // Step 6: Performers (all workers for this wallet)
  const [allPerformers, setAllPerformers] = useState<Presence[]>([])
  const [selectedPerformerIds, setSelectedPerformerIds] = useState<string[]>(initialDraft?.selectedPerformerIds || [])
  const [loadingPerformers, setLoadingPerformers] = useState(false)

  // General
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [agentPromptMap, setAgentPromptMap] = useState<Record<string, string>>({})
  const [isWizard, setIsWizard] = useState(false)
  const isAlly = presenceSubtype === 'ally'
  const visibleSteps = isAlly ? PRESENCE_STEPS.filter(s => ALLY_STEP_IDS.includes(s.id)) : PRESENCE_STEPS

  useEffect(() => { setIsWizard(user?.role === 'wizard') }, [user?.role])

  // Auto-save
  const saveDraft = useCallback(() => {
    const draft: PresenceDraft = {
      name, handle, briefDescription, tagline, tone, presenceSubtype, isPrimaryMember,
      selectedKnowledgeIds, selectedPromptId, selectedAccountIds, selectedSkillIds, selectedPerformerIds, currentStep, savedAt: Date.now(),
    }
    savePresenceDraft(draft, wallet)
  }, [name, handle, briefDescription, tagline, tone, presenceSubtype, isPrimaryMember, selectedKnowledgeIds, selectedPromptId, selectedAccountIds, selectedSkillIds, selectedPerformerIds, currentStep])

  const debouncedSaveDraft = useDebounce(saveDraft, AUTO_SAVE_DEBOUNCE_MS)

  // Save draft immediately when navigating away
  const saveDraftRef = useRef(saveDraft)
  saveDraftRef.current = saveDraft
  const createdSuccessRef = useRef(false)
  useEffect(() => {
    return () => { if (!createdSuccessRef.current) saveDraftRef.current() }
  }, [])

  useEffect(() => {
    if (name || handle || briefDescription || tagline || selectedKnowledgeIds.length > 0 || selectedPromptId || selectedSkillIds.length > 0 || selectedPerformerIds.length > 0) {
      debouncedSaveDraft()
    }
  }, [name, handle, briefDescription, tagline, tone, presenceSubtype, selectedKnowledgeIds, selectedPromptId, selectedAccountIds, selectedSkillIds, selectedPerformerIds, debouncedSaveDraft])

  useEffect(() => { if (name || handle || briefDescription || selectedSkillIds.length > 0 || selectedPerformerIds.length > 0) saveDraft() }, [currentStep])

  // Restore draft once wallet becomes available (auth may load after first render)
  useEffect(() => {
    if (!wallet) return
    const draft = loadPresenceDraft(wallet)
    if (!draft) return
    if (draft.selectedSkillIds?.length) setSelectedSkillIds(draft.selectedSkillIds)
    if (draft.selectedPerformerIds?.length) setSelectedPerformerIds(draft.selectedPerformerIds)
  }, [wallet])

  useEffect(() => { if (error && errorRef.current) errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [error])

  useEffect(() => { if (handle && !handleAvailable && !handleChecking) scheduleHandleCheck(handle) }, [])

  useEffect(() => { if ((currentStep === 2 || currentStep === 5) && globalTools.length === 0) fetchGlobalTools() }, [currentStep])
  useEffect(() => { if (currentStep === 3 && knowledgeBases.length === 0) fetchKnowledgeBases() }, [currentStep])
  useEffect(() => { if (currentStep === 4 && prompts.length === 0) { fetchPrompts(); fetchPresenceAgentPromptMap() } }, [currentStep])
  useEffect(() => { if (currentStep === 5 && skills.length === 0) fetchSkills() }, [currentStep])
  useEffect(() => { if (currentStep === 6 && allPerformers.length === 0) fetchAllPerformers() }, [currentStep])

  async function fetchAllPerformers() {
    if (!wallet) return
    setLoadingPerformers(true)
    try {
      const result = await listAgents({ wallet, type: 'WORKER', includeWorkers: true })
      setAllPerformers((result.agents || []).filter((a: Presence) => a.type?.toUpperCase() === 'WORKER'))
    } catch { } finally { setLoadingPerformers(false) }
  }

  function togglePerformer(id: string) {
    setSelectedPerformerIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  async function fetchGlobalTools() {
    if (!wallet) return
    setLoadingTools(true)
    try {
      const saved = await listSavedTools(wallet)
      setGlobalTools(saved)
    } catch { } finally { setLoadingTools(false) }
  }

  function toggleAccountId(accountId: string) {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) return prev.filter(t => t !== accountId)
      const tool = globalTools.find(a => a.id === accountId)?.toolName
      const sameToolIds = globalTools.filter(a => a.toolName === tool).map(a => a.id)
      return [...prev.filter(id => !sameToolIds.includes(id)), accountId]
    })
  }

  async function fetchSkills() {
    setLoadingSkills(true)
    try {
      const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const res = await fetch(`${AGENT_API}/api/skills?page=1&page_size=100&wallet=${encodeURIComponent(wallet)}`)
      if (res.ok) { const data = await res.json(); setSkills(data.skills || []) }
    } catch { } finally { setLoadingSkills(false) }
  }

  // Tool provider names connected to this ally (from the Tools step) — used to
  // gate which skills can be attached.
  const connectedToolNames = globalTools
    .filter((t) => selectedAccountIds.includes(t.id))
    .map((t) => t.toolName)

  function toggleSkill(id: string, skillTools: string[] = []) {
    // Block selecting a skill whose required tools aren't connected (allow
    // deselecting an already-selected skill regardless).
    const missing = getMissingSkillTools(skillTools, connectedToolNames)
    if (missing.length > 0 && !selectedSkillIds.includes(id)) return
    setSelectedSkillIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  async function fetchPresenceAgentPromptMap() {
    try {
      const params = new URLSearchParams()
      if (wallet) params.set('wallet', wallet)
      if (platformId) params.set('platformId', platformId)
      params.set('includeWorkers', 'true')
      const res = await fetch(`/api/agents?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, string> = {}
        for (const a of data.agents || []) {
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
      const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const params = new URLSearchParams()
      if (wallet) params.set('wallet', wallet)
      if (platformId) params.set('platformId', platformId)
      const res = await fetch(`${AGENT_API_URL}/api/knowledge?${params.toString()}`)
      if (res.ok) { const data = await res.json(); setKnowledgeBases(data.knowledgeBases || []) }
    } catch { } finally { setLoadingKB(false) }
  }

  async function fetchPrompts() {
    setLoadingPrompts(true)
    try {
      const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const params = new URLSearchParams()
      if (wallet) params.set('wallet', wallet)
      if (platformId) params.set('platformId', platformId)
      const res = await fetch(`${AGENT_API_URL}/api/prompts?${params.toString()}`)
      if (res.ok) { const data = await res.json(); setPrompts(data.prompts || []) }
    } catch { } finally { setLoadingPrompts(false) }
  }

  function scheduleHandleCheck(h: string) {
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current)
    setHandleAvailable(null)
    setHandleSuggestion(null)
    if (!h || validatePresenceHandle(h)) { setHandleChecking(false); return }
    setHandleChecking(true)
    const version = ++handleCheckVersion.current
    handleCheckTimer.current = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(h)
        if (version !== handleCheckVersion.current) return
        setHandleAvailable(result.available)
        setHandleSuggestion(result.suggestion || null)
      } catch {
        if (version !== handleCheckVersion.current) return
        setHandleAvailable(null); setHandleSuggestion(null)
      } finally {
        if (version === handleCheckVersion.current) setHandleChecking(false)
      }
    }, 400)
  }

  function onNameChange(val: string) {
    setName(val)
    if (!val.trim()) {
      setHandle(''); setHandleTouched(false); setHandleAvailable(null)
      setHandleSuggestion(null); setHandleChecking(false)
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
      setHandleTouched(false); setHandleAvailable(null); setHandleSuggestion(null); setHandleChecking(false)
    } else {
      setHandleTouched(true); scheduleHandleCheck(cleaned)
    }
  }

  function acceptHandleSuggestion() {
    if (handleSuggestion) {
      setHandle(handleSuggestion); setHandleTouched(true); setHandleSuggestion(null)
      scheduleHandleCheck(handleSuggestion)
    }
  }

  function toggleKnowledgeBase(id: string) {
    setSelectedKnowledgeIds(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id])
  }

  const inlineNameError = nameTouched ? validatePresenceName(name) : null
  const inlineHandleFormatError = handleTouched ? validatePresenceHandle(handle) : null
  const inlineHandleAvailError = handle && !inlineHandleFormatError && handleAvailable === false ? `@${handle} is already taken` : null
  const inlineHandleError = inlineHandleFormatError || inlineHandleAvailError
  const inlineDescriptionError = descriptionTouched ? validatePresenceDescription(briefDescription) : null
  const visibleIndex = visibleSteps.findIndex(s => s.id === currentStep)
  const isLastStep = visibleIndex === visibleSteps.length - 1

  const canProceedStep1 =
    name.trim() && handle.trim() && briefDescription.trim() &&
    !validatePresenceName(name) && !validatePresenceHandle(handle) &&
    !validatePresenceDescription(briefDescription) &&
    handleAvailable === true && !handleChecking

  function nextStep() {
    if (currentStep === 1 && !canProceedStep1) return
    if (visibleIndex < visibleSteps.length - 1) {
    setCurrentStep(visibleSteps[visibleIndex + 1].id)
  }
  }

  function prevStep() {
    if (visibleIndex > 0) {
    setCurrentStep(visibleSteps[visibleIndex - 1].id)

  }
  }

  function skipStep() {
    if (currentStep === 2) setSelectedAccountIds([])
    else if (currentStep === 3) setSelectedKnowledgeIds([])
    else if (currentStep === 4) setSelectedPromptId(null)
    else if (currentStep === 5) setSelectedSkillIds([])
    else if (currentStep === 6) setSelectedPerformerIds([])
    nextStep()
  }

  async function handleSubmit() {
    if (!canProceedStep1) return
    setLoading(true)
    setError('')
    try {
      const newAvatar = await createPresenceAgent({
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
        tools: selectedAccountIds,
      })

      // Assign selected performers to the new avatar
      if (selectedPerformerIds.length > 0 && newAvatar?.id) {
        await Promise.allSettled(
          selectedPerformerIds.map(performerId =>
            updateAgent(performerId, { parentId: newAvatar.id })
          )
        )
      }

      createdSuccessRef.current = true
      clearPresenceDraft(wallet)
      router.push('/agents/avatar')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      if (message.toLowerCase().includes('handle') && message.toLowerCase().includes('taken')) {
        setHandleAvailable(false); setHandleSuggestion(null); setCurrentStep(1)
        setError(`The handle @${handle} was claimed while you were setting up. Please pick a new one.`)
        scheduleHandleCheck(handle)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full py-6 px-4">
      {/* Header outside card */}
      <div className="mb-0 max-w-[680px] mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[0.68rem] tracking-[0.16em] uppercase text-accent font-bold mb-1">Create your ally</p>
              <h2 className="text-[1.6rem] font-display italic text-white m-0 leading-none">Make it yours</h2>
              <p className="text-muted text-[0.82rem] mt-1">{"Six short steps. Stop anytime \u2014 you can always just chat."}</p>
            </div>
            <button
              onClick={() => router.push('/agents/avatar')}
              className="font-sans font-bold text-[0.78rem] px-4 py-2 rounded-lg border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
            >
              {"Skip \u2014 just chat"}
            </button>
          </div>

          {/* Step tabs */}
          <div className="flex mt-3 border-b border-card-border max-w-[680px] mx-auto">
            {visibleSteps.map((step, idx) => {
              const isActive = currentStep === step.id
              const isDone = visibleIndex > idx
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

      {/* Content card */}
      <div className="mt-5">
        <div className="bg-surface border border-card-border rounded-[14px] p-5 max-w-[680px] mx-auto">
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
                      const value = e.target.value
                      const filteredValue = value.replace(/[^a-zA-Z0-9 ]/g, '')
                      onNameChange(filteredValue)
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
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs tabular-nums ${name.length > PRESENCE_NAME_MAX ? 'text-red-400' : name.length === PRESENCE_NAME_MAX ? 'text-white' : 'text-muted'}`}>
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
                  <span className="text-muted font-normal ml-1">(unique identifier)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm select-none">@</span>
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
                    <span className={`text-xs tabular-nums ${handle.length > HANDLE_MAX ? 'text-red-400' : handle.length === HANDLE_MAX ? 'text-white' : 'text-muted'}`}>
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
                      <>{' · '}<button type="button" onClick={acceptHandleSuggestion} className="text-accent hover:underline cursor-pointer">Use @{handleSuggestion}?</button></>
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
                  Tagline <span className="text-muted font-normal ml-1">(optional)</span>
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
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs tabular-nums ${tagline.length > PRESENCE_TAGLINE_MAX ? 'text-red-400' : tagline.length === PRESENCE_TAGLINE_MAX ? 'text-white' : 'text-muted'}`}>
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
                  <span className={`absolute right-4 bottom-3 text-xs tabular-nums ${briefDescription.length > PRESENCE_DESCRIPTION_MAX ? 'text-red-400' : briefDescription.length === PRESENCE_DESCRIPTION_MAX ? 'text-white' : briefDescription.length > 0 && briefDescription.length < PRESENCE_DESCRIPTION_MIN ? 'text-amber-400' : 'text-muted'}`}>
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
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Type <span className="text-accent">*</span>
                </label>
                <p className="text-xs text-muted mb-3">What kind of Avatar is this?</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESENCE_SUBTYPES.filter((st) => st.value !== 'big_avatar' && (st.value !== 'ally' || isWizard)).map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => { setPresenceSubtype(st.value); if (st.value !== 'member') setIsPrimaryMember(false) }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${presenceSubtype === st.value ? 'border-accent bg-accent/10 text-accent' : 'border-card-border hover:border-white/30 hover:bg-white/[0.02] text-muted'}`}
                    >
                      <Icon icon={st.icon} width={20} height={20} className={presenceSubtype === st.value ? 'text-accent' : 'text-muted'} />
                      <span className={`text-xs font-medium ${presenceSubtype === st.value ? 'text-accent' : 'text-foreground'}`}>{st.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted/70 mt-2 text-center">
                  {PRESENCE_SUBTYPES.find((st) => st.value === presenceSubtype)?.description}
                </p>
              </div>

              {/* Primary Member Toggle */}
              {presenceSubtype === 'member' && (
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:pin" width={16} height={16} className="text-amber-400" />
                    <div>
                      <div className="text-sm font-medium text-white">Primary Member</div>
                      <div className="text-xs text-muted">Auto-selected when joining movements</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsPrimaryMember(!isPrimaryMember)}
                    style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0, backgroundColor: isPrimaryMember ? '#fbbf24' : 'rgba(255,255,255,0.1)', transition: 'background-color 0.2s ease', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', transition: 'transform 0.2s ease', transform: isPrimaryMember ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </div>
              )}

              {/* Tone Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Personality Tone</label>
                <p className="text-xs text-muted mb-3">Choose how your Avatar communicates</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AGENT_TONES.map((t) => (
                    <button key={t.value} type="button" onClick={() => setTone(t.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${tone === t.value ? 'border-accent bg-accent/10 text-accent' : 'border-card-border hover:border-white/30 hover:bg-white/[0.02] text-muted'}`}>
                      <Icon icon={t.icon} width={20} height={20} className={tone === t.value ? 'text-accent' : 'text-muted'} />
                      <span className={`text-xs font-medium ${tone === t.value ? 'text-accent' : 'text-foreground'}`}>{t.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted/70 mt-2 text-center">
                  {AGENT_TONES.find((t) => t.value === tone)?.description}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Inform */}
          {/* Step 2: Tools */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Select Tools</h3>
                  <p className="text-sm text-muted">Choose which connected tool accounts this avatar can use</p>
                </div>
                <a href="/empower" className="text-sm text-accent hover:underline flex items-center gap-1">
                  <Icon icon="lucide:plus" width={14} height={14} />Add Accounts
                </a>
              </div>
              <ToolAccountSelector
                accounts={globalTools}
                selectedIds={selectedAccountIds}
                onToggle={toggleAccountId}
                loading={loadingTools}
              />
              {selectedAccountIds.length > 0 && (
                <p className="text-sm text-accent flex items-center gap-1">
                  <Icon icon="lucide:check-circle" width={14} height={14} />
                  {selectedAccountIds.length} account{selectedAccountIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Step 3: Inform */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Select Inform</h3>
                  <p className="text-sm text-muted">Choose what your Avatar knows about</p>
                </div>
                <a href="/knowledge" className="text-sm text-accent hover:underline flex items-center gap-1">
                  <Icon icon="lucide:plus" width={14} height={14} />Create New
                </a>
              </div>
              {loadingKB ? (
                <div className="flex items-center justify-center py-8">
                  <Icon icon="lucide:loader-2" width={24} height={24} className="animate-spin text-accent" />
                </div>
              ) : knowledgeBases.length === 0 ? (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
                  <Icon icon="lucide:brain" width={32} height={32} className="mx-auto text-muted mb-2" />
                  <p className="text-muted">No inform found</p>
                  <p className="text-sm text-muted/70">You can skip this step and add later</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {knowledgeBases.map((kb) => (
                    <label key={kb.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedKnowledgeIds.includes(kb.id) ? 'border-accent/50 bg-accent/5' : 'border-card-border hover:border-white/20 hover:bg-white/[0.02]'}`}>
                      <input type="checkbox" checked={selectedKnowledgeIds.includes(kb.id)} onChange={() => toggleKnowledgeBase(kb.id)} className="mt-1 accent-accent" />
                      <div className="flex-1 min-w-0">
                        <span className="text-white font-medium">{kb.name}</span>
                        {kb.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{kb.description}</p>}
                      </div>
                      <Icon icon="lucide:brain" width={16} height={16} className="text-muted flex-shrink-0" />
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

          {/* Step 4: Stance */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Select Stance</h3>
                  <p className="text-sm text-muted">Define how your Presence behaves</p>
                </div>
                <a href="/prompts" className="text-sm text-accent hover:underline flex items-center gap-1">
                  <Icon icon="lucide:plus" width={14} height={14} />Create New
                </a>
              </div>
              {loadingPrompts ? (
                <div className="flex items-center justify-center py-8">
                  <Icon icon="lucide:loader-2" width={24} height={24} className="animate-spin text-accent" />
                </div>
              ) : prompts.length === 0 ? (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
                  <Icon icon="lucide:message-square-code" width={32} height={32} className="mx-auto text-muted mb-2" />
                  <p className="text-muted">No stances found</p>
                  <p className="text-sm text-muted/70">You can skip this step and add later</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {prompts.map((prompt) => {
                    const assignedTo = agentPromptMap[prompt.id]
                    const isLocked = !!assignedTo
                    return (
                      <div key={prompt.id}
                        onClick={() => !isLocked && setSelectedPromptId(selectedPromptId === prompt.id ? null : prompt.id)}
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${isLocked ? 'border-card-border bg-white/[0.01] opacity-50 cursor-not-allowed' : selectedPromptId === prompt.id ? 'border-accent/50 bg-accent/5 cursor-pointer' : 'border-card-border hover:border-white/20 hover:bg-white/[0.02] cursor-pointer'}`}>
                        <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isLocked ? 'border-muted/30' : selectedPromptId === prompt.id ? 'border-accent bg-accent' : 'border-muted'}`}>
                          {selectedPromptId === prompt.id && !isLocked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          {isLocked && <Icon icon="lucide:lock" width={8} height={8} className="text-muted/50" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={isLocked ? 'text-muted font-medium' : 'text-white font-medium'}>{prompt.name}</span>
                          {isLocked && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Assigned to {assignedTo}</span>}
                          {prompt.type && !isLocked && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-muted">{prompt.type}</span>}
                          {prompt.content && <p className="text-xs text-muted mt-0.5 line-clamp-2">{prompt.content}</p>}
                        </div>
                        <Icon icon={isLocked ? 'lucide:lock' : 'lucide:message-square-code'} width={16} height={16} className="text-muted flex-shrink-0" />
                      </div>
                    )
                  })}
                </div>
              )}
              {selectedPromptId && (
                <p className="text-sm text-accent flex items-center gap-1">
                  <Icon icon="lucide:check-circle" width={14} height={14} />Prompt selected
                </p>
              )}
            </div>
          )}

          {/* Step 5: Skills */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Attach Skills</h3>
                  <p className="text-sm text-muted">Select skills to automate — your agent will run them in the background</p>
                </div>
                <a href="/align" className="text-sm text-accent hover:underline flex items-center gap-1">
                  <Icon icon="lucide:plus" width={14} height={14} />Create Skill
                </a>
              </div>
              {loadingSkills ? (
                <div className="flex items-center justify-center py-8">
                  <Icon icon="lucide:loader-2" width={24} height={24} className="animate-spin text-accent" />
                </div>
              ) : skills.length === 0 ? (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
                  <Icon icon="lucide:zap" width={32} height={32} className="mx-auto text-muted mb-2" />
                  <p className="text-muted">No skills found</p>
                  <p className="text-sm text-muted/70">You can skip this step and add skills later</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {skills.map((skill: any) => {
                    const isSelected = selectedSkillIds.includes(skill.id)
                    const triggerType = (skill.triggerType || skill.trigger_type || 'event').toLowerCase()
                    const status = (skill.status || '').toLowerCase()
                    const skillTools: string[] = skill.tools || []
                    const missingTools = getMissingSkillTools(skillTools, connectedToolNames)
                    const missingProviders = getMissingSkillProviders(skillTools, connectedToolNames)
                    const blocked = missingTools.length > 0 && !isSelected
                    return (
                      <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id, skillTools)}
                        disabled={blocked}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                          blocked
                            ? 'border-card-border bg-white/[0.01] opacity-50 cursor-not-allowed'
                            : isSelected
                              ? 'border-accent bg-accent/10'
                              : 'border-card-border hover:border-accent/50 hover:bg-white/[0.02]'
                        }`}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'border-accent bg-accent' : 'border-muted'}`}>
                          {isSelected && <Icon icon="lucide:check" width={12} height={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{skill.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${triggerType === 'event' ? 'bg-green-500/15 text-green-400' : triggerType === 'time' ? 'bg-blue-400/15 text-blue-400' : triggerType === 'command' ? 'bg-orange-400/15 text-orange-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
                              {triggerType === 'event' ? 'EVENT' : triggerType === 'time' ? 'SCHEDULE' : triggerType === 'command' ? 'COMMAND' : 'CONDITION'}
                            </span>
                            {status === 'paused' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400">PAUSED</span>}
                          </div>
                          <p className="text-xs text-muted mt-0.5 truncate">{skill.whenText || skill.when_text || ''} → {skill.thenText || skill.then_text || ''}</p>
                          {blocked && (
                            <p className="text-[10px] text-yellow-400 mt-1">
                              Enable {missingProviders.join(', ')} on the Tools step to use this skill
                            </p>
                          )}
                        </div>
                        <Icon icon="lucide:zap" width={16} height={16} className={isSelected ? 'text-accent' : 'text-muted'} />
                      </button>
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

          {/* Step 6: Performers */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Assign Performers</h3>
                  <p className="text-sm text-muted">Select unassigned performers to link to this avatar. This step is optional.</p>
                </div>
                <a href="/agents/create/performer" className="text-sm text-accent hover:underline flex items-center gap-1">
                  <Icon icon="lucide:plus" width={14} height={14} />Create Performer
                </a>
              </div>
              {loadingPerformers ? (
                <div className="flex items-center justify-center py-8">
                  <Icon icon="lucide:loader-2" width={24} height={24} className="animate-spin text-accent" />
                </div>
              ) : allPerformers.length === 0 ? (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
                  <Icon icon="lucide:bot" width={32} height={32} className="mx-auto text-muted mb-2" />
                  <p className="text-muted">No performers found</p>
                  <p className="text-sm text-muted/70">No performers have been created yet. Create a performer first, then assign it here.</p>
                  <p className="text-xs text-muted/50 mt-2">You can skip this step and assign performers later</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allPerformers.map((worker) => {
                    const isSelected = selectedPerformerIds.includes(worker.id)
                    const parentId = (worker as any).parentId || (worker as any).parent_id
                    return (
                      <button key={worker.id} type="button" onClick={() => togglePerformer(worker.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${isSelected ? 'border-accent bg-accent/10' : 'border-card-border hover:border-accent/50 hover:bg-white/[0.02]'}`}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'border-accent bg-accent' : 'border-muted'}`}>
                          {isSelected && <Icon icon="lucide:check" width={12} height={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{worker.name}</span>
                            {worker.handle && worker.handle.replace(/^@/, '') !== worker.name?.replace(/^@/, '') && <span className="text-xs text-muted">@{worker.handle}</span>}
                            {parentId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-muted/70">assigned</span>}
                          </div>
                          {worker.role && <p className="text-xs text-muted mt-0.5 truncate">{worker.role}</p>}
                          {worker.description && <p className="text-xs text-muted/60 mt-0.5 truncate">{worker.description}</p>}
                        </div>
                        <Icon icon="lucide:bot" width={16} height={16} className={isSelected ? 'text-accent' : 'text-muted'} />
                      </button>
                    )
                  })}
                </div>
              )}
              {selectedPerformerIds.length > 0 && (
                <p className="text-sm text-accent flex items-center gap-1">
                  <Icon icon="lucide:check-circle" width={14} height={14} />
                  {selectedPerformerIds.length} performer{selectedPerformerIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {error && (
            <p ref={errorRef} className="text-sm text-red-400 flex items-center gap-1.5 mt-4">
              <Icon icon="lucide:alert-circle" width={14} height={14} />
              {error}
            </p>
          )}
        </div>
        </div>

      {/* Footer outside card */}
      <div className="flex items-center justify-between pt-4 pb-2 max-w-[680px] mx-auto">
          <div>
            {currentStep > 1 && (
              <button type="button" onClick={prevStep}
                className="font-sans font-bold text-[0.85rem] px-4 py-2 rounded-lg border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer">
                {"\u2190 Back"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6) && (
              <button type="button" onClick={skipStep}
                className="font-sans text-[0.82rem] px-4 py-2 text-muted hover:text-white transition-colors cursor-pointer bg-transparent border-0">
                Skip
              </button>
            )}
            {!isLastStep ? (
              <button type="button" onClick={nextStep} disabled={currentStep === 1 && !canProceedStep1}
                className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-bold text-[0.9rem] px-6 py-2.5 rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer border-0">
                {"Continue \u2192"}
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading || !canProceedStep1}
                className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-bold text-[0.9rem] px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer border-0">
                {loading ? <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" /> : <Icon icon="lucide:check" width={16} height={16} />}
                {loading ? 'Creating…' : 'Create Avatar'}
              </button>
            )}
          </div>
        </div>
      </div>
  )
}
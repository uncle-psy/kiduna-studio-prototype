'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import {
  isValidHandle,
  HANDLE_MAX,
} from '@/lib/agent-types'
import type { WorkerAccessLevel } from '@/lib/agent-types'
import { createWorkerAgent, checkHandleAvailability, updateAgent } from '@/lib/agents-api'
import { listSavedTools, type SavedTool } from '@/lib/tools-api'
import { getMissingSkillTools, getMissingSkillProviders } from '@/lib/skill-tools'
import ToolAccountSelector from '@/components/ToolAccountSelector'
import { useAuth } from '@/lib/auth-context'
import { useStudio } from '@/lib/studio-context'

// ─── Draft storage ─────────────────────────────────────────────────────────────

const WORKER_DRAFT_KEY_PREFIX = 'kinship_worker_draft_'
function getWorkerDraftKey(w: string): string { return w ? `${WORKER_DRAFT_KEY_PREFIX}${w}` : '' }
const AUTO_SAVE_DEBOUNCE_MS = 500

interface WorkerDraft {
  name: string
  description: string
  tagline: string
  role: string
  accessLevel: WorkerAccessLevel
  selectedAccountIds: string[]
  selectedPromptId: string | null
  selectedSkillIds: string[]
  currentStep: number
  savedAt: number
}

function useDebounce<T extends (...args: Parameters<T>) => void>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => { callback(...args) }, delay)
  }, [callback, delay]) as T
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])
  return debouncedFn
}

function saveWorkerDraft(draft: WorkerDraft, wallet: string): void {
  const key = getWorkerDraftKey(wallet)
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify(draft)) } catch { }
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
  } catch { }
  return null
}
function clearWorkerDraft(wallet: string): void {
  const key = getWorkerDraftKey(wallet)
  if (!key) return
  try { localStorage.removeItem(key) } catch { }
  try { localStorage.removeItem('kinship_worker_draft') } catch { }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Prompt { id: string; name: string; content?: string; type?: string }

// ─── Validation ────────────────────────────────────────────────────────────────

const WORKER_ROLE_MAX = 100
const WORKER_DESCRIPTION_MIN = 50
const WORKER_DESCRIPTION_MAX = 5000

function validateWorkerHandleFormat(h: string): string | null {
  if (!h) return 'Handle is required'
  if (!isValidHandle(h)) return 'Only letters, numbers, _ and . allowed'
  if (h.length > HANDLE_MAX) return `Max ${HANDLE_MAX} characters`
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
  if (desc.trim().length < WORKER_DESCRIPTION_MIN) return `At least ${WORKER_DESCRIPTION_MIN} characters required`
  if (desc.length > WORKER_DESCRIPTION_MAX) return `Max ${WORKER_DESCRIPTION_MAX} characters`
  return null
}

const WORKER_STEPS = [
  { id: 1, name: 'Basic Info', icon: 'lucide:user' },
  { id: 2, name: 'Tools', icon: 'lucide:wrench' },
  { id: 3, name: 'Stance', icon: 'lucide:message-square-code' },
  { id: 4, name: 'Skills', icon: 'lucide:zap' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatePerformerPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { currentPlatform } = useStudio()

  const wallet = user?.wallet || ''
  const platformId = currentPlatform?.id

  const initialDraft = typeof window !== 'undefined' ? loadWorkerDraft(wallet) : null

  const [currentStep, setCurrentStep] = useState(initialDraft?.currentStep || 1)

  // Step 1: Basic Info
  const [workerHandle, setWorkerHandle] = useState(initialDraft?.name || '')
  const [workerHandleTouched, setWorkerHandleTouched] = useState(false)
  const [workerHandleAvailable, setWorkerHandleAvailable] = useState<boolean | null>(null)
  const [workerHandleSuggestion, setWorkerHandleSuggestion] = useState<string | null>(null)
  const [workerHandleChecking, setWorkerHandleChecking] = useState(false)
  const workerHandleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const workerHandleCheckVersion = useRef(0)
  const [description, setDescription] = useState(initialDraft?.description || '')
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [tagline, setTagline] = useState(initialDraft?.tagline || '')
  const [role, setRole] = useState(initialDraft?.role || '')
  const [roleTouched, setRoleTouched] = useState(false)
  const [accessLevel, setAccessLevel] = useState<WorkerAccessLevel>(initialDraft?.accessLevel || 'public')

  // Step 2: Tools (from global pool)
  const [globalTools, setGlobalTools] = useState<SavedTool[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [loadingTools, setLoadingTools] = useState(false)

  // Step 3: Stance
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(initialDraft?.selectedPromptId || null)
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [agentPromptMap, setAgentPromptMap] = useState<Record<string, string>>({})

  // Step 4: Skills
  const [skills, setSkills] = useState<any[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(initialDraft?.selectedSkillIds || [])
  const [loadingSkills, setLoadingSkills] = useState(false)

  // General
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLParagraphElement>(null)

  // Auto-save
  const saveDraft = useCallback(() => {
    const draft: WorkerDraft = { name: workerHandle, description, tagline, role, accessLevel, selectedAccountIds, selectedPromptId, selectedSkillIds, currentStep, savedAt: Date.now() }
    saveWorkerDraft(draft, wallet)
  }, [workerHandle, description, tagline, role, accessLevel, selectedAccountIds, selectedPromptId, selectedSkillIds, currentStep])

  const debouncedSaveDraft = useDebounce(saveDraft, AUTO_SAVE_DEBOUNCE_MS)

  // Save draft immediately when navigating away
  const saveDraftRef = useRef(saveDraft)
  saveDraftRef.current = saveDraft
  const createdSuccessRef = useRef(false)
  useEffect(() => {
    return () => { if (!createdSuccessRef.current) saveDraftRef.current() }
  }, [])

  useEffect(() => {
    if (workerHandle || description || tagline || role || selectedAccountIds.length > 0 || selectedPromptId || selectedSkillIds.length > 0) debouncedSaveDraft()
  }, [workerHandle, description, tagline, role, accessLevel, selectedAccountIds, selectedPromptId, selectedSkillIds, debouncedSaveDraft])

  useEffect(() => { if (workerHandle || description || role) saveDraft() }, [currentStep])

  useEffect(() => { if (error && errorRef.current) errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [error])

  function scheduleWorkerHandleCheck(h: string) {
    if (workerHandleCheckTimer.current) clearTimeout(workerHandleCheckTimer.current)
    setWorkerHandleAvailable(null); setWorkerHandleSuggestion(null)
    const trimmed = h.trim().toLowerCase()
    if (!trimmed || validateWorkerHandleFormat(trimmed)) { setWorkerHandleChecking(false); return }
    setWorkerHandleChecking(true)
    const version = ++workerHandleCheckVersion.current
    workerHandleCheckTimer.current = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(trimmed)
        if (version !== workerHandleCheckVersion.current) return
        setWorkerHandleAvailable(result.available); setWorkerHandleSuggestion(result.suggestion || null)
      } catch {
        if (version !== workerHandleCheckVersion.current) return
        setWorkerHandleAvailable(null); setWorkerHandleSuggestion(null)
      } finally {
        if (version === workerHandleCheckVersion.current) setWorkerHandleChecking(false)
      }
    }, 400)
  }

  useEffect(() => { if (workerHandle && !workerHandleAvailable && !workerHandleChecking) scheduleWorkerHandleCheck(workerHandle) }, [])

  function acceptWorkerHandleSuggestion() {
    if (workerHandleSuggestion) {
      setWorkerHandle(workerHandleSuggestion); setWorkerHandleTouched(true); setWorkerHandleSuggestion(null)
      scheduleWorkerHandleCheck(workerHandleSuggestion)
    }
  }

  useEffect(() => {
    if (currentStep === 2 && globalTools.length === 0) fetchGlobalTools()
  }, [currentStep])

  useEffect(() => {
    if (currentStep === 3 && prompts.length === 0) { fetchPrompts(); fetchWorkerAgentPromptMap() }
  }, [currentStep])

  useEffect(() => {
    if (currentStep === 4 && skills.length === 0) fetchSkills()
  }, [currentStep])

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

  async function fetchWorkerAgentPromptMap() {
    try {
      const params = new URLSearchParams()
      if (wallet) params.set('wallet', wallet)
      if (platformId) params.set('platformId', platformId)
      params.set('includeWorkers', 'true')
      const res = await fetch(`/api/agents?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, string> = {}
        for (const a of data.agents || []) { const pid = a.promptId || a.prompt_id; if (pid) map[pid] = a.name }
        setAgentPromptMap(map)
      }
    } catch { }
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

  async function fetchSkills() {
    if (!wallet) return
    setLoadingSkills(true)
    try {
      const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const params = new URLSearchParams({ page: '1', page_size: '100', wallet })
      const res = await fetch(`${AGENT_API_URL}/api/skills?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSkills(data.skills || [])
      }
    } catch { } finally { setLoadingSkills(false) }
  }

  const connectedToolNames = globalTools
    .filter((t) => selectedAccountIds.includes(t.id))
    .map((t) => t.toolName)

  function toggleSkill(skillId: string, skillTools: string[]) {
    const missing = getMissingSkillTools(skillTools, connectedToolNames)
    if (missing.length > 0 && !selectedSkillIds.includes(skillId)) return
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    )
  }

  const inlineHandleFormatError = workerHandleTouched ? validateWorkerHandleFormat(workerHandle) : null
  const inlineHandleAvailError = workerHandle && !inlineHandleFormatError && workerHandleAvailable === false ? `@${workerHandle} is already taken` : null
  const inlineHandleError = inlineHandleFormatError || inlineHandleAvailError
  const inlineRoleError = roleTouched ? validateWorkerRole(role) : null
  const inlineDescriptionError = descriptionTouched ? validateWorkerDescription(description) : null

  const canProceedStep1 =
    workerHandle.trim() && role.trim() && description.trim() &&
    !validateWorkerHandleFormat(workerHandle) && !validateWorkerRole(role) &&
    !validateWorkerDescription(description) &&
    workerHandleAvailable === true && !workerHandleChecking

  function nextStep() {
    if (currentStep === 1 && !canProceedStep1) return
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }
  function prevStep() { if (currentStep > 1) setCurrentStep(currentStep - 1) }

  async function handleCreate() {
    if (!canProceedStep1) return
    setSaving(true); setError('')
    try {
      // Account IDs go directly into agent.tools — backend resolves to MCP tool names at runtime
      const newWorker = await createWorkerAgent({
        name: `@${workerHandle.trim()}`,
        handle: workerHandle.trim().toLowerCase(),
        briefDescription: description.trim(),
        tagline: tagline.trim() || undefined,
        role: role.trim(),
        accessLevel,
        wallet,
        platformId,
        tools: selectedAccountIds,
        promptId: selectedPromptId,
        skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
      })
      // Persist the selected tools explicitly. The worker-create endpoint does not
      // reliably store the tools array, which left newly created performers showing
      // "Tools not connected". Re-applying them via updateAgent uses the same path
      // as connecting a tool on the details page (which works).
      if (selectedAccountIds.length > 0 && newWorker?.id) {
        await updateAgent(newWorker.id, { tools: selectedAccountIds })
      }
      createdSuccessRef.current = true
      clearWorkerDraft(wallet)
      router.push('/agents/performer')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      if (message.toLowerCase().includes('handle') && message.toLowerCase().includes('taken')) {
        setWorkerHandleAvailable(false); setWorkerHandleSuggestion(null); setCurrentStep(1)
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
      <div className="w-full py-6 px-4">
        {/* Header outside card */}
        <div className="mb-0 max-w-[680px] mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[0.68rem] tracking-[0.16em] uppercase text-accent font-bold mb-1">Create performer</p>
                <h2 className="text-[1.6rem] font-display text-white m-0 leading-none">Build your agent</h2>
                <p className="text-muted text-[0.82rem] mt-1">{"Four steps to a working performer."}</p>
              </div>
              <button onClick={() => router.push('/agents/performer')}
                className="font-sans font-bold text-[0.78rem] px-4 py-2 rounded-lg border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer">
                skip - just chat
              </button>
            </div>
            {/* Step progress bar + tab labels (prototype-matched) */}
            <div className="mt-4 max-w-[680px] mx-auto">
              {/* Segmented progress bar */}
              <div className="flex items-center gap-0">
                {WORKER_STEPS.map((step, i) => {
                  const isActive = currentStep === step.id
                  const isDone = currentStep > step.id
                  return (
                    <div key={step.id} className="flex-1" style={{ height: 3 }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 2,
                          background: isDone || isActive
                            ? 'var(--accent, #EAAA00)'
                            : 'rgba(255,255,255,0.18)',
                          marginLeft: i === 0 ? 0 : 3,
                          marginRight: i === WORKER_STEPS.length - 1 ? 0 : 3,
                        }}
                      />
                    </div>
                  )
                })}
              </div>
              {/* Tab labels */}
              <div className="flex mt-2">
                {WORKER_STEPS.map((step) => {
                  const isActive = currentStep === step.id
                  const isDone = currentStep > step.id
                  return (
                    <button key={step.id} onClick={() => { if (isDone) setCurrentStep(step.id) }}
                      className="flex-1 text-center text-[0.68rem] tracking-[0.14em] uppercase font-bold transition-colors bg-transparent border-0 py-1"
                      style={{
                        color: isActive
                          ? 'var(--accent, #EAAA00)'
                          : isDone
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(255,255,255,0.35)',
                        cursor: isDone ? 'pointer' : 'default',
                      }}>
                      {step.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Content card */}
        <div className="mt-5">
          <div className="bg-surface border border-card-border rounded-[14px] p-5 max-w-[680px] mx-auto">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <p className="text-[0.68rem] tracking-[0.16em] uppercase text-accent font-bold mb-2">{"Step 1 \u00B7 " + WORKER_STEPS[0].name}</p>
                  <h3 className="text-[1.3rem] font-bold text-white m-0">Set up your performer</h3>
                  <p className="text-muted text-[0.85rem] mt-1">Name it and describe what it does.</p>
                </div>

                {/* Handle */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Handle <span className="text-accent">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-muted text-sm pointer-events-none">@</span>
                    <input value={workerHandle}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, HANDLE_MAX).toLowerCase()
                        setWorkerHandle(cleaned); setWorkerHandleTouched(true)
                        if (cleaned === '') { setWorkerHandleAvailable(null); setWorkerHandleSuggestion(null); setWorkerHandleChecking(false) } else { scheduleWorkerHandleCheck(cleaned) }
                      }}
                      onBlur={() => setWorkerHandleTouched(true)}
                      maxLength={HANDLE_MAX}
                      placeholder="e.g. bluesky_agent"
                      className={`w-full bg-input border rounded-xl pl-8 pr-20 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${inlineHandleError ? 'border-red-500/50 focus:border-red-500/70' : workerHandleAvailable === true ? 'border-green-500/50 focus:border-green-500/70' : 'border-card-border focus:border-accent/50'}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                      {workerHandleChecking && <Icon icon="lucide:loader-2" width={12} height={12} className="text-muted animate-spin" />}
                      {!workerHandleChecking && workerHandleAvailable === true && workerHandle.trim() && <Icon icon="lucide:check-circle" width={12} height={12} className="text-green-400" />}
                      <span className={`text-xs tabular-nums ${workerHandle.length >= HANDLE_MAX ? 'text-red-400' : 'text-muted'}`}>{workerHandle.length}/{HANDLE_MAX}</span>
                    </span>
                  </div>
                  {inlineHandleError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <Icon icon="lucide:alert-circle" width={12} height={12} />
                      {inlineHandleError}
                      {workerHandleSuggestion && <>{' · '}<button type="button" onClick={acceptWorkerHandleSuggestion} className="text-accent hover:underline cursor-pointer">Use @{workerHandleSuggestion}?</button></>}
                    </p>
                  )}
                  {!inlineHandleError && workerHandleAvailable === true && workerHandle.trim() && (
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <Icon icon="lucide:check-circle" width={12} height={12} />Handle is available
                    </p>
                  )}
                </div>

                {/* Specialization / Role */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Specialization / Role <span className="text-accent">*</span>
                  </label>
                  <div className="relative">
                    <input value={role} onChange={e => setRole(e.target.value)} onBlur={() => setRoleTouched(true)} maxLength={WORKER_ROLE_MAX}
                      placeholder="e.g. Web research, Copywriting, Data extraction"
                      className={`w-full bg-input border rounded-xl px-4 pr-16 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${inlineRoleError ? 'border-red-500/50 focus:border-red-500/70' : 'border-card-border focus:border-accent/50'}`}
                    />
                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs tabular-nums ${role.length >= WORKER_ROLE_MAX ? 'text-red-400' : 'text-muted'}`}>{role.length}/{WORKER_ROLE_MAX}</span>
                  </div>
                  {inlineRoleError && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><Icon icon="lucide:alert-circle" width={12} height={12} />{inlineRoleError}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Description <span className="text-accent">*</span>
                  </label>
                  <div className="relative">
                    <textarea value={description} onChange={e => setDescription(e.target.value)} onBlur={() => setDescriptionTouched(true)}
                      maxLength={WORKER_DESCRIPTION_MAX}
                      placeholder="Describe what this agent does in detail — its tasks, capabilities, and behavior. Minimum 50 characters."
                      rows={6}
                      className={`w-full bg-input border rounded-xl px-4 py-3 pr-16 text-foreground placeholder:text-muted focus:outline-none resize-none transition-colors ${inlineDescriptionError ? 'border-red-500/50 focus:border-red-500/70' : 'border-card-border focus:border-accent/50'}`}
                    />
                    <span className={`absolute right-4 bottom-3 text-xs tabular-nums ${description.length >= WORKER_DESCRIPTION_MAX ? 'text-red-400' : description.length > 0 && description.length < WORKER_DESCRIPTION_MIN ? 'text-amber-400' : 'text-muted'}`}>
                      {description.length}/{WORKER_DESCRIPTION_MAX}
                    </span>
                  </div>
                  {inlineDescriptionError && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><Icon icon="lucide:alert-circle" width={12} height={12} />{inlineDescriptionError}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Select Tools */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Select Tools</h3>
                    <p className="text-sm text-muted">Choose which connected tool accounts this performer can use</p>
                  </div>
                  <a href="/empower?return=/agents/create/performer" className="text-sm text-accent hover:underline flex items-center gap-1">
                    <Icon icon="lucide:plus" width={14} height={14} />Add Accounts
                  </a>
                  <p className="text-[11px] text-muted/70 mt-1">Opens Empower to connect accounts, then return here to select them.</p>
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

            {/* Step 3: Stance */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Select Stance</h3>
                    <p className="text-sm text-muted">Choose a pre-defined prompt to guide agent behavior</p>
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
                    <p className="text-sm text-muted/70 mt-1">Create prompts in the <a href="/prompts" className="text-accent hover:underline">Instruct</a> section</p>
                    <p className="text-xs text-muted/50 mt-2">You can skip this step and add later</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prompts.map(prompt => {
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
                            {prompt.content && <p className="text-xs text-muted mt-0.5 line-clamp-2">{prompt.content}</p>}
                          </div>
                          <Icon icon={isLocked ? 'lucide:lock' : 'lucide:message-square-code'} width={16} height={16} className="text-muted flex-shrink-0" />
                        </div>
                      )
                    })}
                  </div>
                )}
                {selectedPromptId && <p className="text-sm text-accent flex items-center gap-1"><Icon icon="lucide:check-circle" width={14} height={14} />Prompt selected</p>}
              </div>
            )}

            {/* Step 4: Skills */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Attach Skills</h3>
                    <p className="text-sm text-muted">Select skills this performer can run (e.g. website edits via chat)</p>
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
                    <p className="text-sm text-muted/70 mt-1">Create one in <a href="/align" className="text-accent hover:underline">Enact</a> first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {skills.map((skill: any) => {
                      const isSelected = selectedSkillIds.includes(skill.id)
                      const skillTools: string[] = skill.tools || []
                      const missingTools = getMissingSkillTools(skillTools, connectedToolNames)
                      const missingProviders = getMissingSkillProviders(skillTools, connectedToolNames)
                      const blocked = missingTools.length > 0 && !isSelected
                      const triggerType = (skill.triggerType || skill.trigger_type || 'event').toLowerCase()
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill.id, skillTools)}
                          disabled={blocked}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                            blocked
                              ? 'border-card-border bg-white/[0.01] opacity-50 cursor-not-allowed'
                              : isSelected
                                ? 'border-accent bg-accent/10 cursor-pointer'
                                : 'border-card-border hover:border-accent/50 hover:bg-white/[0.02] cursor-pointer'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-accent bg-accent' : 'border-muted'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">{skill.name}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{triggerType}</span>
                            </div>
                            {blocked && (
                              <p className="text-[10px] text-yellow-400 mt-1">
                                Enable {missingProviders.join(', ')} on the Tools step to use this skill
                              </p>
                            )}
                          </div>
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
                  className="font-sans font-bold text-[0.85rem] px-4 py-2 rounded-[4px] border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer">
                  {"\u2190 Back"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              
              {currentStep < 4 ? (
                <button type="button" onClick={nextStep} disabled={currentStep === 1 && !canProceedStep1}
                  className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-bold text-[0.9rem] px-6 py-2.5 rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer border-0">
                  {"Continue \u2192"}
                </button>
              ) : (
                <button type="button" onClick={handleCreate} disabled={saving || !canProceedStep1}
                  className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-bold text-[0.9rem] px-6 py-2.5 rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer border-0">
                  {saving && <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" />}
                  {saving ? 'Creating...' : 'Create Ability'}
                </button>
              )}
            </div>
          </div>
    </>
  )
}
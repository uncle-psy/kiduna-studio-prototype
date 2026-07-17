'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { Presence, PresenceSignal, AgentTone, PresenceSubtype, WorkerAccessLevel } from '@/lib/agent-types'
import { ALL_SIGNALS, HANDLE_MAX, isValidHandle, PRESENCE_SUBTYPES, CUSTOM_TONE_MAX} from '@/lib/agent-types'
import { checkHandleAvailability, getWorkersForPresence, deleteAgent as deleteAgentApi, updateAgent, setAlly as setAllyApi, unsetAlly as unsetAllyApi, listAgents} from '@/lib/agents-api'
import { listSavedTools, type SavedTool } from '@/lib/tools-api'
import { listContextsWithNested } from '@/lib/context-api'
import { useAuth } from '@/lib/auth-context'
import SkillTemplateDrawer from '@/components/SkillTemplateDrawer'
import ToolAccountSelector from '@/components/ToolAccountSelector'
import { TEMPLATES_BY_ID } from '@/lib/skill-templates'
import { getMissingSkillTools } from '@/lib/skill-tools'
import { EXEC_AUTOMATION_CATEGORIES } from '@/lib/predefined-avatars'

const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
import { useStudio } from '@/lib/studio-context'
import {
  ArrowLeft,
  Crown,
  Bot,
  Save,
  Pencil,
  Trash2,
  Unplug,
  Brain,
  MessageSquareCode,
  Activity,
  Sparkles,
  ScanFace,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Check,
  Image as ImageIcon,
  Library,
  Plus,
  Users,
  UserRound,
  Zap,
  Globe,
  Lock,
  Shield,
  Settings,
  Link as LinkIcon,
  RotateCcw,
  Pin,
  Archive,
  Eye,
  EyeOff,
  Pause,
  Play,
  Star
} from 'lucide-react'

interface KnowledgeBase {
  id: string
  name: string
}

interface PromptItem {
  id: string
  name: string
}

// ─── Editable text section ──────────────────────────────────────────
const DESCRIPTION_MIN_CHARS = 50
const DESCRIPTION_MAX_CHARS = 5000
const NAME_MAX = 25
const TAGLINE_MAX = 255
const ROLE_MAX = 100 

function EditableSection({
  label,
  icon: Icon,
  value,
  onChange,
  onSave,
  saving,
  savedFlash,
  placeholder,
  rows = 10,
  minChars,
}: {
  label: string
  icon: React.ElementType
  value: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
  savedFlash: boolean
  placeholder: string
  rows?: number
  minChars?: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [showError, setShowError] = useState(false)
  const originalRef = useRef('')

  const tooShort = minChars ? value.trim().length < minChars : false

  function startEditing() {
    originalRef.current = value
    setIsEditing(true)
    setShowError(false)
  }

  function handleCancel() {
    onChange(originalRef.current)
    setIsEditing(false)
    setShowError(false)
  }

  async function handleSave() {
    if (tooShort) {
      setShowError(true) 
      return
    }
    setShowError(false)
    await onSave()
    setIsEditing(false)
  }

  useEffect(() => {
    if (!value) setIsEditing(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`border rounded-xl p-5 transition-colors ${
        isEditing ? 'bg-card border-accent/40' : 'bg-card border-card-border'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Icon size={16} className="text-accent" />
          {label}
          {isEditing && (
            <span className="text-xs font-normal text-accent/70 bg-accent/10 px-2 py-0.5 rounded-full">
              Editing
            </span>
          )}
        </h3>
        {value && (
          <span className={`text-xs tabular-nums ${value.length >= DESCRIPTION_MAX_CHARS ? 'text-red-400' : value.length >= 4000 ? 'text-amber-400' : tooShort && showError ? 'text-red-400' : 'text-muted'}`}>
            {value.length}/{DESCRIPTION_MAX_CHARS}
          </span>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => { if (e.target.value.length <= DESCRIPTION_MAX_CHARS) { onChange(e.target.value); if (showError) setShowError(false) } }}
        readOnly={!isEditing}
        placeholder={placeholder}
        rows={rows}
        maxLength={DESCRIPTION_MAX_CHARS}
        className={`w-full rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none text-sm leading-relaxed transition-colors ${
          isEditing
            ? `bg-input border ${showError && tooShort ? 'border-red-500/50 focus:border-red-500/70' : 'border-accent/30 focus:border-accent/60'} resize-y cursor-text`
            : 'bg-transparent border border-transparent cursor-default resize-none select-text'
        }`}
      />

      {showError && tooShort && (
        <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle size={12} />
          At least {minChars} characters required ({value.trim().length} entered)
        </p>
      )}

      <div className="flex items-center gap-3 mt-3">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-accent hover:bg-accent-dark text-white font-semibold px-5 py-2 rounded-full transition-colors flex items-center gap-2 text-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save {label}
            </button>
            <button
              onClick={handleCancel}
              className="border border-card-border text-foreground/70 hover:text-foreground hover:border-accent/40 font-medium px-4 py-2 rounded-full transition-colors text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={startEditing}
            className="bg-card border border-card-border hover:border-accent/50 text-foreground font-medium px-5 py-2 rounded-full transition-colors flex items-center gap-2 text-sm"
          >
            <Pencil size={14} />
            Edit {label}
          </button>
        )}
        <p
          className={`text-xs flex items-center gap-1 transition-colors ${
            savedFlash ? 'text-green-400' : 'text-muted'
          }`}
        >
          {savedFlash && <CheckCircle size={12} />}
          {savedFlash ? 'Saved!' : ''}
        </p>
      </div>
    </div>
  )
}

// ─── Collapsible sidebar card ─────────────────────────────────────────────────
function SidebarCard({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-white font-semibold flex items-center gap-2 text-sm">
          <Icon size={16} className="text-accent" />
          {title}
        </span>
        {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-card-border pt-4">{children}</div>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AgentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()
  const { currentPlatform } = useStudio()

  const [agent, setAgent] = useState<Presence | null>(null)
  const [loading, setLoading] = useState(true)

  // Editable fields
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [editingHandle, setEditingHandle] = useState(false)
  const [handleError, setHandleError] = useState('')
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [handleSuggestion, setHandleSuggestion] = useState<string | null>(null)
  const [handleChecking, setHandleChecking] = useState(false)
  const handleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCheckVersion = useRef(0)
  const [briefDescription, setBriefDescription] = useState('')
  const [editingBrief, setEditingBrief] = useState(false)
  const [tagline, setTagline] = useState('')
  const [editingTagline, setEditingTagline] = useState(false)
  const [description, setDescription] = useState('')

  // Additional editable fields
  const PREDEFINED_TONES: AgentTone[] = ['neutral', 'friendly', 'professional', 'strict', 'cool', 'angry', 'playful', 'wise']
  const [tone, setTone] = useState<AgentTone | ''>('')
  const [customTone, setCustomTone] = useState('')
  const [presenceSubtype, setPresenceSubtype] = useState<PresenceSubtype | ''>('')
  const [role, setRole] = useState('')
  const [editingRole, setEditingRole] = useState(false)
  const [accessLevel, setAccessLevel] = useState<WorkerAccessLevel | ''>('')

  // Save state per section
  const [descSaving, setDescSaving] = useState(false)
  const [descFlash, setDescFlash] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)
  const [handleSaving, setHandleSaving] = useState(false)
  const [briefSaving, setBriefSaving] = useState(false)
  const [taglineSaving, setTaglineSaving] = useState(false)
  const [toneSaving, setToneSaving] = useState(false)
  const [toneFlash, setToneFlash] = useState(false)
  const [subtypeSaving, setSubtypeSaving] = useState(false)
  const [roleSaving, setRoleSaving] = useState(false)
  const [accessLevelSaving, setAccessLevelSaving] = useState(false)

  // Relationships
  const [allKBs, setAllKBs] = useState<KnowledgeBase[]>([])
  const [allPrompts, setAllPrompts] = useState<PromptItem[]>([])
  const [selectedKBIds, setSelectedKBIds] = useState<string[]>([])
  const [kbDirty, setKbDirty] = useState(false)
  const [kbWarning, setKbWarning] = useState(false)
  const [selectedPromptId, setSelectedPromptId] = useState('')
  const [allSkills, setAllSkills] = useState<any[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false)
  // Template skill status tracking (templateId → {skillId, status})
  const [templateSkillMap, setTemplateSkillMap] = useState<Record<string, {skillId: string; status: string}>>({})
  // Confirmation dialog for template removal
  const [removeConfirm, setRemoveConfirm] = useState<{tplId: string; name: string} | null>(null)
  const [activeSignals, setActiveSignals] = useState<PresenceSignal[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [selectedAssetName, setSelectedAssetName] = useState('')

  // AI assistant
  const [aiMode, setAiMode] = useState<'generate' | 'refine'>('generate')
  const [aiInstructions, setAiInstructions] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  // Prompt-agent map (for locking assigned stances)
  const [agentPromptMap, setAgentPromptMap] = useState<Record<string, string>>({})
  // KB-agent map (for locking assigned inform sources)
  const [kbAgentMap, setKbAgentMap] = useState<Record<string, string>>({})

  // Sidebar save state
  const [sidebarSaving, setSidebarSaving] = useState(false)
  const [sidebarFlash, setSidebarFlash] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteBlocked, setDeleteBlocked] = useState(false)
  const [deleteBlockReason, setDeleteBlockReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Workers (for Presence agents)
  const [workers, setWorkers] = useState<Presence[]>([])
  const [workersLoading, setWorkersLoading] = useState(false)
  const [workerToRemove, setWorkerToRemove] = useState<Presence | null>(null)
  const [removingWorker, setRemovingWorker] = useState(false)

  // Available workers (for adding performers to a Presence — excludes already assigned)
  const [availableWorkers, setAvailableWorkers] = useState<Presence[]>([])
  const [availableLoading, setAvailableLoading] = useState(false)
  const [showAddPerformer, setShowAddPerformer] = useState(false)
  const [assigningPerformer, setAssigningPerformer] = useState<string | null>(null)

  // Parent presences (for Worker agents — can have multiple)
  const [parentPresences, setParentPresences] = useState<Presence[]>([])
  const [parentLoading, setParentLoading] = useState(false)

  // Live tool connections (for Worker agents)
  
  const [toolsLoading, setToolsLoading] = useState(false)
  const [toolToDisconnect, setToolToDisconnect] = useState<string | null>(null)
  const [disconnectingTool, setDisconnectingTool] = useState(false)
  const [empowerTools, setEmpowerTools] = useState<SavedTool[]>([])
  const [empowerToolsLoading, setEmpowerToolsLoading] = useState(false)
  const [connectingEmpowerTool, setConnectingEmpowerTool] = useState<string | null>(null)

  // Exec Avatar: assign/unassign tool from Empower pool
  const [execRemoveConfirm, setExecRemoveConfirm] = useState<{ accountId: string; toolName: string; handle: string } | null>(null)
  const [execRemoving, setExecRemoving] = useState(false)

  // Whether this agent is used in a Movement or Mission context
  const [usedInContext, setUsedInContext] = useState(false)

  const flashTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function flash(key: string, setter: (v: boolean) => void) {
    setter(true)
    if (flashTimer.current[key]) clearTimeout(flashTimer.current[key])
    flashTimer.current[key] = setTimeout(() => setter(false), 2500)
  }

  // ── Load ──
  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${id}`)
      if (!res.ok) {
        router.push('/agents')
        return
      }
      const data = await res.json()
      const a: Presence = data.agent
      setAgent(a)
      setName(a.name)
      setHandle(a.handle || '')
      setBriefDescription(a.briefDescription || '')
      setTagline(a.tagline || '')
      setDescription(a.description || '')
      setSelectedKBIds(a.knowledgeBaseIds || [])
      setSelectedPromptId(a.promptId || '')
      setSelectedSkillIds(a.skillIds || (a as any).skill_ids || [])
      setSelectedTemplateIds((a as any).templateIds || (a as any).template_ids || [])
      setActiveSignals(a.signals || [])
      setSelectedAssetId(a.assetId || '')
      setSelectedAssetName(a.assetName || '')
      const loadedTone = ((a.tone || '') as string).toLowerCase()
      if (loadedTone && !['neutral', 'friendly', 'professional', 'strict', 'cool', 'angry', 'playful', 'wise'].includes(loadedTone)) {
        setTone('other')
        setCustomTone(loadedTone)
      } else {
        setTone(loadedTone as AgentTone | '')
      }
      setPresenceSubtype(((a.presenceSubtype || (a as any).presence_subtype || '') as string).toLowerCase() as PresenceSubtype | '')
      setRole(a.role || '')
      setAccessLevel(((a.accessLevel || (a as any).access_level || '') as string).toLowerCase() as WorkerAccessLevel | '')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchAgent()
    // Build query params for user-scoped filtering
    const params = new URLSearchParams()
    if (user?.wallet) params.set('wallet', user.wallet)
    if (currentPlatform?.id) params.set('platformId', currentPlatform.id)
    const qs = params.toString() ? `?${params.toString()}` : ''
    fetch(`/api/knowledge${qs}${qs ? '&' : '?'}include_templates=true`)
      .then((r) => r.json())
      .then((d) => setAllKBs(d.knowledgeBases || []))
      .catch(() => {})
    fetch(`/api/prompts${qs}`)
      .then((r) => r.json())
      .then((d) => setAllPrompts(d.prompts || []))
      .catch(() => {})
    // Fetch skills filtered by current user's wallet (include template-sourced skills for Bluesky avatars)
    const skillsParams = new URLSearchParams()
    if (user?.wallet) skillsParams.set('wallet', user.wallet)
    skillsParams.set('include_templates', 'true')
    fetch(`${AGENT_API_URL}/api/skills?${skillsParams.toString()}`)
      .then((r) => r.json())
      .then((d) => setAllSkills(d.skills || []))
      .catch(() => {})
    // Fetch template-sourced skills to track their status
    if (user?.wallet) {
      const tplParams = new URLSearchParams()
      tplParams.set('wallet', user.wallet)
      tplParams.set('include_templates', 'true')
      fetch(`${AGENT_API_URL}/api/skills?${tplParams.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          const map: Record<string, {skillId: string; status: string}> = {}
          for (const sk of (d.skills || [])) {
            if (sk.sourceTemplateId || sk.source_template_id) {
              map[sk.sourceTemplateId || sk.source_template_id] = {
                skillId: sk.id,
                status: (sk.status || '').toLowerCase(),
              }
            }
          }
          setTemplateSkillMap(map)
        })
        .catch(() => {})
    }
    // Build prompt-agent map for stance locking + KB-agent map for inform locking
    fetch(`/api/agents${qs ? qs + '&includeWorkers=true' : '?includeWorkers=true'}`)
      .then((r) => r.json())
      .then((d) => {
        const agents = d.agents || []
        const promptMap: Record<string, string> = {}
        const kbMap: Record<string, string> = {}
        for (const a of agents) {
          const pid = a.promptId || a.prompt_id
          if (pid) promptMap[pid] = a.name
          const kbIds = a.knowledgeBaseIds || a.knowledge_base_ids || []
          for (const kbId of kbIds) {
            if (kbId) kbMap[kbId] = a.name
          }
        }
        setAgentPromptMap(promptMap)
        setKbAgentMap(kbMap)
      })
      .catch(() => {})
  }, [fetchAgent, user?.wallet, currentPlatform?.id])

  // Fetch workers for Presence agents
  const fetchWorkers = useCallback(async () => {
    if (!agent || agent.type?.toLowerCase() !== 'presence') return
    setWorkersLoading(true)
    try {
      const result = await getWorkersForPresence(id)
      setWorkers(result.agents || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
    } finally {
      setWorkersLoading(false)
    }
  }, [agent?.type, id])

  useEffect(() => {
    if (agent) fetchWorkers()
  }, [agent?.type, fetchWorkers])

  // Fetch parent presences for Worker agents (only once)
  const parentFetchedRef = useRef(false)
  useEffect(() => {
    if (parentFetchedRef.current) return
    if (!agent || agent.type?.toLowerCase() !== 'worker') return
    const parentIds: string[] = (agent as any).parentIds || (agent as any).parent_ids || []
    // Also check legacy single parentId
    const singleParentId = (agent as any).parentId || (agent as any).parent_id
    const allParentIds = [...new Set([...parentIds, ...(singleParentId && !parentIds.includes(singleParentId) ? [singleParentId] : [])])]
    if (allParentIds.length === 0) return
    parentFetchedRef.current = true
    setParentLoading(true)
    Promise.all(
      allParentIds.map(pid =>
        fetch(`/api/agents/${pid}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.agent || d || null)
          .catch(() => null)
      )
    )
      .then(results => setParentPresences(results.filter(Boolean) as Presence[]))
      .finally(() => setParentLoading(false))
  }, [agent?.id])

  // Fetch Empower pool tools for all agent types (wallet-scoped, not per-agent)
  const toolsFetchedRef = useRef(false)
  useEffect(() => {
    if (toolsFetchedRef.current) return
    if (!agent) return
    if (!user?.wallet) return
    toolsFetchedRef.current = true
    setEmpowerToolsLoading(true)
    listSavedTools(user.wallet)
      .then((tools) => setEmpowerTools(tools))
      .catch(() => {})
      .finally(() => setEmpowerToolsLoading(false))
  }, [agent?.id, user?.wallet])

  // Check if this agent is used in any Movement or Mission (context)
  const contextCheckRef = useRef(false)
  useEffect(() => {
    if (contextCheckRef.current) return
    if (!agent || agent.type?.toLowerCase() !== 'presence') return
    contextCheckRef.current = true
    listContextsWithNested()
      .then((contexts) => {
        for (const ctx of contexts) {
          if (ctx.presenceIds?.includes(id)) {
            setUsedInContext(true)
            return
          }
          if (ctx.nestedContexts) {
            for (const nc of ctx.nestedContexts) {
              if (nc.presenceIds?.includes(id)) {
                setUsedInContext(true)
                return
              }
            }
          }
        }
      })
      .catch(() => {})
  }, [agent?.id, id])

  // ── Save name ──
  async function handleSaveName() {
    if (!name.trim() || name.length > NAME_MAX || name.trim() === agent?.name) return
    setNameSaving(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (res.ok) {
      const d = await res.json()
      setAgent(d.agent)
      setName(d.agent.name)
    }
    setNameSaving(false)
  }

  // ── Debounced handle availability check ──
  function scheduleDetailHandleCheck(h: string) {
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current)
    setHandleAvailable(null)
    setHandleSuggestion(null)

    const trimmed = h.trim().toLowerCase()
    // Don't check if empty, same as current, or format-invalid
    if (!trimmed || trimmed === agent?.handle || !isValidHandle(trimmed) || trimmed.length > HANDLE_MAX) {
      setHandleChecking(false)
      return
    }

    setHandleChecking(true)
    const version = ++handleCheckVersion.current

    handleCheckTimer.current = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(trimmed)
        if (version !== handleCheckVersion.current) return
        setHandleAvailable(result.available)
        setHandleSuggestion(result.suggestion || null)
      } catch {
        if (version !== handleCheckVersion.current) return
        setHandleAvailable(null)
        setHandleSuggestion(null)
      } finally {
        if (version === handleCheckVersion.current) setHandleChecking(false)
      }
    }, 400)
  }

  // ── Save handle ──
  async function handleSaveHandle() {
    const trimmed = handle.trim().toLowerCase()
    if (!trimmed) {
      setHandleError('Handle is required')
      return
    }
    if (!isValidHandle(trimmed) || trimmed.length > HANDLE_MAX) {
      setHandleError('Only letters, numbers, _ and . — max 25 characters')
      return
    }
    if (trimmed === agent?.handle) {
      setEditingHandle(false)
      return
    }
    if (handleAvailable === false) {
      setHandleError(`@${trimmed} is already taken`)
      return
    }
    setHandleSaving(true)
    setHandleError('')
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: trimmed }),
    })
    if (res.ok) {
      const d = await res.json()
      setAgent(d.agent)
      setHandle(d.agent.handle)
      setEditingHandle(false)
      setHandleAvailable(null)
      setHandleSuggestion(null)
    } else {
      const d = await res.json()
      const errorMsg = d.error || 'Failed to update handle'
      if (errorMsg.toLowerCase().includes('handle') && errorMsg.toLowerCase().includes('taken')) {
        setHandleAvailable(false)
        setHandleError(`The handle @${trimmed} is already taken. Please choose a different one.`)
        scheduleDetailHandleCheck(trimmed)
      } else {
        setHandleError(errorMsg)
      }
    }
    setHandleSaving(false)
  }

  // ── Save brief description ──
  async function handleSaveBriefDescription() {
    setBriefSaving(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefDescription }),
    })
    if (res.ok) {
      const d = await res.json()
      setAgent(d.agent)
    }
    setBriefSaving(false)
    setEditingBrief(false)
  }

  // ── Save tagline ──
  async function handleSaveTagline() {
    setTaglineSaving(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagline }),
    })
    if (res.ok) {
      const d = await res.json()
      setAgent(d.agent)
    }
    setTaglineSaving(false)
    setEditingTagline(false)
  }

  // ── Save tone ──
  async function handleSaveTone(newTone: AgentTone | '') {
    setTone(newTone)
    if (newTone !== 'other') {
      setCustomTone('')
    }
    // When selecting 'other', don't save yet — wait for custom input
    if (newTone === 'other') return
    setToneSaving(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone: newTone || null }),
    })
    if (res.ok) { const d = await res.json(); setAgent(d.agent); flash('tone', setToneFlash) }
    setToneSaving(false)
  }

  async function handleSaveCustomTone() {
    const trimmed = customTone.trim()
    if (!trimmed || trimmed.length > CUSTOM_TONE_MAX) return
    setToneSaving(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone: trimmed }),
    })
    if (res.ok) { const d = await res.json(); setAgent(d.agent); flash('tone', setToneFlash) }
    setToneSaving(false)
  }

  // ── Save subtype ──
  async function handleSaveSubtype(newSubtype: PresenceSubtype | '') {
    setPresenceSubtype(newSubtype)
    setSubtypeSaving(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presenceSubtype: newSubtype || null }),
    })
    if (res.ok) { const d = await res.json(); setAgent(d.agent) }
    setSubtypeSaving(false)
  }

  // ── Save role ──
  async function handleSaveRole() {
    setRoleSaving(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) { const d = await res.json(); setAgent(d.agent) }
    setRoleSaving(false)
    setEditingRole(false)
  }

  // ── Save access level ──
  async function handleSaveAccessLevel(newLevel: WorkerAccessLevel | '') {
    setAccessLevel(newLevel)
    setAccessLevelSaving(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessLevel: newLevel || null }),
    })
    if (res.ok) { const d = await res.json(); setAgent(d.agent) }
    setAccessLevelSaving(false)
  }

  // ── Save description ──
  async function handleSaveDescription() {
    setDescSaving(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    })
    if (res.ok) {
      const d = await res.json()
      setAgent(d.agent)
      flash('desc', setDescFlash)
    }
    setDescSaving(false)
  }

  // ── Save sidebar (KB, prompt, signals, asset) ──
  async function handleSaveSidebar() {
    setSidebarSaving(true)
    const kbNames = selectedKBIds.map((kbId) => allKBs.find((k) => k.id === kbId)?.name ?? kbId)
    const promptName = allPrompts.find((p) => p.id === selectedPromptId)?.name ?? ''
    // Only send knowledgeBaseIds if user explicitly changed them (prevents accidental wipe)
    const payload: Record<string, any> = {
      assetId: selectedAssetId || null,
      assetName: selectedAssetName || null,
      promptId: selectedPromptId || null,
      promptName: selectedPromptId ? promptName : null,
      signals: activeSignals,
      skillIds: selectedSkillIds,
      templateIds: selectedTemplateIds,
    }
    if (kbDirty) {
      payload.knowledgeBaseIds = selectedKBIds
      payload.knowledgeBaseNames = kbNames
    }
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const d = await res.json()
      setAgent(d.agent)
      setKbDirty(false)
      flash('sidebar', setSidebarFlash)
    }
    setSidebarSaving(false)
  }

  // ── AI generate ──
  async function handleAIGenerate() {
    if (!aiInstructions.trim()) return
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch(`${AGENT_API_URL}/api/agents/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'description', instructions: aiInstructions, mode: aiMode }),
      })
      if (res.ok) {
        const data = await res.json()
        setDescription(data.content)
        flash('desc', setDescFlash)
        setAgent(data.agent)
        setAiInstructions('')
      } else {
        const data = await res.json()
        setAiError(data.detail || data.error || 'Generation failed')
      }
    } catch {
      setAiError('Something went wrong')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Signals ──
  function toggleSignal(sig: (typeof ALL_SIGNALS)[number]) {
    setActiveSignals((prev) => {
      const exists = prev.find((s) => s.signalId === sig.signalId)
      if (exists) return prev.filter((s) => s.signalId !== sig.signalId)
      return [...prev, { ...sig, value: 50 }]
    })
  }
  function setSignalValue(signalId: string, value: number) {
    setActiveSignals((prev) => prev.map((s) => (s.signalId === signalId ? { ...s, value } : s)))
  }

  // ── Member Lifecycle (publish / unpublish / archive) ──
  const isMemberAvatar = ['member', 'big_avatar'].includes((presenceSubtype || agent?.presenceSubtype || '').toString().toLowerCase())
  const isBigAvatar = (presenceSubtype || agent?.presenceSubtype || '').toString().toLowerCase() === 'big_avatar'
  const agentStatus = (agent?.status || 'ACTIVE').toUpperCase()
  const isPrimaryMember = !!(agent as any)?.isPrimaryMember || !!(agent as any)?.is_primary_member
  const isAlly = !!(agent as any)?.isAlly || !!(agent as any)?.is_ally
  // True when this agent's presence subtype is "ally" (not the chat-agent toggle state above).
  const isAllySubtype = (presenceSubtype || agent?.presenceSubtype || '').toString().toLowerCase() === 'ally'
  const tplIds: string[] = (agent as any)?.templateIds || (agent as any)?.template_ids || []
  const isBlueskyAvatar = tplIds.includes('platform_bluesky')
  const isExecAvatar = tplIds.includes('platform_executive_avatar')
  const blueskyHandle = isBlueskyAvatar ? ((agent?.description || '').split('@').pop() || '').trim() : ''
  const isWizard = user?.role === 'wizard'

  // ── Bluesky Character Presets ──
  const BSKY_CHARACTERS: Record<string, { label: string; desc: string; personality: string }> = {
    professional: {
      label: 'Professional',
      desc: 'Polished, brand-safe, and purposeful',
      personality: 'You are professional, polished, and consistent. You represent a brand or organization with authority and credibility. Your tone is formal but approachable — measured, clear, and purposeful. You avoid slang and casual language. Every post and reply reflects positively on the account. You engage selectively and thoughtfully. Content is informative, on-message, and adds value to the conversation.',
    },
    friendly: {
      label: 'Friendly',
      desc: 'Warm, conversational, and community-first',
      personality: 'You are warm, conversational, and community-first. You feel like a real person — not a bot. You engage with everyone who reaches out, follow back generously, and make people feel welcomed and heard. Your tone is casual and genuine. You use natural language, occasionally light humor, and always make the other person feel valued. Building relationships matters more than growing numbers.',
    },
    custom: {
      label: 'Custom',
      desc: 'Write your own personality',
      personality: '',
    },
  }

  const EXEC_CHARACTERS: Record<string, { label: string; desc: string; personality: string }> = {
    professional: {
      label: 'Professional',
      desc: 'Formal, consistent, and on-brand',
      personality: 'You are professional, polished, and consistent. You represent a brand or organization with authority and credibility. Your tone is formal but approachable — measured, clear, and purposeful. You avoid slang and casual language. Every communication reflects positively on the principal. You engage selectively and thoughtfully.',
    },
    friendly: {
      label: 'Friendly',
      desc: 'Warm, conversational, and approachable',
      personality: 'You are warm, conversational, and people-first. You feel like a real person — not an AI. Your tone is casual and genuine. You use natural language, occasionally light humor, and always make the other person feel valued. Building relationships matters more than efficiency.',
    },
    custom: {
      label: 'Custom',
      desc: 'Write your own personality',
      personality: '',
    },
  }

  const [bskyCharacter, setBskyCharacter] = useState<string>('')
  const [bskyCharacterSaving, setBskyCharacterSaving] = useState(false)
  const [bskyCustomText, setBskyCustomText] = useState('')
  const [bskyGenerating, setBskyGenerating] = useState(false)
  const [bskyStance, setBskyStance] = useState('')
  const [bskyStanceSaving, setBskyStanceSaving] = useState(false)
  const [bskyStanceFlash, setBskyStanceFlash] = useState(false)

  // Template KB preview/edit state
  const [templateKbExpanded, setTemplateKbExpanded] = useState<string | null>(null)
  const [templateKbContent, setTemplateKbContent] = useState<Record<string, string>>({})
  const [templateKbSaving, setTemplateKbSaving] = useState(false)

  const [execCharacter, setExecCharacter] = useState<string>('')
  const [execCharacterSaving, setExecCharacterSaving] = useState(false)
  const [execCustomText, setExecCustomText] = useState('')
  const [execGenerating, setExecGenerating] = useState(false)
  const [execStance, setExecStance] = useState('')
  const [execStanceSaving, setExecStanceSaving] = useState(false)
  const [execStanceFlash, setExecStanceFlash] = useState(false)

  // Detect current character from system_prompt
  useEffect(() => {
    if (!isBlueskyAvatar || !agent) return
    const sp = (agent as any).systemPrompt || (agent as any).system_prompt || ''
    setBskyStance(sp)
    if (sp.includes('professional, polished, and consistent')) setBskyCharacter('professional')
    else if (sp.includes('warm, conversational, and community-first')) setBskyCharacter('friendly')
    else if (sp) setBskyCharacter('custom')
  }, [isBlueskyAvatar, agent])

  async function handleBskyCharacterChange(preset: string) {
    if (!isBlueskyAvatar || preset === bskyCharacter) return
    setBskyCharacter(preset)
    if (preset !== 'custom') {
      setBskyCharacterSaving(true)
      const personality = BSKY_CHARACTERS[preset]?.personality || ''
      setBskyStance(personality)
      try {
        const res = await fetch(`/api/agents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt: personality }),
        })
        if (res.ok) { const d = await res.json(); setAgent(d.agent); flash('sidebar', setBskyStanceFlash) }
      } catch {}
      setBskyCharacterSaving(false)
    }
  }

  async function handleBskyStanceSave() {
    if (!isBlueskyAvatar) return
    setBskyStanceSaving(true)
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: bskyStance }),
      })
      if (res.ok) { const d = await res.json(); setAgent(d.agent); flash('sidebar', setBskyStanceFlash) }
    } catch {}
    setBskyStanceSaving(false)
  }

  // ── Executive Avatar Character & Stance ──
  useEffect(() => {
    if (!isExecAvatar || !agent) return
    const sp = ((agent as any).systemPrompt || (agent as any).system_prompt || '').toLowerCase()
    setExecStance((agent as any).systemPrompt || (agent as any).system_prompt || '')
    if (!sp) return
    if (sp.includes('professional')) setExecCharacter('professional')
    else if (sp.includes('friendly') || sp.includes('warm')) setExecCharacter('friendly')
    else setExecCharacter('custom')
  }, [isExecAvatar, agent])

  async function handleExecCharacterChange(preset: string) {
    if (!isExecAvatar || preset === execCharacter) return
    setExecCharacter(preset)
    if (preset !== 'custom') {
      setExecCharacterSaving(true)
      const personality = EXEC_CHARACTERS[preset]?.personality || ''
      setExecStance(personality)
      try {
        const res = await fetch(`/api/agents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt: personality }),
        })
        if (res.ok) { const d = await res.json(); setAgent(d.agent); flash('sidebar', setExecStanceFlash) }
      } catch {}
      setExecCharacterSaving(false)
    }
  }

  async function handleExecStanceSave() {
    if (!isExecAvatar) return
    setExecStanceSaving(true)
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: execStance }),
      })
      if (res.ok) { const d = await res.json(); setAgent(d.agent); flash('sidebar', setExecStanceFlash) }
    } catch {}
    setExecStanceSaving(false)
  }

  async function handleSkillApprovalToggle(skillId: string, currentApproval: boolean) {
    const SKILL_API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
    try {
      await fetch(`${SKILL_API}/api/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiresApproval: !currentApproval }),
      })
      // Update local state
      setAllSkills((prev: any[]) => prev.map((s: any) =>
        s.id === skillId ? { ...s, requiresApproval: !currentApproval, requires_approval: !currentApproval } : s
      ))
    } catch {}
  }

  async function handleSkillStatusToggle(skillId: string, currentStatus: string) {
    const SKILL_API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused'
    try {
      await fetch(`${SKILL_API}/api/skills/${skillId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setAllSkills((prev: any[]) => prev.map((s: any) =>
        s.id === skillId ? { ...s, status: newStatus.toUpperCase() } : s
      ))
    } catch {}
  }

  async function handlePublishAgent() {
    setActionLoading('publish')
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      })
      if (res.ok) { const d = await res.json(); setAgent(d.agent) }
    } finally { setActionLoading(null) }
  }

  async function handleUnpublishAgent() {
    setActionLoading('unpublish')
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT' }),
      })
      if (res.ok) { const d = await res.json(); setAgent(d.agent) }
    } finally { setActionLoading(null) }
  }

  async function handleArchiveAgent() {
    setActionLoading('archive')
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      })
      if (res.ok) { const d = await res.json(); setAgent(d.agent) }
    } finally { setActionLoading(null) }
  }

  async function handleTogglePrimaryMember() {
    setActionLoading('primary')
    try {
      const newVal = !isPrimaryMember
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimaryMember: newVal }),
      })
      if (res.ok) { const d = await res.json(); setAgent(d.agent) }
    } finally { setActionLoading(null) }
  }

  async function handleToggleAlly() {
    setActionLoading('ally')
    try {
      if (isAlly) {
        const updated = await unsetAllyApi(id as string)
        setAgent(updated)
      } else {
        const updated = await setAllyApi(id as string)
        setAgent(updated)
      }
      window.dispatchEvent(new CustomEvent('chat-agent-updated'))
    } catch (err) {
      console.error('Failed to toggle ally:', err)
    } finally { setActionLoading(null) }
  }

  // ── Delete ──
  async function handleDelete() {
    setActionLoading('delete')
    try {
      await fetch(isBlueskyAvatar || isExecAvatar ? `/api/agents/${id}?preserveKb=true` : `/api/agents/${id}`, { method: 'DELETE' })
      router.push('/agents')
    } finally { setActionLoading(null) }
  }

  // ── Remove worker (unlink — remove this avatar from worker's parent_ids) ──
  async function handleConfirmRemoveWorker() {
    if (!workerToRemove) return
    setRemovingWorker(true)
    try {
      await updateAgent(workerToRemove.id, { removeParentId: id })
      setWorkers((prev) => prev.filter((w) => w.id !== workerToRemove.id))
      setWorkerToRemove(null)
      // Refresh available list if the add panel is open
      if (showAddPerformer && user?.wallet) fetchAvailableWorkers()
    } catch (error) {
      console.error('Error unlinking worker:', error)
    } finally {
      setRemovingWorker(false)
    }
  }

  // ── Fetch available workers (all performers minus already assigned to this avatar) ──
  async function fetchAvailableWorkers() {
    if (!user?.wallet) return
    setAvailableLoading(true)
    try {
      const result = await listAgents({ wallet: user.wallet, type: 'WORKER', includeWorkers: true })
      const allWorkers = (result.agents || []).filter((a: Presence) => a.type?.toUpperCase() === 'WORKER')
      // Exclude workers already assigned to THIS avatar
      const assignedIds = new Set(workers.map(w => w.id))
      setAvailableWorkers(allWorkers.filter(w => !assignedIds.has(w.id)))
    } catch (error) {
      console.error('Error fetching available workers:', error)
    } finally {
      setAvailableLoading(false)
    }
  }

  // ── Assign performer to this avatar ──
  async function handleAssignPerformer(workerId: string) {
    setAssigningPerformer(workerId)
    try {
      await updateAgent(workerId, { parentId: id })
      // Move from available to assigned
      const assigned = availableWorkers.find(w => w.id === workerId)
      if (assigned) {
        setWorkers(prev => [assigned, ...prev])
        setAvailableWorkers(prev => prev.filter(w => w.id !== workerId))
      }
    } catch (error) {
      console.error('Error assigning performer:', error)
    } finally {
      setAssigningPerformer(null)
    }
  }

  // ── Disconnect tool from worker ──
  async function handleConfirmDisconnectTool() {
    if (!toolToDisconnect || !user?.wallet) return
    setDisconnectingTool(true)
    try {
      // Remove the account ID from agent.tools — credentials stay in global pool
      const currentTools = agent?.tools || []
      const newTools = currentTools.filter((t: string) => t !== toolToDisconnect)
      await updateAgent(id, { tools: newTools })
      fetchAgent()
      setToolToDisconnect(null)
    } catch (error) {
      console.error('Error detaching tool:', error)
    } finally {
      setDisconnectingTool(false)
    }
  }

  // ── Exec Avatar: unassign tool from this agent ──
  async function handleExecUnassignAccount() {
    if (!execRemoveConfirm || !user?.wallet) return
    setExecRemoving(true)
    try {
      const currentTools = agent?.tools || []
      const newTools = currentTools.filter(t => t !== execRemoveConfirm.accountId)
      await updateAgent(id, { tools: newTools })
      fetchAgent()
      setExecRemoveConfirm(null)
    } catch (error) {
      console.error('Error unassigning account:', error)
    } finally {
      setExecRemoving(false)
    }
  }

  // ── Exec Avatar: assign a tool from the Empower pool (replaces same-type) ──
  async function handleExecAssignAccount(accountId: string) {
    try {
      const tool = empowerTools.find(t => t.id === accountId)
      if (!tool) return
      const currentTools = agent?.tools || []
      // Remove any existing account of the same tool type, then add the new one
      const sameToolIds = empowerTools.filter(t => t.toolName === tool.toolName).map(t => t.id)
      await updateAgent(id, { tools: [...currentTools.filter(t => !sameToolIds.includes(t)), accountId] })
      fetchAgent()
    } catch (error) {
      console.error('Error assigning account:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={36} className="text-muted animate-spin" />
      </div>
    )
  }
  if (!agent) return null

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-4">
        <button onClick={() => router.push('/agents')} className="hover:text-accent transition-colors">
          Allies
        </button>
        <ChevronRight size={14} />
        <span className="text-foreground">{agent.name}</span>
      </div>

      {/* Tools not connected warning — hidden for Bluesky, Exec, Worker performers, or if any worker has tools */}
      {!isBlueskyAvatar && !isExecAvatar &&
        agent.type?.toLowerCase() !== 'worker' &&
        (agent.tools || []).length === 0 &&
        !workers.some(w => (w.tools || []).length > 0) && (
        <div style={{
          marginBottom: 16, padding: '14px 18px', borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(248,113,113,0.08) 0%, rgba(251,191,36,0.06) 100%)',
          border: '1px solid rgba(248,113,113,0.25)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertCircle size={18} style={{ color: '#f87171' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>
              Tools not connected for this agent
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
              This agent has no tools assigned. Connect tools in <strong style={{ color: '#f87171' }}>Empower</strong>, then assign them here.
            </p>
          </div>
          <button onClick={() => router.push(`/empower?return=${encodeURIComponent(`/agent/${id}`)}`)} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.35)',
            background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          }}>
            <Zap size={13} />
            Configure Tools
          </button>
        </div>
      )}

      {/* Executive Avatar required tools warning */}
      {(() => {
        if (!isExecAvatar) return null

        const agentToolIds = agent.tools || []
        const requiredTools = [
          { name: 'google', label: 'Google (Gmail, Calendar, Meet)', icon: '📧' },
          { name: 'telegram', label: 'Telegram', icon: '💬' },
        ]
        const missingTools = requiredTools.filter(rt => {
          // Check if any empower tool of this type is assigned to the agent
          const matchingEmpower = empowerTools.filter(et => et.toolName === rt.name)
          return !matchingEmpower.some(et => agentToolIds.includes(et.id))
        })

        if (missingTools.length === 0) return null

        return (
          <div style={{
            marginBottom: 16, padding: '14px 18px', borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(248,113,113,0.06) 100%)',
            border: '1px solid rgba(251,191,36,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <AlertCircle size={18} style={{ color: '#fbbf24' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>
                  Required tools missing for Executive Avatar
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                  Connect these tools on the <strong style={{ color: '#fbbf24' }}>Empower</strong> page and assign them to this agent.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 50 }}>
              {missingTools.map(t => (
                <div key={t.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)',
                }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{t.label}</span>
                  <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600, marginLeft: 'auto' }}>NOT CONNECTED</span>
                </div>
              ))}
            </div>
            <div style={{ paddingLeft: 50, marginTop: 10 }}>
              <button onClick={() => router.push('/empower')} style={{
                padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(251,191,36,0.35)',
                background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Zap size={13} />
                Go to Empower
              </button>
            </div>
          </div>
        )
      })()}

      {/* Title row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
            {agent.type?.toLowerCase() === 'presence' ? (
              <Crown size={20} className="text-accent" />
            ) : (
              <Bot size={20} className="text-accent" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {agent.type?.toLowerCase() === 'worker' ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-muted">@</span>
                  <input
                    value={handle}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, HANDLE_MAX).toLowerCase()
                      setHandle(cleaned)
                      if (cleaned !== agent?.handle) scheduleDetailHandleCheck(cleaned)
                    }}
                    onBlur={() => {
                      if (handle.trim().toLowerCase() !== agent?.handle) handleSaveHandle()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    maxLength={HANDLE_MAX}
                    disabled={handleSaving}
                    className="text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-accent/50 focus:outline-none transition-colors py-0.5 flex-1 min-w-0"
                  />
                  {handleChecking && <Loader2 size={16} className="text-muted animate-spin shrink-0" />}
                  {!handleChecking && handleAvailable === true && handle.trim().toLowerCase() !== agent?.handle && (
                    <CheckCircle size={16} className="text-green-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs tabular-nums ${handle.length >= HANDLE_MAX ? 'text-red-400' : 'text-muted'}`}>{handle.length}/{HANDLE_MAX}</span>
                  {!handleError && handleAvailable === false && handle.trim().toLowerCase() !== agent?.handle && (
                    <span className="text-xs text-red-400">@{handle} is already taken</span>
                  )}
                  {!handleError && handleAvailable === true && handle.trim().toLowerCase() !== agent?.handle && (
                    <span className="text-xs text-green-400">Available</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      ;(e.target as HTMLInputElement).blur()
                    }
                  }}
                  maxLength={NAME_MAX}
                  disabled={nameSaving}
                  className="text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-accent/50 focus:outline-none transition-colors py-0.5 w-full min-w-0"
                />
                <span className={`text-xs tabular-nums ${name.length >= NAME_MAX ? 'text-red-400' : 'text-muted'}`}>
                  {name.length}/{NAME_MAX}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Type + Subtype badges */}
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${agent.type?.toLowerCase() === 'presence' ? 'bg-accent/20 text-accent' : 'bg-white/[0.08] text-white/60'}`}>
            {agent.type?.toLowerCase() === 'presence' ? 'Avatar' : 'Performer'}
          </span>
          {isBlueskyAvatar || isExecAvatar ? (
            <span className="font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,133,255,0.15)', color: '#4da6ff', border: '1px solid rgba(0,133,255,0.3)', letterSpacing: '0.06em', fontSize: 13, textTransform: 'uppercase' }}>Template</span>
          ) : (
            <>
          {agent.presenceSubtype && (
            <span className="font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(234,170,0,0.15)', color: '#EAAA00', border: '1px solid rgba(234,170,0,0.35)', letterSpacing: '0.06em', fontSize: 13, textTransform: 'uppercase' }}>
              {agent.presenceSubtype.replace(/_/g, ' ')}
            </span>
          )}
          {isMemberAvatar && (
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${
              agentStatus === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' :
              agentStatus === 'ARCHIVED' ? 'bg-red-500/20 text-red-400' :
              agentStatus === 'DRAFT' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-white/[0.06] text-muted'
            }`}>
              {agentStatus === 'PUBLISHED' ? '● Published' :
               agentStatus === 'DRAFT' ? 'Draft' :
               agentStatus === 'ARCHIVED' ? 'Archived' :
               agentStatus}
            </span>
          )}
            </>
          )}

          {/* Divider between badges and buttons */}
          {(isMemberAvatar || true) && <div className="w-px h-5 bg-white/10" />}

          {/* Action buttons — hidden for Bluesky */}
          {isMemberAvatar && !isBlueskyAvatar && (
            <>
              {agentStatus !== 'PUBLISHED' && agentStatus !== 'ARCHIVED' && (
                <button onClick={handlePublishAgent} disabled={!!actionLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/35 active:bg-green-500/45 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {actionLoading === 'publish' ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
                  {actionLoading === 'publish' ? 'Publishing…' : 'Publish'}
                </button>
              )}
              {agentStatus === 'PUBLISHED' && (
                <button onClick={handleUnpublishAgent} disabled={!!actionLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-500/20 text-slate-300 hover:bg-slate-500/35 active:bg-slate-500/45 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {actionLoading === 'unpublish' ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />}
                  {actionLoading === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}
                </button>
              )}
              {agentStatus === 'ARCHIVED' && (
                <button onClick={handleUnpublishAgent} disabled={!!actionLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/35 active:bg-blue-500/45 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {actionLoading === 'unpublish' ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  {actionLoading === 'unpublish' ? 'Restoring…' : 'Restore'}
                </button>
              )}
              {isMemberAvatar && (
              <button
                onClick={handleTogglePrimaryMember}
                disabled={!!actionLoading}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPrimaryMember
                    ? 'bg-amber-500/25 text-amber-300 hover:bg-amber-500/35'
                    : 'bg-amber-500/15 text-amber-300/70 hover:bg-amber-500/25 hover:text-amber-300 active:bg-amber-500/35'
                }`}
              >
                {actionLoading === 'primary' ? <Loader2 size={13} className="animate-spin" /> : <Pin size={13} />}
                {actionLoading === 'primary' ? 'Saving…' : isPrimaryMember ? 'Primary' : 'Set Primary'}
              </button>
              )}
              {agentStatus !== 'ARCHIVED' && (
                <button onClick={handleArchiveAgent} disabled={!!actionLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/35 active:bg-orange-500/45 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {actionLoading === 'archive' ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
                  {actionLoading === 'archive' ? 'Archiving…' : 'Archive'}
                </button>
              )}
            </>
          )}
          {/* System Ally — powers the Studio Ask Duna chat dock.
              Only available on Ally-subtype agents, and only to wizards. */}
          {agent.type?.toLowerCase() === 'presence' && isAllySubtype && isWizard && (
            <button
              onClick={handleToggleAlly}
              disabled={!!actionLoading}
              title="Use this avatar in the Studio chat dock"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isAlly
                  ? 'bg-yellow-500/25 text-yellow-300 hover:bg-yellow-500/35'
                  : 'bg-yellow-500/15 text-yellow-300/70 hover:bg-yellow-500/25 hover:text-yellow-300 active:bg-yellow-500/35'
              }`}
            >
              {actionLoading === 'ally' ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
              {actionLoading === 'ally' ? 'Saving…' : isAlly ? 'Chat Agent ✓' : 'Set as Chat Agent'}
            </button>
          )}
          <button
            disabled={!!actionLoading}
            onClick={async () => {
              const subtype = (agent.presenceSubtype || '').toLowerCase()
              if (subtype === 'big_avatar') {
                setDeleteBlocked(true)
                setDeleteBlockReason('Your Big Avatar cannot be deleted. It is your primary AI identity.')
                return
              }
              if (agent.type?.toLowerCase() === 'presence' && (subtype === 'movement' || subtype === 'mission' || subtype === 'member')) {
                try {
                  const contexts = await listContextsWithNested(user?.wallet || '')
                  const linkedNames: string[] = []
                  ;(contexts || []).forEach((ctx: any) => {
                    // Top-level context presences (Kiduna avatars live here)
                    const topIds = ctx.presenceIds || ctx.presence_ids || []
                    if (topIds.includes(agent.id)) linkedNames.push(ctx.name)
                    // Nested context presences (Mission avatars live here)
                    const nested = ctx.nestedContexts || ctx.nested_contexts || []
                    nested.forEach((nctx: any) => {
                      const nestedIds = nctx.presenceIds || nctx.presence_ids || []
                      if (nestedIds.includes(agent.id)) linkedNames.push(nctx.name)
                    })
                  })
                  if (linkedNames.length > 0) {
                    const names = Array.from(new Set(linkedNames)).join(', ')
                    setDeleteBlocked(true)
                    setDeleteBlockReason(`This avatar is currently used in: ${names}. Please remove it from the kiduna/mission before deleting.`)
                    return
                  }
                } catch {}
              }
              setDeleteBlocked(false)
              setDeleteBlockReason('')
              setShowDeleteConfirm(true)
            }}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/35 active:bg-red-500/45 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={13} className="shrink-0" />
            <span className="leading-none">Delete</span>
          </button>
        </div>
      </div>

      {/* Handle — hidden for Bluesky and Executive */}
      {agent.type?.toLowerCase() === 'presence' && !isBlueskyAvatar && !isExecAvatar && (
      <>
        <div className="ml-[52px] mb-2 flex items-start gap-2">
          {editingHandle ? (
          <>
            <div className="flex items-center flex-1 min-w-0">
              <span className="text-muted text-sm mr-1 shrink-0">@</span>
              <div className="flex-1 relative min-w-0">
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, HANDLE_MAX)
                    setHandle(cleaned)
                    setHandleError('')
                    scheduleDetailHandleCheck(cleaned)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveHandle()
                    if (e.key === 'Escape') {
                      setHandle(agent?.handle || '')
                      setHandleError('')
                      setHandleAvailable(null)
                      setHandleSuggestion(null)
                      setHandleChecking(false)
                      setEditingHandle(false)
                    }
                  }}
                  autoFocus
                  maxLength={HANDLE_MAX}
                  placeholder="handle"
                  className={`w-full text-sm bg-input border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted focus:outline-none pr-16 ${
                    handleError || handleAvailable === false
                      ? 'border-red-500/50 focus:border-red-500/70'
                      : handleAvailable === true
                        ? 'border-green-500/50 focus:border-green-500/70'
                        : 'border-accent/40 focus:border-accent/70'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  {handleChecking && (
                    <Loader2 size={12} className="text-muted animate-spin" />
                  )}
                  {!handleChecking && handleAvailable === true && handle.trim().toLowerCase() !== agent?.handle && (
                    <CheckCircle size={12} className="text-green-400" />
                  )}
                  <span className={`text-xs tabular-nums ${handle.length >= HANDLE_MAX ? 'text-red-400' : 'text-muted'}`}>
                    {handle.length}/{HANDLE_MAX}
                  </span>
                </span>
              </div>
            </div>
            <button
              onClick={handleSaveHandle}
              disabled={handleSaving || handleChecking || handleAvailable === false}
              className="shrink-0 bg-accent hover:bg-accent-dark text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60"
            >
              {handleSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Save
            </button>
            <button
              onClick={() => {
                setHandle(agent?.handle || '')
                setHandleError('')
                setHandleAvailable(null)
                setHandleSuggestion(null)
                setHandleChecking(false)
                setEditingHandle(false)
              }}
              className="shrink-0 text-muted hover:text-white text-xs px-2 py-1.5 rounded-lg transition-colors"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <button onClick={() => setEditingHandle(true)} className="group flex items-center gap-2 text-left">
              <span className={`text-sm font-mono ${handle ? 'text-white/80' : 'text-muted/40'}`}>
                {handle ? `@${handle}` : 'Add a handle…'}
              </span>
              <Pencil size={12} className="text-muted/30 group-hover:text-accent transition-colors shrink-0" />
            </button>
        )}
      </div>
      {handleError && (
        <div className="ml-[52px] mb-1">
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={11} />
            {handleError}
          </p>
        </div>
      )}
      {!handleError && handleAvailable === false && editingHandle && (
        <div className="ml-[52px] mb-1">
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={11} />
            @{handle.trim().toLowerCase()} is already taken
            {handleSuggestion && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={() => {
                    setHandle(handleSuggestion)
                    setHandleError('')
                    scheduleDetailHandleCheck(handleSuggestion)
                  }}
                  className="text-accent hover:underline cursor-pointer"
                >
                  Use @{handleSuggestion}?
                </button>
              </>
            )}
          </p>
        </div>
      )}
      {!handleError && handleAvailable === true && editingHandle && handle.trim().toLowerCase() !== agent?.handle && (
        <div className="ml-[52px] mb-1">
          <p className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle size={11} />
            Handle is available
          </p>
        </div>
      )}
      </>
      )}

      {/* Tagline — hidden for Bluesky and Executive */}
      {agent.type?.toLowerCase() === 'presence' && !isBlueskyAvatar && !isExecAvatar && (
      <div className="ml-[52px] mb-6 flex items-start gap-2">
        {editingTagline ? (
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value.slice(0, TAGLINE_MAX))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTagline()
                  if (e.key === 'Escape') {
                    setTagline(agent?.tagline || '')
                    setEditingTagline(false)
                  }
                }}
                autoFocus
                maxLength={TAGLINE_MAX}
                placeholder="A short catchphrase…"
                className="flex-1 text-sm bg-input border border-accent/40 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-accent/70 min-w-0"
              />
              <button
                onClick={handleSaveTagline}
                disabled={taglineSaving}
                className="shrink-0 bg-accent hover:bg-accent-dark text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60"
              >
                {taglineSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save
              </button>
              <button
                onClick={() => {
                  setTagline(agent?.tagline || '')
                  setEditingTagline(false)
                }}
                className="shrink-0 text-muted hover:text-white text-xs px-2 py-1.5 rounded-lg transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <span className={`text-xs tabular-nums mt-1 block ${tagline.length >= TAGLINE_MAX ? 'text-red-400' : 'text-muted'}`}>
              {tagline.length}/{TAGLINE_MAX}
            </span>
          </div>
        ) : (
          <button onClick={() => setEditingTagline(true)} className="group flex items-center gap-2 text-left">
            <span className={`text-sm ${tagline ? 'text-white/70' : 'text-muted/40'}`}>
              {tagline ? `"${tagline}"` : 'Add a tagline…'}
            </span>
            <Pencil size={12} className="text-muted/30 group-hover:text-accent transition-colors shrink-0" />
          </button>
        )}
      </div>
      )}

      {/* Agent Details — editable fields */}
      <div className={`border rounded-xl bg-card border-card-border ${isBlueskyAvatar || isExecAvatar ? 'mb-3' : 'mb-6'} overflow-hidden`}>
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Details</p>
        </div>
        <div className={`px-5 pb-5 grid ${isBlueskyAvatar || isExecAvatar ? 'grid-cols-2 gap-6' : 'grid-cols-2 gap-x-6 gap-y-4'}`}>

          {/* Avatar-specific fields */}
          {agent.type?.toLowerCase() === 'presence' && (
            <>
              {/* Subtype — hidden for Bluesky and Executive */}
              {!isBlueskyAvatar && !isExecAvatar && (<div>
                <label className="text-[10px] uppercase tracking-wider text-muted/50 font-medium block mb-1">
                  Type {subtypeSaving && <Loader2 size={10} className="inline animate-spin ml-1" />}
                </label>
                <select
                  value={(presenceSubtype || agent.presenceSubtype || (agent as any).presence_subtype || '').toString().toLowerCase()}
                  onChange={(e) => handleSaveSubtype(e.target.value as PresenceSubtype | '')}
                  disabled={usedInContext || isBigAvatar}
                  className={`w-full text-sm bg-input border border-card-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent/50 transition-colors ${usedInContext || isBigAvatar ? 'opacity-60 cursor-not-allowed' : ''}`}
                  style={{ background: '#0A0D33', color: '#ffffff', colorScheme: 'dark' }}
                >
                  <option value="" style={{ background: '#0A0D33', color: '#ffffff' }}>— Select type —</option>
                 {PRESENCE_SUBTYPES.filter((s) => s.value !== 'big_avatar').map((s) => (
                    <option key={s.value} value={s.value} style={{ background: '#0A0D33', color: '#ffffff' }}>{s.label}</option>
                  ))}
                </select>
                {isBigAvatar && (
                  <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={11} />
                    Big Avatar type cannot be changed.
                  </p>
                )}
                {usedInContext && !isBigAvatar && (
                  <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={11} />
                    This agent is already used in a Movement or Mission, so its type cannot be changed.
                  </p>
                )}
              </div>
              )}

              {/* Tone — hidden for Bluesky and Executive, replaced with Character */}
              {!isBlueskyAvatar && !isExecAvatar && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted/50 font-medium block mb-1">
                  Tone {toneSaving && <Loader2 size={10} className="inline animate-spin ml-1" />}
                  {toneFlash && <span className="text-green-400 ml-1.5 inline-flex items-center gap-0.5"><CheckCircle size={10} /> Saved!</span>}
                </label>
                <select
                  value={(tone || agent.tone || '').toString().toLowerCase()}
                  onChange={(e) => handleSaveTone(e.target.value as AgentTone | '')}
                  className="w-full text-sm bg-input border border-card-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent/50 transition-colors capitalize"
                  style={{ background: '#0A0D33', color: '#ffffff', colorScheme: 'dark' }}
                >
                  <option value="" style={{ background: '#0A0D33', color: '#ffffff' }}>— Select tone —</option>
                  {(['neutral', 'friendly', 'professional', 'strict', 'cool', 'angry', 'playful', 'wise'] as AgentTone[]).map((t) => (
                    <option key={t} value={t} className="capitalize" style={{ background: '#0A0D33', color: '#ffffff' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                  <option value="other" style={{ background: '#0A0D33', color: '#ffffff' }}>Other</option>
                </select>
                {tone === 'other' && (
                  <div className="mt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTone}
                        onChange={(e) => setCustomTone(e.target.value.slice(0, CUSTOM_TONE_MAX))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomTone() }}
                        placeholder="Enter custom tone"
                        className="flex-1 text-sm bg-input border border-card-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                      />
                      <button
                        onClick={handleSaveCustomTone}
                        disabled={!customTone.trim() || customTone.trim().length > CUSTOM_TONE_MAX || toneSaving}
                        className="px-3 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                    </div>
                    <p className={`text-[10px] mt-1 ${customTone.length > CUSTOM_TONE_MAX ? 'text-red-400' : 'text-muted/40'}`}>
                      {customTone.length}/{CUSTOM_TONE_MAX} characters
                      {customTone.length > CUSTOM_TONE_MAX && ' — too long'}
                    </p>
                  </div>
                )}
              </div>
              )}

              {/* Character — Bluesky avatars only */}
              {isBlueskyAvatar && (
              <>
                {/* LEFT: Custom input + generate + preview (only when Custom selected) */}
                {bskyCharacter === 'custom' && (
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-wider text-muted/50 font-medium block">Custom Personality</label>
                  <div>
                    <p className="text-[11px] text-muted/50 mb-1.5">Describe the personality in a few words</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bskyCustomText}
                        onChange={(e) => setBskyCustomText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && bskyCustomText.trim()) (e.target as HTMLInputElement).blur() }}
                        placeholder="e.g. Angry, Sarcastic, Motivational Coach..."
                        className="flex-1 text-sm rounded-lg px-3 py-2.5 text-foreground focus:outline-none transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(147,51,234,0.5)' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                      />
                      <button
                        onClick={async () => {
                          const charName = bskyCustomText.trim()
                          if (!charName) return
                          setBskyGenerating(true)
                          try {
                            const res = await fetch(`${AGENT_API_URL}/api/prompts/generate`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                instructions: `Generate a 3-4 sentence personality description for a Bluesky social media agent with the personality of: "${charName}". Describe how it speaks, what tone it uses, how it engages with people on social media, and what makes it distinctive. Keep it practical — this will be used as the agent's personality section in its system prompt. Return only the personality description, nothing else.`,
                                name: `${charName} Bluesky Agent`,
                              })
                            })
                            if (res.ok) {
                              const data = await res.json()
                              const personality = data.content || ''
                              if (personality) {
                                setBskyStance(personality)
                                setBskyStanceSaving(true)
                                try {
                                  const saveRes = await fetch(`/api/agents/${id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ systemPrompt: personality }),
                                  })
                                  if (saveRes.ok) { const d = await saveRes.json(); setAgent(d.agent); flash('sidebar', setBskyStanceFlash) }
                                } catch {}
                                setBskyStanceSaving(false)
                              }
                            }
                          } catch {}
                          setBskyGenerating(false)
                        }}
                        disabled={bskyGenerating || !bskyCustomText.trim()}
                        style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: bskyGenerating || !bskyCustomText.trim() ? 'rgba(147,51,234,0.3)' : 'rgba(147,51,234,0.6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: bskyGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' as const }}
                      >
                        {bskyGenerating ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> Generate</>}
                      </button>
                    </div>
                  </div>
                  {bskyStanceFlash && <p className="text-[10px] text-green-400 flex items-center gap-1 mt-1"><CheckCircle size={10} /> Personality generated and saved!</p>}
                </div>
                )}

                {/* RIGHT: Character radio buttons (full width when not custom) */}
                <div className={bskyCharacter !== 'custom' ? 'col-span-2 max-w-md' : ''}>
                  <label className="text-[10px] uppercase tracking-wider text-muted/50 font-medium block mb-2">
                    Character {bskyCharacterSaving && <Loader2 size={10} className="inline animate-spin ml-1" />}
                  </label>
                  <div className="space-y-2">
                    {Object.entries(BSKY_CHARACTERS).map(([key, ch]) => {
                      const isSelected = bskyCharacter === key
                      return (
                        <label key={key} className="flex items-center gap-3 cursor-pointer" onClick={() => handleBskyCharacterChange(key)}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-accent bg-accent' : 'border-white/20'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white/60'}`}>{ch.label}</p>
                            <p className="text-[11px] text-muted/50">{ch.desc}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </>
              )}

              {/* Character — Executive Avatar only */}
              {isExecAvatar && (
              <>
                {/* LEFT: Custom input + generate + preview (only when Custom selected) */}
                {execCharacter === 'custom' && (
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-wider text-muted/50 font-medium block">Custom Personality</label>
                  <div>
                    <p className="text-[11px] text-muted/50 mb-1.5">Describe the personality in a few words</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={execCustomText}
                        onChange={(e) => setExecCustomText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && execCustomText.trim()) (e.target as HTMLInputElement).blur() }}
                        placeholder="e.g. Strict, Empathetic, Detail-oriented..."
                        className="flex-1 text-sm rounded-lg px-3 py-2.5 text-foreground focus:outline-none transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(147,51,234,0.5)' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                      />
                      <button
                        onClick={async () => {
                          const charName = execCustomText.trim()
                          if (!charName) return
                          setExecGenerating(true)
                          try {
                            const res = await fetch(`${AGENT_API_URL}/api/prompts/generate`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                instructions: `Generate a 3-4 sentence personality description for an AI executive assistant with the personality of: "${charName}". Describe how it manages emails, schedules meetings, handles conflicts, and communicates. Keep it practical. Return only the personality description.`,
                                name: `${charName} Executive Assistant`,
                              })
                            })
                            if (res.ok) {
                              const data = await res.json()
                              const personality = data.content || ''
                              if (personality) {
                                setExecStance(personality)
                                setExecStanceSaving(true)
                                try {
                                  const saveRes = await fetch(`/api/agents/${id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ systemPrompt: personality }),
                                  })
                                  if (saveRes.ok) { const d = await saveRes.json(); setAgent(d.agent); flash('sidebar', setExecStanceFlash) }
                                } catch {}
                                setExecStanceSaving(false)
                              }
                            }
                          } catch {}
                          setExecGenerating(false)
                        }}
                        disabled={execGenerating || !execCustomText.trim()}
                        style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: execGenerating || !execCustomText.trim() ? 'rgba(147,51,234,0.3)' : 'rgba(147,51,234,0.6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: execGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' as const }}
                      >
                        {execGenerating ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> Generate</>}
                      </button>
                    </div>
                  </div>
                  {execStanceFlash && <p className="text-[10px] text-green-400 flex items-center gap-1 mt-1"><CheckCircle size={10} /> Personality generated and saved!</p>}
                </div>
                )}

                {/* RIGHT: Character radio buttons (full width when not custom) */}
                <div className={execCharacter !== 'custom' ? 'col-span-2 max-w-md' : ''}>
                  <label className="text-[10px] uppercase tracking-wider text-muted/50 font-medium block mb-2">
                    Character {execCharacterSaving && <Loader2 size={10} className="inline animate-spin ml-1" />}
                  </label>
                  <div className="space-y-2">
                    {Object.entries(EXEC_CHARACTERS).map(([key, ch]) => {
                      const isSelected = execCharacter === key
                      return (
                        <label key={key} className="flex items-center gap-3 cursor-pointer" onClick={() => handleExecCharacterChange(key)}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-accent bg-accent' : 'border-white/20'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white/60'}`}>{ch.label}</p>
                            <p className="text-[11px] text-muted/50">{ch.desc}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </>
              )}
            </>
          )}

          {/* Worker-specific fields */}
          {agent.type?.toLowerCase() === 'worker' && (
            <>
              {/* Role */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted/50 font-medium block mb-1">
                  Role {roleSaving && <Loader2 size={10} className="inline animate-spin ml-1" />}
                </label>
                {editingRole ? (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value.slice(0, ROLE_MAX))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRole(); if (e.key === 'Escape') { setRole(agent?.role || ''); setEditingRole(false) } }}
                        autoFocus
                        maxLength={ROLE_MAX}
                        placeholder="e.g. Social Media Manager"
                        className="flex-1 text-sm bg-input border border-accent/40 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-accent/70"
                      />
                      <button onClick={handleSaveRole} className="text-accent hover:text-white transition-colors"><Check size={14} /></button>
                      <button onClick={() => { setRole(agent?.role || ''); setEditingRole(false) }} className="text-muted hover:text-white transition-colors"><X size={14} /></button>
                    </div>
                    <span className={`text-xs tabular-nums mt-1 block ${role.length >= ROLE_MAX ? 'text-red-400' : 'text-muted'}`}>
                      {role.length}/{ROLE_MAX}
                    </span>
                  </div>
                ) : (
                  <button onClick={() => setEditingRole(true)} className="group flex items-center gap-2 text-left w-full">
                    <span className={`text-sm ${role ? 'text-white' : 'text-muted/30'}`}>{role || 'Add a role…'}</span>
                    <Pencil size={11} className="text-muted/20 group-hover:text-accent transition-colors" />
                  </button>
                )}
              </div>

              {/* Parent Avatars — pill grid, 3 cols × 2 rows, horizontal scroll */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted/50 font-medium block mb-2">
                  Parent Avatar{parentPresences.length !== 1 ? 's' : ''}
                </label>
                {parentLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="text-muted animate-spin" />
                    <span className="text-sm text-muted">Loading…</span>
                  </div>
                ) : parentPresences.length > 0 ? (
                  <div
                    className="overflow-x-auto pb-1"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: parentPresences.length > 3 ? 'repeat(2, auto)' : 'auto',
                        gridAutoFlow: 'column',
                        gridTemplateColumns: parentPresences.length <= 3
                          ? `repeat(${parentPresences.length}, 180px)`
                          : undefined,
                        gridAutoColumns: '180px',
                        gap: '8px',
                      }}
                    >
                      {parentPresences.map((pp) => (
                        <button
                          key={pp.id}
                          onClick={() => router.push(`/agent/${pp.id}`)}
                          className="group flex items-center gap-2 px-3 py-2 rounded-full transition-all text-left"
                          style={{
                            background: 'rgba(234,170,0,0.06)',
                            border: '1px solid rgba(234,170,0,0.2)',
                            minWidth: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(234,170,0,0.14)'
                            e.currentTarget.style.borderColor = 'rgba(234,170,0,0.45)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(234,170,0,0.06)'
                            e.currentTarget.style.borderColor = 'rgba(234,170,0,0.2)'
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(234,170,0,0.15)' }}
                          >
                            <Crown size={12} className="text-accent" />
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <span className="text-xs font-semibold text-white block truncate group-hover:text-accent transition-colors">
                              {pp.name}
                            </span>
                            {pp.handle && (
                              <span className="text-[10px] text-muted/50 block truncate">@{pp.handle}</span>
                            )}
                          </div>
                          <ChevronRight size={12} className="text-muted/40 group-hover:text-accent transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted/50 italic">No parent linked</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tools — hidden for Bluesky and Executive */}
      {agent.type?.toLowerCase() === 'presence' && !isBlueskyAvatar && !isExecAvatar && (
        <div className="border rounded-xl bg-card border-card-border mb-6 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <Zap size={15} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Tools</p>
                <p className="text-xs text-muted">Select which tools this avatar can use</p>
              </div>
            </div>
            <button onClick={() => router.push(`/empower?return=${encodeURIComponent(`/agent/${id}`)}`)} className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0">
              <Plus size={12} />Add Accounts
            </button>
          </div>
          <div className="border-t border-card-border px-5 py-4">
            <ToolAccountSelector
              accounts={empowerTools}
              selectedIds={agent.tools || []}
              onToggle={async (accountId) => {
                const currentTools = agent.tools || []
                const isSelected = currentTools.includes(accountId)
                if (isSelected) {
                  setToolToDisconnect(accountId)
                } else {
                  setConnectingEmpowerTool(accountId)
                  try {
                    await updateAgent(id, { tools: [...currentTools, accountId] })
                    fetchAgent()
                  } catch {}
                  setConnectingEmpowerTool(null)
                }
              }}
              loading={empowerToolsLoading}
            />
          </div>
        </div>
      )}

      {/* Worker Workflow (Performer only) */}
      {agent.type?.toLowerCase() === 'worker' && (() => {
        const stanceName = agent.promptName || allPrompts.find((p) => p.id === selectedPromptId)?.name || ''
        const hasStance = !!stanceName
        // Use agent.tools directly
        const allToolNames: string[] = agent.tools || []
        const hasTools = allToolNames.length > 0

        // Connector
        const Connector = () => (
          <div className="flex justify-center">
            <div className="flex flex-col items-center">
              <div className="w-px h-4 bg-white/[0.1]" />
              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-white/[0.15]" />
            </div>
          </div>
        )

        return (
        <div className="border rounded-xl bg-card border-card-border mb-6 overflow-hidden">
          <div className="px-5 py-5 space-y-0">

            {/* ── Worker ── */}
            <div className="px-4 py-3.5 rounded-xl border-2 border-accent/40 bg-gradient-to-r from-accent/[0.08] to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                  <Bot size={18} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{agent.name}</p>
                  <p className="text-[11px] text-muted">{agent.role || 'Performer'}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted/60 mt-2 ml-[52px] leading-relaxed">
                This performer receives tasks and processes them using the behavior, tools, and configuration defined below.
              </p>
            </div>

            <Connector />

            {/* ── Behavior (Stance) ── */}
            <div className={`px-4 py-3.5 rounded-xl border ${hasStance ? 'border-purple-500/25 bg-purple-500/[0.04]' : 'border-dashed border-white/[0.08] bg-white/[0.015]'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${hasStance ? 'bg-purple-500/15' : 'bg-white/[0.04]'}`}>
                  <MessageSquareCode size={15} className={hasStance ? 'text-purple-400' : 'text-muted/25'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] uppercase tracking-wider font-semibold leading-none mb-1 ${hasStance ? 'text-purple-400/70' : 'text-muted/30'}`}>Behavior</p>
                  {hasStance ? (
                    <p className="text-xs text-white font-medium truncate">{stanceName}</p>
                  ) : (
                    <p className="text-xs text-muted/30 italic">No behavior defined</p>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted/50 mt-2 ml-12 leading-relaxed">
                {hasStance
                  ? 'Defines the personality, tone, and rules this performer follows when handling requests.'
                  : 'Without a behavior, this performer uses default settings. Assign a stance to customize how it responds.'}
              </p>
            </div>

            <Connector />

            {/* ── Tools (select/unselect from Empower) ── */}
            <div className="rounded-xl border overflow-hidden border-amber-500/20 bg-amber-500/[0.025]">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/15">
                      <Zap size={15} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold leading-none mb-1 text-amber-400/70">Tools</p>
                      <p className="text-xs text-white font-medium">Select tools for this performer</p>
                    </div>
                  </div>
                  <button onClick={() => router.push(`/empower?return=${encodeURIComponent(`/agent/${id}`)}`)} className="text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0">
                    <Plus size={10} />Add Accounts
                  </button>
                </div>
              </div>

              <div className="border-t border-amber-500/[0.1] px-4 py-3">
                <ToolAccountSelector
                  accounts={empowerTools}
                  selectedIds={agent.tools || []}
                  onToggle={async (accountId) => {
                    const currentTools = agent.tools || []
                    const isSelected = currentTools.includes(accountId)
                    if (isSelected) {
                      setToolToDisconnect(accountId)
                    } else {
                      setConnectingEmpowerTool(accountId)
                      try {
                        await updateAgent(id, { tools: [...currentTools, accountId] })
                        fetchAgent()
                      } catch {}
                      setConnectingEmpowerTool(null)
                    }
                  }}
                  loading={empowerToolsLoading}
                />
              </div>
            </div>

            <Connector />

            {/* ── Response ── */}
            <div className="px-4 py-3.5 rounded-xl border border-green-500/20 bg-green-500/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle size={15} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-green-400/70 uppercase tracking-wider font-semibold leading-none mb-1">Response</p>
                  <p className="text-xs text-white/60">Returns the final result</p>
                </div>
              </div>
              <p className="text-[11px] text-muted/50 mt-2 ml-12 leading-relaxed">
                After processing the task — using its behavior rules and connected tools — the performer sends the result back to the user.
              </p>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Connected Bluesky Account — Bluesky avatars only */}
      {isBlueskyAvatar && (
        (() => {
          const worker = workers[0]
          const gtaId = worker?.tools?.[0] || ''
          const connectedAccount = empowerTools.find((t: SavedTool) => t.id === gtaId)
          const blueskyAccounts = empowerTools.filter((t: SavedTool) => t.toolName === 'bluesky')
          const otherAccounts = blueskyAccounts.filter((t: SavedTool) => t.id !== gtaId)

          return (
            <div className="border rounded-xl bg-card border-card-border mb-3 overflow-hidden">
              <div className="px-5 py-4">
                {/* Connected account display */}
                {!worker || workersLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 size={14} className="animate-spin text-muted" />
                    <span className="text-xs text-muted">Loading account...</span>
                  </div>
                ) : connectedAccount ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(0,133,255,0.15), rgba(0,133,255,0.05))', border: '1px solid rgba(0,133,255,0.25)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#0085FF"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.574 6.467.581 2.277 2.69 2.86 4.577 2.52-3.417.616-6.418 2.11-2.986 7.37 3.923 5.136 5.587-.28 6.835-3.638.182-.49.263-.722.341-.663.078-.059.159.173.341.663 1.248 3.358 2.912 8.774 6.835 3.637 3.432-5.26.431-6.753-2.986-7.369 1.887.34 3.996-.243 4.577-2.52C18.302 9.418 18.68 4.458 18.68 3.768c0-.688-.139-1.86-.902-2.203-.659-.299-1.664-.621-4.3 1.24C10.726 4.747 7.767 8.686 6.68 10.8"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">@{String(connectedAccount.externalHandle || '').replace(/^@+/, '')}</p>
                      <p className="text-[11px] text-green-400 flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Connected · Bluesky
                      </p>
                    </div>
                    {/* Switch button — only if other accounts available */}
                    {otherAccounts.length > 0 && (
                      <div className="relative shrink-0">
                        <select
                          value=""
                          onChange={async (e) => {
                            const newGtaId = e.target.value
                            if (!newGtaId || !worker) return
                            try {
                              const API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
                              const res = await fetch(`${API}/api/agents/predefined/bluesky/${id}/switch-account`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ newAccountId: newGtaId, wallet: user?.wallet }),
                              })
                              if (res.ok) {
                                const result = await getWorkersForPresence(id)
                                setWorkers(result.agents || [])
                                const agentRes = await fetch(`/api/agents/${id}`)
                                if (agentRes.ok) { const d = await agentRes.json(); setAgent(d.agent) }
                              }
                            } catch {}
                          }}
                          className="appearance-none text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                          style={{ background: 'rgba(0,133,255,0.1)', color: '#4da6ff', border: '1px solid rgba(0,133,255,0.25)' }}
                        >
                          <option value="" style={{ background: '#0A0D33' }}>Switch ↓</option>
                          {otherAccounts.map((acct: SavedTool) => (
                            <option key={acct.id} value={acct.id} style={{ background: '#0A0D33', color: '#fff' }}>
                              @{String(acct.externalHandle || '').replace(/^@+/, '')}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-400">No account connected</p>
                      <p className="text-[11px] text-muted/50">Connect a Bluesky account on the <a href="/empower" className="text-accent hover:underline">Empower</a> page</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()
      )}

      {/* Two-column layout */}
      <div className={`flex gap-6 items-start ${isBlueskyAvatar ? '' : ''}`}>
        {/* Left: Description — hidden for Bluesky and Executive */}
        {!isBlueskyAvatar && !isExecAvatar && (
        <div className="flex-[3] min-w-0 space-y-4">
          <EditableSection
            label="Description"
            icon={ScanFace}
            value={description}
            onChange={setDescription}
            onSave={handleSaveDescription}
            saving={descSaving}
            savedFlash={descFlash}
            placeholder="Describe this agent — what it does, how it behaves, and what makes it unique. Minimum 50 characters."
            rows={10}
            minChars={DESCRIPTION_MIN_CHARS}
          />
        </div>
        )}

        {/* Sidebar */}
        <div className={`${isBlueskyAvatar || isExecAvatar ? 'flex-1' : 'flex-[2]'} min-w-0 ${isBlueskyAvatar || isExecAvatar ? 'space-y-2' : 'space-y-3'}`}>
          {/* AI Assistant */}
          {!isBlueskyAvatar && !isExecAvatar && (<SidebarCard title="AI Assistant" icon={Sparkles} defaultOpen>
            <div className="space-y-3">
              {/* Mode toggle */}
              <div className="flex rounded-lg overflow-hidden border border-card-border">
                <button
                  onClick={() => setAiMode('generate')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    aiMode === 'generate' ? 'bg-white/10 text-white' : 'bg-input text-muted hover:text-foreground'
                  }`}
                >
                  Generate
                </button>
                <button
                  onClick={() => setAiMode('refine')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    aiMode === 'refine' ? 'bg-white/10 text-white' : 'bg-input text-muted hover:text-foreground'
                  }`}
                >
                  Refine
                </button>
              </div>

              <p className="text-xs text-muted">
                {aiMode === 'generate'
                  ? 'Create a fresh description from the agent name and your instructions.'
                  : 'Improve the existing description based on your feedback.'}
              </p>

              <textarea
                value={aiInstructions}
                onChange={(e) => { if (e.target.value.length <= 500) setAiInstructions(e.target.value) }}
                placeholder={aiMode === 'generate'
                  ? 'Describe the vibe, personality, backstory you want…'
                  : 'What should change? e.g. Make it more formal, add humor…'}
                rows={3}
                maxLength={500}
                className="w-full bg-input border border-card-border rounded-xl px-3 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none"
              />
              <span className={`text-xs tabular-nums ${aiInstructions.length >= 500 ? 'text-red-400' : 'text-muted'}`}>
                {aiInstructions.length}/500
              </span>

              {aiError && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle size={12} />
                  {aiError}
                </p>
              )}

              <button
                onClick={handleAIGenerate}
                disabled={aiLoading || !aiInstructions.trim()}
                className="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-2.5 rounded-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {aiLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {aiMode === 'generate' ? 'Generating…' : 'Refining…'}
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    {aiMode === 'generate' ? 'Generate Description' : 'Refine Description'}
                  </>
                )}
              </button>
            </div>
          </SidebarCard>)}

          {/* Inform — Avatar only */}
          {agent.type?.toLowerCase() !== 'worker' && (
            <SidebarCard title="Inform" icon={Brain} defaultOpen={isBlueskyAvatar || isExecAvatar}>
              <p className="text-xs text-muted mb-3">Select one or more KBs for this agent to draw from.</p>
              {kbWarning && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
                  <AlertCircle size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: '#fbbf24', margin: 0, fontWeight: 500 }}>At least one knowledge base is required for this avatar to function properly.</p>
                </div>
              )}
              {allKBs.length === 0 ? (
                <p className="text-xs text-muted/60 italic">No inform available.</p>
              ) : (
                <div className="space-y-1.5">
                  {allKBs
                    .filter((kb) => {
                      const isTemplate = (kb as any).sourceType === 'template' || (kb as any).source_type === 'template'
                      // Template KBs: only show if attached to THIS agent
                      if (isTemplate) return selectedKBIds.includes(kb.id)
                      // Non-template KBs: always show
                      return true
                    })
                    .map((kb) => {
                    const checked = selectedKBIds.includes(kb.id)
                    const isTemplate = (kb as any).sourceType === 'template' || (kb as any).source_type === 'template'
                    const isExpanded = templateKbExpanded === kb.id
                    return (
                      <div key={kb.id}>
                        <div
                          onClick={() => {
                            const isDeselecting = selectedKBIds.includes(kb.id)
                            if (isDeselecting && selectedKBIds.length <= 1 && (isBlueskyAvatar || isExecAvatar)) {
                              setKbWarning(true)
                              setTimeout(() => setKbWarning(false), 4000)
                              return
                            }
                            setSelectedKBIds((prev) =>
                              prev.includes(kb.id) ? prev.filter((x) => x !== kb.id) : [...prev, kb.id]
                            )
                            setKbDirty(true)
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                            checked
                              ? 'bg-accent/10 border border-accent/30 cursor-pointer'
                              : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06] cursor-pointer'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                            checked ? 'border-accent bg-accent' : 'border-muted/50'
                          }`}>
                            {checked && <div className="w-1.5 h-1.5 rounded-[1px] bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm ${checked ? 'text-white' : 'text-muted'}`}>
                              {kb.name}
                            </span>
                            {isTemplate && (
                              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Default
                              </span>
                            )}
                          </div>
                          {isTemplate && checked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isExpanded) {
                                  setTemplateKbExpanded(null)
                                } else {
                                  setTemplateKbExpanded(kb.id)
                                  if (!templateKbContent[kb.id]) {
                                    fetch(`/api/knowledge/${kb.id}`)
                                      .then(r => r.json())
                                      .then(d => setTemplateKbContent(prev => ({ ...prev, [kb.id]: d.content || '' })))
                                      .catch(() => {})
                                  }
                                }
                              }}
                              className="text-[10px] px-2 py-1 rounded bg-white/[0.04] border border-white/[0.1] text-muted hover:text-white transition-colors shrink-0"
                            >
                              {isExpanded ? 'Close' : 'Preview & Edit'}
                            </button>
                          )}
                        </div>
                        {isTemplate && isExpanded && (
                          <div className="mt-1.5 rounded-lg border border-blue-500/20 overflow-hidden">
                            <textarea
                              value={templateKbContent[kb.id] || ''}
                              onChange={(e) => setTemplateKbContent(prev => ({ ...prev, [kb.id]: e.target.value }))}
                              rows={8}
                              className="w-full text-[11px] bg-black/20 border-0 text-white/80 px-3 py-2.5 outline-none resize-y"
                              style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', lineHeight: 1.6, minHeight: 100 }}
                            />
                            <div className="flex items-center justify-between px-3 py-2 bg-blue-500/[0.04] border-t border-blue-500/10">
                              <span className="text-[10px] text-muted/40">{(templateKbContent[kb.id] || '').length} characters</span>
                              <button
                                onClick={async () => {
                                  setTemplateKbSaving(true)
                                  try {
                                    await fetch(`/api/knowledge/${kb.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ content: templateKbContent[kb.id] }),
                                    })
                                  } catch {}
                                  setTemplateKbSaving(false)
                                }}
                                disabled={templateKbSaving}
                                className="text-[10px] font-medium px-3 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-40"
                              >
                                {templateKbSaving ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </SidebarCard>
          )}


          {/* Skills — Avatar and Worker */}
          {!isBlueskyAvatar && !isExecAvatar && (<SidebarCard title="Skills" icon={Zap}>
            <p className="text-xs text-muted mb-3">
              {agent.type?.toLowerCase() === 'worker'
                ? 'Select skills this performer can activate.'
                : 'Select skills for this agent to use.'}
            </p>

            {/* Select Predefined Template — removed: use Align page instead */}

            {allSkills.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-muted/60 italic mb-2">No skills created yet.</p>
                <button
                  onClick={() => router.push('/align')}
                  className="text-xs font-medium text-accent hover:text-accent-dark transition-colors"
                >
                  Create a skill
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {allSkills.map((sk: any) => {
                  const checked = selectedSkillIds.includes(sk.id)
                  const triggerType = (sk.trigger_type || sk.triggerType || '').toLowerCase()
                  const triggerColor = triggerType === 'event' ? 'text-green-400' : triggerType === 'time' ? 'text-blue-400' : 'text-amber-400'

                  // Check if skill's required tools are connected
                  const skillTools: string[] = sk.tools || []
                  const connectedToolNames = agent.type?.toLowerCase() === 'worker'
                    ? empowerTools.map((t) => t.toolName)
                    : workers.flatMap((w) => w.tools || [])
                  const missingTools = getMissingSkillTools(skillTools, connectedToolNames)
                  const hasAllTools = missingTools.length === 0 || skillTools.length === 0

                  return (
                    <div
                      key={sk.id}
                      onClick={async () => {
                        if (!hasAllTools && !checked) return // Block adding if tools missing
                        const newIds = selectedSkillIds.includes(sk.id)
                          ? selectedSkillIds.filter((x: string) => x !== sk.id)
                          : [...selectedSkillIds, sk.id]
                        setSelectedSkillIds(newIds)
                        try {
                          await fetch(`/api/agents/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ skillIds: newIds }),
                          })
                        } catch (e) {
                          console.error('Failed to save skills:', e)
                        }
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                        !hasAllTools && !checked
                          ? 'bg-white/[0.02] border border-transparent opacity-50 cursor-not-allowed'
                          : checked
                            ? 'bg-accent/10 border border-accent/30 cursor-pointer'
                            : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06] cursor-pointer'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? 'border-accent bg-accent' : 'border-muted/50'
                      }`}>
                        {checked && <Check size={10} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white block truncate">{sk.name}</span>
                        <span className="text-[10px] text-muted truncate block">{sk.when_text || sk.whenText}</span>
                        {!hasAllTools && !checked && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle size={9} className="text-yellow-400 shrink-0" />
                            <span className="text-[9px] text-yellow-400">
                              Missing: {missingTools.join(', ')} — connect on Empower page
                            </span>
                          </div>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${triggerColor}`}>
                        {triggerType}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </SidebarCard>)}

          {/* Stance */}
          <SidebarCard title="Stance" icon={MessageSquareCode} defaultOpen={isBlueskyAvatar || isExecAvatar}>
            {/* Bluesky: editable system_prompt textarea */}
            {isBlueskyAvatar ? (
              <div>
                <p className="text-xs text-muted mb-2">The system prompt that governs this avatar&apos;s behavior.</p>
                <textarea
                  value={bskyStance}
                  onChange={(e) => setBskyStance(e.target.value)}
                  rows={8}
                  className="w-full text-sm bg-input border border-card-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:border-accent/50 transition-colors resize-y"
                  placeholder="Enter the system prompt / stance for this avatar..."
                  style={{ minHeight: 120 }}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-muted/40">{bskyStance.length} characters</p>
                  <button
                    onClick={handleBskyStanceSave}
                    disabled={bskyStanceSaving}
                    className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors text-xs font-medium disabled:opacity-40"
                  >
                    {bskyStanceSaving ? 'Saving…' : bskyStanceFlash ? '✓ Saved' : 'Save Stance'}
                  </button>
                </div>
              </div>
            ) : isExecAvatar ? (
              <div>
                <p className="text-xs text-muted mb-2">The system prompt that governs this avatar&apos;s behavior.</p>
                <textarea
                  value={execStance}
                  onChange={(e) => setExecStance(e.target.value)}
                  rows={8}
                  className="w-full text-sm bg-input border border-card-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:border-accent/50 transition-colors resize-y"
                  placeholder="Enter the system prompt / stance for this avatar..."
                  style={{ minHeight: 120 }}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-muted/40">{execStance.length} characters</p>
                  <button
                    onClick={handleExecStanceSave}
                    disabled={execStanceSaving}
                    className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors text-xs font-medium disabled:opacity-40"
                  >
                    {execStanceSaving ? 'Saving…' : execStanceFlash ? '✓ Saved' : 'Save Stance'}
                  </button>
                </div>
              </div>
            ) : (
            <>
            <p className="text-xs text-muted mb-3">Assign one prompt to govern this agent&apos;s behaviour.</p>
            {allPrompts.length === 0 ? (
              <p className="text-xs text-muted/60 italic">No prompts available.</p>
            ) : (
              <div className="space-y-1.5">
                {allPrompts.map((p) => {
                  const isSelected = selectedPromptId === p.id
                  const assignedTo = agentPromptMap[p.id]
                  const isLocked = !!assignedTo && assignedTo !== agent.name && !isSelected
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (isLocked) return
                        setSelectedPromptId(isSelected ? '' : p.id)
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                        isLocked
                          ? 'bg-white/[0.01] opacity-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-accent/10 border border-accent/30 cursor-pointer'
                            : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06] cursor-pointer'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isLocked ? 'border-muted/30' : isSelected ? 'border-accent bg-accent' : 'border-muted/50'
                      }`}>
                        {isSelected && !isLocked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        {isLocked && <Lock size={7} className="text-muted/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${isLocked ? 'text-muted' : isSelected ? 'text-white' : 'text-muted'}`}>
                          {p.name}
                        </span>
                        {isLocked && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            </>
            )}
          </SidebarCard>

          {/* Skills — read-only for Bluesky avatars */}
          {isBlueskyAvatar && (
          <SidebarCard title="Automations" icon={Zap} defaultOpen>
            <p className="text-xs text-muted mb-1">7 built-in Bluesky automations.</p>
            <p className="text-[11px] text-muted/50 mb-4">
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> <b className="text-green-400/80">Automatic</b></span> — runs on its own. 
              <span className="inline-flex items-center gap-1 ml-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> <b className="text-amber-400/80">Needs Approval</b></span> — asks you first.
            </p>
            <div className="space-y-1.5">
              {(() => {
                const bskySkills = allSkills.filter((s: any) => selectedSkillIds.includes(s.id))
                if (bskySkills.length === 0) {
                  const fallbackSkills = [
                    { name: 'Reply to Mentions', desc: 'Automatically replies when someone mentions you' },
                    { name: 'Like Mentions', desc: 'Likes posts that mention your account' },
                    { name: 'Continue Threads', desc: 'Continues conversations in your threads' },
                    { name: 'Like Replies', desc: 'Likes replies to your posts' },
                    { name: 'Follow Back', desc: 'Follows back new followers' },
                    { name: 'Welcome DMs', desc: 'Sends a welcome message to new followers' },
                    { name: 'Auto-respond DMs', desc: 'Responds to incoming direct messages' },
                  ]
                  return fallbackSkills.map((sk, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                        <Zap size={12} className="text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-white block">{sk.name}</span>
                        <span className="text-[10px] text-muted/50">{sk.desc}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[10px] text-green-400 font-medium">Automatic</span>
                      </div>
                    </div>
                  ))
                }
                return bskySkills.map((sk: any) => {
                  const needsApproval = sk.requiresApproval ?? sk.requires_approval ?? false
                  const isPaused = (sk.status || '').toUpperCase() === 'PAUSED'
                  return (
                    <div key={sk.id} className={`rounded-xl border overflow-hidden ${isPaused ? 'border-red-500/15' : 'border-white/[0.06]'}`}>
                      <div className={`flex items-center gap-3 px-3 py-3 ${isPaused ? 'bg-red-500/[0.03]' : 'bg-white/[0.02]'}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isPaused ? 'bg-red-500/10' : 'bg-accent/15'}`}>
                          <Zap size={12} className={isPaused ? 'text-red-400/50' : 'text-accent'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-medium block truncate ${isPaused ? 'text-white/40 line-through' : 'text-white'}`}>{sk.name}</span>
                          <span className="text-[10px] text-muted/50 truncate block">{sk.description || sk.when_text || sk.whenText || ''}</span>
                        </div>
                        {!isPaused && (
                        <button
                          onClick={() => handleSkillApprovalToggle(sk.id, needsApproval)}
                          className="flex items-center gap-1.5 shrink-0 cursor-pointer group/toggle"
                          title={needsApproval ? 'Click to switch to Automatic mode' : 'Click to require your approval'}
                        >
                          <span className={`w-8 h-[18px] rounded-full relative transition-colors ${needsApproval ? 'bg-amber-400/25' : 'bg-green-400/25'}`}>
                            <span className={`absolute top-[3px] w-3 h-3 rounded-full transition-all ${needsApproval ? 'right-[3px] bg-amber-400' : 'left-[3px] bg-green-400'}`} />
                          </span>
                          <span className={`text-[10px] font-medium ${needsApproval ? 'text-amber-400' : 'text-green-400'}`}>
                            {needsApproval ? 'Needs Approval' : 'Automatic'}
                          </span>
                        </button>
                        )}
                      </div>
                      <div className={`flex items-center justify-end px-3 py-2 ${isPaused ? 'bg-red-500/[0.02] border-t border-red-500/10' : 'bg-white/[0.01] border-t border-white/[0.04]'}`}>
                        <button
                          onClick={() => handleSkillStatusToggle(sk.id, isPaused ? 'paused' : 'active')}
                          className="cursor-pointer text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                          style={isPaused ? {
                            background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)',
                          } : {
                            background: 'rgba(239,68,68,0.06)', color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.12)',
                          }}
                        >
                          {isPaused ? 'Resume' : 'Pause'}
                        </button>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </SidebarCard>
          )}

          {/* Skills / Automations — Executive Avatar */}
          {isExecAvatar && (
          <SidebarCard title="Automations" icon={Zap} defaultOpen>
            <p className="text-xs text-muted mb-1">{EXEC_AUTOMATION_CATEGORIES.reduce((n, c) => n + c.automations.length, 0)} built-in automations.</p>
            <p className="text-[11px] text-muted/50 mb-4">
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> <b className="text-green-400/80">Automatic</b></span> — runs on its own.{' '}
              <span className="inline-flex items-center gap-1 ml-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> <b className="text-amber-400/80">Needs Approval</b></span> — asks you first.
            </p>
            <div className="space-y-1.5">
              {(() => {
                const execSkills = allSkills.filter((s: any) => selectedSkillIds.includes(s.id))
                if (execSkills.length === 0) {
                  const fallbackSkills = EXEC_AUTOMATION_CATEGORIES.flatMap(cat =>
                    cat.automations.map(a => ({
                      name: a.name,
                      desc: cat.name,
                      defaultApproval: a.default,
                    }))
                  )
                  return fallbackSkills.map((sk, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                        <Zap size={12} className="text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-white block">{sk.name}</span>
                        <span className="text-[10px] text-muted/50">{sk.desc}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${sk.defaultApproval === 'auto' ? 'bg-green-400' : 'bg-amber-400'}`} />
                        <span className={`text-[10px] font-medium ${sk.defaultApproval === 'auto' ? 'text-green-400' : 'text-amber-400'}`}>
                          {sk.defaultApproval === 'auto' ? 'Automatic' : 'Needs Approval'}
                        </span>
                      </div>
                    </div>
                  ))
                }
                return execSkills.map((sk: any) => {
                  const needsApproval = sk.requiresApproval ?? sk.requires_approval ?? false
                  const isPaused = (sk.status || '').toUpperCase() === 'PAUSED'
                  return (
                    <div key={sk.id} className={`rounded-xl border overflow-hidden ${isPaused ? 'border-red-500/15' : 'border-white/[0.06]'}`}>
                      <div className={`flex items-center gap-3 px-3 py-3 ${isPaused ? 'bg-red-500/[0.03]' : 'bg-white/[0.02]'}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isPaused ? 'bg-red-500/10' : 'bg-accent/15'}`}>
                          <Zap size={12} className={isPaused ? 'text-red-400/50' : 'text-accent'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-medium block truncate ${isPaused ? 'text-white/40 line-through' : 'text-white'}`}>{sk.name}</span>
                          <span className="text-[10px] text-muted/50 truncate block">{sk.description || sk.when_text || sk.whenText || ''}</span>
                        </div>
                        {!isPaused && (
                        <button
                          onClick={() => handleSkillApprovalToggle(sk.id, needsApproval)}
                          className="flex items-center gap-1.5 shrink-0 cursor-pointer group/toggle"
                          title={needsApproval ? 'Click to switch to Automatic mode' : 'Click to require your approval'}
                        >
                          <span className={`w-8 h-[18px] rounded-full relative transition-colors ${needsApproval ? 'bg-amber-400/25' : 'bg-green-400/25'}`}>
                            <span className={`absolute top-[3px] w-3 h-3 rounded-full transition-all ${needsApproval ? 'right-[3px] bg-amber-400' : 'left-[3px] bg-green-400'}`} />
                          </span>
                          <span className={`text-[10px] font-medium ${needsApproval ? 'text-amber-400' : 'text-green-400'}`}>
                            {needsApproval ? 'Needs Approval' : 'Automatic'}
                          </span>
                        </button>
                        )}
                      </div>
                      <div className={`flex items-center justify-end px-3 py-2 ${isPaused ? 'bg-red-500/[0.02] border-t border-red-500/10' : 'bg-white/[0.01] border-t border-white/[0.04]'}`}>
                        <button
                          onClick={() => handleSkillStatusToggle(sk.id, isPaused ? 'paused' : 'active')}
                          className="cursor-pointer text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                          style={isPaused ? {
                            background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)',
                          } : {
                            background: 'rgba(239,68,68,0.06)', color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.12)',
                          }}
                        >
                          {isPaused ? 'Resume' : 'Pause'}
                        </button>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </SidebarCard>
          )}

          {/* Connected Accounts — Executive Avatar */}
          {isExecAvatar && (
          <SidebarCard title="Connected Accounts" icon={LinkIcon} defaultOpen>
            <p className="text-xs text-muted mb-4">One account per service. Manage accounts on the <button onClick={() => router.push('/empower')} className="text-accent hover:underline cursor-pointer bg-transparent border-0 p-0 inline text-xs">Empower</button> page.</p>

            {(() => {
              const agentToolIds = agent.tools || []
              const EXEC_SLOTS = [
                { toolName: 'google',   label: 'Google',   sub: 'Gmail, Calendar, Meet', icon: 'G', color: '#4285F4' },
                { toolName: 'telegram', label: 'Telegram', sub: 'Messages & bot access',  icon: 'T', color: '#60a5fa' },
              ]

              return (
                <div className="space-y-2.5">
                  {EXEC_SLOTS.map((slot) => {
                    // The one assigned to this agent for this tool type
                    const connectedAccount = agentToolIds
                      .map((tid: string) => empowerTools.find((t) => t.id === tid))
                      .find((t) => t && t.toolName === slot.toolName) || null
                    // Other accounts of this type in the Empower pool (not assigned to this agent)
                    const poolAccounts = empowerTools.filter(t =>
                      t.toolName === slot.toolName && !agentToolIds.includes(t.id)
                    )
                    const hasPoolOptions = poolAccounts.length > 0

                    return (
                      <div key={slot.toolName}>
                        {/* Slot — account is assigned */}
                        {connectedAccount && (
                          <div className="rounded-xl border bg-white/[0.02] overflow-hidden"
                            style={{ borderColor: `${slot.color}20` }}>
                            <div className="flex items-center gap-3 px-3.5 py-3">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: `${slot.color}12` }}>
                                <span style={{ color: slot.color, fontSize: 15, fontWeight: 700 }}>{slot.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-white block">{slot.label}</span>
                                <span className="text-[10px] text-muted/70 block truncate">
                                  {slot.toolName === 'telegram' && connectedAccount.externalHandle
                                    ? (connectedAccount.externalHandle.startsWith('@') ? connectedAccount.externalHandle : `@${connectedAccount.externalHandle}`)
                                    : connectedAccount.externalHandle || 'Connected'}
                                </span>
                              </div>
                              <button
                                onClick={() => setExecRemoveConfirm({
                                  accountId: connectedAccount.id,
                                  toolName: connectedAccount.toolName,
                                  handle: connectedAccount.externalHandle || connectedAccount.toolName,
                                })}
                                className="text-muted/30 hover:text-red-400 transition-colors p-1 cursor-pointer shrink-0"
                                title="Unassign"
                              >
                                <X size={13} />
                              </button>
                            </div>

                            {/* If there are other accounts in pool, show a switch option */}
                            {hasPoolOptions && (
                              <div className="border-t px-3.5 py-2" style={{ borderColor: `${slot.color}10` }}>
                                <p className="text-[10px] text-muted/40 mb-1.5">Switch to</p>
                                {poolAccounts.map((alt) => (
                                  <button
                                    key={alt.id}
                                    onClick={() => handleExecAssignAccount(alt.id)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer text-left"
                                  >
                                    <span className="text-[11px] text-white/50 flex-1 truncate font-mono">
                                      {slot.toolName === 'telegram' && alt.externalHandle ? (alt.externalHandle.startsWith('@') ? alt.externalHandle : `@${alt.externalHandle}`) : alt.externalHandle || 'Account'}
                                    </span>
                                    <span className="text-[10px] text-accent shrink-0">Use</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Slot — nothing assigned */}
                        {!connectedAccount && (
                          <>
                            {hasPoolOptions ? (
                              /* Pick from pool */
                              <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${slot.color}15` }}>
                                <div className="flex items-center gap-3 px-3.5 py-2.5" style={{ background: `${slot.color}04` }}>
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: `${slot.color}08` }}>
                                    <span style={{ color: `${slot.color}50`, fontSize: 14, fontWeight: 700 }}>{slot.icon}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium text-white/60 block">{slot.label}</span>
                                    <span className="text-[10px] text-muted/30 block">{slot.sub}</span>
                                  </div>
                                </div>
                                <div className="border-t px-3.5 py-2" style={{ borderColor: `${slot.color}10` }}>
                                  {poolAccounts.map((acct) => (
                                    <button
                                      key={acct.id}
                                      onClick={() => handleExecAssignAccount(acct.id)}
                                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer text-left"
                                    >
                                      <span className="text-[11px] text-white/60 flex-1 truncate font-mono">
                                        {slot.toolName === 'telegram' && acct.externalHandle ? (acct.externalHandle.startsWith('@') ? acct.externalHandle : `@${acct.externalHandle}`) : acct.externalHandle || 'Account'}
                                      </span>
                                      <span className="text-[10px] font-semibold text-accent flex items-center gap-1 shrink-0">
                                        <Plus size={10} />Assign
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              /* No accounts in pool — point to Empower */
                              <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-dashed"
                                style={{ borderColor: `${slot.color}15` }}>
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                  style={{ background: `${slot.color}06` }}>
                                  <span style={{ color: `${slot.color}30`, fontSize: 15, fontWeight: 700 }}>{slot.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-medium text-white/30 block">{slot.label}</span>
                                  <span className="text-[10px] text-muted/25 block">Not connected</span>
                                </div>
                                <button
                                  onClick={() => router.push('/empower')}
                                  className="text-[10px] font-semibold flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                                  style={{ color: `${slot.color}90`, background: `${slot.color}08`, border: `1px solid ${slot.color}15` }}
                                >
                                  <Plus size={10} />
                                  Add in Empower
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </SidebarCard>
          )}

          {/* Signals — hidden for Bluesky and Executive */}
          {!isBlueskyAvatar && !isExecAvatar && (
          <SidebarCard title="Signals" icon={Activity}>
            <p className="text-xs text-muted mb-4">Enable signals and set the starting value for this agent.</p>
            <div className="space-y-3">
              {ALL_SIGNALS.map((sig) => {
                const active = activeSignals.find((s) => s.signalId === sig.signalId)
                return (
                  <div key={sig.signalId}>
                    <div className="flex items-center gap-2.5 mb-1">
                      <button
                        type="button"
                        onClick={() => toggleSignal(sig)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 transition-opacity ${
                          active ? 'opacity-100' : 'opacity-25'
                        }`}
                        style={{ backgroundColor: sig.color }}
                      >
                        {sig.letter}
                      </button>
                      <span className={`text-sm flex-1 ${active ? 'text-white' : 'text-muted'}`}>{sig.name}</span>
                      {active && <span className="text-xs font-mono text-accent w-6 text-right">{active.value}</span>}
                    </div>
                    {active && (
                      <div className="pl-[38px]">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={active.value}
                          onChange={(e) => setSignalValue(sig.signalId, Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{
                            accentColor: sig.color,
                            background: `linear-gradient(to right, ${sig.color} ${active.value}%, rgba(255,255,255,0.1) ${active.value}%)`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </SidebarCard>
          )}

          {/* Performers — hidden for Bluesky and Executive */}
          {agent.type?.toLowerCase() === 'presence' && !isBlueskyAvatar && !isExecAvatar && (
            <SidebarCard title="Performers" icon={Bot}>
              <div className="space-y-3">
                {/* Assigned performers */}
                {workersLoading ? (
                  <div className="text-center py-4">
                    <Loader2 size={18} className="text-muted animate-spin mx-auto" />
                  </div>
                ) : workers.length > 0 ? (
                  <div className="space-y-1.5">
                    {workers.map((worker) => (
                      <div key={worker.id}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-card-border hover:bg-white/[0.02] transition-colors">
                        <div className="w-7 h-7 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center shrink-0">
                          <Bot size={14} className="text-accent/60" />
                        </div>
                        <button
                          onClick={() => router.push(`/agent/${worker.id}`)}
                          className="flex-1 min-w-0 text-left group"
                        >
                          <span className="text-xs font-medium text-white block truncate group-hover:text-accent transition-colors">
                            {worker.name}
                          </span>
                          {worker.tools && worker.tools.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {worker.tools.slice(0, 3).map((tool) => (
                                <span key={tool} className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent/70">{tool}</span>
                              ))}
                              {worker.tools.length > 3 && <span className="text-[9px] text-muted">+{worker.tools.length - 3}</span>}
                            </div>
                          )}
                        </button>
                        <button
                          onClick={() => setWorkerToRemove(worker)}
                          className="shrink-0 text-red-400/60 hover:text-red-400 transition-colors p-1"
                          title="Unlink performer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Bot size={22} className="text-muted/20 mx-auto mb-1.5" />
                    <p className="text-xs text-muted/40">No performers assigned</p>
                  </div>
                )}

                {/* Add performer button / panel */}
                {!showAddPerformer ? (
                  <button
                    onClick={() => { setShowAddPerformer(true); fetchAvailableWorkers() }}
                    className="w-full text-xs font-medium text-accent hover:text-accent/80 border border-dashed border-accent/30 hover:border-accent/50 rounded-lg py-2 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    Add Performer
                  </button>
                ) : (
                  <div className="border border-accent/20 rounded-lg p-3 bg-accent/[0.02]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-wider text-accent font-bold">Unassigned Performers</span>
                      <button onClick={() => setShowAddPerformer(false)} className="text-muted hover:text-white transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                    {availableLoading ? (
                      <div className="text-center py-3">
                        <Loader2 size={16} className="text-muted animate-spin mx-auto" />
                      </div>
                    ) : availableWorkers.length === 0 ? (
                      <p className="text-xs text-muted/50 text-center py-3">No available performers to add</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {availableWorkers.map((worker) => (
                          <div key={worker.id}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-card-border hover:bg-white/[0.02] transition-colors">
                            <div className="w-6 h-6 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center shrink-0">
                              <Bot size={12} className="text-muted" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-white block truncate">{worker.name}</span>
                              {(worker as any).role && <span className="text-[10px] text-muted truncate block">{(worker as any).role}</span>}
                            </div>
                            <button
                              onClick={() => handleAssignPerformer(worker.id)}
                              disabled={assigningPerformer === worker.id}
                              className="shrink-0 text-[10px] font-bold text-accent border border-accent/30 hover:border-accent/60 bg-accent/[0.06] hover:bg-accent/15 px-2 py-1 rounded transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              {assigningPerformer === worker.id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Plus size={10} />
                              )}
                              Assign
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-muted/40">
                  {workers.length} performer{workers.length !== 1 ? 's' : ''} assigned
                </p>
              </div>
            </SidebarCard>
          )}

          {/* Worker Configuration — Worker only */}
          {agent.type?.toLowerCase() === 'worker' && (
            <SidebarCard title="Configuration" icon={Settings} defaultOpen={true}>
              <div className="space-y-4">
                {/* Role */}
                {(agent as any).role && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted/50 mb-1">Role</p>
                    <p className="text-sm text-white">{(agent as any).role}</p>
                  </div>
                )}

                {/* Behavior (Stance) */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted/50 mb-1">Behavior</p>
                  {(() => {
                    const sName = agent.promptName || allPrompts.find((p) => p.id === selectedPromptId)?.name
                    return sName
                      ? <p className="text-sm text-white">{sName}</p>
                      : <p className="text-xs text-muted/50 italic">No stance assigned</p>
                  })()}
                </div>

                {/* Connected Tools — live data */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted/50 mb-1.5">Connected Tools</p>
                  {(() => {
                    const merged: string[] = agent.tools || []
                    return merged.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {merged.map((tool) => (
                          <span
                            key={tool}
                            className="text-xs px-2.5 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center gap-1.5"
                          >
                            <Zap size={10} />
                            {tool}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted/50 italic">No tools connected</p>
                    )
                  })()}
                </div>

                {/* Timestamps */}
                <div className="pt-2 border-t border-card-border space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted/40">Created</span>
                    <span className="text-xs text-muted/70">{new Date(agent.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted/40">Updated</span>
                    <span className="text-xs text-muted/70">{new Date(agent.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </SidebarCard>
          )}

          {/* Save sidebar button */}
          <button
            onClick={handleSaveSidebar}
            disabled={sidebarSaving}
            className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-card-border hover:border-accent/40 text-foreground font-medium py-2.5 rounded-xs transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {sidebarSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {sidebarSaving ? 'Saving…' : 'Save Configuration'}
          </button>
          {sidebarFlash && (
            <p className="text-xs text-green-400 text-center flex items-center justify-center gap-1">
              <CheckCircle size={12} />
              Configuration saved!
            </p>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Delete {agent.type?.toLowerCase() === 'presence' ? 'Avatar' : 'Performer'}?</h3>
            <p className="text-muted text-sm mb-5">
              &ldquo;{agent.name}&rdquo; will be permanently removed. This cannot be undone.
              {(isBlueskyAvatar || isExecAvatar) && (
                <span className="block mt-2 text-blue-400">Your knowledge bases will be preserved.</span>
              )}
              {!isBlueskyAvatar && !isExecAvatar && agent.type?.toLowerCase() === 'presence' && workers.length > 0 && (
                <span className="block mt-2 text-amber-400">
                  ⚠️ This will also remove {workers.length} associated Performer{workers.length !== 1 ? 's' : ''}.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] border border-card-border text-foreground font-medium px-4 py-2.5 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold px-4 py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {actionLoading === 'delete' ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete blocked warning */}
      {deleteBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteBlocked(false)} />
          <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <AlertCircle size={24} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cannot Delete</h3>
                <p className="text-sm text-muted">Deletion is restricted</p>
              </div>
            </div>
            <p className="text-foreground text-sm mb-5">{deleteBlockReason}</p>
            <button
              onClick={() => setDeleteBlocked(false)}
              className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-card-border text-foreground font-medium px-4 py-2.5 rounded transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Remove worker confirm */}
      {workerToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !removingWorker && setWorkerToRemove(null)}
          />
          <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Unplug size={24} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Unlink Performer?
                </h3>
                <p className="text-sm text-muted">
                  The performer will become unassigned
                </p>
              </div>
            </div>

            {/* Worker preview */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 mb-5">
              <div className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center shrink-0">
                <Bot size={16} className="text-accent/60" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{workerToRemove.name}</p>
                {workerToRemove.tools && workerToRemove.tools.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {workerToRemove.tools.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent/70">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-muted text-sm mb-5">
              This performer will be unlinked from this avatar and become unassigned. It will not be deleted — you can reassign it later.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setWorkerToRemove(null)}
                disabled={removingWorker}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] border border-card-border text-foreground font-medium px-4 py-2.5 rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveWorker}
                disabled={removingWorker}
                className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold px-4 py-2.5 rounded transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {removingWorker ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Unlinking…
                  </>
                ) : (
                  <>
                    <Unplug size={13} />
                    Unlink
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect tool confirm */}
      {toolToDisconnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !disconnectingTool && setToolToDisconnect(null)} />
          <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Remove Tool?</h3>
                <p className="text-sm text-muted">Remove from this agent only</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <Zap size={16} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate capitalize">
                  {empowerTools.find(t => t.id === toolToDisconnect)?.toolName || toolToDisconnect}
                </p>
                {empowerTools.find(t => t.id === toolToDisconnect)?.externalHandle && (
                  <p className="text-xs text-muted truncate font-mono">
                    {empowerTools.find(t => t.id === toolToDisconnect)?.externalHandle}
                  </p>
                )}
              </div>
            </div>

            <p className="text-muted text-sm mb-5">
              This tool will be removed from this agent. Your account credentials stay connected in Empower — you can re-assign the tool anytime.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setToolToDisconnect(null)}
                disabled={disconnectingTool}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] border border-card-border text-foreground font-medium px-4 py-2.5 rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisconnectTool}
                disabled={disconnectingTool}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold px-4 py-2.5 rounded transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {disconnectingTool ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Disconnecting…
                  </>
                ) : (
                  <>
                    <Unplug size={13} />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign account confirm — Executive Avatar */}
      {execRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !execRemoving && setExecRemoveConfirm(null)} />
          <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Unplug size={24} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Unassign Account?</h3>
                <p className="text-sm text-muted">Remove from this avatar only</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{
                background: execRemoveConfirm.toolName.includes('telegram') ? 'rgba(96,165,250,0.15)' : 'rgba(66,133,244,0.15)'
              }}>
                <span style={{
                  color: execRemoveConfirm.toolName.includes('telegram') ? '#60a5fa' : '#4285F4',
                  fontSize: 16, fontWeight: 700,
                }}>
                  {execRemoveConfirm.toolName.includes('telegram') ? 'T' : 'G'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate capitalize">
                  {execRemoveConfirm.toolName.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-muted truncate">{execRemoveConfirm.handle}</p>
              </div>
            </div>

            <p className="text-muted text-sm mb-5">
              This account will be unassigned from this avatar. It stays in your Empower pool and can be reassigned anytime.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setExecRemoveConfirm(null)}
                disabled={execRemoving}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] border border-card-border text-foreground font-medium px-4 py-2.5 rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecUnassignAccount}
                disabled={execRemoving}
                className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold px-4 py-2.5 rounded transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {execRemoving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Removing…
                  </>
                ) : (
                  <>
                    <Unplug size={13} />
                    Unassign
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
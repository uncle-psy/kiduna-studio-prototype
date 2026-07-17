'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useAuth } from '@/lib/auth-context'
import { checkHandleAvailability } from '@/lib/agents-api'
import {
  updateContext,
  getContextPermissions,
  publishContext as apiPublishContext,
  unpublishContext as apiUnpublishContext,
  archiveContext as apiArchiveContext,
  deleteContext as apiDeleteContext,
  type Context,
  type NestedContext,
  type VisibilityLevel,
  type ContextStatus,
  type UpdateContextParams,
  type ContextPermissions,
  type CategoryEntry,
} from '@/lib/context-api'
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  type Role,
} from '@/lib/roles-api'
import {
  fetchContextMembers,
  deleteRedemption,
  type ContextMember,
} from '@/lib/codes-api'
import ContextStatusBadge from '@/components/ContextStatusBadge'
import ContextActionMenu from '@/components/ContextActionMenu'
import ConfirmationDialog from '@/components/ConfirmationDialog'
import {
  MAIN_TYPES,
  HANDLE_RE,
  HANDLE_MAX,
  NAME_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  TAGLINE_MAX,
  validateName,
  validateHandle,
  validateDescription,
  validateTagline,
  suggestHandle,
} from '@/lib/context-constants'
import type { MainTypeId } from '@/lib/context-constants'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Presence {
  id: string
  name: string
  handle: string | null
  type: string
  status: string
  description: string | null
}

interface KnowledgeBase {
  id: string
  name: string
  namespace: string
  description: string | null
  contentType: string | null
  itemCount: number
}

interface SystemPrompt {
  id: string
  name: string
  content: string
  connectedKBId: string | null
  connectedKBName: string | null
  status: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Display Types (for available workers selection)
// ─────────────────────────────────────────────────────────────────────────────

interface WorkerDisplay {
  id: string
  name: string
  toolIds: string[]
  parentName?: string
  sourceContext?: string
  contextType?: 'context' | 'nested'
}

interface WorkerAgent {
  id: string
  name: string
  description: string | null
  tools: string[]
  parentId: string | null
  parentName?: string
  sourceContext?: string
  contextType?: 'context' | 'nested'
}

function workerToDisplay(worker: WorkerAgent): WorkerDisplay {
  return {
    id: worker.id,
    name: worker.name,
    toolIds: worker.tools,
    parentName: worker.parentName,
    sourceContext: worker.sourceContext,
    contextType: worker.contextType,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────────────────────────────────

const AGENTS_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://192.168.1.30:8000'
const ASSETS_API_URL = process.env.NEXT_PUBLIC_ASSETS_API_URL || 'http://192.168.1.30:4000/api/v1'
// Context API served by kinship-agent
const CONTEXT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL 
  ? `${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/v1`
  : 'http://192.168.1.30:8000/api/v1'

async function fetchPresences(wallet: string, presenceSubtype?: string): Promise<Presence[]> {
  try {
    let url = `${AGENTS_API_URL}/api/agents?wallet=${encodeURIComponent(wallet)}&includeWorkers=false`
    if (presenceSubtype) {
      url += `&presenceSubtype=${encodeURIComponent(presenceSubtype)}`
    }
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch presences')
    const data = await response.json()
    return (data.agents || []).filter((agent: any) => agent.type === 'PRESENCE')
  } catch {
    return []
  }
}

async function fetchPresencesByIds(ids: string[]): Promise<Presence[]> {
  if (!ids || ids.length === 0) return []
  const results: Presence[] = []
  for (const id of ids) {
    try {
      const response = await fetch(`${AGENTS_API_URL}/api/agents/${id}`)
      if (response.ok) {
        const agent = await response.json()
        if (agent && agent.type === 'PRESENCE') {
          results.push(agent)
        }
      }
    } catch {
      // Skip failed fetches
    }
  }
  return results
}

async function fetchKnowledgeBases(wallet: string): Promise<KnowledgeBase[]> {
  try {
    const response = await fetch(
      `${AGENTS_API_URL}/api/knowledge?wallet=${encodeURIComponent(wallet)}`
    )
    if (!response.ok) throw new Error('Failed to fetch knowledge bases')
    const data = await response.json()
    return data.knowledgeBases || []
  } catch {
    return []
  }
}

async function fetchKnowledgeBasesByIds(ids: string[]): Promise<KnowledgeBase[]> {
  if (!ids || ids.length === 0) return []
  const results: KnowledgeBase[] = []
  for (const id of ids) {
    try {
      const response = await fetch(`${AGENTS_API_URL}/api/knowledge/${id}`)
      if (response.ok) {
        const kb = await response.json()
        if (kb) results.push(kb)
      }
    } catch {
      // Skip failed fetches
    }
  }
  return results
}

async function fetchSystemPrompts(wallet: string): Promise<SystemPrompt[]> {
  try {
    const response = await fetch(
      `${AGENTS_API_URL}/api/prompts?wallet=${encodeURIComponent(wallet)}`
    )
    if (!response.ok) throw new Error('Failed to fetch system prompts')
    const data = await response.json()
    return (data.prompts || []).filter((p: any) => p.status === 'active')
  } catch {
    return []
  }
}

async function fetchSystemPromptsByIds(ids: string[]): Promise<SystemPrompt[]> {
  if (!ids || ids.length === 0) return []
  const results: SystemPrompt[] = []
  for (const id of ids) {
    try {
      const response = await fetch(`${AGENTS_API_URL}/api/prompts/${id}`)
      if (response.ok) {
        const prompt = await response.json()
        if (prompt) results.push(prompt)
      }
    } catch {
      // Skip failed fetches
    }
  }
  return results
}

async function fetchWorkersForPresence(presenceId: string): Promise<WorkerAgent[]> {
  try {
    const response = await fetch(`${AGENTS_API_URL}/api/agents/${presenceId}/workers`)
    if (!response.ok) return []
    const data = await response.json()
    // API returns { agents: [...], total: N } - use 'agents' not 'workers'
    return (data.agents || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      description: w.description || null,
      tools: w.tools || [],
      parentId: w.parentId || null,
    }))
  } catch {
    return []
  }
}

async function fetchWorkersForPresences(
  presenceIds: string[],
  presences: Presence[],
  sourceContext: string,
  contextType: 'context' | 'nested'
): Promise<WorkerAgent[]> {
  const allWorkers: WorkerAgent[] = []
  for (const presenceId of presenceIds) {
    const workers = await fetchWorkersForPresence(presenceId)
    const presence = presences.find((p) => p.id === presenceId)
    const parentName = presence?.name || presence?.handle || presenceId.slice(0, 8)
    workers.forEach((w) => {
      allWorkers.push({
        ...w,
        parentName,
        sourceContext,
        contextType,
      })
    })
  }
  return allWorkers
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility Badge Component
// ─────────────────────────────────────────────────────────────────────────────

function VisibilityBadge({ visibility }: { visibility: VisibilityLevel }) {
  const config = {
    public: { icon: 'lucide:globe', label: 'Public', color: 'text-green-400', bg: 'bg-green-400/15' },
    private: { icon: 'lucide:lock', label: 'Private', color: 'text-amber-400', bg: 'bg-amber-400/15' },
    secret: { icon: 'lucide:eye-off', label: 'Secret', color: 'text-red-400', bg: 'bg-red-400/15' },
  }
  const { icon, label, color, bg } = config[visibility] || config.public
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${bg} ${color} flex-shrink-0`}>
      <Icon icon={icon} width={10} height={10} />
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Select Component
// ─────────────────────────────────────────────────────────────────────────────

function MultiSelectField({
  label,
  icon,
  values,
  onChange,
  options,
  colorClass = 'accent',
}: {
  label: string
  icon: string
  values: string[]
  onChange: (values: string[]) => void
  options: { id: string; name: string }[]
  colorClass?: string
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    accent: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/20' },
    blue: { bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/20' },
    purple: { bg: 'bg-purple-400/10', text: 'text-purple-400', border: 'border-purple-400/20' },
  }
  const colors = colorMap[colorClass] || colorMap.accent

  const toggleOption = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter((v) => v !== id))
    } else {
      onChange([...values, id])
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
        <Icon icon={icon} width={14} height={14} className={colors.text} />
        {label}
      </label>
      
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {values.map((id) => {
            const opt = options.find((o) => o.id === id)
            if (!opt) return null
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.text} text-sm border ${colors.border}`}
              >
                {opt.name}
                <button
                  type="button"
                  onClick={() => toggleOption(id)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <Icon icon="lucide:x" width={12} height={12} />
                </button>
              </span>
            )
          })}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {options
          .filter((o) => !values.includes(o.id))
          .map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleOption(opt.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-muted hover:bg-white/10 hover:text-white text-sm transition-colors border border-card-border"
            >
              <Icon icon="lucide:plus" width={12} height={12} />
              {opt.name}
            </button>
          ))}
        {options.length === 0 && (
          <span className="text-muted/50 italic text-sm">No options available</span>
        )}
        {options.length > 0 && options.filter((o) => !values.includes(o.id)).length === 0 && (
          <span className="text-muted/50 italic text-sm">All selected</span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Selector Component (Card-based multi-select with primary/secondary)
// ─────────────────────────────────────────────────────────────────────────────

function CategorySelector({
  categories,
  onChange,
}: {
  categories: CategoryEntry[]
  onChange: (categories: CategoryEntry[]) => void
}) {
  const [expandedType, setExpandedType] = useState<string | null>(null)

  const selectedIds = new Set(categories.map((c) => c.mainType))
  const primaryId = categories.find((c) => c.isPrimary)?.mainType || null

  function toggleMainType(typeId: string) {
    if (selectedIds.has(typeId)) {
      const remaining = categories.filter((c) => c.mainType !== typeId)
      if (remaining.length === 0) return
      if (primaryId === typeId && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isPrimary: true }
      }
      onChange(remaining)
      if (expandedType === typeId) setExpandedType(null)
    } else {
      const isPrimary = categories.length === 0
      const entry: CategoryEntry = { mainType: typeId, subType: null, isPrimary }
      onChange([...categories, entry])
      setExpandedType(typeId)
    }
  }

  function makePrimary(typeId: string) {
    onChange(categories.map((c) => ({ ...c, isPrimary: c.mainType === typeId })))
  }

  function toggleSubType(mainTypeId: string, subTypeId: string) {
    onChange(categories.map((c) =>
      c.mainType === mainTypeId ? { ...c, subType: c.subType === subTypeId ? null : subTypeId } : c
    ))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        Categories <span className="text-accent">*</span>
        <span className="text-muted font-normal ml-2 text-xs">Select one or more</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {MAIN_TYPES.map((type) => {
          const isSelected = selectedIds.has(type.id)
          const isPrimary = primaryId === type.id
          const isSecondary = isSelected && !isPrimary
          const isExpanded = expandedType === type.id
          const entry = categories.find((c) => c.mainType === type.id)
          return (
            <div key={type.id} className={isExpanded ? 'col-span-2' : ''}>
              <button
                type="button"
                onClick={() => { if (isSelected) { if (isExpanded) setExpandedType(null); else setExpandedType(type.id) } else { toggleMainType(type.id) } }}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all relative ${
                  isPrimary ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                    : isSecondary ? 'border-accent/40 bg-accent/5'
                      : 'border-card-border hover:border-white/30 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-foreground' : 'text-muted'}`}>{type.label}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isPrimary && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent">Primary</span>}
                    {isSecondary && <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-muted">2nd</span>}
                    {isSelected && <Icon icon="lucide:check" width={14} height={14} className="text-accent" />}
                  </div>
                </div>
              </button>
              {isSelected && isExpanded && (
                <div className="mt-2 ml-1 mb-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {!isPrimary && <button type="button" onClick={() => makePrimary(type.id)} className="text-[10px] text-accent hover:underline">Make primary</button>}
                    {categories.length > 1 && <button type="button" onClick={() => toggleMainType(type.id)} className="text-[10px] text-red-400 hover:underline">Remove</button>}
                  </div>
                  {type.subTypes.length > 0 && (
                    <div>
                      <span className="block text-[10px] font-medium text-muted mb-1">Sub type (optional)</span>
                      <div className="flex flex-wrap gap-1.5">
                        {type.subTypes.map((st) => (
                          <button key={st.id} type="button" onClick={() => toggleSubType(type.id, st.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                              entry?.subType === st.id ? 'border-accent bg-accent/15 text-accent' : 'border-card-border text-muted hover:border-white/30 hover:text-foreground'
                            }`}>{st.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Display Field Component (for view mode)
// ─────────────────────────────────────────────────────────────────────────────

function DisplayField({ 
  label, 
  icon, 
  children,
  colorClass = 'amber',
}: { 
  label: string
  icon: string
  children: React.ReactNode
  colorClass?: string
}) {
  const colors: Record<string, string> = {
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
  }
  
  return (
    <div className="py-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon icon={icon} width={14} height={14} className={colors[colorClass] || colors.amber} />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-white">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ContextDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const contextId = typeof params?.platformId === 'string' 
    ? params.platformId 
    : Array.isArray(params?.platformId) 
      ? params.platformId[0] 
      : null

  // Data states
  const [context, setContext] = useState<Context | null>(null)
  const [nestedContexts, setNestedContexts] = useState<NestedContext[]>([])
  const [presences, setPresences] = useState<Presence[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [auxiliaryLoading, setAuxiliaryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Permissions state - fetched from API
  const [permissions, setPermissions] = useState<ContextPermissions>({
    isOwner: false,
    canEdit: false,
    canDelete: false,
  })

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form states
  const [editName, setEditName] = useState('')
  const [editHandle, setEditHandle] = useState('')
  const [editCategories, setEditCategories] = useState<CategoryEntry[]>([])
  const [editDescription, setEditDescription] = useState('')
  const [editTagline, setEditTagline] = useState('')
  const [editPresenceIds, setEditPresenceIds] = useState<string[]>([])
  const [editVisibility, setEditVisibility] = useState<VisibilityLevel>('public')
  const [editKnowledgeBaseIds, setEditKnowledgeBaseIds] = useState<string[]>([])
  const [editInstructionIds, setEditInstructionIds] = useState<string[]>([])

  // Handle availability state
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [handleSuggestion, setHandleSuggestion] = useState<string | null>(null)
  const [handleChecking, setHandleChecking] = useState(false)
  const handleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCheckVersion = useRef(0)

  // Validation touched states
  const [nameTouched, setNameTouched] = useState(false)
  const [handleTouched, setHandleTouched] = useState(false)
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [taglineTouched, setTaglineTouched] = useState(false)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string; danger: boolean; loading: boolean; onConfirm: () => void
  }>({ open: false, title: '', message: '', confirmLabel: '', danger: false, loading: false, onConfirm: () => {} })

  // Roles state (user-created roles from selected Worker Agents)
  const [roles, setRoles] = useState<Role[]>([])
  const [availableWorkers, setAvailableWorkers] = useState<WorkerDisplay[]>([]) // Workers available to add as roles
  const [workersLoading, setWorkersLoading] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleSaving, setRoleSaving] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [roleFormOpen, setRoleFormOpen] = useState(false)
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null)
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]) // For selecting workers to add (multi-select)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]) // Permissions for the role being created/edited

  // Members state
  const [members, setMembers] = useState<ContextMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersTotal, setMembersTotal] = useState(0)
  const [memberToRemove, setMemberToRemove] = useState<ContextMember | null>(null)
  const [removingMember, setRemovingMember] = useState(false)

  // Debounced handle availability check
  function scheduleHandleCheck(h: string) {
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current)
    setHandleAvailable(null)
    setHandleSuggestion(null)

    // Skip if handle matches the current saved value (unchanged = already theirs)
    if (context && h.toLowerCase() === (context.handle || '').toLowerCase()) {
      setHandleAvailable(true)
      setHandleChecking(false)
      return
    }

    if (!h || validateHandle(h)) {
      setHandleChecking(false)
      return
    }

    setHandleChecking(true)
    const version = ++handleCheckVersion.current

    handleCheckTimer.current = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(h, 'movement')
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

  // Compute validation errors
  const nameError = nameTouched ? validateName(editName) : null
  const handleFormatError = handleTouched ? validateHandle(editHandle) : null
  const handleAvailError =
    editHandle && !handleFormatError && handleAvailable === false
      ? `@${editHandle} is already taken`
      : null
  const handleError = handleFormatError || handleAvailError
  const descriptionError = descriptionTouched ? validateDescription(editDescription) : null
  const taglineError = taglineTouched ? validateTagline(editTagline) : null

  // Check if form is valid — matches creation modal requirements
  const isFormValid = 
    editName.trim() &&
    editHandle.trim() &&
    !validateName(editName) &&
    !validateHandle(editHandle) &&
    handleAvailable === true &&
    !handleChecking &&
    editCategories.length > 0 &&
    editCategories.some(c => c.isPrimary) &&
    !validateDescription(editDescription) &&
    !validateTagline(editTagline) &&
    editPresenceIds.length > 0

  // Handle name change with auto-generate handle
  const onNameChange = (val: string) => {
    setEditName(val)
    setNameTouched(true)
    if (!handleTouched) {
      const suggested = suggestHandle(val)
      setEditHandle(suggested)
      scheduleHandleCheck(suggested)
    }
  }

  // Handle handle change
  const onHandleChange = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, HANDLE_MAX)
    setEditHandle(cleaned)
    setHandleTouched(true)
    if (cleaned) {
      scheduleHandleCheck(cleaned)
    } else {
      setHandleAvailable(null)
      setHandleSuggestion(null)
      setHandleChecking(false)
    }
  }

  function acceptHandleSuggestion() {
    if (handleSuggestion) {
      setEditHandle(handleSuggestion)
      setHandleTouched(true)
      setHandleSuggestion(null)
      scheduleHandleCheck(handleSuggestion)
    }
  }

  // ── Roles Management ──
  
  // Group workers by context type (context = top-level, nested = nested context)
  // All workers are always available - same worker can be used for multiple roles
  const contextWorkers = availableWorkers.filter((w) => w.contextType === 'context')
  const nestedWorkers = availableWorkers.filter((w) => w.contextType === 'nested')
  
  // Get unique nested context names for grouping
  const nestedContextNames = [...new Set(nestedWorkers.map((w) => w.sourceContext).filter(Boolean))] as string[]

  // Toggle worker selection (multi-select)
  function handleSelectWorker(workerId: string) {
    setSelectedWorkerIds((prev) => 
      prev.includes(workerId) 
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    )
  }

  async function handleAddWorkerAsRole() {
    if (selectedWorkerIds.length === 0 || !newRoleName.trim() || !contextId || !user?.wallet) return
    
    setRoleSaving(true)
    setRoleError(null)
    
    try {
      const newRole = await createRole({
        contextId,
        workerIds: selectedWorkerIds,
        name: newRoleName.trim(),
        permissions: selectedPermissions,
        wallet: user.wallet,
        createdBy: user.wallet,
      })
      
      if (newRole) {
        setRoles((prev) => [...prev, newRole])
      }
      
      setSelectedWorkerIds([])
      setSelectedPermissions([])
      setNewRoleName('')
      setRoleFormOpen(false)
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Failed to create role')
    } finally {
      setRoleSaving(false)
    }
  }

  async function handleDeleteRole(roleId: string) {
    setRoleError(null)
    
    const success = await deleteRole(roleId)
    if (success) {
      setRoles((prev) => prev.filter((r) => r.id !== roleId))
      if (editingRoleId === roleId) {
        setEditingRoleId(null)
        setNewRoleName('')
        setSelectedWorkerIds([])
        setRoleFormOpen(false)
      }
      if (expandedRoleId === roleId) setExpandedRoleId(null)
    } else {
      setRoleError('Failed to delete role')
    }
  }

  function handleEditRole(roleId: string) {
    const role = roles.find((r) => r.id === roleId)
    if (!role) return
    setEditingRoleId(roleId)
    setNewRoleName(role.name)
    setSelectedWorkerIds(role.workerIds) // Pre-select the workers used for this role
    setSelectedPermissions(role.permissions || []) // Pre-select the permissions
    setRoleFormOpen(true)
  }

  async function handleUpdateRole() {
    if (!editingRoleId || !newRoleName.trim() || selectedWorkerIds.length === 0) return
    
    setRoleSaving(true)
    setRoleError(null)
    
    try {
      const updatedRole = await updateRole(editingRoleId, {
        name: newRoleName.trim(),
        workerIds: selectedWorkerIds,
        permissions: selectedPermissions,
      })
      
      if (updatedRole) {
        setRoles((prev) =>
          prev.map((r) => r.id === editingRoleId ? updatedRole : r)
        )
      }
      
      setEditingRoleId(null)
      setNewRoleName('')
      setSelectedWorkerIds([])
      setSelectedPermissions([])
      setRoleFormOpen(false)
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setRoleSaving(false)
    }
  }

  function handleCancelRoleEdit() {
    setEditingRoleId(null)
    setNewRoleName('')
    setSelectedWorkerIds([])
    setSelectedPermissions([])
    setRoleFormOpen(false)
    setRoleError(null)
  }

  const loadData = useCallback(async () => {
    if (!contextId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      
      // Fetch context from kinship-agent
      const contextResponse = await fetch(
        `${CONTEXT_API_URL}/context/${contextId}`,
        { signal: controller.signal }
      )
      clearTimeout(timeout)
      
      if (!contextResponse.ok) {
        throw new Error(`Failed to load context: ${contextResponse.status}`)
      }
      
      const contextRaw = await contextResponse.json()
      const contextData: Context = {
        id: contextRaw.id,
        name: contextRaw.name,
        slug: contextRaw.slug,
        handle: contextRaw.handle,
        categories: (contextRaw.context_categories || []).map((c: any) => ({ mainType: c.mainType, subType: c.subType || null, isPrimary: !!c.isPrimary })),
        description: contextRaw.description || '',
        tagline: contextRaw.tagline || null,
        icon: contextRaw.icon || '',
        color: contextRaw.color || '',
        presenceIds: contextRaw.presence_ids || [],
        visibility: contextRaw.visibility || 'public',
        knowledgeBaseIds: contextRaw.knowledge_base_ids || [],
        instructionIds: contextRaw.instruction_ids || [],
        instructions: contextRaw.instructions || '',
        status: contextRaw.status || 'draft',
        isPrimary: !!contextRaw.is_primary,
        createdBy: contextRaw.created_by,
        createdAt: contextRaw.created_at,
        updatedAt: contextRaw.updated_at,
        assetsCount: contextRaw.assets_count || 0,
        gamesCount: contextRaw.games_count || 0,
        nestedContextsCount: contextRaw.nested_contexts_count || 0,
      }
      
      setContext(contextData)
      
      // Fetch permissions for this context
      if (user?.wallet) {
        const perms = await getContextPermissions(user.wallet, contextId)
        if (perms) {
          setPermissions(perms)
        } else {
          // Fallback: check if user is the owner
          const isOwner = contextData.createdBy === user.wallet
          setPermissions({
            isOwner,
            canEdit: isOwner,
            canDelete: isOwner,
          })
        }
      }
      
      setEditName(contextData.name || '')
      setEditHandle(contextData.handle || '')
      setEditCategories(contextData.categories || [])
      setEditDescription(contextData.description || '')
      setEditTagline(contextData.tagline || '')
      setEditPresenceIds(contextData.presenceIds || [])
      setEditVisibility(contextData.visibility || 'public')
      setEditKnowledgeBaseIds(contextData.knowledgeBaseIds || [])
      setEditInstructionIds(contextData.instructionIds || [])
      setNameTouched(false)
      setHandleTouched(!!contextData.handle)
      setHandleAvailable(contextData.handle ? true : null)
      setDescriptionTouched(false)
      
      setLoading(false)
      
      // Load nested contexts
      let loadedNestedContexts: NestedContext[] = []
      try {
        const nestedRes = await fetch(`${CONTEXT_API_URL}/context/${contextId}/nested`)
        if (nestedRes.ok) {
          const nestedData = await nestedRes.json()
          loadedNestedContexts = (nestedData || []).map((nc: any) => ({
            id: nc.id,
            contextId: nc.context_id,
            name: nc.name,
            slug: nc.slug,
            handle: nc.handle,
            description: nc.description || '',
            icon: nc.icon || '',
            color: nc.color || '',
            presenceIds: nc.presence_ids || [],
            visibility: nc.visibility || 'public',
            knowledgeBaseIds: nc.knowledge_base_ids || [],
            gatheringIds: nc.gathering_ids || [],
            instructionIds: nc.instruction_ids || [],
            instructions: nc.instructions || '',
            status: nc.status || 'draft',
            createdBy: nc.created_by,
            createdAt: nc.created_at,
            updatedAt: nc.updated_at,
            assetsCount: nc.assets_count || 0,
            gamesCount: nc.games_count || 0,
          }))
          setNestedContexts(loadedNestedContexts)
        }
      } catch (err) {
        console.error('Error loading nested contexts:', err)
        setNestedContexts([])
      }
      
      // Load auxiliary data (presences, KBs, prompts)
      if (user?.wallet) {
        setAuxiliaryLoading(true)
        try {
          const isOwner = contextData.createdBy === user.wallet
          
          let allPresences: Presence[]
          let kbData: KnowledgeBase[]
          let promptData: SystemPrompt[]
          
          if (isOwner) {
            // Owner sees everything they own
            const [pd, kd, prd] = await Promise.all([
              fetchPresences(user.wallet, 'movement'),
              fetchKnowledgeBases(user.wallet),
              fetchSystemPrompts(user.wallet),
            ])
            allPresences = pd
            kbData = kd
            promptData = prd
          } else {
            // Redeemed user sees only context-specific items
            const [pd, kd, prd] = await Promise.all([
              fetchPresencesByIds(contextData.presenceIds || []),
              fetchKnowledgeBasesByIds(contextData.knowledgeBaseIds || []),
              fetchSystemPromptsByIds(contextData.instructionIds || []),
            ])
            allPresences = pd
            kbData = kd
            promptData = prd
          }
          
          setPresences(allPresences)
          setKnowledgeBases(kbData)
          setSystemPrompts(promptData)
          setAuxiliaryLoading(false)
          
          // Fetch roles from API
          setRolesLoading(true)
          try {
            const rolesData = await fetchRoles(contextId)
            setRoles(rolesData)
          } catch (err) {
            console.error('Error loading roles:', err)
          } finally {
            setRolesLoading(false)
          }
          
          // Now fetch workers from all presences (context + nested contexts)
          setWorkersLoading(true)
          try {
            let allWorkers: WorkerAgent[] = []
            
            // Fetch workers for context presences
            if (contextData.presenceIds && contextData.presenceIds.length > 0) {
              console.log('Fetching workers for context presences:', contextData.presenceIds)
              const contextWorkersData = await fetchWorkersForPresences(
                contextData.presenceIds,
                allPresences,
                contextData.name || 'Box',
                'context'
              )
              console.log('Context workers found:', contextWorkersData.length)
              allWorkers = [...allWorkers, ...contextWorkersData]
            }
            
            // Fetch workers for each nested context's presences
            for (const nc of loadedNestedContexts) {
              if (nc.presenceIds && nc.presenceIds.length > 0) {
                console.log('Fetching workers for nested context presences:', nc.name, nc.presenceIds)
                const ncWorkers = await fetchWorkersForPresences(
                  nc.presenceIds,
                  allPresences,
                  nc.name || 'Nested Box',
                  'nested'
                )
                console.log('Nested context workers found:', ncWorkers.length)
                allWorkers = [...allWorkers, ...ncWorkers]
              }
            }
            
            console.log('Total workers found:', allWorkers.length)
            setAvailableWorkers(allWorkers.map(workerToDisplay))
          } catch (err) {
            console.error('Error loading workers:', err)
          } finally {
            setWorkersLoading(false)
          }
        } catch (err) {
          console.error('Error loading auxiliary data:', err)
          setAuxiliaryLoading(false)
        }
      }
      
    } catch (err) {
      console.error('Error loading context:', err)
      setError(err instanceof Error ? err.message : 'Failed to load box')
      setLoading(false)
    }
  }, [contextId, user?.wallet])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!contextId) {
      const timeout = setTimeout(() => {
        if (!contextId) {
          setError('No box ID provided')
          setLoading(false)
        }
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [contextId])

  // Fetch members for this context
  useEffect(() => {
    if (!contextId) return
    setMembersLoading(true)
    fetchContextMembers(contextId)
      .then((data) => {
        setMembers(data.members)
        setMembersTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setMembersLoading(false))
  }, [contextId])

  async function handleRemoveMember() {
    if (!memberToRemove) return
    setRemovingMember(true)
    try {
      await deleteRedemption(memberToRemove.id)
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id))
      setMembersTotal((prev) => Math.max(0, prev - 1))
      setMemberToRemove(null)
    } catch (err) {
      console.error('Failed to remove member:', err)
    } finally {
      setRemovingMember(false)
    }
  }

  /** Re-fetch available workers based on current presenceIds */
  async function refreshWorkers(contextPresenceIds: string[], ncs: typeof nestedContexts) {
    setWorkersLoading(true)
    try {
      let allWorkers: WorkerAgent[] = []
      if (contextPresenceIds.length > 0) {
        const contextWorkersData = await fetchWorkersForPresences(
          contextPresenceIds, presences, context?.name || 'Box', 'context'
        )
        allWorkers = [...allWorkers, ...contextWorkersData]
      }
      for (const nc of ncs) {
        if (nc.presenceIds && nc.presenceIds.length > 0) {
          const ncWorkers = await fetchWorkersForPresences(
            nc.presenceIds, presences, nc.name || 'Nested Box', 'nested'
          )
          allWorkers = [...allWorkers, ...ncWorkers]
        }
      }
      setAvailableWorkers(allWorkers.map(workerToDisplay))
    } catch (err) {
      console.error('Error refreshing workers:', err)
    } finally {
      setWorkersLoading(false)
    }
  }

  // Re-fetch workers when presences change during editing
  useEffect(() => {
    if (!isEditing || presences.length === 0) return
    refreshWorkers(editPresenceIds, nestedContexts)
  }, [editPresenceIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!context) return
    
    setNameTouched(true)
    setHandleTouched(true)
    setDescriptionTouched(true)
    setTaglineTouched(true)
    
    // Compute final context type
    if (!isFormValid) return
    
    setSaving(true)
    setSaveError(null)
    try {
      const params: UpdateContextParams = {
        name: editName.trim(),
        handle: editHandle.trim(),
        categories: editCategories,
        description: editDescription.trim(),
        tagline: editTagline.trim() || undefined,
        visibility: editVisibility,
        presenceIds: editPresenceIds,
        knowledgeBaseIds: editKnowledgeBaseIds,
        instructionIds: editInstructionIds,
      }
      const updated = await updateContext(context.id, params)
      setContext(updated)
      setIsEditing(false)
      // Re-fetch workers based on updated presenceIds
      await refreshWorkers(updated.presenceIds || [], nestedContexts)
    } catch (err) {
      const message = (err as Error).message
      if (message.toLowerCase().includes('handle') && message.toLowerCase().includes('taken')) {
        setHandleAvailable(false)
        setHandleSuggestion(null)
        setSaveError(`The handle @${editHandle} was claimed. Please pick a new one.`)
        scheduleHandleCheck(editHandle)
      } else {
        setSaveError(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (context) {
      setEditName(context.name || '')
      setEditHandle(context.handle || '')
      setEditCategories(context.categories || [])
      setEditDescription(context.description || '')
      setEditTagline(context.tagline || '')
      setEditPresenceIds(context.presenceIds || [])
      setEditVisibility(context.visibility || 'public')
      setEditKnowledgeBaseIds(context.knowledgeBaseIds || [])
      setEditInstructionIds(context.instructionIds || [])
      setNameTouched(false)
      setHandleTouched(!!context.handle)
      setHandleAvailable(context.handle ? true : null)
      setHandleSuggestion(null)
      setHandleChecking(false)
      setDescriptionTouched(false)
    }
    setIsEditing(false)
    setSaveError(null)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <Icon icon="lucide:loader-2" width={40} height={40} className="mx-auto mb-4 text-accent animate-spin" />
          <p className="text-muted">Loading box details…</p>
        </div>
      </div>
    )
  }

  if (error || !context) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-red-400/15 flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:alert-circle" width={32} height={32} className="text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Failed to load box</h3>
          <p className="text-muted mb-6">{error || 'Box not found'}</p>
          <button onClick={() => router.push('/context')} className="inline-flex items-center gap-2 text-accent hover:underline">
            <Icon icon="lucide:arrow-left" width={16} height={16} />
            Back to Box
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-8">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={() => router.push('/context')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Icon icon="lucide:arrow-left" width={18} height={18} className="text-white" />
          </button>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 border border-amber-400/20">
              <Icon icon="lucide:building-2" width={22} height={22} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{context.name}</h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                {context.handle && <span className="text-sm text-muted">@{context.handle}</span>}
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-400">Box</span>
                <VisibilityBadge visibility={context.visibility} />
                <ContextStatusBadge status={context.status} size="md" />
                {context.isPrimary && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-400 flex items-center gap-1">
                    <Icon icon="lucide:pin" width={10} height={10} />
                    Primary
                  </span>
                )}
                {permissions.isOwner ? (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1">
                    <Icon icon="lucide:user" width={10} height={10} />
                    Owner
                  </span>
                ) : permissions.canEdit ? (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                    <Icon icon="lucide:edit" width={10} height={10} />
                    Editor
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 flex items-center gap-1">
                    <Icon icon="lucide:eye" width={10} height={10} />
                    Viewer
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {isEditing ? (
            <>
              <button onClick={handleCancel} disabled={saving} className="px-4 py-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors font-medium text-sm">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isFormValid}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {saving && <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" />}
                Save Changes
              </button>
            </>
          ) : permissions.canEdit ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors flex items-center gap-2 border border-card-border text-xs"
              >
                <Icon icon="lucide:pencil" width={14} height={14} />
                Edit Box
              </button>
              <ContextActionMenu
                status={context.status}
                canEdit={permissions.canEdit}
                canDelete={permissions.canDelete}
                onPublish={async () => { try { const u = await apiPublishContext(context.id); setContext(u) } catch (e) { console.error(e) } }}
                onUnpublish={async () => { try { const u = await apiUnpublishContext(context.id); setContext(u) } catch (e) { console.error(e) } }}
                onArchive={() => setConfirmDialog({ open: true, title: 'Archive Kiduna', message: `Archive "${context.name}"? It will be hidden but can be restored later.`, confirmLabel: 'Archive', danger: false, loading: false, onConfirm: async () => { setConfirmDialog(p => ({...p, loading: true})); try { const u = await apiArchiveContext(context.id); setContext(u) } catch(e) { console.error(e) } finally { setConfirmDialog(p => ({...p, open: false, loading: false})) } } })}
                onRestore={async () => { try { const u = await apiUnpublishContext(context.id); setContext(u) } catch (e) { console.error(e) } }}
                onDelete={() => setConfirmDialog({ open: true, title: 'Delete Kiduna', message: `Permanently delete "${context.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true, loading: false, onConfirm: async () => { setConfirmDialog(p => ({...p, loading: true})); try { await apiDeleteContext(context.id); router.push('/context') } catch(e) { console.error(e) } finally { setConfirmDialog(p => ({...p, open: false, loading: false})) } } })}
              />
            </>
          ) : null}
        </div>
      </div>

      {saveError && (
        <div className="mb-6 p-4 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 flex items-center gap-3">
          <Icon icon="lucide:alert-circle" width={20} height={20} />
          <span>{saveError}</span>
        </div>
      )}

      {/* Primary Movement Toggle (wizard only) */}
      {user?.role === 'wizard' && (
        <div className="mb-6 flex items-center justify-between p-4 rounded-2xl bg-card border border-card-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center">
              <Icon icon="lucide:pin" width={20} height={20} className="text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Primary Movement</div>
              <div className="text-xs text-muted">This movement appears first in the chat list for all users</div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const prev = context
              const newVal = !context.isPrimary
              // Optimistic: flip UI immediately
              setContext({ ...context, isPrimary: newVal })
              try {
                const updated = await updateContext(context.id, { isPrimary: newVal })
                if (updated) setContext(updated)
              } catch (e) {
                // Revert on failure
                setContext(prev)
                console.error('Failed to update primary:', e)
              }
            }}
            style={{
              position: 'relative',
              width: 44,
              height: 24,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              backgroundColor: context.isPrimary ? '#fbbf24' : 'rgba(255,255,255,0.1)',
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
                transform: context.isPrimary ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {/* Box Details Card */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-card-border bg-white/[0.02]">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Icon icon="lucide:info" width={18} height={18} className="text-amber-400" />
              Box Details
            </h2>
          </div>
          
          <div className="p-4 sm:p-6">
            {isEditing ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Basic Information</div>
                  
                  {/* Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-foreground">Box Name <span className="text-accent">*</span></label>
                      <span className={`text-xs tabular-nums ${nameError ? 'text-red-400' : 'text-muted'}`}>{editName.length}/{NAME_MAX}</span>
                    </div>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => onNameChange(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                      placeholder="e.g. Kinship Health, Acme Corp..."
                      maxLength={NAME_MAX}
                      className={`w-full bg-input border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${nameError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'}`}
                    />
                    {nameError && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><Icon icon="lucide:alert-circle" width={12} height={12} />{nameError}</p>}
                  </div>

                  {/* Handle */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Handle <span className="text-accent">*</span><span className="text-muted font-normal ml-1">(unique · max {HANDLE_MAX})</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm select-none">@</span>
                      <input
                        type="text"
                        value={editHandle}
                        onChange={(e) => onHandleChange(e.target.value)}
                        onBlur={() => setHandleTouched(true)}
                        placeholder="kinship_health"
                        maxLength={HANDLE_MAX}
                        className={`w-full bg-input border rounded-xl pl-8 pr-14 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${handleError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'}`}
                      />
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs tabular-nums ${handleError ? 'text-red-400' : 'text-muted'}`}>{editHandle.length}/{HANDLE_MAX}</span>
                    </div>
                    {handleError && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><Icon icon="lucide:alert-circle" width={12} height={12} />{handleError}</p>}
                  </div>

                  {/* Categories */}
                  <CategorySelector
                    categories={editCategories}
                    onChange={setEditCategories}
                  />
                  {editCategories.length === 0 && (
                    <p className="text-xs text-red-400 -mt-3 flex items-center gap-1"><Icon icon="lucide:alert-circle" width={12} height={12} />At least one category is required</p>
                  )}
                  {editCategories.length > 0 && !editCategories.some(c => c.isPrimary) && (
                    <p className="text-xs text-amber-400 -mt-3 flex items-center gap-1"><Icon icon="lucide:alert-triangle" width={12} height={12} />Please select a primary category</p>
                  )}

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-foreground">Description</label>
                      <span className={`text-xs tabular-nums ${descriptionError ? 'text-red-400' : 'text-muted'}`}>{editDescription.length}/{DESCRIPTION_MAX}</span>
                    </div>
                    <textarea
                      value={editDescription}
                      onChange={(e) => { setEditDescription(e.target.value); setDescriptionTouched(true) }}
                      onBlur={() => setDescriptionTouched(true)}
                      placeholder="Describe this kiduna — its purpose, goals, and community. Minimum 50 characters."
                      rows={3}
                      maxLength={DESCRIPTION_MAX}
                      className={`w-full bg-input border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none text-sm resize-none transition-colors ${descriptionError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'}`}
                    />
                    {descriptionError && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><Icon icon="lucide:alert-circle" width={12} height={12} />{descriptionError}</p>}
                  </div>

                  {/* Tagline */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-foreground">Tagline <span className="text-muted font-normal">(optional)</span></label>
                      <span className={`text-xs tabular-nums ${taglineError ? 'text-red-400' : 'text-muted'}`}>{editTagline.length}/{TAGLINE_MAX}</span>
                    </div>
                    <input
                      type="text"
                      value={editTagline}
                      onChange={(e) => { setEditTagline(e.target.value); setTaglineTouched(true) }}
                      onBlur={() => setTaglineTouched(true)}
                      placeholder="A short tagline for your kiduna"
                      maxLength={TAGLINE_MAX}
                      className={`w-full bg-input border rounded-xl px-4 pr-20 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${taglineError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'}`}
                    />
                    {taglineError && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><Icon icon="lucide:alert-circle" width={12} height={12} />{taglineError}</p>}
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Visibility</label>
                    <div className="flex gap-2">
                      {(['public', 'private', 'secret'] as const).map((v) => (
                        <button key={v} type="button" onClick={() => setEditVisibility(v)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors border ${
                            editVisibility === v
                              ? 'border-accent/40 bg-accent/10 text-accent'
                              : 'border-card-border bg-white/[0.02] text-muted hover:bg-white/[0.04]'
                          }`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Agent Configuration</div>
                  <MultiSelectField 
                    label="Avatars" 
                    icon="lucide:bot" 
                    values={editPresenceIds} 
                    onChange={setEditPresenceIds} 
                    options={presences.map(p => ({ id: p.id, name: p.name + (p.handle ? ` (@${p.handle})` : '') }))} 
                    colorClass="accent" 
                  />
                  {editPresenceIds.length === 0 && (
                    <p className="text-xs text-red-400 -mt-3 flex items-center gap-1"><Icon icon="lucide:alert-circle" width={12} height={12} />At least one avatar is required</p>
                  )}
                </div>

                {/* Roles Section */}
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Roles</div>
                  <div className="bg-white/[0.02] border border-card-border rounded-xl p-4">
                    <p className="text-xs text-muted mb-4">
                      Define roles by selecting Worker Agents. Each role groups workers for specific responsibilities.
                      {roles.length > 0 && (
                        <span className="ml-1 text-accent/70 font-medium">
                          {roles.length} role{roles.length !== 1 ? 's' : ''} created.
                        </span>
                      )}
                    </p>

                    {/* Existing roles list */}
                    {rolesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Icon icon="lucide:loader-2" width={20} height={20} className="text-muted animate-spin" />
                        <span className="text-sm text-muted ml-2">Loading roles...</span>
                      </div>
                    ) : roles.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {roles.map((role) => {
                          const isExpanded = expandedRoleId === role.id
                          return (
                            <div
                              key={role.id}
                              className="bg-white/[0.025] border border-card-border rounded-xl overflow-hidden transition-colors hover:border-white/[0.12]"
                            >
                              <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                                <button
                                  onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-accent/12 flex items-center justify-center shrink-0">
                                    <Icon icon="lucide:waypoints" width={13} height={13} className="text-accent" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-white truncate">{role.name}</span>
                                      {role.permissions && role.permissions.length > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 border border-emerald-400/20">
                                          <Icon icon="lucide:shield-check" width={9} height={9} />
                                          {role.permissions.length}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[11px] text-muted/60">
                                        {role.workers.length} worker{role.workers.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  </div>
                                  <Icon icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"} width={13} height={13} className="text-muted/50 shrink-0" />
                                </button>
                                {permissions.canEdit && (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button onClick={() => handleEditRole(role.id)} title="Edit role" className="text-muted/50 hover:text-accent transition-colors p-1.5 rounded-lg hover:bg-white/[0.04]">
                                      <Icon icon="lucide:pencil" width={12} height={12} />
                                    </button>
                                    <button onClick={() => handleDeleteRole(role.id)} title="Delete role" className="text-muted/50 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/[0.06]">
                                      <Icon icon="lucide:trash-2" width={12} height={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              {isExpanded && (
                                <div className="px-3.5 pb-3 pt-0">
                                  <div className="border-t border-card-border pt-2.5 space-y-3">
                                    {/* Workers */}
                                    <div>
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/50 block mb-1.5">Workers</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {role.workers.map((worker) => (
                                          <span key={worker.id} className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-400/8 text-blue-400/80 border border-blue-400/15 px-2 py-1 rounded-lg">
                                            <Icon icon="lucide:bot" width={10} height={10} />
                                            {worker.name}
                                          </span>
                                        ))}
                                        {role.workers.length === 0 && (
                                          <span className="text-[11px] text-muted/50 italic">No workers</span>
                                        )}
                                      </div>
                                    </div>
                                    {/* Permissions */}
                                    <div>
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/50 block mb-1.5">Permissions</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {role.permissions && role.permissions.length > 0 ? (
                                          role.permissions.map((perm) => (
                                            <span key={perm} className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-1 rounded-lg capitalize">
                                              <Icon icon={perm === 'invite' ? 'lucide:user-plus' : 'lucide:shield'} width={10} height={10} />
                                              {perm}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[11px] text-muted/50 italic">No permissions</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : null}

                    {/* Empty state */}
                    {!rolesLoading && roles.length === 0 && !roleFormOpen && (
                      <div className="text-center py-5 border border-dashed border-card-border rounded-xl mb-4">
                        <Icon icon="lucide:layers" width={22} height={22} className="text-muted/30 mx-auto mb-2" />
                        <p className="text-xs text-muted/50">
                          {permissions.canEdit ? 'No roles yet. Create one to get started.' : 'No roles defined for this box.'}
                        </p>
                      </div>
                    )}

                    {/* Add role trigger - only show if user can edit */}
                    {!roleFormOpen && permissions.canEdit && (
                      <button
                        onClick={() => { setRoleFormOpen(true); setEditingRoleId(null); setNewRoleName(''); setSelectedWorkerIds([]); setSelectedPermissions([]) }}
                        className="w-full bg-accent/8 hover:bg-accent/15 border border-accent/20 hover:border-accent/35 text-accent font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Icon icon="lucide:plus" width={14} height={14} />
                        Add New Role
                      </button>
                    )}

                    {/* Role builder form */}
                    {roleFormOpen && (
                      <div className="border border-accent/20 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-accent/[0.04] border-b border-accent/15">
                          <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
                            <Icon icon="lucide:waypoints" width={12} height={12} />
                            {editingRoleId ? 'Edit Role' : 'Add Role'}
                          </span>
                          <button onClick={handleCancelRoleEdit} className="text-muted/50 hover:text-white transition-colors p-0.5 rounded">
                            <Icon icon="lucide:x" width={13} height={13} />
                          </button>
                        </div>
                        <div className="p-3.5 space-y-3.5">
                          {/* Role Name - shown first */}
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted/60 mb-1.5 block">Role Name</label>
                            <input
                              type="text"
                              value={newRoleName}
                              onChange={(e) => setNewRoleName(e.target.value)}
                              placeholder="Enter role name..."
                              autoFocus
                              className="w-full bg-input border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors"
                            />
                          </div>

                          {/* Select Worker Agent - shown after name */}
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted/60 mb-1.5 block">
                              Select Worker Agents
                              {selectedWorkerIds.length > 0 && (
                                <span className="ml-2 text-accent/70 normal-case font-normal">
                                  ({selectedWorkerIds.length} selected)
                                </span>
                              )}
                            </label>
                            {workersLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Icon icon="lucide:loader-2" width={20} height={20} className="text-muted animate-spin" />
                                <span className="text-sm text-muted ml-2">Loading available workers...</span>
                              </div>
                            ) : availableWorkers.length > 0 ? (
                              <div className="max-h-[280px] overflow-y-auto pr-0.5 overscroll-contain space-y-3" style={{ scrollbarWidth: 'thin' }}>
                                {/* Box Workers (Top-level Box) */}
                                {contextWorkers.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                      <Icon icon="lucide:layout-grid" width={12} height={12} className="text-blue-400" />
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400/80">Top-level Box</span>
                                      <span className="text-[10px] text-muted/50">({contextWorkers.length})</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {contextWorkers.map((worker) => {
                                        const isSelected = selectedWorkerIds.includes(worker.id)
                                        return (
                                          <button
                                            key={worker.id}
                                            onClick={() => handleSelectWorker(worker.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${isSelected ? 'bg-accent/15 border border-accent/30' : 'bg-white/[0.025] border border-card-border hover:bg-white/[0.05] hover:border-white/[0.12]'}`}
                                          >
                                            <div className="flex items-center gap-2.5">
                                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent/20' : 'bg-blue-400/10'}`}>
                                                <Icon icon="lucide:waypoints" width={12} height={12} className={isSelected ? 'text-accent' : 'text-blue-400'} />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                {worker.parentName && (
                                                  <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-[10px] font-medium text-muted/70 uppercase tracking-wider">Presence Name</span>
                                                    <span className="text-[10px] text-muted/40">—</span>
                                                    <span className="text-[11px] font-medium text-blue-400/80">{worker.parentName}</span>
                                                  </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-foreground/80'}`}>{worker.name}</span>
                                                </div>
                                              </div>
                                              {isSelected && (
                                                <Icon icon="lucide:check" width={16} height={16} className="text-accent shrink-0" />
                                              )}
                                            </div>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Nested Workers (Nested Box) - grouped by nested box */}
                                {nestedContextNames.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                      <Icon icon="lucide:folder-tree" width={12} height={12} className="text-purple-400" />
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/80">Nested Box</span>
                                      <span className="text-[10px] text-muted/50">({nestedWorkers.length})</span>
                                    </div>
                                    <div className="space-y-2">
                                      {nestedContextNames.map((nestedName) => {
                                        const workersForNested = nestedWorkers.filter((w) => w.sourceContext === nestedName)
                                        return (
                                          <div key={nestedName}>
                                            <div className="flex items-center gap-1.5 mb-1 px-2">
                                              <Icon icon="lucide:folder" width={10} height={10} className="text-purple-400/60" />
                                              <span className="text-[10px] font-medium text-purple-400/70">{nestedName}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                              {workersForNested.map((worker) => {
                                                const isSelected = selectedWorkerIds.includes(worker.id)
                                                return (
                                                  <button
                                                    key={worker.id}
                                                    onClick={() => handleSelectWorker(worker.id)}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${isSelected ? 'bg-accent/15 border border-accent/30' : 'bg-white/[0.025] border border-card-border hover:bg-white/[0.05] hover:border-white/[0.12]'}`}
                                                  >
                                                    <div className="flex items-center gap-2.5">
                                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent/20' : 'bg-purple-400/10'}`}>
                                                        <Icon icon="lucide:waypoints" width={12} height={12} className={isSelected ? 'text-accent' : 'text-purple-400'} />
                                                      </div>
                                                      <div className="min-w-0 flex-1">
                                                        {worker.parentName && (
                                                          <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="text-[10px] font-medium text-muted/70 uppercase tracking-wider">Presence Name</span>
                                                            <span className="text-[10px] text-muted/40">—</span>
                                                            <span className="text-[11px] font-medium text-purple-400/80">{worker.parentName}</span>
                                                          </div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                          <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-foreground/80'}`}>{worker.name}</span>
                                                        </div>
                                                      </div>
                                                      {isSelected && (
                                                        <Icon icon="lucide:check" width={16} height={16} className="text-accent shrink-0" />
                                                      )}
                                                    </div>
                                                  </button>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-6 border border-dashed border-card-border rounded-xl">
                                <Icon icon="lucide:users" width={22} height={22} className="text-muted/30 mx-auto mb-2" />
                                <p className="text-xs text-muted/50">No worker agents available.</p>
                                <p className="text-xs text-muted/40 mt-1">Assign presences to this box to see their workers.</p>
                              </div>
                            )}
                          </div>

                          {/* Permissions Section */}
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted/60 mb-2 block">
                              Permissions
                            </label>
                            <div className="space-y-2">
                              {/* Invite Permission */}
                              <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-card-border hover:border-emerald-400/30 transition-colors cursor-pointer group">
                                <div className="relative flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissions.includes('invite')}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPermissions(prev => [...prev, 'invite'])
                                      } else {
                                        setSelectedPermissions(prev => prev.filter(p => p !== 'invite'))
                                      }
                                    }}
                                    className="peer sr-only"
                                  />
                                  <div className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                                    {selectedPermissions.includes('invite') && (
                                      <Icon icon="lucide:check" width={12} height={12} className="text-white" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-white">Invite</span>
                                    <Icon icon="lucide:user-plus" width={14} height={14} className="text-emerald-400" />
                                  </div>
                                  <p className="text-[11px] text-muted/60 mt-0.5">
                                    Can invite others to join this context
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>

                          {/* Error display */}
                          {roleError && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                              <Icon icon="lucide:alert-circle" width={14} height={14} className="text-red-400 shrink-0" />
                              <span className="text-xs text-red-400">{roleError}</span>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="pt-1.5 border-t border-card-border">
                            <div className="flex gap-2">
                              {editingRoleId ? (
                                <button 
                                  onClick={handleUpdateRole} 
                                  disabled={selectedWorkerIds.length === 0 || !newRoleName.trim() || roleSaving} 
                                  className="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                >
                                  {roleSaving ? (
                                    <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />
                                  ) : (
                                    <Icon icon="lucide:check" width={14} height={14} />
                                  )}
                                  {roleSaving ? 'Updating...' : 'Update Role'}
                                </button>
                              ) : (
                                <button 
                                  onClick={handleAddWorkerAsRole} 
                                  disabled={selectedWorkerIds.length === 0 || !newRoleName.trim() || roleSaving} 
                                  className="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                >
                                  {roleSaving ? (
                                    <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />
                                  ) : (
                                    <Icon icon="lucide:plus" width={14} height={14} />
                                  )}
                                  {roleSaving ? 'Creating...' : 'Add Role'}
                                </button>
                              )}
                              <button onClick={handleCancelRoleEdit} disabled={roleSaving} className="border border-card-border text-foreground/60 hover:text-foreground hover:border-white/20 font-medium px-4 py-2 rounded-xl transition-colors text-sm disabled:opacity-40">Cancel</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-card-border/50">
                <DisplayField label="Name" icon="lucide:text-cursor-input"><p className="text-lg">{context.name}</p></DisplayField>
                <DisplayField label="Handle" icon="lucide:at-sign">
                  {context.handle ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 text-white font-mono text-sm">@{context.handle}</span> : <span className="text-muted/50 italic">Not set</span>}
                </DisplayField>
                <DisplayField label="Categories" icon="lucide:tag">
                  {(context.categories || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(context.categories || []).map((cat) => {
                        const mainLabel = MAIN_TYPES.find((t) => t.id === cat.mainType)?.label || cat.mainType
                        const subLabel = cat.subType ? MAIN_TYPES.find((t) => t.id === cat.mainType)?.subTypes.find((s) => s.id === cat.subType)?.label : null
                        return (
                          <span key={cat.mainType} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm border ${cat.isPrimary ? 'bg-accent/10 text-accent border-accent/20' : 'bg-white/5 text-muted border-card-border'}`}>
                            {cat.isPrimary && <Icon icon="lucide:star" width={11} height={11} />}
                            {mainLabel}{subLabel && ` · ${subLabel}`}
                          </span>
                        )
                      })}
                    </div>
                  ) : <span className="text-muted/50 italic">Not set</span>}
                </DisplayField>
                <DisplayField label="Description" icon="lucide:file-text">
                  {context.description ? <p className="text-muted whitespace-pre-wrap">{context.description}</p> : <span className="text-muted/50 italic">No description</span>}
                </DisplayField>
                <DisplayField label="Avatars" icon="lucide:bot">
                  {(context.presenceIds || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(context.presenceIds || []).map((id) => {
                        const presence = presences.find((p) => p.id === id)
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm border border-accent/20">
                            <Icon icon="lucide:bot" width={12} height={12} />
                            {presence?.name || id.slice(0, 8) + '...'}
                            {presence?.handle && <span className="text-accent/70 text-xs">@{presence.handle}</span>}
                          </span>
                        )
                      })}
                    </div>
                  ) : <span className="text-muted/50 italic">No avatars assigned</span>}
                </DisplayField>
                <DisplayField label="Roles" icon="lucide:waypoints" colorClass="amber">
                  {rolesLoading ? (
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:loader-2" width={14} height={14} className="text-muted animate-spin" />
                      <span className="text-muted/50 text-sm">Loading roles...</span>
                    </div>
                  ) : roles.length > 0 ? (
                    <div className="space-y-2">
                      {roles.map((role) => (
                        <div key={role.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-card-border/50">
                          <div className="w-8 h-8 rounded-lg bg-amber-400/15 flex items-center justify-center flex-shrink-0">
                            <Icon icon="lucide:waypoints" width={14} height={14} className="text-amber-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-white font-medium">{role.name}</h4>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400/70">
                                {role.workers.length} worker{role.workers.length !== 1 ? 's' : ''}
                              </span>
                              {role.permissions && role.permissions.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 border border-emerald-400/20">
                                  <Icon icon="lucide:shield-check" width={9} height={9} />
                                  {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {role.workers.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {role.workers.map((worker) => (
                                  <span key={worker.id} className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-blue-400/8 text-blue-400/80 border border-blue-400/15 px-2 py-1 rounded-lg">
                                    <Icon icon="lucide:bot" width={10} height={10} />
                                    {worker.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {role.permissions && role.permissions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {role.permissions.map((perm) => (
                                  <span key={perm} className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-1 rounded-lg capitalize">
                                    <Icon icon={perm === 'invite' ? 'lucide:user-plus' : 'lucide:shield'} width={10} height={10} />
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-muted/50 italic">No roles defined</span>}
                </DisplayField>
              </div>
            )}
          </div>
        </div>

        {/* Nested Boxes Card */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-card-border bg-white/[0.02] flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Icon icon="lucide:folder" width={18} height={18} className="text-purple-400" />
              Nested Boxes<span className="text-sm font-normal text-muted ml-1">({nestedContexts.length})</span>
            </h2>
          </div>
          
          <div className="p-4">
            {nestedContexts.length > 0 ? (
              <div className="space-y-2">
                {nestedContexts.map((nestedContext) => (
                  <div
                    key={nestedContext.id}
                    onClick={() => router.push(`/context/${contextId}/project/${nestedContext.id}`)}
                    className="p-4 bg-background/50 rounded-xl border border-card-border/50 cursor-pointer hover:bg-white/[0.03] hover:border-purple-400/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-purple-400/15 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-400/25 transition-colors">
                        <Icon icon="lucide:folder" width={22} height={22} className="text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-white font-medium group-hover:text-purple-400 transition-colors">{nestedContext.name}</h4>
                          <VisibilityBadge visibility={nestedContext.visibility} />
                        </div>
                        {nestedContext.handle && <p className="text-xs text-muted/70">@{nestedContext.handle}</p>}
                        {nestedContext.description && <p className="text-sm text-muted mt-1 line-clamp-1">{nestedContext.description}</p>}
                      </div>
                      <Icon icon="lucide:chevron-right" width={20} height={20} className="text-muted group-hover:text-purple-400 flex-shrink-0 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-xl bg-purple-400/10 flex items-center justify-center mx-auto mb-3">
                  <Icon icon="lucide:folder-plus" width={24} height={24} className="text-purple-400/50" />
                </div>
                <p className="text-muted/50">No nested boxes in this box yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Members Card */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-card-border bg-white/[0.02] flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Icon icon="lucide:users" width={18} height={18} className="text-accent" />
              Members<span className="text-sm font-normal text-muted ml-1">({membersLoading ? '…' : membersTotal})</span>
            </h2>
          </div>

          <div className="p-4">
            {membersLoading ? (
              <div className="text-center py-8">
                <Icon icon="lucide:loader-2" width={24} height={24} className="text-muted animate-spin mx-auto" />
                <p className="text-muted text-sm mt-2">Loading members…</p>
              </div>
            ) : members.length > 0 ? (
              <div className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                      <Icon icon="lucide:user" width={18} height={18} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white font-mono truncate">
                        {member.wallet.slice(0, 6)}...{member.wallet.slice(-4)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted capitalize">{member.role}</span>
                        {member.joinMethod && (
                          <>
                            <span className="text-muted/30">·</span>
                            <span className="text-xs text-muted">{member.joinMethod === 'direct' ? 'Direct join' : 'Via code'}</span>
                          </>
                        )}
                        <span className="text-muted/30">·</span>
                        <span className="text-xs text-muted">
                          {new Date(member.redeemedAt.includes('Z') || member.redeemedAt.includes('+') ? member.redeemedAt : member.redeemedAt + 'Z').toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setMemberToRemove(member)}
                      className="shrink-0 text-red-400/70 hover:text-red-400 text-xs font-medium border border-red-500/20 hover:border-red-500/40 bg-red-500/[0.04] hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Icon icon="lucide:trash-2" width={12} height={12} />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <Icon icon="lucide:users" width={24} height={24} className="text-accent/50" />
                </div>
                <p className="text-muted/50">No members have joined yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Remove member confirmation */}
        {memberToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !removingMember && setMemberToRemove(null)} />
            <div className="relative bg-card border border-card-border rounded-2xl p-4 sm:p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <Icon icon="lucide:alert-circle" width={24} height={24} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Remove Member?</h3>
                  <p className="text-sm text-muted">This action cannot be undone</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:user" width={16} height={16} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white font-mono truncate">
                    {memberToRemove.wallet.slice(0, 6)}...{memberToRemove.wallet.slice(-4)}
                  </p>
                  <p className="text-xs text-muted capitalize">{memberToRemove.role}</p>
                </div>
              </div>

              <p className="text-muted text-sm mb-5">
                This member will lose access. Their membership record will be permanently deleted.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setMemberToRemove(null)}
                  disabled={removingMember}
                  className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] border border-card-border text-foreground font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveMember}
                  disabled={removingMember}
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {removingMember ? (
                    <><Icon icon="lucide:loader-2" width={13} height={13} className="animate-spin" /> Removing…</>
                  ) : (
                    <><Icon icon="lucide:trash-2" width={13} height={13} /> Remove</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      <ConfirmationDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        danger={confirmDialog.danger}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useAuth } from '@/lib/auth-context'
import { useStudio } from '@/lib/studio-context'
import { checkHandleAvailability } from '@/lib/agents-api'
import {
  updateNestedContext,
  publishNestedContext as apiPublishNestedContext,
  unpublishNestedContext as apiUnpublishNestedContext,
  archiveNestedContext as apiArchiveNestedContext,
  deleteNestedContext as apiDeleteNestedContext,
  type NestedContext,
  type VisibilityLevel,
  type ContextStatus,
  type UpdateNestedContextParams,
  type CategoryEntry,
} from '@/lib/context-api'
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

interface Game {
  id: string
  platformId: string
  name: string
  slug: string
  description: string
  icon: string
  status: string
  scenesCount: number
  questsCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────────────────────────────────

const AGENTS_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://192.168.1.30:8000'
const CONTEXT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://192.168.1.30:8000'
const ASSETS_API_URL = process.env.NEXT_PUBLIC_ASSETS_API_URL || 'http://192.168.1.30:4000/api/v1'

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

async function fetchGames(userId: string, platformId?: string): Promise<Game[]> {
  try {
    const params = new URLSearchParams()
    if (platformId) params.set('platform_id', platformId)
    const qs = params.toString() ? `?${params}` : ''
    const url = `${ASSETS_API_URL}/games/user/${encodeURIComponent(userId)}${qs}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch games')
    const data = await response.json()
    return (data.data || []).map((game: any) => ({
      id: game.id,
      platformId: game.platform_id,
      name: game.name,
      slug: game.slug,
      description: game.description || '',
      icon: game.icon || '🎮',
      status: game.status || 'draft',
      scenesCount: game.scenes_count || 0,
      questsCount: game.quests_count || 0,
    }))
  } catch {
    return []
  }
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
// Presence Selector Component (matching creation page style)
// ─────────────────────────────────────────────────────────────────────────────

function PresenceSelector({
  value,
  onChange,
  presences,
  loading,
}: {
  value: string
  onChange: (value: string) => void
  presences: Presence[]
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = presences.find((p) => p.id === value)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">Presence</label>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          disabled={loading}
          onClick={() => setOpen((o) => !o)}
          className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-left focus:outline-none focus:border-accent/50 cursor-pointer disabled:opacity-50 flex items-center justify-between gap-2 transition-colors hover:border-white/30"
        >
          <span className={selected ? 'text-foreground' : 'text-muted'}>
            {loading
              ? 'Loading avatars...'
              : selected
                ? `${selected.name}${selected.handle ? ` (@${selected.handle})` : ''}`
                : 'Select an avatar...'}
          </span>
          <Icon
            icon={loading ? 'lucide:loader-2' : open ? 'lucide:chevron-up' : 'lucide:chevron-down'}
            width={16}
            height={16}
            className={`text-muted flex-shrink-0 ${loading ? 'animate-spin' : ''}`}
          />
        </button>

        {open && !loading && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  !value
                    ? 'bg-accent/15 text-accent'
                    : 'text-muted hover:bg-white/[0.06] hover:text-foreground'
                }`}
              >
                No avatar assigned
              </button>
              {presences.map((presence) => {
                const isSelected = value === presence.id
                return (
                  <button
                    key={presence.id}
                    type="button"
                    onClick={() => { onChange(presence.id); setOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-accent/15 text-accent'
                        : 'text-foreground hover:bg-white/[0.06] hover:text-white'
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
            </div>
          </div>
        )}
      </div>
      {presences.length === 0 && !loading && (
        <p className="text-xs text-muted/60 mt-1">
          No avatar agents found. Create one in the Agents page.
        </p>
      )}
    </div>
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
  options: { id: string; name: string; icon?: string }[]
  colorClass?: string
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    accent: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/20' },
    blue: { bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/20' },
    purple: { bg: 'bg-purple-400/10', text: 'text-purple-400', border: 'border-purple-400/20' },
    green: { bg: 'bg-green-400/10', text: 'text-green-400', border: 'border-green-400/20' },
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
                {opt.icon && <span>{opt.icon}</span>}
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
              {opt.icon && <span>{opt.icon}</span>}
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
  colorClass = 'purple',
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
        <Icon icon={icon} width={14} height={14} className={colors[colorClass] || colors.purple} />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-white">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function NestedContextDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { games: studioGames, gamesLoading: studioGamesLoading } = useStudio()
  
  const contextId = typeof params?.platformId === 'string' 
    ? params.platformId 
    : Array.isArray(params?.platformId) 
      ? params.platformId[0] 
      : null
  const nestedContextId = typeof params?.projectId === 'string' 
    ? params.projectId 
    : Array.isArray(params?.projectId) 
      ? params.projectId[0] 
      : null

  // Data states
  const [nestedContext, setNestedContext] = useState<NestedContext | null>(null)
  const [presences, setPresences] = useState<Presence[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([])
  // Games from studio context (already loaded and working)
  const games = studioGames.map((g: any) => ({
    id: g.id,
    platformId: g.platformId || g.platform_id,
    name: g.name,
    slug: g.slug || '',
    description: g.description || '',
    icon: g.icon || '🎮',
    status: g.status || 'draft',
    scenesCount: g.scenesCount || g.scenes_count || 0,
    questsCount: g.questsCount || g.quests_count || 0,
  })) as Game[]
  const [loading, setLoading] = useState(true)
  const [auxiliaryLoading, setAuxiliaryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  const [editGatheringIds, setEditGatheringIds] = useState<string[]>([])

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

  // Debounced handle availability check
  function scheduleHandleCheck(h: string) {
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current)
    setHandleAvailable(null)
    setHandleSuggestion(null)

    // Skip if handle matches the current saved value (unchanged = already theirs)
    if (nestedContext && h.toLowerCase() === (nestedContext.handle || '').toLowerCase()) {
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
        const result = await checkHandleAvailability(h, 'mission')
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

  const loadData = useCallback(async () => {
    if (!nestedContextId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      
      // Fetch nested context from kinship-agent
      const nestedContextResponse = await fetch(
        `${CONTEXT_API_URL}/api/v1/nested-context/${nestedContextId}`,
        { signal: controller.signal }
      )
      clearTimeout(timeout)
      
      if (!nestedContextResponse.ok) {
        throw new Error(`Failed to load nested context: ${nestedContextResponse.status}`)
      }
      
      const nestedContextRaw = await nestedContextResponse.json()
      const nestedContextData: NestedContext = {
        id: nestedContextRaw.id,
        contextId: nestedContextRaw.context_id,
        name: nestedContextRaw.name,
        slug: nestedContextRaw.slug,
        handle: nestedContextRaw.handle,
        categories: (nestedContextRaw.context_categories || []).map((c: any) => ({ mainType: c.mainType, subType: c.subType || null, isPrimary: !!c.isPrimary })),
        description: nestedContextRaw.description || '',
        tagline: nestedContextRaw.tagline || null,
        icon: nestedContextRaw.icon || '',
        color: nestedContextRaw.color || '',
        presenceIds: nestedContextRaw.presence_ids || [],
        visibility: nestedContextRaw.visibility || 'public',
        knowledgeBaseIds: nestedContextRaw.knowledge_base_ids || [],
        gatheringIds: nestedContextRaw.gathering_ids || [],
        instructionIds: nestedContextRaw.instruction_ids || [],
        instructions: nestedContextRaw.instructions || '',
        status: nestedContextRaw.status || 'draft',
        createdBy: nestedContextRaw.created_by,
        createdAt: nestedContextRaw.created_at,
        updatedAt: nestedContextRaw.updated_at,
        assetsCount: nestedContextRaw.assets_count || 0,
        gamesCount: nestedContextRaw.games_count || 0,
      }
      
      setNestedContext(nestedContextData)
      setEditName(nestedContextData.name || '')
      setEditHandle(nestedContextData.handle || '')
      setEditCategories(nestedContextData.categories || [])
      setEditDescription(nestedContextData.description || '')
      setEditTagline(nestedContextData.tagline || '')
      setEditPresenceIds(nestedContextData.presenceIds || [])
      setEditVisibility(nestedContextData.visibility || 'public')
      setEditKnowledgeBaseIds(nestedContextData.knowledgeBaseIds || [])
      setEditInstructionIds(nestedContextData.instructionIds || [])
      setEditGatheringIds(nestedContextData.gatheringIds || [])
      setNameTouched(false)
      setHandleTouched(!!nestedContextData.handle)
      setHandleAvailable(nestedContextData.handle ? true : null)
      setDescriptionTouched(false)
      
      setLoading(false)
      
      // Load auxiliary data in background
      if (user?.wallet) {
        setAuxiliaryLoading(true)
        Promise.all([
          fetchPresences(user.wallet),
          fetchKnowledgeBases(user.wallet),
          fetchSystemPrompts(user.wallet),
        ]).then(([presenceData, kbData, promptData]) => {
          setPresences(presenceData)
          setKnowledgeBases(kbData)
          setSystemPrompts(promptData)
          setAuxiliaryLoading(false)
        }).catch(() => setAuxiliaryLoading(false))
      }
      
    } catch (err) {
      console.error('Error loading nested context:', err)
      setError(err instanceof Error ? err.message : 'Failed to load nested context')
      setLoading(false)
    }
  }, [nestedContextId, user?.wallet])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!nestedContextId) {
      const timeout = setTimeout(() => {
        if (!nestedContextId) {
          setError('No nested context ID provided')
          setLoading(false)
        }
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [nestedContextId])

  const handleSave = async () => {
    if (!nestedContext) return
    
    setNameTouched(true)
    setHandleTouched(true)
    setDescriptionTouched(true)
    setTaglineTouched(true)
    
    if (!isFormValid) return
    
    setSaving(true)
    setSaveError(null)
    try {
      const params: UpdateNestedContextParams = {
        name: editName.trim(),
        handle: editHandle.trim(),
        categories: editCategories,
        description: editDescription.trim(),
        tagline: editTagline.trim() || undefined,
        visibility: editVisibility,
        presenceIds: editPresenceIds,
        knowledgeBaseIds: editKnowledgeBaseIds,
        instructionIds: editInstructionIds,
        gatheringIds: editGatheringIds,
      }
      const updated = await updateNestedContext(nestedContext.id, params)
      setNestedContext(updated)
      setIsEditing(false)
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
    if (nestedContext) {
      setEditName(nestedContext.name || '')
      setEditHandle(nestedContext.handle || '')
      setEditCategories(nestedContext.categories || [])
      setEditDescription(nestedContext.description || '')
      setEditTagline(nestedContext.tagline || '')
      setEditPresenceIds(nestedContext.presenceIds || [])
      setEditVisibility(nestedContext.visibility || 'public')
      setEditKnowledgeBaseIds(nestedContext.knowledgeBaseIds || [])
      setEditInstructionIds(nestedContext.instructionIds || [])
      setEditGatheringIds(nestedContext.gatheringIds || [])
      setNameTouched(false)
      setHandleTouched(!!nestedContext.handle)
      setHandleAvailable(nestedContext.handle ? true : null)
      setHandleSuggestion(null)
      setHandleChecking(false)
      setDescriptionTouched(false)
    }
    setIsEditing(false)
    setSaveError(null)
  }

  const getPresenceName = (id?: string | null) => presences.find((p) => p.id === id)?.name || null
  const getPresenceNames = (ids?: string[]) => (ids || []).map((id) => presences.find((p) => p.id === id)).filter(Boolean) as Presence[]
  const getGames = (ids?: string[]) => (ids || []).map((id) => games.find((g) => g.id === id)).filter(Boolean) as Game[]

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <Icon icon="lucide:loader-2" width={40} height={40} className="mx-auto mb-4 text-accent animate-spin" />
          <p className="text-muted">Loading nested box details…</p>
        </div>
      </div>
    )
  }

  if (error || !nestedContext) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-red-400/15 flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:alert-circle" width={32} height={32} className="text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Failed to load nested box</h3>
          <p className="text-muted mb-6">{error || 'Nested box not found'}</p>
          <button onClick={() => router.push(`/context/${contextId}`)} className="inline-flex items-center gap-2 text-accent hover:underline">
            <Icon icon="lucide:arrow-left" width={16} height={16} />
            Back to Box
          </button>
        </div>
      </div>
    )
  }

  const nestedContextGames = getGames(nestedContext.gatheringIds)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-8">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={() => router.push(`/context/${contextId}`)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Icon icon="lucide:arrow-left" width={18} height={18} className="text-white" />
          </button>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-400/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 border border-purple-400/20">
              <Icon icon="lucide:folder" width={22} height={22} className="text-purple-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{nestedContext.name}</h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                {nestedContext.handle && <span className="text-sm text-muted">@{nestedContext.handle}</span>}
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-400/20 text-purple-400">Nested Box</span>
                <VisibilityBadge visibility={nestedContext.visibility} />
                <ContextStatusBadge status={nestedContext.status} size="md" />
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
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors flex items-center gap-2 border border-card-border text-xs"
              >
                <Icon icon="lucide:pencil" width={14} height={14} />
                Edit Nested Box
              </button>
              <ContextActionMenu
                status={nestedContext.status}
                canEdit={true}
                canDelete={true}
                onPublish={async () => { try { const u = await apiPublishNestedContext(nestedContext.id); setNestedContext(u) } catch (e) { console.error(e) } }}
                onUnpublish={async () => { try { const u = await apiUnpublishNestedContext(nestedContext.id); setNestedContext(u) } catch (e) { console.error(e) } }}
                onArchive={() => setConfirmDialog({ open: true, title: 'Archive Mission', message: `Archive "${nestedContext.name}"? It will be hidden but can be restored later.`, confirmLabel: 'Archive', danger: false, loading: false, onConfirm: async () => { setConfirmDialog(p => ({...p, loading: true})); try { const u = await apiArchiveNestedContext(nestedContext.id); setNestedContext(u) } catch(e) { console.error(e) } finally { setConfirmDialog(p => ({...p, open: false, loading: false})) } } })}
                onRestore={async () => { try { const u = await apiUnpublishNestedContext(nestedContext.id); setNestedContext(u) } catch (e) { console.error(e) } }}
                onDelete={() => setConfirmDialog({ open: true, title: 'Delete Mission', message: `Permanently delete "${nestedContext.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true, loading: false, onConfirm: async () => { setConfirmDialog(p => ({...p, loading: true})); try { await apiDeleteNestedContext(nestedContext.id); router.push(`/context/${nestedContext.contextId}`) } catch(e) { console.error(e) } finally { setConfirmDialog(p => ({...p, open: false, loading: false})) } } })}
              />
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="mb-6 p-4 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 flex items-center gap-3">
          <Icon icon="lucide:alert-circle" width={20} height={20} />
          <span>{saveError}</span>
        </div>
      )}

      {/* Nested Box Details Card */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-card-border bg-white/[0.02]">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Icon icon="lucide:info" width={18} height={18} className="text-purple-400" />
            Nested Box Details
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
                    <label className="text-sm font-medium text-foreground">Nested Box Name <span className="text-accent">*</span></label>
                    <span className={`text-xs tabular-nums ${nameError ? 'text-red-400' : 'text-muted'}`}>{editName.length}/{NAME_MAX}</span>
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => onNameChange(e.target.value)}
                    onBlur={() => setNameTouched(true)}
                    placeholder="e.g. Mobile App, Marketing Campaign..."
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
                      placeholder="mobile_app"
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
                    placeholder="Describe this mission — its purpose, goals, and team. Minimum 50 characters."
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
                      placeholder="A short tagline for this mission"
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

              <div className="space-y-4">
                <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Gatherings</div>
                <MultiSelectField 
                  label="Games" 
                  icon="lucide:gamepad-2" 
                  values={editGatheringIds} 
                  onChange={setEditGatheringIds} 
                  options={games.map(g => ({ id: g.id, name: g.name, icon: g.icon }))} 
                  colorClass="green" 
                />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-card-border/50">
              <DisplayField label="Name" icon="lucide:text-cursor-input"><p className="text-lg">{nestedContext.name}</p></DisplayField>
              <DisplayField label="Handle" icon="lucide:at-sign">
                {nestedContext.handle ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 text-white font-mono text-sm">@{nestedContext.handle}</span> : <span className="text-muted/50 italic">Not set</span>}
              </DisplayField>
              <DisplayField label="Categories" icon="lucide:tag">
                {(nestedContext.categories || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(nestedContext.categories || []).map((cat) => {
                      const mainLabel = MAIN_TYPES.find((t) => t.id === cat.mainType)?.label || cat.mainType
                      const subLabel = cat.subType ? MAIN_TYPES.find((t) => t.id === cat.mainType)?.subTypes.find((s) => s.id === cat.subType)?.label : null
                      return (
                        <span key={cat.mainType} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm border ${cat.isPrimary ? 'bg-purple-400/10 text-purple-400 border-purple-400/20' : 'bg-white/5 text-muted border-card-border'}`}>
                          {cat.isPrimary && <Icon icon="lucide:star" width={11} height={11} />}
                          {mainLabel}{subLabel && ` · ${subLabel}`}
                        </span>
                      )
                    })}
                  </div>
                ) : <span className="text-muted/50 italic">Not set</span>}
              </DisplayField>
              <DisplayField label="Description" icon="lucide:file-text">
                {nestedContext.description ? <p className="text-muted whitespace-pre-wrap">{nestedContext.description}</p> : <span className="text-muted/50 italic">No description</span>}
              </DisplayField>
              <DisplayField label="Avatars" icon="lucide:bot">
                {(nestedContext.presenceIds || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(nestedContext.presenceIds || []).map((id) => {
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
              <DisplayField label="Gatherings" icon="lucide:gamepad-2" colorClass="green">
                {nestedContextGames.length > 0 ? (
                  <div className="space-y-2">
                    {nestedContextGames.map((game) => (
                      <div key={game.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-card-border/50">
                        <div className="w-10 h-10 rounded-lg bg-green-400/15 flex items-center justify-center flex-shrink-0 text-xl">{game.icon}</div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <h4 className="text-white font-medium truncate">{game.name}</h4>
                          {game.description && <p className="text-xs text-muted truncate">{game.description}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted flex items-center gap-1"><Icon icon="lucide:map" width={10} height={10} />{game.scenesCount} scenes</span>
                            <span className="text-xs text-muted flex items-center gap-1"><Icon icon="lucide:scroll" width={10} height={10} />{game.questsCount} quests</span>
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${game.status === 'published' ? 'bg-green-400/15 text-green-400' : game.status === 'archived' ? 'bg-red-400/15 text-red-400' : 'bg-amber-400/15 text-amber-400'}`}>{game.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-muted/50 italic">No gatherings assigned</span>}
              </DisplayField>
            </div>
          )}
        </div>
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
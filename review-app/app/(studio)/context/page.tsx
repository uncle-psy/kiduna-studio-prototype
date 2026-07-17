'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useAuth } from '@/lib/auth-context'
import { useStudio } from '@/lib/studio-context'
import { checkHandleAvailability } from '@/lib/agents-api'
import { CreatePresenceModal } from '@/components/AgentModals'
import {
  listContextsWithNested,
  listAccessibleContextsWithPermissions,
  createContext as apiCreateContext,
  createNestedContext as apiCreateNestedContext,
  deleteContext as apiDeleteContext,
  deleteNestedContext as apiDeleteNestedContext,
  publishContext as apiPublishContext,
  unpublishContext as apiUnpublishContext,
  archiveContext as apiArchiveContext,
  publishNestedContext as apiPublishNestedContext,
  unpublishNestedContext as apiUnpublishNestedContext,
  archiveNestedContext as apiArchiveNestedContext,
  type Context,
  type ContextWithNested,
  type ContextWithNestedAndPermissions,
  type NestedContext,
  type VisibilityLevel,
  type ContextStatus,
  type CategoryEntry,
} from '@/lib/context-api'
import ContextStatusBadge from '@/components/ContextStatusBadge'
import ContextActionMenu from '@/components/ContextActionMenu'
import ConfirmationDialog from '@/components/ConfirmationDialog'
import {
  MAIN_TYPES,
  VISIBILITY_OPTIONS,
  HANDLE_RE,
  HANDLE_MAX,
  NAME_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  TAGLINE_MAX,
  validateName,
  validateDescription,
  validateTagline,
  validateHandle,
  suggestHandle,
  isValidHandle,
} from '@/lib/context-constants'
import type { MainTypeId } from '@/lib/context-constants'

// ─────────────────────────────────────────────────────────────────────────────
// Types for Presences (Agents API)
// ─────────────────────────────────────────────────────────────────────────────

interface Presence {
  id: string
  name: string
  handle: string | null
  type: string
  presenceSubtype?: string
  status: string
  description: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Types for Knowledge Bases
// ─────────────────────────────────────────────────────────────────────────────

interface KnowledgeBase {
  id: string
  name: string
  namespace: string
  description: string | null
  contentType: string | null
  itemCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Types for System Prompts
// ─────────────────────────────────────────────────────────────────────────────

interface SystemPrompt {
  id: string
  name: string
  content: string
  connectedKBId: string | null
  connectedKBName: string | null
  status: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Types for Games (Gatherings)
// ─────────────────────────────────────────────────────────────────────────────

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

const AGENTS_API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://192.168.1.30:8000'
const ASSETS_API_URL =
  process.env.NEXT_PUBLIC_ASSETS_API_URL || 'http://192.168.1.30:4000/api/v1'

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Presences from Agents API
// ─────────────────────────────────────────────────────────────────────────────

async function fetchPresences(wallet: string, presenceSubtype?: string): Promise<Presence[]> {
  try {
    let url = `${AGENTS_API_URL}/api/agents?wallet=${encodeURIComponent(wallet)}&includeWorkers=false`
    if (presenceSubtype) {
      url += `&presenceSubtype=${encodeURIComponent(presenceSubtype)}`
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch presences: ${response.statusText}`)
    }
    const data = await response.json()
    return data.agents || []
  } catch (error) {
    console.error('Error fetching presences:', error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Knowledge Bases from API
// ─────────────────────────────────────────────────────────────────────────────

async function fetchKnowledgeBases(wallet: string): Promise<KnowledgeBase[]> {
  try {
    const response = await fetch(
      `${AGENTS_API_URL}/api/knowledge?wallet=${encodeURIComponent(wallet)}`
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch knowledge bases: ${response.statusText}`)
    }
    const data = await response.json()
    return data.knowledgeBases || []
  } catch (error) {
    console.error('Error fetching knowledge bases:', error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch System Prompts from API
// ─────────────────────────────────────────────────────────────────────────────

async function fetchSystemPrompts(wallet: string): Promise<SystemPrompt[]> {
  try {
    const response = await fetch(
      `${AGENTS_API_URL}/api/prompts?wallet=${encodeURIComponent(wallet)}`
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch system prompts: ${response.statusText}`)
    }
    const data = await response.json()
    return (data.prompts || []).filter((p: any) => p.status === 'active')
  } catch (error) {
    console.error('Error fetching system prompts:', error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Games (Gatherings) from Assets API — scoped to user
// ─────────────────────────────────────────────────────────────────────────────

async function fetchGames(userId: string, platformId?: string): Promise<Game[]> {
  try {
    const params = new URLSearchParams({ created_by: userId })
    if (platformId) params.set('platform_id', platformId)
    const url = `${ASSETS_API_URL}/games?${params}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.statusText}`)
    }
    const data = await response.json()
    // Transform snake_case to camelCase
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
  } catch (error) {
    console.error('Error fetching games:', error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-Save Draft Storage
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_DRAFT_KEY_PREFIX = 'kinship_platform_draft_'
const PROJECT_DRAFT_KEY_PREFIX = 'kinship_project_draft_'
function getPlatformDraftKey(w: string): string { return w ? `${PLATFORM_DRAFT_KEY_PREFIX}${w}` : '' }
function getProjectDraftKey(w: string): string { return w ? `${PROJECT_DRAFT_KEY_PREFIX}${w}` : '' }
const AUTO_SAVE_DEBOUNCE_MS = 500

interface PlatformDraft {
  name: string
  handle: string
  categories: CategoryEntry[]
  description: string
  tagline: string
  presenceIds: string[]
  visibility: VisibilityLevel
  knowledgeBases: string[]
  instructionIds: string[]
  isPrimary: boolean
  savedAt: number
}

interface ProjectDraft {
  contextId: string
  name: string
  handle: string
  categories: CategoryEntry[]
  description: string
  tagline: string
  presenceIds: string[]
  visibility: VisibilityLevel
  knowledgeBases: string[]
  gatherings: string[]
  instructionIds: string[]
  savedAt: number
}

function savePlatformDraft(draft: PlatformDraft, wallet: string): void {
  const key = getPlatformDraftKey(wallet)
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify(draft)) } catch {}
}

function loadPlatformDraft(wallet: string): PlatformDraft | null {
  const key = getPlatformDraftKey(wallet)
  if (!key) return null
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const draft = JSON.parse(stored) as PlatformDraft
      if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) return draft
      localStorage.removeItem(key)
    }
  } catch {}
  return null
}

function clearPlatformDraft(wallet: string): void {
  const key = getPlatformDraftKey(wallet)
  if (!key) return
  try { localStorage.removeItem(key) } catch {}
  try { localStorage.removeItem('kinship_platform_draft') } catch {}
}

function saveProjectDraft(draft: ProjectDraft, wallet: string): void {
  const key = getProjectDraftKey(wallet)
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify(draft)) } catch {}
}

function loadProjectDraft(contextId: string, wallet: string): ProjectDraft | null {
  const key = getProjectDraftKey(wallet)
  if (!key) return null
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const draft = JSON.parse(stored) as ProjectDraft
      if (draft.contextId === contextId && Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) return draft
      localStorage.removeItem(key)
    }
  } catch {}
  return null
}

function clearProjectDraft(wallet: string): void {
  const key = getProjectDraftKey(wallet)
  if (!key) return
  try { localStorage.removeItem(key) } catch {}
  try { localStorage.removeItem('kinship_project_draft') } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility Selector Component
// ─────────────────────────────────────────────────────────────────────────────

interface VisibilitySelectorProps {
  value: VisibilityLevel
  onChange: (value: VisibilityLevel) => void
}

function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        Visibility
      </label>
      <div className="grid grid-cols-3 gap-2">
        {VISIBILITY_OPTIONS.map((option) => {
          const isDisabled = !option.enabled
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => option.enabled && onChange(option.value)}
              disabled={isDisabled}
              className={`relative px-3 py-3 rounded-xl border text-left transition-all ${
                isDisabled
                  ? 'cursor-not-allowed opacity-100 border-card-border bg-card pointer-events-none select-none'
                  : isSelected
                    ? 'border-accent bg-accent/10 cursor-pointer'
                    : 'border-card-border hover:border-white/30 hover:bg-white/[0.02] cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  icon={option.icon}
                  width={16}
                  height={16}
                  className={
                    isDisabled
                      ? 'text-muted/50'
                      : isSelected
                        ? option.color
                        : 'text-muted'
                  }
                />
                <span
                  className={`text-sm font-medium ${isDisabled ? 'text-muted/50' : isSelected ? 'text-white' : 'text-muted'}`}
                >
                  {option.label}
                </span>
              </div>
              <p
                className={`text-[10px] ${isDisabled ? 'text-muted/40' : 'text-muted'}`}
              >
                {option.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Selector Component (Card-based multi-select with primary/secondary)
// ─────────────────────────────────────────────────────────────────────────────

interface CategorySelectorProps {
  categories: CategoryEntry[]
  onChange: (categories: CategoryEntry[]) => void
}

function CategorySelector({ categories, onChange }: CategorySelectorProps) {
  const [expandedType, setExpandedType] = useState<string | null>(null)

  const selectedIds = new Set(categories.map((c) => c.mainType))
  const primaryId = categories.find((c) => c.isPrimary)?.mainType || null

  function toggleMainType(typeId: string) {
    if (selectedIds.has(typeId)) {
      // Removing — don't allow removing the last one
      const remaining = categories.filter((c) => c.mainType !== typeId)
      if (remaining.length === 0) return
      // If removing the primary, promote the first remaining
      if (primaryId === typeId && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isPrimary: true }
      }
      onChange(remaining)
      if (expandedType === typeId) setExpandedType(null)
    } else {
      // Adding — first selection is auto-primary
      const isPrimary = categories.length === 0
      const entry: CategoryEntry = { mainType: typeId, subType: null, isPrimary }
      onChange([...categories, entry])
      setExpandedType(typeId)
    }
  }

  function makePrimary(typeId: string) {
    onChange(
      categories.map((c) => ({
        ...c,
        isPrimary: c.mainType === typeId,
      }))
    )
  }

  function toggleSubType(mainTypeId: string, subTypeId: string) {
    onChange(
      categories.map((c) =>
        c.mainType === mainTypeId
          ? { ...c, subType: c.subType === subTypeId ? null : subTypeId }
          : c
      )
    )
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
                onClick={() => {
                  if (isSelected) {
                    if (isExpanded) setExpandedType(null)
                    else setExpandedType(type.id)
                  } else {
                    toggleMainType(type.id)
                  }
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all relative ${
                  isPrimary
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                    : isSecondary
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-card-border hover:border-white/30 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium leading-tight ${
                    isSelected ? 'text-foreground' : 'text-muted'
                  }`}>
                    {type.label}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isPrimary && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                        Primary
                      </span>
                    )}
                    {isSecondary && (
                      <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-muted">
                        2nd
                      </span>
                    )}
                    {isSelected && (
                      <Icon icon="lucide:check" width={14} height={14} className="text-accent" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded: sub types + actions */}
              {isSelected && isExpanded && (
                <div className="mt-2 ml-1 mb-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => makePrimary(type.id)}
                        className="text-[10px] text-accent hover:underline"
                      >
                        Make primary
                      </button>
                    )}
                    {categories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleMainType(type.id)}
                        className="text-[10px] text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {type.subTypes.length > 0 && (
                    <div>
                      <span className="block text-[10px] font-medium text-muted mb-1">Sub type (optional)</span>
                      <div className="flex flex-wrap gap-1.5">
                        {type.subTypes.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => toggleSubType(type.id, st.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                              entry?.subType === st.id
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-card-border text-muted hover:border-white/30 hover:text-foreground'
                            }`}
                          >
                            {st.label}
                          </button>
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
// Presence Selector Component
// ─────────────────────────────────────────────────────────────────────────────

interface PresenceMultiSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  presences: Presence[]
  loading?: boolean
  required?: boolean
  error?: string | null
  onCreateNew?: () => void
}

function PresenceMultiSelector({
  value,
  onChange,
  presences,
  loading,
  required,
  error,
  onCreateNew,
}: PresenceMultiSelectorProps) {
  function togglePresence(presenceId: string) {
    if (value.includes(presenceId)) {
      onChange(value.filter((id) => id !== presenceId))
    } else {
      onChange([...value, presenceId])
    }
  }

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Avatars
        </label>
        <div className="flex items-center gap-2 text-muted text-sm py-3">
          <Icon
            icon="lucide:loader-2"
            width={16}
            height={16}
            className="animate-spin"
          />
          Loading avatars...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-foreground">
          Avatars {required && <span className="text-red-400">*</span>}
        </label>
        {onCreateNew ? (
          <button
            type="button"
            onClick={onCreateNew}
            className="text-xs text-accent hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <Icon icon="lucide:plus" width={12} height={12} />
            Create New
          </button>
        ) : (
        <Link
          href="/agents"
          className="text-xs text-accent hover:text-amber-300 flex items-center gap-1 transition-colors"
        >
          <Icon icon="lucide:plus" width={12} height={12} />
          Create New
        </Link>
        )}
      </div>
      {presences.length === 0 ? (
        <div className={`text-center py-4 border border-dashed rounded-xl ${error ? 'border-red-500/40' : 'border-card-border'}`}>
          <Icon icon="lucide:bot" width={24} height={24} className="mx-auto mb-2 text-muted" />
          <p className="text-xs text-muted/60 mb-2">
            No avatar agents found.
          </p>
          {onCreateNew ? (
            <button
              type="button"
              onClick={onCreateNew}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors inline-flex items-center gap-1"
            >
              <Icon icon="lucide:plus" width={12} height={12} />
              Create Avatar
            </button>
          ) : (
          <Link
            href="/agents"
            className="text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors inline-flex items-center gap-1"
          >
            <Icon icon="lucide:plus" width={12} height={12} />
            Create Avatar
          </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {presences.map((presence) => {
            const isSelected = value.includes(presence.id)
            return (
              <button
                key={presence.id}
                type="button"
                onClick={() => togglePresence(presence.id)}
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
                    <Icon
                      icon="lucide:check"
                      width={12}
                      height={12}
                      className="text-white"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">
                    {presence.name}
                  </p>
                  {presence.handle && (
                    <p className="text-xs text-muted">@{presence.handle}</p>
                  )}
                </div>
                <Icon
                  icon="lucide:bot"
                  width={16}
                  height={16}
                  className={isSelected ? 'text-accent' : 'text-muted'}
                />
              </button>
            )
          })}
        </div>
      )}
      {error && (
        <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
          <Icon icon="lucide:alert-circle" width={12} height={12} />
          {error}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Base Selector Component
// ─────────────────────────────────────────────────────────────────────────────

interface KnowledgeBaseSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  knowledgeBases: KnowledgeBase[]
  loading?: boolean
}

function KnowledgeBaseSelector({
  value,
  onChange,
  knowledgeBases,
  loading,
}: KnowledgeBaseSelectorProps) {
  function toggleKB(kbId: string) {
    if (value.includes(kbId)) {
      onChange(value.filter((id) => id !== kbId))
    } else {
      onChange([...value, kbId])
    }
  }

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Inform <span className="text-muted font-normal ml-1">(optional)</span>
          
        </label>
        <div className="flex items-center gap-2 text-muted text-sm py-3">
          <Icon
            icon="lucide:loader-2"
            width={16}
            height={16}
            className="animate-spin"
          />
          Loading inform...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-foreground">
          Inform <span className="text-muted font-normal ml-1">(optional)</span>
        </label>
        <Link
          href="/knowledge"
          className="text-xs text-accent hover:text-amber-300 flex items-center gap-1 transition-colors"
        >
          <Icon icon="lucide:plus" width={12} height={12} />
          Create New
        </Link>
      </div>
      {knowledgeBases.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-card-border rounded">
          <Icon icon="lucide:database" width={24} height={24} className="mx-auto mb-2 text-muted" />
          <p className="text-xs text-muted/60 mb-2">
            No inform found.
          </p>
          <Link
            href="/knowledge"
            className="text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors inline-flex items-center gap-1"
          >
            <Icon icon="lucide:plus" width={12} height={12} />
            Create Inform
          </Link>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {knowledgeBases.map((kb) => {
            const isSelected = value.includes(kb.id)
            return (
              <button
                key={kb.id}
                type="button"
                onClick={() => toggleKB(kb.id)}
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
                    <Icon
                      icon="lucide:check"
                      width={12}
                      height={12}
                      className="text-white"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-foreground'}`}
                  >
                    {kb.name}
                  </p>
                  <p className="text-xs text-muted">
                    {kb.description ||
                      `${kb.itemCount} item${kb.itemCount !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt Selector Component
// ─────────────────────────────────────────────────────────────────────────────

interface PromptSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  prompts: SystemPrompt[]
  loading?: boolean
}

function PromptSelector({
  value,
  onChange,
  prompts,
  loading,
}: PromptSelectorProps) {
  function togglePrompt(promptId: string) {
    if (value.includes(promptId)) {
      onChange(value.filter((id) => id !== promptId))
    } else {
      onChange([...value, promptId])
    }
  }

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Stance <span className="text-muted font-normal ml-1">(optional)</span>
          
        </label>
        <div className="flex items-center gap-2 text-muted text-sm py-3">
          <Icon
            icon="lucide:loader-2"
            width={16}
            height={16}
            className="animate-spin"
          />
          Loading stances...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-foreground">
          Stance <span className="text-muted font-normal ml-1">(optional)</span>
        </label>
        <Link
          href="/prompts"
          className="text-xs text-accent hover:text-amber-300 flex items-center gap-1 transition-colors"
        >
          <Icon icon="lucide:plus" width={12} height={12} />
          Create New
        </Link>
      </div>
      {prompts.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-card-border rounded">
          <Icon icon="lucide:file-text" width={24} height={24} className="mx-auto mb-2 text-muted" />
          <p className="text-xs text-muted/60 mb-2">
            No stances found.
          </p>
          <Link
            href="/prompts"
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors inline-flex items-center gap-1"
          >
            <Icon icon="lucide:plus" width={12} height={12} />
            Create Stance
          </Link>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {prompts.map((prompt) => {
            const isSelected = value.includes(prompt.id)
            // Truncate content for preview
            const preview =
              prompt.content.length > 80
                ? prompt.content.substring(0, 80) + '...'
                : prompt.content
            return (
              <button
                key={prompt.id}
                type="button"
                onClick={() => togglePrompt(prompt.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-card-border hover:border-amber-400/50 hover:bg-white/[0.02]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400'
                      : 'border-muted'
                  }`}
                >
                  {isSelected && (
                    <Icon
                      icon="lucide:check"
                      width={12}
                      height={12}
                      className="text-white"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-foreground'}`}
                  >
                    {prompt.name}
                  </p>
                  <p className="text-xs text-muted truncate">{preview}</p>
                  {prompt.connectedKBName && (
                    <p className="text-xs text-amber-400/70 mt-0.5 flex items-center gap-1">
                      <Icon icon="lucide:database" width={10} height={10} />
                      {prompt.connectedKBName}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Gatherings Selector Component (for Projects only)
// ─────────────────────────────────────────────────────────────────────────────

interface GatheringsSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  games: Game[]
  loading?: boolean
}

function GatheringsSelector({
  value,
  onChange,
  games,
  loading,
}: GatheringsSelectorProps) {
  function toggleGathering(gatheringId: string) {
    if (value.includes(gatheringId)) {
      onChange(value.filter((id) => id !== gatheringId))
    } else {
      onChange([...value, gatheringId])
    }
  }

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Gatherings (Games)
          
        </label>
        <div className="flex items-center gap-2 text-muted text-sm py-3">
          <Icon
            icon="lucide:loader-2"
            width={16}
            height={16}
            className="animate-spin"
          />
          Loading games...
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        Gatherings (Games)
      </label>
      <p className="text-xs text-muted mb-3">
        Add games and experiences to this mission
      </p>
      {games.length === 0 ? (
        <p className="text-xs text-muted/60 py-2">
          No games found. Create one in the Games page.
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {games.map((game) => {
            const isSelected = value.includes(game.id)
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => toggleGathering(game.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'border-purple-400 bg-purple-400/10'
                    : 'border-card-border hover:border-purple-400/50 hover:bg-white/[0.02]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-purple-400 bg-purple-400'
                      : 'border-muted'
                  }`}
                >
                  {isSelected && (
                    <Icon
                      icon="lucide:check"
                      width={12}
                      height={12}
                      className="text-white"
                    />
                  )}
                </div>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-purple-400/20' : 'bg-white/[0.06]'
                  }`}
                >
                  <span className="text-base">{game.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-foreground'}`}
                    >
                      {game.name}
                    </p>
                    <span
                      className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        game.status === 'published'
                          ? 'bg-green-400/20 text-green-400'
                          : 'bg-amber-400/20 text-amber-400'
                      }`}
                    >
                      {game.status}
                    </span>
                  </div>
                  {game.description && (
                    <p className="text-xs text-muted line-clamp-1">
                      {game.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted flex items-center gap-1">
                      <Icon icon="lucide:map" width={10} height={10} />
                      {game.scenesCount} scene
                      {game.scenesCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Platform Modal
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateContextModalProps {
  onClose: () => void
  onCreate: (context: Context) => void
  wallet: string
  sponsorMode?: boolean
}

export function CreateContextModal({
  onClose,
  onCreate,
  wallet,
  sponsorMode = false,
}: CreateContextModalProps) {
  const initialDraft = loadPlatformDraft(wallet)
  const { user } = useAuth()
  const router = useRouter()
  const isWizard = user?.role === 'wizard'

  const [name, setName] = useState(initialDraft?.name || '')
  const [nameTouched, setNameTouched] = useState(false)
  const [handle, setHandle] = useState(initialDraft?.handle || '')
  const [handleTouched, setHandleTouched] = useState(false)
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [handleSuggestion, setHandleSuggestion] = useState<string | null>(null)
  const [handleChecking, setHandleChecking] = useState(false)
  const handleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCheckVersion = useRef(0)
  const [categories, setCategories] = useState<CategoryEntry[]>(initialDraft?.categories || [])
  const [description, setDescription] = useState(initialDraft?.description || '')
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [tagline, setTagline] = useState(initialDraft?.tagline || '')
  const [taglineTouched, setTaglineTouched] = useState(false)
  const [presenceIds, setPresenceIds] = useState<string[]>(initialDraft?.presenceIds || [])
  const [presenceTouched, setPresenceTouched] = useState(false)
  const [visibility, setVisibility] = useState<VisibilityLevel>(initialDraft?.visibility || 'public')
  const [knowledgeBases, setKnowledgeBases] = useState<string[]>(initialDraft?.knowledgeBases || [])
  const [instructionIds, setInstructionIds] = useState<string[]>(initialDraft?.instructionIds || [])
  const [isPrimary, setIsPrimary] = useState(initialDraft?.isPrimary || false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-save timer ref
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Always-current ref — updated on every render so handleXClose never reads stale closure values
  const latestDraftRef = useRef({ name, handle, categories, description, tagline, presenceIds, visibility, knowledgeBases, instructionIds, isPrimary })
  latestDraftRef.current = { name, handle, categories, description, tagline, presenceIds, visibility, knowledgeBases, instructionIds, isPrimary }

  // Debounced draft save
  useEffect(() => {
    if (!name && !handle && !description) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      savePlatformDraft({ ...latestDraftRef.current, savedAt: Date.now() }, wallet)
    }, AUTO_SAVE_DEBOUNCE_MS)
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
  }, [name, handle, categories, description, tagline, presenceIds, visibility, knowledgeBases, instructionIds, isPrimary])

  // Flush draft immediately and close (used by X button and backdrop)
  function handleXClose() {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    const d = latestDraftRef.current
    if (d.name || d.handle || d.description || d.presenceIds.length > 0) {
      savePlatformDraft({ ...d, savedAt: Date.now() }, wallet)
    }
    onClose()
  }

  // Fetch presences, knowledge bases, and prompts
  const [presences, setPresences] = useState<Presence[]>([])
  const [presencesLoading, setPresencesLoading] = useState(true)
  const [kbList, setKbList] = useState<KnowledgeBase[]>([])
  const [kbLoading, setKbLoading] = useState(true)
  const [promptList, setPromptList] = useState<SystemPrompt[]>([])
  const [promptsLoading, setPromptsLoading] = useState(true)
  const [showCreateAvatar, setShowCreateAvatar] = useState(false)

  async function refreshPresences() {
    const presenceData = await fetchPresences(wallet, 'movement')
    setPresences(presenceData)
  }

  useEffect(() => {
    async function loadData() {
      setPresencesLoading(true)
      setKbLoading(true)
      setPromptsLoading(true)

      const [presenceData, kbData, promptData] = await Promise.all([
        fetchPresences(wallet, 'movement'),
        fetchKnowledgeBases(wallet),
        fetchSystemPrompts(wallet),
      ])

      setPresences(presenceData)
      setPresencesLoading(false)
      setKbList(kbData)
      setKbLoading(false)
      setPromptList(promptData)
      setPromptsLoading(false)
    }
    loadData()
  }, [wallet])

  // Debounced handle availability check
  function scheduleHandleCheck(h: string) {
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current)
    setHandleAvailable(null)
    setHandleSuggestion(null)

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

  // Check handle on mount if restoring from draft
  useEffect(() => {
    if (handle && !handleAvailable && !handleChecking) {
      scheduleHandleCheck(handle)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function onNameChange(val: string) {
    setName(val)
    if (!handleTouched) {
      const suggested = suggestHandle(val)
      setHandle(suggested)
      scheduleHandleCheck(suggested)
    }
  }

  function onHandleChange(val: string) {
    const cleaned = val.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, HANDLE_MAX)
    setHandle(cleaned)
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
      setHandle(handleSuggestion)
      setHandleTouched(true)
      setHandleSuggestion(null)
      scheduleHandleCheck(handleSuggestion)
    }
  }

  // Validation errors (only max length)
  const nameError = nameTouched ? validateName(name) : null
  const handleFormatError = handleTouched ? validateHandle(handle) : null
  const handleAvailError =
    handle && !handleFormatError && handleAvailable === false
      ? `@${handle} is already taken`
      : null
  const handleError = handleFormatError || handleAvailError
  const descriptionError = descriptionTouched ? validateDescription(description) : null
  const taglineError = taglineTouched ? validateTagline(tagline) : null
  const presenceError = presenceTouched && presenceIds.length === 0 ? 'At least one presence is required' : null

  const canSubmit =
    name.trim() &&
    name.length <= NAME_MAX &&
    handle.trim() &&
    isValidHandle(handle) &&
    handleAvailable === true &&
    !handleChecking &&
    categories.length > 0 &&
    categories.some(c => c.isPrimary) &&
    description.trim() &&
    description.trim().length >= DESCRIPTION_MIN &&
    description.length <= DESCRIPTION_MAX &&
    !validateTagline(tagline) &&
    presenceIds.length > 0 &&
    !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Touch all fields to show validation
    setNameTouched(true)
    setHandleTouched(true)
    setDescriptionTouched(true)
    setPresenceTouched(true)
    
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const context = await apiCreateContext({
        name: name.trim(),
        handle: handle.trim(),
        categories,
        description: description.trim(),
        tagline: tagline.trim() || undefined,
        presenceIds: presenceIds,
        visibility,
        knowledgeBaseIds: knowledgeBases,
        instructionIds: instructionIds,
        isPrimary: isPrimary,
        createdBy: wallet,
      })

      clearPlatformDraft(wallet)
      onCreate(context)
    } catch (err) {
      const message = (err as Error).message
      if (message.toLowerCase().includes('handle') && message.toLowerCase().includes('taken')) {
        setHandleAvailable(false)
        setHandleSuggestion(null)
        setError(`The handle @${handle} was claimed. Please pick a new one.`)
        scheduleHandleCheck(handle)
      } else {
        setError(message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={sponsorMode ? undefined : handleXClose}
      />
      <div className="relative bg-card border border-card-border rounded w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-card-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center">
              <Icon
                icon="lucide:building-2"
                width={20}
                height={20}
                className="text-amber-400"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">
                  {sponsorMode ? 'Create your Kiduna' : 'New Kiduna'}
                </h2>
                {!sponsorMode && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-400">
                  Organization
                </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {sponsorMode
                  ? 'A Kiduna is your movement or community space'
                  : 'Create an organization-level kiduna'
                }
              </p>
            </div>
          </div>
          {!sponsorMode && (
          <button
            onClick={handleXClose}
            className="text-muted hover:text-white transition-colors p-1 cursor-pointer"
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          <div className="rounded-xl border border-card-border bg-card/50 p-4 space-y-4">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Basic Information
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Kiduna Name <span className="text-accent">*</span>
                </label>
                <span className={`text-xs tabular-nums ${nameError ? 'text-red-400' : 'text-muted'}`}>
                  {name.length}/{NAME_MAX}
                </span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder="e.g. Kinship Health, Acme Corp..."
                maxLength={NAME_MAX}
                autoFocus
                className={`w-full bg-input border rounded px-4 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                  nameError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'
                }`}
              />
              {nameError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {nameError}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Handle <span className="text-accent">*</span>{' '}
                <span className="text-muted font-normal ml-1">
                  (unique · max {HANDLE_MAX})
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
                  placeholder="kinship_health"
                  maxLength={HANDLE_MAX}
                  className={`w-full bg-input border rounded pl-8 pr-20 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                    handleError
                      ? 'border-red-500/50 focus:border-red-500/70'
                      : handleAvailable === true && handle
                        ? 'border-green-500/50 focus:border-green-500/70'
                        : 'border-card-border focus:border-accent/50'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {handleChecking && handle && !handleFormatError && (
                    <Icon icon="lucide:loader-2" width={14} height={14} className="text-muted animate-spin" />
                  )}
                  {!handleChecking && handleAvailable === true && handle && !handleFormatError && (
                    <Icon icon="lucide:check-circle-2" width={14} height={14} className="text-green-400" />
                  )}
                  <span className={`text-xs tabular-nums ${handle.length >= HANDLE_MAX ? 'text-red-400' : 'text-muted'}`}>
                    {handle.length}/{HANDLE_MAX}
                  </span>
                </span>
              </div>
              {handleFormatError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {handleFormatError}
                </p>
              )}
              {handleAvailError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {handleAvailError}
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
              {!handleError && handleAvailable === true && handle && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:check-circle-2" width={12} height={12} />
                  Handle is available
                </p>
              )}
            </div>
            <CategorySelector
              categories={categories}
              onChange={setCategories}
            />
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
                  placeholder="e.g. Building a healthier tomorrow, together"
                  maxLength={TAGLINE_MAX}
                  className={`w-full bg-input border rounded px-4 pr-20 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                    taglineError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'
                  }`}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${tagline.length >= TAGLINE_MAX ? 'text-red-400' : 'text-muted'}`}>
                  {tagline.length}/{TAGLINE_MAX}
                </span>
              </div>
              {taglineError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {taglineError}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Description <span className="text-accent">*</span>
                </label>
                <span className={`text-xs tabular-nums ${
                  description.length >= DESCRIPTION_MAX
                    ? 'text-red-400'
                    : description.length > 0 && description.length < DESCRIPTION_MIN
                      ? 'text-amber-400'
                      : 'text-muted'
                }`}>
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setDescriptionTouched(true)}
                placeholder="Describe this kiduna in detail — its purpose, goals, and community. Minimum 50 characters."
                rows={6}
                maxLength={DESCRIPTION_MAX}
                className={`w-full bg-input border rounded px-4 py-3 text-foreground placeholder:text-muted focus:outline-none text-sm resize-none transition-colors ${
                  descriptionError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'
                }`}
              />
              {descriptionError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {descriptionError}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-card-border bg-card/50 p-4 space-y-4">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Access & Agent
            </div>
            <PresenceMultiSelector
              value={presenceIds}
              onChange={setPresenceIds}
              presences={presences}
              loading={presencesLoading}
              required
              error={presenceError}
              onCreateNew={() => router.push('/agents/create/avatar?type=movement')}
            />
            <VisibilitySelector value={visibility} onChange={setVisibility} />
          </div>

          {/* Primary Movement Toggle (wizard only) */}
          {isWizard && (
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div className="flex items-center gap-2">
                <Icon icon="lucide:pin" width={16} height={16} className="text-amber-400" />
                <div>
                  <div className="text-sm font-medium text-white">Primary Movement</div>
                  <div className="text-xs text-muted">Appears first in the chat list for all users</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrimary(!isPrimary)}
                style={{
                  position: 'relative',
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  backgroundColor: isPrimary ? '#fbbf24' : 'rgba(255,255,255,0.1)',
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
                    transform: isPrimary ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {!sponsorMode && (
            <button
              type="button"
              onClick={() => { clearPlatformDraft(wallet); onClose() }}
              className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] border border-card-border text-foreground font-medium px-4 py-2.5 rounded transition-colors"
            >
              Cancel
            </button>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Icon
                  icon="lucide:loader-2"
                  width={16}
                  height={16}
                  className="animate-spin"
                />
              ) : (
                <Icon icon="lucide:plus" width={16} height={16} />
              )}
              {loading ? 'Creating…' : 'Create Kiduna'}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </form>
      </div>

      {showCreateAvatar && (
        <CreatePresenceModal
          wallet={wallet}
          platformId={undefined}
          onClose={() => setShowCreateAvatar(false)}
          onCreate={async (agent) => {
            setShowCreateAvatar(false)
            await refreshPresences()
            setPresenceIds((prev) => [...prev, agent.id])
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Project Modal
// ─────────────────────────────────────────────────────────────────────────────

interface CreateNestedContextModalProps {
  onClose: () => void
  onCreate: (nestedContext: NestedContext) => void
  contextId: string
  contextName: string
  wallet: string
  userId: string
}

function CreateNestedContextModal({
  onClose,
  onCreate,
  contextId,
  contextName,
  wallet,
  userId,
}: CreateNestedContextModalProps) {
  const initialDraft = loadProjectDraft(contextId, wallet)

  const [name, setName] = useState(initialDraft?.name || '')
  const [nameTouched, setNameTouched] = useState(false)
  const [handle, setHandle] = useState(initialDraft?.handle || '')
  const [handleTouched, setHandleTouched] = useState(false)
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [handleSuggestion, setHandleSuggestion] = useState<string | null>(null)
  const [handleChecking, setHandleChecking] = useState(false)
  const handleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCheckVersion = useRef(0)
  const [categories, setCategories] = useState<CategoryEntry[]>(initialDraft?.categories || [])
  const [description, setDescription] = useState(initialDraft?.description || '')
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [tagline, setTagline] = useState(initialDraft?.tagline || '')
  const [taglineTouched, setTaglineTouched] = useState(false)
  const [presenceIds, setPresenceIds] = useState<string[]>(initialDraft?.presenceIds || [])
  const [presenceTouched, setPresenceTouched] = useState(false)
  const [visibility, setVisibility] = useState<VisibilityLevel>(initialDraft?.visibility || 'public')
  const [knowledgeBases, setKnowledgeBases] = useState<string[]>(initialDraft?.knowledgeBases || [])
  const [gatherings, setGatherings] = useState<string[]>(initialDraft?.gatherings || [])
  const [instructionIds, setInstructionIds] = useState<string[]>(initialDraft?.instructionIds || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-save timer ref
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Always-current ref — updated on every render so handleXClose never reads stale closure values
  const latestDraftRef = useRef({ contextId, name, handle, categories, description, tagline, presenceIds, visibility, knowledgeBases, gatherings, instructionIds })
  latestDraftRef.current = { contextId, name, handle, categories, description, tagline, presenceIds, visibility, knowledgeBases, gatherings, instructionIds }

  // Debounced draft save
  useEffect(() => {
    if (!name && !handle && !description) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      saveProjectDraft({ ...latestDraftRef.current, savedAt: Date.now() }, wallet)
    }, AUTO_SAVE_DEBOUNCE_MS)
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
  }, [contextId, name, handle, categories, description, tagline, presenceIds, visibility, knowledgeBases, gatherings, instructionIds])

  // Flush draft immediately and close (used by X button and backdrop)
  function handleXClose() {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    const d = latestDraftRef.current
    if (d.name || d.handle || d.description || d.presenceIds.length > 0) {
      saveProjectDraft({ ...d, savedAt: Date.now() }, wallet)
    }
    onClose()
  }

  // Fetch presences, knowledge bases, prompts, and games
  const [presences, setPresences] = useState<Presence[]>([])
  const [presencesLoading, setPresencesLoading] = useState(true)
  const [kbList, setKbList] = useState<KnowledgeBase[]>([])
  const [kbLoading, setKbLoading] = useState(true)
  const [promptList, setPromptList] = useState<SystemPrompt[]>([])
  const [promptsLoading, setPromptsLoading] = useState(true)

  // Games from studio context (already loaded and working)
  const { games: studioGames, gamesLoading: studioGamesLoading } = useStudio()
  const gamesList = studioGames.map((g: any) => ({
    id: g.id,
    platformId: g.platformId || g.platform_id,
    name: g.name,
    slug: g.slug,
    description: g.description || '',
    icon: g.icon || '🎮',
    status: g.status || 'draft',
    scenesCount: g.scenesCount || g.scenes_count || 0,
    questsCount: g.questsCount || g.quests_count || 0,
  })) as Game[]
  const gamesLoading = studioGamesLoading

  useEffect(() => {
    async function loadData() {
      setPresencesLoading(true)
      setKbLoading(true)
      setPromptsLoading(true)

      const [presenceData, kbData, promptData] = await Promise.all([
        fetchPresences(wallet),
        fetchKnowledgeBases(wallet),
        fetchSystemPrompts(wallet),
      ])

      setPresences(presenceData.filter((p) => p.presenceSubtype?.toLowerCase() === 'mission'))
      setPresencesLoading(false)
      setKbList(kbData)
      setKbLoading(false)
      setPromptList(promptData)
      setPromptsLoading(false)
    }
    loadData()
  }, [wallet, contextId])

  // Debounced handle availability check
  function scheduleHandleCheck(h: string) {
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current)
    setHandleAvailable(null)
    setHandleSuggestion(null)

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

  // Check handle on mount if restoring from draft
  useEffect(() => {
    if (handle && !handleAvailable && !handleChecking) {
      scheduleHandleCheck(handle)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function onNameChange(val: string) {
    setName(val)
    if (!handleTouched) {
      const suggested = suggestHandle(val)
      setHandle(suggested)
      scheduleHandleCheck(suggested)
    }
  }

  function onHandleChange(val: string) {
    const cleaned = val.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, HANDLE_MAX)
    setHandle(cleaned)
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
      setHandle(handleSuggestion)
      setHandleTouched(true)
      setHandleSuggestion(null)
      scheduleHandleCheck(handleSuggestion)
    }
  }

  // Validation errors (only max length)
  const nameError = nameTouched ? validateName(name) : null
  const handleFormatError = handleTouched ? validateHandle(handle) : null
  const handleAvailError =
    handle && !handleFormatError && handleAvailable === false
      ? `@${handle} is already taken`
      : null
  const handleError = handleFormatError || handleAvailError
  const descriptionError = descriptionTouched ? validateDescription(description) : null
  const taglineError = taglineTouched ? validateTagline(tagline) : null
  const presenceError = presenceTouched && presenceIds.length === 0 ? 'At least one presence is required' : null

  const canSubmit =
    name.trim() &&
    name.length <= NAME_MAX &&
    handle.trim() &&
    isValidHandle(handle) &&
    handleAvailable === true &&
    !handleChecking &&
    categories.length > 0 &&
    categories.some(c => c.isPrimary) &&
    description.trim() &&
    description.trim().length >= DESCRIPTION_MIN &&
    description.length <= DESCRIPTION_MAX &&
    !validateTagline(tagline) &&
    presenceIds.length > 0 &&
    !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Touch all fields to show validation
    setNameTouched(true)
    setHandleTouched(true)
    setDescriptionTouched(true)
    setPresenceTouched(true)
    
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const nestedContext = await apiCreateNestedContext({
        contextId,
        name: name.trim(),
        handle: handle.trim(),
        categories,
        description: description.trim(),
        tagline: tagline.trim() || undefined,
        presenceIds: presenceIds,
        visibility,
        knowledgeBaseIds: knowledgeBases,
        gatheringIds: gatherings,
        instructionIds: instructionIds,
        createdBy: wallet,
      })
      clearProjectDraft(wallet)
      onCreate(nestedContext)
    } catch (err) {
      const message = (err as Error).message
      if (message.toLowerCase().includes('handle') && message.toLowerCase().includes('taken')) {
        setHandleAvailable(false)
        setHandleSuggestion(null)
        setError(`The handle @${handle} was claimed. Please pick a new one.`)
        scheduleHandleCheck(handle)
      } else {
        setError(message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleXClose}
      />
      <div className="relative bg-card border border-card-border rounded w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-card-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-400/15 flex items-center justify-center">
              <Icon
                icon="lucide:folder"
                width={20}
                height={20}
                className="text-purple-400"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">
                  New Mission
                </h2>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-400/20 text-purple-400">
                  Team
                </span>
              </div>
              <p className="text-xs text-muted">
                Create a mission in {contextName}
              </p>
            </div>
          </div>
          <button
            onClick={handleXClose}
            className="text-muted hover:text-white transition-colors p-1 cursor-pointer"
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          <div className="rounded-xl border border-card-border bg-card/50 p-4 space-y-4">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Basic Information
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Mission Name <span className="text-accent">*</span>
                </label>
                <span className={`text-xs tabular-nums ${nameError ? 'text-red-400' : 'text-muted'}`}>
                  {name.length}/{NAME_MAX}
                </span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder="e.g. Patient Care Team..."
                maxLength={NAME_MAX}
                autoFocus
                className={`w-full bg-input border rounded px-4 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                  nameError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'
                }`}
              />
              {nameError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {nameError}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Handle <span className="text-accent">*</span>{' '}
                <span className="text-muted font-normal ml-1">
                  (unique · max {HANDLE_MAX})
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
                  placeholder="patient_care"
                  maxLength={HANDLE_MAX}
                  className={`w-full bg-input border rounded pl-8 pr-20 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                    handleError
                      ? 'border-red-500/50 focus:border-red-500/70'
                      : handleAvailable === true && handle
                        ? 'border-green-500/50 focus:border-green-500/70'
                        : 'border-card-border focus:border-accent/50'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {handleChecking && handle && !handleFormatError && (
                    <Icon icon="lucide:loader-2" width={14} height={14} className="text-muted animate-spin" />
                  )}
                  {!handleChecking && handleAvailable === true && handle && !handleFormatError && (
                    <Icon icon="lucide:check-circle-2" width={14} height={14} className="text-green-400" />
                  )}
                  <span className={`text-xs tabular-nums ${handle.length >= HANDLE_MAX ? 'text-red-400' : 'text-muted'}`}>
                    {handle.length}/{HANDLE_MAX}
                  </span>
                </span>
              </div>
              {handleFormatError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {handleFormatError}
                </p>
              )}
              {handleAvailError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {handleAvailError}
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
              {!handleError && handleAvailable === true && handle && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:check-circle-2" width={12} height={12} />
                  Handle is available
                </p>
              )}
            </div>
            <CategorySelector
              categories={categories}
              onChange={setCategories}
            />
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
                  placeholder="e.g. Caring for every patient, every day"
                  maxLength={TAGLINE_MAX}
                  className={`w-full bg-input border rounded px-4 pr-20 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                    taglineError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'
                  }`}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${tagline.length >= TAGLINE_MAX ? 'text-red-400' : 'text-muted'}`}>
                  {tagline.length}/{TAGLINE_MAX}
                </span>
              </div>
              {taglineError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {taglineError}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Description <span className="text-accent">*</span>
                </label>
                <span className={`text-xs tabular-nums ${
                  description.length >= DESCRIPTION_MAX
                    ? 'text-red-400'
                    : description.length > 0 && description.length < DESCRIPTION_MIN
                      ? 'text-amber-400'
                      : 'text-muted'
                }`}>
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setDescriptionTouched(true)}
                placeholder="Describe this mission in detail — its purpose, goals, and team. Minimum 50 characters."
                rows={6}
                maxLength={DESCRIPTION_MAX}
                className={`w-full bg-input border rounded px-4 py-3 text-foreground placeholder:text-muted focus:outline-none text-sm resize-none transition-colors ${
                  descriptionError ? 'border-red-500/50' : 'border-card-border focus:border-accent/50'
                }`}
              />
              {descriptionError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" width={12} height={12} />
                  {descriptionError}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-card-border bg-card/50 p-4 space-y-4">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Access & Agent
            </div>
            <PresenceMultiSelector
              value={presenceIds}
              onChange={setPresenceIds}
              presences={presences}
              loading={presencesLoading}
              required
              error={presenceError}
            />
            <VisibilitySelector value={visibility} onChange={setVisibility} />
          </div>

          <div className="rounded-xl border border-card-border bg-card/50 p-4 space-y-4">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Gatherings
            </div>
            <GatheringsSelector
              value={gatherings}
              onChange={setGatherings}
              games={gamesList}
              loading={gamesLoading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { clearProjectDraft(wallet); onClose() }}
              className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] border border-card-border text-foreground font-medium px-4 py-2.5 rounded-[4px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Icon
                  icon="lucide:loader-2"
                  width={16}
                  height={16}
                  className="animate-spin"
                />
              ) : (
                <Icon icon="lucide:plus" width={16} height={16} />
              )}
              {loading ? 'Creating…' : 'Create Mission'}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Choice Modal
// ─────────────────────────────────────────────────────────────────────────────

interface CreateContextChoiceModalProps {
  onClose: () => void
  onChooseContext: () => void
  onChooseNestedContext: (contextId: string, contextName: string) => void
  contexts: ContextWithNested[]
  hasOwnedKiduna?: boolean
}

function CreateContextChoiceModal({
  onClose,
  onChooseContext,
  onChooseNestedContext,
  contexts,
  hasOwnedKiduna = false,
}: CreateContextChoiceModalProps) {
  const [selectedContext, setSelectedContext] =
    useState<ContextWithNested | null>(null)
  const [contextDropdownOpen, setContextDropdownOpen] = useState(false)
  const contextDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contextDropdownRef.current && !contextDropdownRef.current.contains(e.target as Node)) {
        setContextDropdownOpen(false)
      }
    }
    if (contextDropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextDropdownOpen])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      <div className="relative bg-card border border-card-border rounded w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-card-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Create New</h2>
            <p className="text-sm text-muted mt-1">
              Choose what to create
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors cursor-pointer"
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 gap-4">
          <button
            onClick={hasOwnedKiduna ? undefined : onChooseContext}
            disabled={hasOwnedKiduna}
            className={`group text-left bg-background border border-card-border rounded p-5 transition-all ${hasOwnedKiduna ? 'opacity-60 cursor-not-allowed' : 'hover:border-amber-400/60 hover:bg-amber-400/10 cursor-pointer'}`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${hasOwnedKiduna ? 'bg-white/[0.06]' : 'bg-amber-400/15 group-hover:bg-amber-400/25'}`}>
                <Icon
                  icon="lucide:building-2"
                  width={22}
                  height={22}
                  className={hasOwnedKiduna ? 'text-muted' : 'text-amber-400'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-white font-semibold text-base">
                    Top-level Kiduna
                  </h3>
                  {hasOwnedKiduna && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
                      <Icon icon="lucide:check" width={10} height={10} />
                      Already created
                    </span>
                  )}
                </div>
                {hasOwnedKiduna ? (
                  <p className="text-sm text-muted leading-relaxed">
                    You already have a top-level Kiduna. You can create Missions inside it.
                  </p>
                ) : (
                <p className="text-sm text-muted group-hover:text-foreground/80 leading-relaxed transition-colors">
                  Create an organization-level kiduna. Add Missions and a
                  Kiduna Presence.
                </p>
                )}
              </div>
              {!hasOwnedKiduna && (
              <Icon
                icon="lucide:chevron-right"
                width={18}
                height={18}
                className="text-muted group-hover:text-amber-400 transition-colors flex-shrink-0 mt-3"
              />
              )}
            </div>
          </button>

          <button
            onClick={() => {
              if (contexts.length === 0) return
              if (contexts.length === 1) {
                onChooseNestedContext(contexts[0].id, contexts[0].name)
              } else {
                setSelectedContext(contexts[0])
              }
            }}
            disabled={contexts.length === 0}
            className={`group text-left bg-background border border-card-border rounded p-5 transition-all ${contexts.length === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:border-purple-400/60 hover:bg-purple-400/10 cursor-pointer'}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${contexts.length === 0 ? 'bg-white/[0.06]' : 'bg-purple-400/15 group-hover:bg-purple-400/25'}`}
              >
                {contexts.length === 0 ? (
                  <Icon
                    icon="lucide:lock"
                    width={22}
                    height={22}
                    className="text-muted"
                  />
                ) : (
                  <Icon
                    icon="lucide:folder"
                    width={22}
                    height={22}
                    className="text-purple-400"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-white font-semibold text-base">
                    Mission
                  </h3>
                  {contexts.length === 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
                      <Icon icon="lucide:lock" width={10} height={10} />
                      Requires Kiduna
                    </span>
                  )}
                </div>
                {contexts.length === 0 ? (
                  <p className="text-sm text-muted leading-relaxed">
                    You must create a Kiduna first.
                    <br />
                    <span className="text-amber-400">
                      Create a Kiduna above to unlock.
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted group-hover:text-foreground/80 leading-relaxed transition-colors">
                    Create a team-level mission. Add Gatherings and a Mission
                    Presence.
                  </p>
                )}
              </div>
              <Icon
                icon="lucide:chevron-right"
                width={18}
                height={18}
                className="text-muted group-hover:text-purple-400 transition-colors flex-shrink-0 mt-3"
              />
            </div>
          </button>

          {selectedContext && contexts.length > 1 && (
            <div className="mt-4 p-4 bg-background border border-card-border rounded">
              <label className="block text-sm font-medium text-foreground mb-2">
                Choose Kiduna for Mission
              </label>
              <div className="relative" ref={contextDropdownRef}>
                <button
                  type="button"
                  onClick={() => setContextDropdownOpen((o) => !o)}
                  className="w-full bg-input border border-card-border rounded px-4 py-3 text-left focus:outline-none focus:border-accent/50 cursor-pointer flex items-center justify-between gap-2 transition-colors hover:border-white/30"
                >
                  <span className="text-foreground">{selectedContext.name}</span>
                  <Icon
                    icon={contextDropdownOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                    width={16}
                    height={16}
                    className="text-muted flex-shrink-0"
                  />
                </button>

                {contextDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-card-border rounded shadow-2xl overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      {contexts.map((c) => {
                        const isSelected = selectedContext.id === c.id
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setSelectedContext(c); setContextDropdownOpen(false) }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-accent/15 text-accent'
                                : 'text-foreground hover:bg-white/[0.06] hover:text-white'
                            }`}
                          >
                            <span>{c.name}</span>
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
              <button
                onClick={() =>
                  onChooseNestedContext(selectedContext.id, selectedContext.name)
                }
                className="w-full mt-3 bg-accent hover:bg-accent-dark text-white font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Icon icon="lucide:plus" width={16} height={16} />
                Create Mission in {selectedContext.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility Badge Component
// ─────────────────────────────────────────────────────────────────────────────

function VisibilityBadge({ visibility }: { visibility: VisibilityLevel }) {
  const config = VISIBILITY_OPTIONS.find((v) => v.value === visibility)
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-flex items-center gap-1 ${visibility === 'public' ? 'bg-green-400/20 text-green-400' : visibility === 'private' ? 'bg-amber-400/20 text-amber-400' : 'bg-red-400/20 text-red-400'}`}
    >
      <Icon icon={config?.icon || 'lucide:globe'} width={10} height={10} />
      {config?.label || visibility}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Context Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ContextPage() {
  const { user } = useAuth()
  const wallet = user?.wallet || ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMissionsView = searchParams.get('view') === 'missions'
  const [contexts, setContexts] = useState<ContextWithNestedAndPermissions[]>([])
  const [presences, setPresences] = useState<Presence[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedContexts, setExpandedContexts] = useState<Set<string>>(
    new Set()
  )
  const [expandedNestedLists, setExpandedNestedLists] = useState<Set<string>>(
    new Set()
  )
  const [showChoiceModal, setShowChoiceModal] = useState(false)
  const [showCreateContext, setShowCreateContext] = useState(false)
  const [showCreateNestedContext, setShowCreateNestedContext] = useState<{
    contextId: string
    contextName: string
  } | null>(null)

  // Onboarding: auto-open Kiduna creation

  useEffect(() => {
    if (false && !showCreateContext) {
      setShowCreateContext(true)
    }
  }, [false])

  // Status filter
  const [statusFilter, setStatusFilter] = useState<ContextStatus | 'all'>('all')

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    danger: boolean
    loading: boolean
    onConfirm: () => void
  }>({ open: false, title: '', message: '', confirmLabel: '', danger: false, loading: false, onConfirm: () => {} })

  // Drafts from localStorage
  const [contextDrafts, setContextDrafts] = useState<{ key: string; type: 'Kiduna' | 'Mission'; name: string; savedAt: number; contextId?: string }[]>([])

  useEffect(() => {
    const found: typeof contextDrafts = []
    try {
      const pd = localStorage.getItem(`kinship_platform_draft_${wallet}`)
      if (pd) {
        const d = JSON.parse(pd)
        if (d.savedAt && Date.now() - d.savedAt < 24 * 60 * 60 * 1000) {
          found.push({ key: `kinship_platform_draft_${wallet}`, type: 'Kiduna', name: d.name || 'Untitled Kiduna', savedAt: d.savedAt })
        }
      }
    } catch {}
    try {
      const pd2 = localStorage.getItem(`kinship_project_draft_${wallet}`)
      if (pd2) {
        const d = JSON.parse(pd2)
        if (d.savedAt && Date.now() - d.savedAt < 24 * 60 * 60 * 1000) {
          found.push({ key: `kinship_project_draft_${wallet}`, type: 'Mission', name: d.name || 'Untitled Mission', savedAt: d.savedAt, contextId: d.contextId })
        }
      }
    } catch {}
    setContextDrafts(found)
  }, [showCreateContext, showCreateNestedContext]) // re-check when modals close

  function deleteContextDraft(key: string) {
    try { localStorage.removeItem(key) } catch {}
    setContextDrafts((prev) => prev.filter((d) => d.key !== key))
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch only accessible contexts (owned OR has any permission via code redemption)
      if (user?.wallet) {
        const data = await listAccessibleContextsWithPermissions(user.wallet)
        setContexts(data)
        // Fetch presences, knowledge bases, and prompts
        const [presenceData, kbData, promptData] = await Promise.all([
          fetchPresences(user.wallet),
          fetchKnowledgeBases(user.wallet),
          fetchSystemPrompts(user.wallet),
        ])
        setPresences(presenceData)
        setKnowledgeBases(kbData)
        setSystemPrompts(promptData)
      } else {
        setContexts([])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [user?.wallet])

  useEffect(() => {
    loadData()
  }, [loadData])
  useEffect(() => {
    if (contexts.length > 0)
      setExpandedContexts(new Set(contexts.map((c) => c.id)))
  }, [contexts])

  function toggleContext(contextId: string) {
    setExpandedContexts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(contextId)) newSet.delete(contextId)
      else newSet.add(contextId)
      return newSet
    })
  }

  function toggleNestedList(contextId: string) {
    setExpandedNestedLists((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(contextId)) newSet.delete(contextId)
      else newSet.add(contextId)
      return newSet
    })
  }

  function getPresenceName(presenceId?: string | null): string | null {
    if (!presenceId) return null
    return presences.find((p) => p.id === presenceId)?.name || null
  }

  function getPresenceNames(presenceIds?: string[]): string[] {
    if (!presenceIds || presenceIds.length === 0) return []
    return presenceIds
      .map((id) => presences.find((p) => p.id === id)?.name)
      .filter((name): name is string => !!name)
  }

  function getKnowledgeBaseNames(kbIds?: string[]): string[] {
    if (!kbIds || kbIds.length === 0) return []
    return kbIds
      .map((id) => knowledgeBases.find((kb) => kb.id === id)?.name)
      .filter((name): name is string => !!name)
  }

  function getPromptNames(promptIds?: string[]): string[] {
    if (!promptIds || promptIds.length === 0) return []
    return promptIds
      .map((id) => systemPrompts.find((p) => p.id === id)?.name)
      .filter((name): name is string => !!name)
  }

  const totalNestedContexts = contexts.reduce(
    (acc, c) => acc + (c.nestedContexts?.length || 0),
    0
  )

  const filteredContexts = statusFilter === 'all'
    ? contexts
    : contexts.filter((c) => c.status === statusFilter)

  // ─── Lifecycle Actions ─────────────────────────────────────────────────────

  function requestDeleteContext(contextId: string, contextName: string) {
    setConfirmDialog({
      open: true,
      title: 'Delete Kiduna',
      message: `Are you sure you want to permanently delete "${contextName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      loading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }))
        try {
          await apiDeleteContext(contextId)
          setContexts((prev) => prev.filter((c) => c.id !== contextId))
        } catch (err) {
          console.error('Failed to delete context:', err)
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false, loading: false }))
        }
      },
    })
  }

  function requestDeleteNestedContext(nestedContextId: string, contextId: string, nestedContextName: string) {
    setConfirmDialog({
      open: true,
      title: 'Delete Mission',
      message: `Are you sure you want to permanently delete "${nestedContextName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      loading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }))
        try {
          await apiDeleteNestedContext(nestedContextId)
          setContexts((prev) =>
            prev.map((c) =>
              c.id === contextId
                ? { ...c, nestedContexts: c.nestedContexts.filter((nc) => nc.id !== nestedContextId) }
                : c
            )
          )
        } catch (err) {
          console.error('Failed to delete mission:', err)
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false, loading: false }))
        }
      },
    })
  }

  function requestArchiveContext(contextId: string, contextName: string) {
    setConfirmDialog({
      open: true,
      title: 'Archive Kiduna',
      message: `Archive "${contextName}"? It will be hidden from active views but can be restored later.`,
      confirmLabel: 'Archive',
      danger: false,
      loading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }))
        try {
          const updated = await apiArchiveContext(contextId)
          setContexts((prev) => prev.map((c) => c.id === contextId ? { ...c, ...updated } : c))
        } catch (err) {
          console.error('Failed to archive context:', err)
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false, loading: false }))
        }
      },
    })
  }

  function requestArchiveNestedContext(nestedContextId: string, contextId: string, nestedContextName: string) {
    setConfirmDialog({
      open: true,
      title: 'Archive Mission',
      message: `Archive "${nestedContextName}"? It will be hidden from active views but can be restored later.`,
      confirmLabel: 'Archive',
      danger: false,
      loading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }))
        try {
          const updated = await apiArchiveNestedContext(nestedContextId)
          setContexts((prev) =>
            prev.map((c) =>
              c.id === contextId
                ? { ...c, nestedContexts: c.nestedContexts.map((nc) => nc.id === nestedContextId ? { ...nc, ...updated } : nc) }
                : c
            )
          )
        } catch (err) {
          console.error('Failed to archive mission:', err)
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false, loading: false }))
        }
      },
    })
  }

  async function handlePublishContext(contextId: string) {
    try {
      const updated = await apiPublishContext(contextId)
      setContexts((prev) => prev.map((c) => c.id === contextId ? { ...c, ...updated } : c))
    } catch (err) { console.error('Failed to publish context:', err) }
  }

  async function handleUnpublishContext(contextId: string) {
    try {
      const updated = await apiUnpublishContext(contextId)
      setContexts((prev) => prev.map((c) => c.id === contextId ? { ...c, ...updated } : c))
    } catch (err) { console.error('Failed to unpublish context:', err) }
  }

  async function handleRestoreContext(contextId: string) {
    try {
      const updated = await apiUnpublishContext(contextId) // archived -> draft uses unpublish (draft transition)
      setContexts((prev) => prev.map((c) => c.id === contextId ? { ...c, ...updated } : c))
    } catch (err) { console.error('Failed to restore context:', err) }
  }

  async function handlePublishNestedContext(nestedContextId: string, contextId: string) {
    try {
      const updated = await apiPublishNestedContext(nestedContextId)
      setContexts((prev) =>
        prev.map((c) =>
          c.id === contextId
            ? { ...c, nestedContexts: c.nestedContexts.map((nc) => nc.id === nestedContextId ? { ...nc, ...updated } : nc) }
            : c
        )
      )
    } catch (err) { console.error('Failed to publish mission:', err) }
  }

  async function handleUnpublishNestedContext(nestedContextId: string, contextId: string) {
    try {
      const updated = await apiUnpublishNestedContext(nestedContextId)
      setContexts((prev) =>
        prev.map((c) =>
          c.id === contextId
            ? { ...c, nestedContexts: c.nestedContexts.map((nc) => nc.id === nestedContextId ? { ...nc, ...updated } : nc) }
            : c
        )
      )
    } catch (err) { console.error('Failed to unpublish mission:', err) }
  }

  async function handleRestoreNestedContext(nestedContextId: string, contextId: string) {
    try {
      const updated = await apiUnpublishNestedContext(nestedContextId)
      setContexts((prev) =>
        prev.map((c) =>
          c.id === contextId
            ? { ...c, nestedContexts: c.nestedContexts.map((nc) => nc.id === nestedContextId ? { ...nc, ...updated } : nc) }
            : c
        )
      )
    } catch (err) { console.error('Failed to restore mission:', err) }
  }

  // Navigate to context detail page
  function handleContextClick(context: ContextWithNested) {
    router.push(`/context/${context.id}`)
  }

  return (
    <div className="max-w-full overflow-hidden">
      {/* Onboarding Banner */}
      {false && (
        <>
        {/* Floating step badge (visible above modal) */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-card border border-accent/30 shadow-2xl flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/15 text-accent">Step 4 of 5</span>
          <span className="text-sm font-semibold text-white">Create a Kiduna — set up your movement or community</span>
        </div>
        <div style={{ marginBottom: 20, padding: '16px 20px', display: showCreateContext ? 'none' : 'block', borderRadius: 14, background: 'rgba(255,41,195,0.06)', border: '1px solid rgba(255,41,195,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FF29C3', background: 'rgba(255,41,195,0.15)', padding: '2px 8px', borderRadius: 6 }}>Step 4 of 5</span>
          </div>
          <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '4px 0 2px' }}>Create your first Kiduna</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>A Kiduna is your community or movement space. Fill in the details, create an avatar for it, then you&apos;re ready to invite others.</p>
        </div>
        </>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{isMissionsView ? 'Missions' : 'Kidunas'}</h1>
          <p className="text-muted mt-1">
            {isMissionsView
              ? `${totalNestedContexts} mission${totalNestedContexts !== 1 ? 's' : ''}`
              : `${contexts.length} kiduna${contexts.length !== 1 ? 's' : ''} • ${totalNestedContexts} mission${totalNestedContexts !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        {!isMissionsView && (user?.subscription === 'sponsor' || user?.role === 'wizard') && (
        <button
          onClick={() => setShowChoiceModal(true)}
          className="bg-accent hover:bg-accent-hover text-on-accent font-semibold px-5 py-2.5 rounded-[4px] transition-colors flex items-center gap-2 flex-shrink-0"        >
          <Icon icon="lucide:plus" width={18} height={18} />
          Create New Kiduna
        </button>
        )}
      </div>

      {/* Drafts */}
      {!isMissionsView && contextDrafts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Icon icon="lucide:file-edit" width={14} height={14} />
            Unsaved Drafts
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {contextDrafts.map((draft) => (
              <div
                key={draft.key}
                className="flex-shrink-0 bg-card border border-dashed border-accent/30 rounded-xl p-4 min-w-[220px] max-w-[280px]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    icon={draft.type === 'Kiduna' ? 'lucide:flag' : 'lucide:target'}
                    width={16}
                    height={16}
                    className={draft.type === 'Kiduna' ? 'text-accent' : 'text-purple-400'}
                  />
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    draft.type === 'Kiduna' ? 'bg-accent/15 text-accent' : 'bg-purple-500/15 text-purple-400'
                  }`}>
                    {draft.type}
                  </span>
                </div>
                <p className="text-sm font-medium text-white truncate mb-1">{draft.name}</p>
                <p className="text-[10px] text-muted mb-3">
                  Saved {new Date(draft.savedAt).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (draft.type === 'Kiduna') {
                        setShowCreateContext(true)
                      } else if (draft.type === 'Mission' && draft.contextId) {
                        // Find parent context name from loaded contexts
                        const parentCtx = contexts.find((c) => c.id === draft.contextId)
                        setShowCreateNestedContext({
                          contextId: draft.contextId,
                          contextName: parentCtx?.name || 'Kiduna',
                        })
                      }
                    }}
                    className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => deleteContextDraft(draft.key)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      {!loading && !error && !isMissionsView && contexts.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {([
            { value: 'all' as const, label: 'All' },
            { value: 'draft' as const, label: 'Drafts' },
            { value: 'published' as const, label: 'Published' },
            { value: 'archived' as const, label: 'Archived' },
          ]).map((tab) => {
            const count = tab.value === 'all' ? contexts.length : contexts.filter((c) => c.status === tab.value).length
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.value
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  statusFilter === tab.value ? 'bg-accent/20' : 'bg-white/10'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <style>{`@keyframes cx-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: 'rgba(245,158,11,0.3)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'cx-shimmer 1.4s ease-in-out infinite', zIndex: 1 }} />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* icon */}
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.12)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* name + badges row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div style={{ height: 18, width: '35%', borderRadius: 5, background: 'rgba(255,255,255,0.08)' }} />
                      <div style={{ height: 16, width: 52, borderRadius: 99, background: 'rgba(245,158,11,0.15)' }} />
                      <div style={{ height: 16, width: 44, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                    {/* handle */}
                    <div style={{ height: 12, width: '20%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 8 }} />
                    {/* description */}
                    <div style={{ height: 13, width: '90%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 5 }} />
                    <div style={{ height: 13, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 10 }} />
                    {/* meta chips */}
                    <div className="flex items-center gap-4">
                      {[48, 72, 56].map((w, j) => (
                        <div key={j} style={{ height: 12, width: w, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* nested missions stub */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: j === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(168,85,247,0.12)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 13, width: '40%', borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 5 }} />
                      <div style={{ height: 11, width: '25%', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-xl bg-red-400/15 flex items-center justify-center mx-auto mb-4">
            <Icon
              icon="lucide:alert-circle"
              width={32}
              height={32}
              className="text-red-400"
            />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Failed to load contexts
          </h3>
          <p className="text-muted mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={loadData}
            className="bg-accent hover:bg-accent-hover text-on-accent font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Missions View ──────────────────────────────────── */}
      {!loading && !error && isMissionsView && (() => {
        const allMissions = contexts.flatMap((ctx) =>
          (ctx.nestedContexts || []).map((nc) => ({ ...nc, parentContext: ctx }))
        )
        if (allMissions.length === 0) return (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-xl bg-purple-400/15 flex items-center justify-center mx-auto mb-4">
              <Icon icon="lucide:target" width={32} height={32} className="text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No missions yet</h3>
            <p className="text-muted mb-6 max-w-md mx-auto">
              Missions are created inside a Kiduna. Go to a Kiduna to add missions.
            </p>
          </div>
        )
        return (
          <div className="space-y-3">
            {allMissions.map((mission) => (
              <div
                key={mission.id}
                onClick={() => router.push(`/context/${mission.parentContext.id}/project/${mission.id}`)}
                className="bg-card border border-card-border rounded p-5 cursor-pointer hover:bg-white/[0.02] transition-colors group"
                style={{ borderLeftWidth: 3, borderLeftColor: '#a855f7' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-purple-400/15 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-400/25 transition-colors">
                      <Icon icon="lucide:target" width={20} height={20} className="text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors truncate">
                          {mission.name}
                        </h3>
                      </div>
                      {mission.handle && (
                        <p className="text-xs text-muted/70 mb-1">@{mission.handle}</p>
                      )}
                      {mission.tagline && (
                        <p className="text-sm text-muted truncate">{mission.tagline}</p>
                      )}
                      <p className="text-xs text-muted/50 mt-1">
                        in <span className="text-amber-400/70">{mission.parentContext.name}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Contexts List (default view) ──────────────────── */}
      {!loading && !error && !isMissionsView && filteredContexts.length > 0 && (
        <div className="space-y-4">
          {filteredContexts.map((context) => {
            const isExpanded = expandedContexts.has(context.id)
            const presenceNames = getPresenceNames(context.presenceIds)
            const contextNestedContexts = context.nestedContexts || []
            // Use permissions from API
            const { isOwner, canEdit, canDelete } = context.permissions

            return (
              <div
                key={context.id}
                className="bg-card border border-card-border rounded overflow-hidden"
                style={{ borderLeftWidth: 3, borderLeftColor: '#f59e0b' }}
              >
                {/* Make the entire card clickable */}
                <div 
                  className="p-3 sm:p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => handleContextClick(context)}
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1 group">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-amber-400/15 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-400/25 transition-colors">
                        <Icon
                          icon="lucide:building-2"
                          width={20}
                          height={20}
                          className="text-amber-400"
                        />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-white font-semibold text-sm sm:text-lg group-hover:text-accent transition-colors truncate">
                            {context.name}
                          </h3>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-400 flex-shrink-0">
                            Kiduna
                          </span>
                          {isOwner ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex-shrink-0 flex items-center gap-1">
                              <Icon icon="lucide:user" width={10} height={10} />
                              Owner
                            </span>
                          ) : canEdit ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex-shrink-0 flex items-center gap-1">
                              <Icon icon="lucide:edit" width={10} height={10} />
                              Editor
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 flex-shrink-0 flex items-center gap-1">
                              <Icon icon="lucide:eye" width={10} height={10} />
                              Viewer
                            </span>
                          )}
                          <VisibilityBadge visibility={context.visibility} />
                          <ContextStatusBadge status={context.status} />
                        </div>
                        {context.handle && (
                          <p className="text-xs text-muted/70 mb-1 truncate">
                            @{context.handle}
                          </p>
                        )}
                        {context.description && (
                          <p className="text-sm text-muted line-clamp-2 break-all overflow-hidden">
                            {context.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Icon icon="lucide:folder" width={12} height={12} />
                            {contextNestedContexts.length} mission
                            {contextNestedContexts.length !== 1 ? 's' : ''}
                          </span>
                          {presenceNames.length > 0 && (
                            <span className="text-xs text-accent flex items-center gap-1">
                              <Icon icon="lucide:bot" width={12} height={12} />
                              {presenceNames.length === 1 ? presenceNames[0] : `${presenceNames.length} avatars`}
                            </span>
                          )}
                          {context.knowledgeBaseIds?.length > 0 && (
                            <span className="text-xs text-muted flex items-center gap-1">
                              <Icon
                                icon="lucide:database"
                                width={12}
                                height={12}
                              />
                              {context.knowledgeBaseIds.length} KB
                              {context.knowledgeBaseIds.length !== 1
                                ? 's'
                                : ''}
                            </span>
                          )}
                          {context.instructions && (
                            <span className="text-xs text-muted flex items-center gap-1">
                              <Icon
                                icon="lucide:file-text"
                                width={12}
                                height={12}
                              />
                              Instructions
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowCreateNestedContext({
                              contextId: context.id,
                              contextName: context.name,
                            })
                          }}
                          className="text-xs px-2 sm:px-3 py-1.5 rounded-lg bg-purple-400/10 text-purple-400 hover:bg-purple-400/20 transition-colors flex items-center gap-1"
                        >
                          <Icon icon="lucide:plus" width={12} height={12} />
                          <span className="hidden sm:inline">Add Mission</span>
                        </button>
                      )}
                      {canDelete && (
                        <ContextActionMenu
                          status={context.status}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          onPublish={() => handlePublishContext(context.id)}
                          onUnpublish={() => handleUnpublishContext(context.id)}
                          onArchive={() => requestArchiveContext(context.id, context.name)}
                          onRestore={() => handleRestoreContext(context.id)}
                          onDelete={() => requestDeleteContext(context.id, context.name)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && contextNestedContexts.length > 0 && (
                  <div className="border-t border-card-border bg-background/50">
                    {expandedNestedLists.has(context.id) && contextNestedContexts.map((nestedContext, idx) => {
                      const nestedContextPresenceNames = getPresenceNames(
                        nestedContext.presenceIds
                      )
                      const isLast = idx === contextNestedContexts.length - 1
                      return (
                        <div
                          key={nestedContext.id}
                          onClick={() => router.push(`/context/${context.id}/project/${nestedContext.id}`)}
                          className={`p-3 sm:p-4 pl-6 sm:pl-20 flex items-start justify-between gap-2 sm:gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors group ${!isLast ? 'border-b border-card-border/50' : ''}`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg bg-purple-400/15 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-400/25 transition-colors">
                              <Icon
                                icon="lucide:folder"
                                width={18}
                                height={18}
                                className="text-purple-400"
                              />
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <h4 className="text-white font-medium truncate max-w-[150px] sm:max-w-[250px] md:max-w-none group-hover:text-purple-400 transition-colors">
                                  {nestedContext.name}
                                </h4>
                                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-400 flex-shrink-0">
                                  Mission
                                </span>
                                <VisibilityBadge
                                  visibility={nestedContext.visibility}
                                />
                                <ContextStatusBadge status={nestedContext.status} />
                              </div>
                              {nestedContext.handle && (
                                <p className="text-xs text-muted/70 truncate">
                                  @{nestedContext.handle}
                                </p>
                              )}
                              {nestedContext.description && (
                                <p className="text-sm text-muted mt-1 line-clamp-1 break-all overflow-hidden">
                                  {nestedContext.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                {nestedContextPresenceNames.length > 0 && (
                                  <span className="text-xs text-accent flex items-center gap-1">
                                    <Icon
                                      icon="lucide:bot"
                                      width={11}
                                      height={11}
                                    />
                                    {nestedContextPresenceNames.length === 1 ? nestedContextPresenceNames[0] : `${nestedContextPresenceNames.length} avatars`}
                                  </span>
                                )}
                                {nestedContext.gatheringIds?.length > 0 && (
                                  <span className="text-xs text-purple-400 flex items-center gap-1">
                                    <Icon
                                      icon="lucide:gamepad-2"
                                      width={11}
                                      height={11}
                                    />
                                    {nestedContext.gatheringIds.length} Gathering
                                    {nestedContext.gatheringIds.length !== 1
                                      ? 's'
                                      : ''}
                                  </span>
                                )}
                                {nestedContext.knowledgeBaseIds?.length > 0 && (
                                  <span className="text-xs text-muted flex items-center gap-1">
                                    <Icon
                                      icon="lucide:database"
                                      width={11}
                                      height={11}
                                    />
                                    {nestedContext.knowledgeBaseIds.length} KB
                                    {nestedContext.knowledgeBaseIds.length !== 1
                                      ? 's'
                                      : ''}
                                  </span>
                                )}
                                {nestedContext.instructions && (
                                  <span className="text-xs text-muted flex items-center gap-1">
                                    <Icon
                                      icon="lucide:file-text"
                                      width={11}
                                      height={11}
                                    />
                                    Instructions
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {canDelete && (
                            <ContextActionMenu
                              status={nestedContext.status}
                              canEdit={canEdit}
                              canDelete={canDelete}
                              onPublish={() => handlePublishNestedContext(nestedContext.id, context.id)}
                              onUnpublish={() => handleUnpublishNestedContext(nestedContext.id, context.id)}
                              onArchive={() => requestArchiveNestedContext(nestedContext.id, context.id, nestedContext.name)}
                              onRestore={() => handleRestoreNestedContext(nestedContext.id, context.id)}
                              onDelete={() => requestDeleteNestedContext(nestedContext.id, context.id, nestedContext.name)}
                            />
                          )}
                        </div>
                      )
                    })}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleNestedList(context.id)
                      }}
                      className="w-full py-2.5 pl-20 pr-4 flex items-center gap-2 text-xs text-muted hover:text-white hover:bg-white/[0.03] transition-colors"
                    >
                      <Icon
                        icon={expandedNestedLists.has(context.id) ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                        width={14}
                        height={14}
                      />
                      {expandedNestedLists.has(context.id)
                        ? 'Hide missions'
                        : `Show ${contextNestedContexts.length} mission${contextNestedContexts.length !== 1 ? 's' : ''}`
                      }
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state for filtered results (contexts exist but none match current filter) */}
      {!loading && !error && !isMissionsView && contexts.length > 0 && filteredContexts.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-xl bg-amber-400/15 flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:folder-search" width={32} height={32} className="text-amber-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No {statusFilter === 'all' ? '' : statusFilter} kidunas
          </h3>
          <p className="text-muted mb-6 max-w-md mx-auto">
            {statusFilter === 'draft' && "You don't have any draft kidunas. Create a new kiduna to get started."}
            {statusFilter === 'published' && "You don't have any published kidunas yet. Publish a draft kiduna to make it active."}
            {statusFilter === 'archived' && "You don't have any archived kidunas."}
            {statusFilter !== 'all' && statusFilter !== 'draft' && statusFilter !== 'published' && statusFilter !== 'archived' && `No kidunas found with "${statusFilter}" status.`}
          </p>
        </div>
      )}

      {!loading && !error && !isMissionsView && contexts.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-xl bg-amber-400/15 flex items-center justify-center mx-auto mb-4">
            <Icon
              icon="lucide:folder-tree"
              width={32}
              height={32}
              className="text-amber-400"
            />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No accessible kidunas
          </h3>
          <p className="text-muted mb-6 max-w-md mx-auto">
            {(user?.subscription === 'sponsor' || user?.role === 'wizard')
              ? "You don't have any kidunas yet. Create one to get started, or redeem an invitation code to access a shared kiduna."
              : "You don't have any kidunas yet. Redeem an invitation code to access a shared kiduna, or upgrade to Sponsor to create your own."}
          </p>
          {(user?.subscription === 'sponsor' || user?.role === 'wizard') && (
          <button
            onClick={() => setShowChoiceModal(true)}
            className="bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-3 rounded-[4px] transition-colors"
          >
            + Create New Kiduna
          </button>
          )}
        </div>
      )}

      {showChoiceModal && (
        <CreateContextChoiceModal
          onClose={() => setShowChoiceModal(false)}
          onChooseContext={() => {
            setShowChoiceModal(false)
            setShowCreateContext(true)
          }}
          onChooseNestedContext={(contextId, contextName) => {
            setShowChoiceModal(false)
            setShowCreateNestedContext({ contextId, contextName })
          }}
          contexts={contexts}
          hasOwnedKiduna={contexts.some(c => c.permissions?.isOwner)}
        />
      )}
      {showCreateContext && user?.wallet && (
        <CreateContextModal
          onClose={() => setShowCreateContext(false)}
          
          onCreate={(context) => {
            setContexts([...contexts, { 
              ...context, 
              nestedContexts: [],
              permissions: {
                isOwner: true,
                canEdit: true,
                canDelete: true,
              }
            }])
            setShowCreateContext(false)
            window.dispatchEvent(new Event('kiduna-created'))
          }}
          wallet={user.wallet}
        />
      )}
      {showCreateNestedContext && user?.wallet && (
        <CreateNestedContextModal
          onClose={() => setShowCreateNestedContext(null)}
          onCreate={(nestedContext) => {
            setContexts((prev) =>
              prev.map((c) =>
                c.id === showCreateNestedContext.contextId
                  ? { ...c, nestedContexts: [...c.nestedContexts, nestedContext] }
                  : c
              )
            )
            setShowCreateNestedContext(null)
          }}
          contextId={showCreateNestedContext.contextId}
          contextName={showCreateNestedContext.contextName}
          wallet={user.wallet}
          userId={user.id}
        />
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
  )
}
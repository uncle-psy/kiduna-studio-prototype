/**
 * Seek API Client
 *
 * Mirrors the Flutter app's Seek services:
 *   - ContextService  → movements (contexts) + missions (nested contexts)
 *   - AgentsService   → members / avatars
 *   - CodeService     → invite-code preview, membership check, join / redeem
 *
 * All of these live on the Agents backend (Flutter: AGENTS_API_URL),
 * which in web is NEXT_PUBLIC_AGENT_API_URL — the same base the Chat page
 * already uses for /api/agents/public.
 *
 * Markets are NOT re-implemented here — the Seek list reuses the existing
 * `getLiveMarkets()` from lib/market-api.ts (Studio backend).
 *
 * Auth: most Seek endpoints are wallet-based and unauthenticated, matching
 * Flutter's CodeService (raw http, no bearer). We still attach the bearer
 * token when present, consistent with market-api.ts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

// ─────────────────────────────────────────────────────────────────────────────
// Types  (mirror Flutter models: context_model.dart, agent.dart, code_preview.dart)
// ─────────────────────────────────────────────────────────────────────────────

/** Mirrors NestedContext (a Mission inside a Movement). */
export interface NestedContext {
  id: string
  contextId: string
  name: string
  slug: string
  handle?: string | null
  contextType?: string | null
  description: string
  icon: string
  color: string
  presenceIds: string[]
  visibility: string
  status: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Mirrors KinshipContext (a Movement). */
export interface KinshipContext {
  id: string
  name: string
  slug: string
  handle?: string | null
  contextType?: string | null
  description: string
  icon: string
  color: string
  presenceIds: string[]
  visibility: string
  status: string
  createdBy: string
  nestedContextsCount: number
  nestedContexts: NestedContext[]
  createdAt: string
  updatedAt: string
  isPrimary: boolean
}

/** Mirrors Agent (a Member / avatar). */
export interface Agent {
  id: string
  name: string
  handle: string
  type: string
  status: string
  description?: string | null
  tagline?: string | null
  presenceSubtype?: string | null
  accessLevel: string
  tone: string
  isPublic: boolean
  wallet?: string | null
  parentId?: string | null
  isPrimaryMember: boolean
  createdAt: string
  updatedAt: string
  templateIds?: string[]
}

/** Mirrors MembershipResult. */
export interface MembershipResult {
  isMember: boolean
  wallet: string
  contextId?: string | null
  role?: string | null
  redeemedAt?: string | null
  codeString?: string | null
}

export interface ContextPreview {
  id: string
  name: string
  icon: string
  color: string
}

/** Mirrors CodePreviewResult. */
export interface CodePreviewResult {
  valid: boolean
  code: string
  accessType?: string | null
  role?: string | null
  context?: ContextPreview | null
  marketId?: string | null
  marketName?: string | null
  expiresAt?: string | null
  isExpired: boolean
  errorCode?: string | null
  message?: string | null
}

export interface JoinResult {
  success: boolean
  message?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived helpers (mirror Flutter computed getters)
// ─────────────────────────────────────────────────────────────────────────────

export const displayHandle = (c: { handle?: string | null; slug: string }) =>
  c.handle && c.handle.length > 0 ? c.handle : c.slug

export const avatarCount = (c: { presenceIds: string[] }) =>
  c.presenceIds.length

export const isActiveStatus = (status: string) => status !== 'archived'

export const isMemberAvatar = (a: Agent) =>
  a.type?.toUpperCase() === 'PRESENCE' &&
  a.presenceSubtype?.toUpperCase() === 'MEMBER'

export const isBigAvatar = (a: Agent) =>
  a.type?.toUpperCase() === 'PRESENCE' &&
  a.presenceSubtype?.toUpperCase() === 'BIG_AVATAR'

export const isActiveAgent = (a: Agent) => a.status?.toUpperCase() === 'ACTIVE'

/** Parse a "#RRGGBB" movement/mission color, with fallback. */
export function parseColor(
  hex: string | null | undefined,
  fallback: string
): string {
  if (!hex) return fallback
  const h = hex.startsWith('#') ? hex : `#${hex}`
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h : fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON → model mappers (mirror fromJson, tolerant of snake_case + camelCase)
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapNestedContext(j: any): NestedContext {
  return {
    id: j.id ?? '',
    contextId: j.context_id ?? j.contextId ?? '',
    name: j.name ?? '',
    slug: j.slug ?? '',
    handle: j.handle ?? null,
    contextType: j.context_type ?? j.contextType ?? null,
    description: j.description ?? '',
    icon: j.icon ?? '📁',
    color: j.color ?? '#A855F7',
    presenceIds: Array.isArray(j.presence_ids)
      ? j.presence_ids
      : Array.isArray(j.presenceIds)
        ? j.presenceIds
        : [],
    visibility: j.visibility ?? 'public',
    status: j.status ?? 'draft',
    createdBy: j.created_by ?? j.createdBy ?? '',
    createdAt: j.created_at ?? j.createdAt ?? '',
    updatedAt: j.updated_at ?? j.updatedAt ?? '',
  }
}

function mapContext(j: any): KinshipContext {
  return {
    id: j.id ?? '',
    name: j.name ?? '',
    slug: j.slug ?? '',
    handle: j.handle ?? null,
    contextType: j.context_type ?? j.contextType ?? null,
    description: j.description ?? '',
    icon: j.icon ?? '🎮',
    color: j.color ?? '#4CADA8',
    presenceIds: Array.isArray(j.presence_ids)
      ? j.presence_ids
      : Array.isArray(j.presenceIds)
        ? j.presenceIds
        : [],
    visibility: j.visibility ?? 'public',
    status: j.status ?? 'draft',
    createdBy: j.created_by ?? j.createdBy ?? '',
    nestedContextsCount: j.nested_contexts_count ?? j.nestedContextsCount ?? 0,
    nestedContexts: Array.isArray(j.nested_contexts)
      ? j.nested_contexts.map(mapNestedContext)
      : Array.isArray(j.nestedContexts)
        ? j.nestedContexts.map(mapNestedContext)
        : [],
    createdAt: j.created_at ?? j.createdAt ?? '',
    updatedAt: j.updated_at ?? j.updatedAt ?? '',
    isPrimary: j.is_primary ?? j.isPrimary ?? false,
  }
}

function mapAgent(j: any): Agent {
  return {
    id: j.id ?? '',
    name: j.name ?? '',
    handle: j.handle ?? '',
    type: j.type ?? 'PRESENCE',
    status: j.status ?? 'INACTIVE',
    description: j.description ?? null,
    tagline: j.tagline ?? j.briefDescription ?? null,
    presenceSubtype: j.presenceSubtype ?? j.presence_subtype ?? null,
    accessLevel: j.accessLevel ?? j.access_level ?? 'PUBLIC',
    tone: j.tone ?? 'FRIENDLY',
    isPublic: j.isPublic ?? j.is_public ?? false,
    wallet: j.wallet ?? null,
    parentId: j.parentId ?? j.parent_id ?? null,
    isPrimaryMember: j.isPrimaryMember ?? j.is_primary_member ?? false,
    createdAt: j.createdAt ?? j.created_at ?? '',
    updatedAt: j.updatedAt ?? j.updated_at ?? '',
    templateIds: j.templateIds ?? j.template_ids ?? [],
  }
}

function mapMembership(j: any, walletFallback: string): MembershipResult {
  return {
    isMember: j.is_member ?? j.isMember ?? false,
    wallet: j.wallet ?? walletFallback,
    contextId: j.context_id ?? j.contextId ?? null,
    role: j.role ?? null,
    redeemedAt: j.redeemed_at ?? j.redeemedAt ?? null,
    codeString: j.code_string ?? j.codeString ?? null,
  }
}

function mapCodePreview(j: any, rawCode: string): CodePreviewResult {
  return {
    valid: j.valid ?? false,
    code: j.code ?? rawCode,
    accessType: j.access_type ?? j.accessType ?? null,
    role: j.role ?? null,
    context: j.context
      ? {
          id: j.context.id ?? '',
          name: j.context.name ?? '',
          icon: j.context.icon ?? '🎮',
          color: j.context.color ?? '#4CADA8',
        }
      : null,
    marketId: j.market_id ?? j.marketId ?? null,
    marketName: j.market_name ?? j.marketName ?? null,
    expiresAt: j.expires_at ?? j.expiresAt ?? null,
    isExpired: j.is_expired ?? j.isExpired ?? false,
    errorCode: j.error_code ?? j.errorCode ?? null,
    message: j.message ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal fetch helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function agentGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    const url = new URL(`${AGENT_API_URL}${path}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    }
    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    })
    if (!res.ok) {
      console.error(`[SeekAPI] GET ${path} → ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`[SeekAPI] GET ${path} error:`, err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Codes  (mirror CodeService — wallet-based, like Flutter's raw http calls)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a code string into the canonical KIN-XXXXXX-XXX format.
 * Mirrors CodeService.normalizeCode().
 */
export function normalizeCode(raw: string): string {
  const clean = raw.trim().toUpperCase()
  const stripped = clean.replace(/-/g, '')
  if (stripped.length === 12 && stripped.startsWith('KIN')) {
    return `${stripped.substring(0, 3)}-${stripped.substring(3, 9)}-${stripped.substring(9, 12)}`
  }
  if (clean.startsWith('KIN-') && clean.length === 14) return clean
  return clean
}

// ─────────────────────────────────────────────────────────────────────────────
// Contexts / Movements  (mirror ContextService)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all published movements. Mirrors ContextService.getAllContexts(). */
export async function getAllContexts(): Promise<KinshipContext[]> {
  const data = await agentGet<any[]>('/api/v1/context', {
    include_nested: 'true',
    status: 'published',
    exclude_primary: 'true',
  })
  if (!Array.isArray(data)) return []
  return data.map(mapContext)
}

/** Fetch a single movement by id (with nested missions). Mirrors getContextById(). */
export async function getContextById(
  contextId: string
): Promise<KinshipContext | null> {
  const data = await agentGet<any>(`/api/v1/context/${contextId}`)
  if (!data) return null
  return mapContext(data)
}

/** Fetch the missions (nested contexts) that belong to a movement.
 *  Missions are stored as separate nested-context records, so the movement
 *  response only includes their count — the array must be fetched here. */
export async function getNestedMissions(
  contextId: string
): Promise<NestedContext[]> {
  const data = await agentGet<any[]>(`/api/v1/context/${contextId}/nested`)
  return Array.isArray(data) ? data.map(mapNestedContext) : []
}

// ─────────────────────────────────────────────────────────────────────────────
// Agents / Members  (mirror AgentsService)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch public agents (members). Mirrors AgentsService.getPublicAgents(). */
export async function getPublicAgents(wallet?: string): Promise<Agent[]> {
  const params: Record<string, string> = {}
  if (wallet) params.wallet = wallet
  const data = await agentGet<any>('/api/agents/public', params)
  if (!data || !Array.isArray(data.agents)) return []
  return data.agents.map(mapAgent)
}

/** Fetch a single agent by id. Mirrors AgentsService.getAgentById(). */
export async function getAgentById(agentId: string): Promise<Agent | null> {
  const data = await agentGet<any>(`/api/agents/${agentId}`)
  if (!data) return null
  return mapAgent(data)
}

/** Fetch all PRESENCE agents owned by a wallet. Mirrors getAgentsByWallet(). */
export async function getAgentsByWallet(wallet: string): Promise<Agent[]> {
  const data = await agentGet<any>('/api/agents', { wallet })
  if (!data || !Array.isArray(data.agents)) return []
  return data.agents.map(mapAgent)
}

/** Fetch MEMBER + BIG_AVATAR avatars for a wallet. Mirrors getMemberAvatars(). */
export async function getMemberAvatars(wallet: string): Promise<Agent[]> {
  const agents = await getAgentsByWallet(wallet)
  return agents.filter((a) => isMemberAvatar(a) || isBigAvatar(a))
}

// ─────────────────────────────────────────────────────────────────────────────
// Member connections + hidden members  (mirror AgentsService connection methods)
// These endpoints already exist on the Agents backend — same paths as mobile.
// ─────────────────────────────────────────────────────────────────────────────

/** POST helper for the Agents backend (query-param based, like Dio). */
async function agentPost(
  path: string,
  params?: Record<string, string>
): Promise<boolean> {
  try {
    const url = new URL(`${AGENT_API_URL}${path}`)
    if (params)
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    return res.ok
  } catch (err) {
    console.error(`[SeekAPI] POST ${path} error:`, err)
    return false
  }
}

/** Hidden member ids for a wallet. Mirrors AgentsService.getHiddenMemberIds(). */
export async function getHiddenMemberIds(wallet: string): Promise<Set<string>> {
  const data = await agentGet<any>('/api/agents/members/hidden', { wallet })
  if (data && Array.isArray(data.agent_ids))
    return new Set<string>(data.agent_ids)
  return new Set<string>()
}

/** Connected member ids for a wallet. Mirrors AgentsService.getConnectedMemberIds(). */
export async function getConnectedMemberIds(
  wallet: string
): Promise<Set<string>> {
  const data = await agentGet<any>('/api/agents/members/connections', {
    wallet,
  })
  if (data && Array.isArray(data.agent_ids))
    return new Set<string>(data.agent_ids)
  return new Set<string>()
}

/** Full connected member objects. Mirrors AgentsService.getConnectedMembers(). */
export async function getConnectedMembers(wallet: string): Promise<Agent[]> {
  const data = await agentGet<any>('/api/agents/members/connections/details', {
    wallet,
  })
  if (!data || !Array.isArray(data.agents)) return []
  return data.agents.map(mapAgent)
}

/** Connect a member → it appears in the chat list. Mirrors connectMember(). */
export async function connectMember(
  agentId: string,
  wallet: string
): Promise<boolean> {
  return agentPost(`/api/agents/members/${agentId}/connect`, { wallet })
}

/** Disconnect a member → removed from the chat list. Mirrors disconnectMember(). */
export async function disconnectMember(
  agentId: string,
  wallet: string
): Promise<boolean> {
  return agentPost(`/api/agents/members/${agentId}/disconnect`, { wallet })
}

/** Hide a member from Seek. Mirrors hideMember(). */
export async function hideMember(
  agentId: string,
  wallet: string
): Promise<boolean> {
  return agentPost(`/api/agents/members/${agentId}/hide`, { wallet })
}

/** Unhide a member. Mirrors unhideMember(). */
export async function unhideMember(
  agentId: string,
  wallet: string
): Promise<boolean> {
  return agentPost(`/api/agents/members/${agentId}/unhide`, { wallet })
}

// ─────────────────────────────────────────────────────────────────────────────
// My presences (chat list movements)  (mirror PresenceService.fetchMyPresences)
// ─────────────────────────────────────────────────────────────────────────────

export interface PresenceInfo {
  id: string
  name: string
  handle?: string | null
  description?: string | null
  tagline?: string | null
  presenceSubtype?: string | null
}

export interface MovementPresences {
  contextId: string
  contextName: string
  contextIcon: string
  contextColor: string
  accessType: string
  isPrimary: boolean
  presences: PresenceInfo[]
}

function mapPresenceInfo(j: any): PresenceInfo {
  return {
    id: j.id ?? '',
    name: j.name ?? '',
    handle: j.handle ?? null,
    description: j.description ?? null,
    tagline: j.tagline ?? null,
    presenceSubtype: j.presenceSubtype ?? j.presence_subtype ?? null,
  }
}

function mapMovementPresences(j: any): MovementPresences {
  return {
    contextId: j.contextId ?? j.context_id ?? '',
    contextName: j.contextName ?? j.context_name ?? '',
    contextIcon: j.contextIcon ?? j.context_icon ?? '🎮',
    contextColor: j.contextColor ?? j.context_color ?? '#4CADA8',
    accessType: j.accessType ?? j.access_type ?? 'shared',
    isPrimary: j.is_primary ?? j.isPrimary ?? false,
    presences: Array.isArray(j.presences)
      ? j.presences.map(mapPresenceInfo)
      : [],
  }
}

/**
 * Fetch the user's accessible presences grouped by movement.
 * Mirrors PresenceService.fetchMyPresences → GET /api/v1/codes/my-presences/{wallet}.
 */
export async function fetchMyPresences(
  wallet: string
): Promise<MovementPresences[]> {
  if (!wallet) return []
  const data = await agentGet<any>(`/api/v1/codes/my-presences/${wallet}`)
  if (!data || !Array.isArray(data.movements)) return []
  return data.movements.map(mapMovementPresences)
}

// ─────────────────────────────────────────────────────────────────────────────
// Code preview / membership / join  (mirror CodeService)
// ─────────────────────────────────────────────────────────────────────────────

/** Validate an invite code (public, no auth). Mirrors CodeService.previewCode(). */
export async function previewCode(code: string): Promise<CodePreviewResult> {
  const normalized = normalizeCode(code)
  try {
    const res = await fetch(
      `${AGENT_API_URL}/api/v1/codes/c/${normalized}/preview`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    const json = await res.json().catch(() => ({}))
    if (res.ok) return mapCodePreview(json, code)
    return {
      valid: false,
      code,
      isExpired: false,
      errorCode: json.error_code ?? json.errorCode ?? `http_${res.status}`,
      message: json.message ?? json.detail ?? `Server returned ${res.status}`,
    }
  } catch (err) {
    console.error('[SeekAPI] previewCode error:', err)
    return {
      valid: false,
      code,
      isExpired: false,
      errorCode: 'network_error',
      message: 'Could not connect to server. Please check your connection.',
    }
  }
}

/** Check whether a wallet already joined a movement. Mirrors checkMembership(). */
export async function checkMembership(
  contextId: string,
  wallet: string
): Promise<MembershipResult> {
  try {
    const res = await fetch(
      `${AGENT_API_URL}/api/v1/codes/membership/${contextId}/${wallet}`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    if (res.ok) {
      const json = await res.json()
      return mapMembership(json, wallet)
    }
    return { isMember: false, wallet }
  } catch (err) {
    console.error('[SeekAPI] checkMembership error:', err)
    return { isMember: false, wallet }
  }
}

/** Join a public movement directly. Mirrors CodeService.joinPublic(). */
export async function joinPublic(
  contextId: string,
  wallet: string
): Promise<JoinResult> {
  try {
    const res = await fetch(
      `${AGENT_API_URL}/api/v1/context/${contextId}/join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      }
    )
    const json = await res.json().catch(() => ({}))
    if (res.ok) return { success: json.success ?? true, message: json.message }
    return {
      success: false,
      message: json.message ?? json.detail ?? 'Join failed',
    }
  } catch (err) {
    console.error('[SeekAPI] joinPublic error:', err)
    return { success: false, message: 'Could not connect to server.' }
  }
}

/** Redeem an invite code to join a private/secret movement. Mirrors redeemCode(). */
export async function redeemCode(
  code: string,
  wallet: string
): Promise<JoinResult> {
  const normalized = normalizeCode(code)
  try {
    const res = await fetch(
      `${AGENT_API_URL}/api/v1/codes/c/${normalized}/redeem`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      }
    )
    const json = await res.json().catch(() => ({}))
    if (res.ok) return { success: json.success ?? true, message: json.message }
    return {
      success: false,
      message: json.message ?? json.detail ?? 'Redemption failed',
    }
  } catch (err) {
    console.error('[SeekAPI] redeemCode error:', err)
    return { success: false, message: 'Could not connect to server.' }
  }
}
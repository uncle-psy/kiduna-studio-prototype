// ============================================
// Kinship Studio — Agent/Presence Types
// ============================================

export interface PresenceSignal {
  signalId: string
  name: string
  letter: string
  color: string
  value: number // 0–100
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Agent Access Levels
// ─────────────────────────────────────────────────────────────────────────────
export type WorkerAccessLevel = 'public' | 'private' | 'admin' | 'creator'

export const WORKER_ACCESS_LEVELS: { value: WorkerAccessLevel; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Only you can access this agent' },
  { value: 'public', label: 'Public', description: 'Other users can view and reuse this agent' },
  { value: 'admin', label: 'Admin', description: 'Accessible to platform admins' },
  { value: 'creator', label: 'Creator', description: 'Only you have full control' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Agent Tone Types (for Avatar agents)
// ─────────────────────────────────────────────────────────────────────────────
export type AgentTone = 'neutral' | 'friendly' | 'professional' | 'strict' | 'cool' | 'angry' | 'playful' | 'wise' | 'other'

export const CUSTOM_TONE_MAX = 50

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Subtype (for Presence/Avatar agents)
// ─────────────────────────────────────────────────────────────────────────────
export type PresenceSubtype = 'member' | 'movement' | 'mission' | 'proposal' | 'big_avatar' | 'operator' | 'elector' | 'ally'

export const PRESENCE_SUBTYPES: { value: PresenceSubtype; label: string; icon: string; description: string }[] = [
  { value: 'big_avatar', label: 'Big Avatar', icon: 'lucide:crown', description: 'Your primary AI identity across Kiduna' },
  { value: 'member', label: 'Personal', icon: 'lucide:user', description: 'A personal avatar representing an individual' },
  { value: 'movement', label: 'Kiduna', icon: 'lucide:flag', description: 'An avatar for a community or kiduna' },
  { value: 'mission', label: 'Mission', icon: 'lucide:target', description: 'An avatar focused on a specific mission' },
  { value: 'proposal', label: 'Policy', icon: 'lucide:file-text', description: 'An avatar representing a policy' },
  { value: 'operator', label: 'Operator', icon: 'lucide:cpu', description: 'An avatar that operates and manages systems' },
  { value: 'elector', label: 'Elector', icon: 'lucide:landmark', description: 'An avatar that participates in governance' },
  { value: 'ally', label: 'Ally', icon: 'lucide:star', description: 'A system-wide assistant for all users in the chat dock' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Agent Types Explained
// ─────────────────────────────────────────────────────────────────────────────
// 
// AVATAR (Presence Agent / Supervisor)
// - Has a unique handle/codename (e.g., @shadow_fox)
// - Top-level orchestrator that coordinates Performer (worker) agents
// - Cannot connect to tools directly
// - Powered by alignments and can delegate tasks to Performers
// - If membership lapses, agent is archived (6 months revival window)
// - Handle can be claimed by another member if not renewed
// - Has a subtype: Personal (member), Kiduna (movement), Mission, Policy (proposal), Operator, or Elector
//
// PERFORMER (Worker Agent / Task)
// - Identified by name only (no handle)
// - Executes specific tasks under Avatar's direction
// - Can connect to tools (Telegram, Bluesky, X, Solana, etc.)
// - Focuses on single responsibility: searching, writing, analyzing, etc.
// - Has access levels: private, public, admin, creator
// ─────────────────────────────────────────────────────────────────────────────

export interface Presence {
  id: string
  name: string
  handle?: string // Only for Avatar agents - unique codename, max 25 chars
  briefDescription: string // seed from creation
  description: string // AI-generated / edited full description
  tagline?: string // Short catchphrase or identity tagline
  type: 'PRESENCE' | 'WORKER'
  presenceSubtype?: PresenceSubtype // For avatar agents - member, movement, mission, proposal, operator, elector
  role?: string // For powers agents - specialization
  accessLevel?: WorkerAccessLevel // For powers agents only
  tone?: AgentTone // For avatar agents - personality tone
  status: string // Status field
  assetId?: string
  assetName?: string
  knowledgeBaseIds: string[]
  knowledgeBaseNames: string[]
  skillIds?: string[]
  promptId?: string
  promptName?: string
  signals: PresenceSignal[]
  platformId?: string
  wallet: string // Owner's wallet address - REQUIRED
  tools?: string[] // For worker agents - connected tools
  isAlly?: boolean // System-wide ally flag (global singleton)
  createdAt: string
  updatedAt: string
}

export interface CreatePresencePayload {
  name: string
  handle?: string // Only required for Avatar agents
  briefDescription?: string
  tagline?: string
  type: 'presence' | 'worker'
  presenceSubtype?: PresenceSubtype // For avatar agents only
  role?: string
  accessLevel?: WorkerAccessLevel // For powers agents only
  tone?: AgentTone // For avatar agents only
  platformId?: string
  wallet: string // Required - owner's wallet address
}

export interface UpdatePresencePayload {
  name?: string
  handle?: string
  briefDescription?: string
  description?: string
  tagline?: string
  presenceSubtype?: PresenceSubtype // For avatar agents only
  role?: string
  accessLevel?: WorkerAccessLevel // For powers agents only
  tone?: AgentTone // For avatar agents only
  status?: string
  assetId?: string
  assetName?: string
  knowledgeBaseIds?: string[]
  knowledgeBaseNames?: string[]
  promptId?: string
  promptName?: string
  signals?: PresenceSignal[]
}

// Signal definitions for UI
export const ALL_SIGNALS = [
  { signalId: 'health', name: 'Health', letter: 'H', color: '#ef4444' },
  { signalId: 'empathy', name: 'Empathy', letter: 'E', color: '#f97316' },
  { signalId: 'aspiration', name: 'Aspiration', letter: 'A', color: '#f59e0b' },
  { signalId: 'resilience', name: 'Resilience', letter: 'R', color: '#22c55e' },
  { signalId: 'thinking', name: 'Thinking', letter: 'T', color: '#3b82f6' },
  { signalId: 'self-identity', name: 'Self-Identity', letter: 'Si', color: '#a855f7' },
  { signalId: 'social', name: 'Social', letter: 'So', color: '#ec4899' },
] as const

// Handle validation
export const HANDLE_RE = /^[a-zA-Z0-9_.]{1,25}$/
export const HANDLE_MAX = 25

export function isValidHandle(h: string): boolean {
  return HANDLE_RE.test(h)
}

export function suggestHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, HANDLE_MAX)
}
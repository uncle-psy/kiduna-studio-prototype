/**
 * Shared constants, validation functions, and category data
 * for Context (Kiduna) and NestedContext (Mission) pages.
 *
 * Extracted to avoid duplication across list page, detail page,
 * and project detail page.
 */

import type { VisibilityLevel, ContextStatus } from '@/lib/context-api'

// ─────────────────────────────────────────────────────────────────────────────
// Validation Constants
// ─────────────────────────────────────────────────────────────────────────────

export const HANDLE_RE = /^[a-zA-Z0-9_.]*$/
export const HANDLE_MAX = 25
export const NAME_MAX = 25
export const DESCRIPTION_MIN = 50
export const DESCRIPTION_MAX = 5000
export const TAGLINE_MAX = 255

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

export function validateName(name: string): string | null {
  if (!name) return null
  if (name.length > NAME_MAX) return `Max ${NAME_MAX} characters`
  return null
}

export function validateDescription(desc: string): string | null {
  if (!desc) return null
  if (desc.trim().length < DESCRIPTION_MIN)
    return `At least ${DESCRIPTION_MIN} characters required`
  if (desc.length > DESCRIPTION_MAX) return `Max ${DESCRIPTION_MAX} characters`
  return null
}

export function validateTagline(tagline: string): string | null {
  if (!tagline) return null
  if (tagline.length > TAGLINE_MAX) return `Max ${TAGLINE_MAX} characters`
  return null
}

export function validateHandle(h: string): string | null {
  if (!h) return null
  if (!HANDLE_RE.test(h)) return 'Only letters, numbers, underscores, and periods allowed'
  if (h.length > HANDLE_MAX) return `Max ${HANDLE_MAX} characters`
  return null
}

export function suggestHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, HANDLE_MAX)
}

export function isValidHandle(h: string): boolean {
  return HANDLE_RE.test(h) && h.length <= HANDLE_MAX
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility Options
// ─────────────────────────────────────────────────────────────────────────────

export interface VisibilityOption {
  value: VisibilityLevel
  label: string
  icon: string
  description: string
  color: string
  enabled: boolean
}

export const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: 'public',
    label: 'Public',
    icon: 'lucide:globe',
    description: 'Anyone can join',
    color: 'text-green-400',
    enabled: true,
  },
  {
    value: 'private',
    label: 'Private',
    icon: 'lucide:lock',
    description: 'Listed, requires code',
    color: 'text-amber-400',
    enabled: true,
  },
  {
    value: 'secret',
    label: 'Secret',
    icon: 'lucide:eye-off',
    description: 'Hidden until code entered',
    color: 'text-red-400',
    enabled: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Status Display Config
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusConfig {
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
}

export const STATUS_CONFIG: Record<ContextStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    icon: 'lucide:pencil-line',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30',
  },
  published: {
    label: 'Published',
    icon: 'lucide:globe',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
  },
  archived: {
    label: 'Archived',
    icon: 'lucide:archive',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-400/10',
    borderColor: 'border-zinc-400/30',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Type + Sub Type Hierarchical Data
// ─────────────────────────────────────────────────────────────────────────────

export const MAIN_TYPES = [
  { id: 'civic_public_life', label: 'Civic & Public Life', subTypes: [
    { id: 'civic_engagement', label: 'Civic Engagement' },
    { id: 'governance', label: 'Governance' },
    { id: 'policy_advocacy', label: 'Policy & Advocacy' },
    { id: 'justice_rights', label: 'Justice & Rights' },
    { id: 'community_organizing', label: 'Community Organizing' },
  ]},
  { id: 'environment_planet', label: 'Environment & Planet', subTypes: [
    { id: 'climate_action', label: 'Climate Action' },
    { id: 'environmental_protection', label: 'Environmental Protection' },
    { id: 'conservation', label: 'Conservation' },
    { id: 'biodiversity', label: 'Biodiversity' },
    { id: 'regenerative_agriculture', label: 'Regenerative Agriculture' },
  ]},
  { id: 'health_wellbeing', label: 'Health & Wellbeing', subTypes: [
    { id: 'public_health', label: 'Public Health' },
    { id: 'mental_health', label: 'Mental Health' },
    { id: 'fitness_longevity', label: 'Fitness & Longevity' },
    { id: 'emotional_wellbeing', label: 'Emotional Wellbeing' },
    { id: 'addiction_recovery', label: 'Addiction Recovery' },
  ]},
  { id: 'economy_work', label: 'Economy & Work', subTypes: [
    { id: 'economic_development', label: 'Economic Development' },
    { id: 'startups_entrepreneurship', label: 'Startups / Entrepreneurship' },
    { id: 'cooperative_ownership', label: 'Cooperative Ownership' },
    { id: 'workers_rights', label: 'Workers Rights' },
    { id: 'financial_literacy', label: 'Financial Literacy' },
  ]},
  { id: 'education_knowledge', label: 'Education & Knowledge', subTypes: [
    { id: 'education_reform', label: 'Education Reform' },
    { id: 'lifelong_learning', label: 'Lifelong Learning' },
    { id: 'research_innovation', label: 'Research & Innovation' },
    { id: 'open_knowledge', label: 'Open Knowledge' },
  ]},
  { id: 'technology_future', label: 'Technology & Future', subTypes: [
    { id: 'ai_emerging_tech', label: 'AI & Emerging Tech' },
    { id: 'open_source', label: 'Open Source' },
    { id: 'digital_commons', label: 'Digital Commons' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'web3_decentralization', label: 'Web3 / Decentralization' },
  ]},
  { id: 'service_identity_based', label: 'Service & Identity-Based', subTypes: [
    { id: 'veterans', label: 'Veterans' },
    { id: 'first_responders', label: 'First Responders' },
    { id: 'youth_development', label: 'Youth Development' },
    { id: 'elder_care', label: 'Elder Care' },
    { id: 'immigrant_communities', label: 'Immigrant Communities' },
  ]},
  { id: 'culture_expression', label: 'Culture & Expression', subTypes: [
    { id: 'arts', label: 'Arts' },
    { id: 'media', label: 'Media' },
    { id: 'storytelling', label: 'Storytelling' },
    { id: 'cultural_preservation', label: 'Cultural Preservation' },
    { id: 'spirituality_faith', label: 'Spirituality / Faith' },
  ]},
  { id: 'community_place_based', label: 'Community & Place-Based', subTypes: [
    { id: 'local_community', label: 'Local Community' },
    { id: 'housing', label: 'Housing' },
    { id: 'urban_development', label: 'Urban Development' },
    { id: 'mutual_aid', label: 'Mutual Aid' },
    { id: 'food_systems', label: 'Food Systems' },
  ]},
  { id: 'purpose_mission_driven', label: 'Purpose & Mission-Driven', subTypes: [
    { id: 'personal_growth', label: 'Personal Growth' },
    { id: 'leadership', label: 'Leadership' },
    { id: 'philanthropy', label: 'Philanthropy' },
    { id: 'global_cooperation', label: 'Global Cooperation' },
  ]},
  { id: 'experimental_alternative', label: 'Experimental & Alternative', subTypes: [
    { id: 'alternative_lifestyles', label: 'Alternative Lifestyles' },
    { id: 'intentional_communities', label: 'Intentional Communities' },
    { id: 'new_governance_models', label: 'New Governance Models' },
    { id: 'counterculture', label: 'Counterculture' },
  ]},
  { id: 'playful_meme', label: 'Playful & Meme', subTypes: [
    { id: 'humor', label: 'Humor' },
    { id: 'meme_culture', label: 'Meme Culture' },
    { id: 'fictional_movements', label: 'Fictional Movements' },
    { id: 'games', label: 'Games' },
  ]},
] as const

export type MainTypeId = (typeof MAIN_TYPES)[number]['id']

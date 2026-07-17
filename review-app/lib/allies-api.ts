import type { PersonDef } from '@/lib/allies-data'
import type { SponsorDef } from '@/lib/allies-data'

// Auth/users backend that owns membership tiers (users.subscription_tier).
const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

export interface DirectoryUser {
  id: string
  name: string | null
  displayName: string | null
  username: string | null
  picture: string | null
  bio: string | null
  tier: string | null
  wallet: string | null
}

/**
 * List users for a public allies-directory tab, filtered by membership tier.
 * Pass `role` (member | founder | builder | sponsor | catalyst | luminary) to
 * filter a single tab; omit it to get every paid tier. Public — no auth.
 */
export async function listDirectory(params?: {
  role?: string
  search?: string
  limit?: number
}): Promise<DirectoryUser[]> {
  const sp = new URLSearchParams()
  if (params?.role) sp.set('role', params.role)
  if (params?.search) sp.set('search', params.search)
  if (params?.limit) sp.set('limit', String(params.limit))

  const res = await fetch(`${AUTH_API_URL}/directory?${sp.toString()}`)
  if (!res.ok) throw new Error('Failed to load directory')

  const data = await res.json()
  return (data?.members ?? []) as DirectoryUser[]
}

const TIER_LABELS: Record<string, string> = {
  member: 'Member',
  founder: 'Founder',
  builder: 'Builder',
  sponsor: 'Sponsor',
  catalyst: 'Catalyst',
  luminary: 'Luminary',
}

/** Map a directory user to the existing PersonCard shape (UI unchanged). */
export function userToPersonDef(u: DirectoryUser): PersonDef {
  const name = (u.displayName || u.name || u.username || 'Member').trim()

  const words = name.split(/\s+/).filter(Boolean)
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase()

  const tier = (u.tier || 'member').toLowerCase()
  const role = TIER_LABELS[tier] ?? 'Member'

  const links: { label: string; value: string }[] = []
  if (u.username) links.push({ label: 'Handle', value: `@${u.username}` })

  return { initials, name, role, bio: u.bio || '', links }
}

// Palette mirrors the look of the original static sponsor cards.
const SPONSOR_COLORS = ['#F7941D', '#03CCD9', '#6536BB', '#EAAA00', '#E0457B', '#2BA84A']

/** Map a directory user to the existing SponsorCard shape (UI unchanged). */
export function userToSponsorDef(u: DirectoryUser): SponsorDef {
  const name = (u.displayName || u.name || u.username || 'Sponsor').trim()

  const words = name.split(/\s+/).filter(Boolean)
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase()

  // Deterministic colour from the name so cards stay visually varied.
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  const color = SPONSOR_COLORS[hash % SPONSOR_COLORS.length]

  return {
    initials,
    color,
    kicker: 'Sponsor',
    name,
    bio: u.bio || '',
    sponsoring: '—',
  }
}
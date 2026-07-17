/**
 * Membership tier utilities — shared between client and server components.
 *
 * Tier hierarchy (higher number = higher access):
 *   guest(0) < member(1) < founder(2) < builder(3) < sponsor(4) < catalyst(5) < luminary(6)
 *
 * Usage:
 *   import { hasMinTier, tierLevel } from '@/lib/tier-utils'
 *
 *   // Check if user can create a DUNA (requires founder+)
 *   if (hasMinTier(user.subscription, 'founder')) { ... }
 *
 *   // Compare two tiers
 *   if (tierLevel('catalyst') >= tierLevel('sponsor')) { ... } // true
 */

export const TIER_NAMES = [
  'guest',
  'member',
  'cofounder',
  'founder',
  'builder',
  'sponsor',
  'catalyst',
  'luminary',
] as const

export type TierName = (typeof TIER_NAMES)[number]

export const TIER_ORDER: Record<TierName, number> = {
  guest: 0,
  member: 1,
  // $100 Genesis Kiduna contribution — ranks at the founder level.
  cofounder: 2,
  founder: 2,
  builder: 3,
  sponsor: 4,
  catalyst: 5,
  luminary: 6,
}

/** All tiers that require a Stripe one-time payment. */
export const PAID_TIERS: TierName[] = [
  'member',
  'cofounder',
  'founder',
  'builder',
  'sponsor',
  'catalyst',
  'luminary',
]

/** Return the numeric ordinal for a tier. Defaults to 0 (guest). */
export function tierLevel(tier: string | null | undefined): number {
  return TIER_ORDER[(tier ?? 'guest') as TierName] ?? 0
}

/** True if `userTier` is at least `requiredTier`. */
export function hasMinTier(
  userTier: string | null | undefined,
  requiredTier: TierName,
): boolean {
  return tierLevel(userTier) >= TIER_ORDER[requiredTier]
}

/** True if the tier is a paid tier (not guest). */
export function isPaidTier(tier: string | null | undefined): boolean {
  return PAID_TIERS.includes((tier ?? '') as TierName)
}

/**
 * Monthly token allocation per membership tier — the source of truth for the
 * chat token meter's "total". Mirrors the server-side map in kinship-agent-be
 * (`app/services/token_usage.py`). `cofounder` ranks at the founder level.
 */
export const TIER_TOKEN_ALLOCATION: Record<TierName, number> = {
  guest: 0,
  member: 1_000_000,
  cofounder: 3_000_000,
  founder: 3_000_000,
  builder: 10_000_000,
  sponsor: 32_000_000,
  catalyst: 100_000_000,
  luminary: 320_000_000,
}

/** Monthly token allocation for a tier slug. Defaults to guest (0). */
export function monthlyTokenAllocation(tier: string | null | undefined): number {
  return TIER_TOKEN_ALLOCATION[(tier ?? 'guest') as TierName] ?? 0
}

/** Display label for a tier. */
export function tierLabel(tier: string | null | undefined): string {
  const labels: Record<TierName, string> = {
    guest: 'Guest',
    member: 'Member',
    cofounder: 'Co-founder',
    founder: 'Founder',
    builder: 'Builder',
    sponsor: 'Sponsor',
    catalyst: 'Catalyst',
    luminary: 'Luminary',
  }
  return labels[(tier ?? 'guest') as TierName] ?? 'Guest'
}

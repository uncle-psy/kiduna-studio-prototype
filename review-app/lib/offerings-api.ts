const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:6050'

function headers(token?: string | null) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function authOnly(token?: string | null) {
  const h: Record<string, string> = {}
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export interface Offering {
  id: string
  creatorId: string
  name: string
  image: string | null
  images: string | null
  description: string | null
  pricingType: string
  price: string
  offerPercentage: string
  status: string
  createdAt: string
}

export function getOfferingImages(o: Pick<Offering, 'image' | 'images'>): string[] {
  if (o.images) {
    try {
      const parsed = JSON.parse(o.images)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {}
  }
  return o.image ? [o.image] : []
}

export interface Purchase {
  purchase: {
    id: string; offeringId: string; buyerId: string; creatorId: string
    transactionId: string | null; purchaseType: string; purchaseDate: string
    expiryDate: string | null; status: string; amountPaid: string
  }
  offering: { name: string; image: string | null; images: string | null; description: string | null; pricingType: string; price: string } | null
  creator: { name: string | null; username: string | null } | null
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface ListOfferingsResult {
  data: Offering[]
  pagination: Pagination
}

export interface CreatorWalletInfo {
  creatorWallet: string | null
  price: string
  offerPercentage: string
  pricingType: string
  // NEW: single admin custody wallet — frontend pays lineage portion here
  adminLineageWallet: string | null
  // Total lineage percentage e.g. 40
  lineagePct: number
}

// ── Lineage Reward types ────────────────────────────────────────────────────

export interface LineageReward {
  id: string
  userId: string
  purchaseId: string
  offeringId: string
  purchaseUserId: string
  offeringCreatorId: string
  rewardAmount: string
  rewardPercentage: string
  type: string
  tier: string
  status: string        // PENDING | CLAIMED
  claimStatus: string   // LOCKED  | CLAIMABLE | CLAIMED
  claimedAt: string | null
  availableAt: string | null
  sourceTransaction: string | null
  claimTransaction: string | null
  createdAt: string
  updatedAt: string
}

export interface LineageRewardRow {
  reward: LineageReward
  offeringName: string | null
  buyerName: string | null
}

export interface LineageRewardSummary {
  totalPending:   number
  totalClaimed:   number
  totalEarned:    number
  isEligible:     boolean
  thresholdMet:   boolean
  timeLockMet:    boolean
  claimThreshold: number
  daysElapsed:    number
  daysRemaining:  number
  claimDaysLock:  number
}

export interface ClaimResult {
  claimedAmount:    number
  claimTransaction: string
  rewardsClaimed:   number
  userWallet:       string
}

// ── Offerings CRUD ──────────────────────────────────────────────────────────

export async function createOffering(data: {
  name: string
  image?: string
  images?: string[]
  description?: string
  pricingType: 'one-time' | 'subscription'
  price: number
  offerPercentage?: number
}, token?: string | null): Promise<Offering> {
  const res = await fetch(`${AUTH_URL}/offerings`, { method: 'POST', headers: headers(token), body: JSON.stringify(data) })
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Create failed'); return json.data
}

export async function listOfferings(
  token?: string | null,
  page = 1,
  pageSize = 9,
): Promise<ListOfferingsResult> {
  const res = await fetch(`${AUTH_URL}/offerings?page=${page}&pageSize=${pageSize}`, { headers: authOnly(token) })
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Fetch failed')
  return { data: json.data, pagination: json.pagination }
}

export async function listMyPurchases(token?: string | null): Promise<Purchase[]> {
  const res = await fetch(`${AUTH_URL}/purchases/mine`, { headers: authOnly(token) })
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Fetch failed'); return json.data
}

export async function getCreatorWallet(offeringId: string, token?: string | null): Promise<CreatorWalletInfo> {
  const res = await fetch(`${AUTH_URL}/offerings/${offeringId}/creator-wallet`, { headers: authOnly(token) })
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Fetch failed'); return json.data
}

export async function recordPurchase(
  offeringId: string,
  transactionId: string,
  amountPaid: number,
  token?: string | null,
  lineageTxId?: string,
) {
  const res = await fetch(`${AUTH_URL}/offerings/${offeringId}/purchase`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ transactionId, amountPaid, lineageTxId }),
  })
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || json?.message || 'Record failed'); return json.data
}

export async function recordRenewal(
  purchaseId: string,
  transactionId: string,
  amountPaid: number,
  token?: string | null,
  lineageTxId?: string,
) {
  const res = await fetch(`${AUTH_URL}/purchases/${purchaseId}/renew`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ transactionId, amountPaid, lineageTxId }),
  })
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Renewal failed'); return json.data
}

// ── Lineage Rewards API ─────────────────────────────────────────────────────

export interface LineageRewardsResult {
  data: LineageRewardRow[]
  pagination: Pagination
}

export async function getLineageRewards(
  token?: string | null,
  status: 'PENDING' | 'CLAIMED' | 'all' = 'all',
  page = 1,
  pageSize = 8,
): Promise<LineageRewardsResult> {
  const res = await fetch(
    `${AUTH_URL}/lineage-rewards?status=${status}&page=${page}&pageSize=${pageSize}`,
    { headers: authOnly(token) },
  )
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Fetch failed')
  return { data: json.data, pagination: json.pagination }
}

export async function getLineageRewardSummary(
  token?: string | null,
): Promise<LineageRewardSummary> {
  const res = await fetch(`${AUTH_URL}/lineage-rewards/summary`, { headers: authOnly(token) })
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Fetch failed'); return json.data
}

export async function claimLineageRewards(
  token?: string | null,
): Promise<ClaimResult> {
  // No request body — send auth only. Setting Content-Type: application/json
  // with an empty body makes Fastify reject it (FST_ERR_CTP_EMPTY_JSON_BODY).
  const res = await fetch(`${AUTH_URL}/lineage-rewards/claim`, {
    method: 'POST', headers: authOnly(token),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.message || json?.error || 'Claim failed')
  return json.data
}

export async function getLineageRewardHistory(
  token?: string | null,
): Promise<LineageRewardRow[]> {
  const res = await fetch(`${AUTH_URL}/lineage-rewards/history`, { headers: authOnly(token) })
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Fetch failed'); return json.data
}
export async function getOfferingById(id: string, token?: string | null): Promise<Offering> {
  const res = await fetch(`${AUTH_URL}/offerings/${id}`, { headers: authOnly(token) })
  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to load offering')
  // Every other endpoint wraps the payload in { data }; tolerate either shape.
  return json?.data ?? json
}
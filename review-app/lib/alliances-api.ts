// Alliances API client (Phase 3: create + list).
// Calls the Next.js API routes under /api/v1/alliances.

export interface AllianceMemberLite {
  wallet: string
  role: string
  isSigner: boolean
}

export interface Alliance {
  id: string
  name: string
  handle: string
  description: string | null
  purpose: string | null
  visibility: string
  startDate: string | null
  endDate: string | null
  threshold: number
  parentMarketId: string
  creatorWallet: string
  multisigPda: string | null
  vaultPda: string | null
  walletEnabled: boolean
  spendingRule: string | null
  defaultTools: string | null
  status: string
  createdAt: string
  updatedAt: string
  members: AllianceMemberLite[]
}

export interface CreateAllianceInput {
  name: string
  handle?: string
  description?: string
  purpose?: string
  visibility?: 'public' | 'private' | 'secret'
  startDate?: string
  endDate?: string
  threshold?: number
  walletEnabled?: boolean
  spendingRule?: string
  defaultTools?: string
}

function authHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

/** List alliances in a market (parent DUNA), visible to the caller. */
export async function listAlliances(
  token?: string | null,
): Promise<Alliance[]> {
  const res = await fetch(`/api/v1/alliances`, {
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to load alliances')
  }
  const data = await res.json()
  return (data?.alliances ?? []) as Alliance[]
}

/** Create an alliance. The caller becomes its first Wizard. */
export async function createAlliance(
  input: CreateAllianceInput,
  token?: string | null,
): Promise<Alliance> {
  const res = await fetch('/api/v1/alliances', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to create alliance')
  }
  return data.alliance as Alliance
}


export interface AttachWalletInput {
  multisigPda: string
  vaultPda: string
  walletEnabled?: boolean
}

/** Save the on-chain Squads addresses to an alliance (after wallet creates them). */
export async function attachAllianceWallet(
  id: string,
  input: AttachWalletInput,
  token?: string | null,
): Promise<Alliance> {
  const res = await fetch(`/api/v1/alliances/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Failed to attach wallet')
  return data.alliance as Alliance
}


export async function setAllianceStatus(
  id: string,
  status: 'active' | 'archived',
  token?: string | null,
): Promise<Alliance> {
  const res = await fetch(`/api/v1/alliances/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Failed to update alliance')
  return data.alliance as Alliance
}

// ── Details + member management (Phase 5) ──────────────────────────────────

export interface AllianceMemberFull {
  id: string
  wallet: string
  role: string
  isSigner: boolean
  joinedAt: string
}

export interface AllianceDetail extends Alliance {
  members: AllianceMemberFull[]
}

/** Fetch one alliance with its active members. */
export async function getAlliance(
  id: string,
  token?: string | null,
): Promise<AllianceDetail> {
  const res = await fetch(`/api/v1/alliances/${id}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Failed to load alliance')
  return data.alliance as AllianceDetail
}

/** Add a member by wallet address (public key) + role. */
export async function addAllianceMember(
  id: string,
  input: { wallet: string; role: string },
  token?: string | null,
): Promise<AllianceDetail> {
  const res = await fetch(`/api/v1/alliances/${id}/members`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Failed to add member')
  return data.alliance as AllianceDetail
}

/** Change a member's role. */
export async function updateAllianceMember(
  id: string,
  memberId: string,
  role: string,
  token?: string | null,
): Promise<AllianceDetail> {
  const res = await fetch(`/api/v1/alliances/${id}/members/${memberId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Failed to update member')
  return data.alliance as AllianceDetail
}

/** Remove a member (soft delete). */
export async function removeAllianceMember(
  id: string,
  memberId: string,
  token?: string | null,
): Promise<AllianceDetail> {
  const res = await fetch(`/api/v1/alliances/${id}/members/${memberId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Failed to remove member')
  return data.alliance as AllianceDetail
}

/** Change the approval threshold (1 ≤ threshold ≤ member count). */
export async function changeAllianceThreshold(
  id: string,
  threshold: number,
  token?: string | null,
): Promise<AllianceDetail> {
  const res = await fetch(`/api/v1/alliances/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ threshold }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Failed to change threshold')
  return data.alliance as AllianceDetail
}
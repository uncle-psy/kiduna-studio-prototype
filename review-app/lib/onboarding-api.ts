/**
 * Onboarding API Client
 *
 * Calls the backend /api/onboarding endpoints to manage
 * onboarding progress in the database.
 */

const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

export interface OnboardingRecord {
  id: string
  wallet: string
  currentStep: string
  subscriptionType?: string
  bigAvatarId?: string
  bigAvatarHandle?: string
  wisdomId?: string
  stanceId?: string
  kidunaId?: string
  kidunaHandle?: string
  performerId?: string
  workerWisdomId?: string
  workerStanceId?: string
  formData?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

/**
 * Fetch onboarding progress for a wallet.
 * Returns null if no record exists (404).
 */
export async function fetchOnboarding(wallet: string): Promise<OnboardingRecord | null> {
  try {
    const res = await fetch(`${AGENT_API_URL}/api/onboarding/${encodeURIComponent(wallet)}`)
    if (res.status === 404) return null
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Create a new onboarding record.
 * If one already exists, returns the existing record.
 */
export async function createOnboarding(
  wallet: string,
  data: Partial<OnboardingRecord>
): Promise<OnboardingRecord | null> {
  try {
    const res = await fetch(`${AGENT_API_URL}/api/onboarding/${encodeURIComponent(wallet)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Update onboarding progress.
 * Only sends provided fields.
 */
export async function updateOnboarding(
  wallet: string,
  data: Partial<OnboardingRecord>
): Promise<OnboardingRecord | null> {
  try {
    const res = await fetch(`${AGENT_API_URL}/api/onboarding/${encodeURIComponent(wallet)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Mark onboarding as complete.
 */
export async function completeOnboardingApi(wallet: string): Promise<OnboardingRecord | null> {
  try {
    const res = await fetch(`${AGENT_API_URL}/api/onboarding/${encodeURIComponent(wallet)}/complete`, {
      method: 'PUT',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Delete onboarding record (reset progress).
 * Used by Switch Account.
 */
export async function deleteOnboarding(wallet: string): Promise<boolean> {
  try {
    const res = await fetch(`${AGENT_API_URL}/api/onboarding/${encodeURIComponent(wallet)}`, {
      method: 'DELETE',
    })
    return res.ok || res.status === 204
  } catch {
    return false
  }
}

/**
 * Token usage API — reads the current calendar-month chat token consumption
 * and the user's monthly allocation from the agent backend, which is the
 * server-authoritative source (it counts real LLM tokens and enforces the
 * monthly cap).
 *
 * Backend: GET {AGENT_API_URL}/api/usage/{wallet}
 *   → { wallet, tier, allocation, total, used, remaining, period, requestCount }
 *
 * Mirrors the plain-fetch + bearer-header pattern used by lib/seek-api.ts.
 */

const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

export interface TokenUsageSummary {
  wallet: string
  tier: string
  allocation: number
  total: number
  used: number
  remaining: number
  period: string
  requestCount: number
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Fetch the wallet's current-month token usage. Returns null on any failure
 * so callers can fall back to a tier-derived allocation without throwing.
 */
export async function fetchTokenUsage(wallet: string): Promise<TokenUsageSummary | null> {
  if (!wallet) return null
  try {
    const res = await fetch(`${AGENT_API_URL}/api/usage/${encodeURIComponent(wallet)}`, {
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    })
    if (!res.ok) return null
    return (await res.json()) as TokenUsageSummary
  } catch {
    return null
  }
}

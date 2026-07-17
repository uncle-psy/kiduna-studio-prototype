/**
 * Market API Client
 *
 * ALL calls go through Next.js proxy routes (/api/markets/...) instead of
 * calling https://kiduna.studio directly from the browser.
 *
 * WHY: Browser CORS preflight is blocked by a redirect from kiduna.studio.
 * The Next.js proxy routes run server-side (Node.js), follow redirects
 * transparently, and return data to the browser with no CORS issue.
 *
 * Mobile uses STUDIO_BASE_URL=http://192.168.1.30:3000 (local LAN, no CORS).
 * Web proxy uses STUDIO_API_URL=http://192.168.1.30:3000 (same value, server-side).
 *
 * Proxy routes:
 *   GET  /api/markets             → GET  {STUDIO}/api/v1/markets?...
 *   GET  /api/markets/{slug}      → GET  {STUDIO}/api/v1/markets/{slug}
 *   POST /api/markets/{slug}/join → POST {STUDIO}/api/v1/markets/{slug}/join
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types  (mirrors Flutter models: market_summary.dart)
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketSummary {
  id: string
  slug: string
  name: string
  description?: string | null
  logoUrl?: string | null
  type: 'simple' | 'token-backed'
  tokenTicker?: string | null
  launchStatus: 'draft' | 'launching' | 'live' | 'failed'
  memberCount: number
  openProposalsCount: number
  treasuryUsd?: number | null
  createdAt: string
}

export interface MarketsPageResponse {
  items: MarketSummary[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface MyMembership {
  joinedAt: string
  role: string
  removedAt?: string | null
}

export interface MarketDetail extends MarketSummary {
  tokenMintAddress?: string | null
  myMembership?: MyMembership | null
}

export interface Proposal {
  id: string
  kind: 'spend' | 'param' | 'mint' | 'metadata' | 'liquidity' | 'perf'
  title: string
  rationale?: string | null
  status: 'draft' | 'live' | 'resolving' | 'passed' | 'failed' | 'executed'
  authorWallet?: string | null
  objectiveName?: string | null
  objectiveIcon?: string | null
  openedAt?: string | null
  closesAt?: string | null
  passTwap: number
  failTwap: number
  activeElectors: number
  totalElectors: number
  tradeCount: number
  volumeUsd: number
  createdAt: string
  futarchyProposalAddress?: string | null
  spend?: Record<string, unknown> | null
  param?: Record<string, unknown> | null
  mint?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  liquidity?: Record<string, unknown> | null
  perf?: Record<string, unknown> | null
}

export interface ProposalsPageResponse {
  items: Proposal[]
  total: number
  page: number
  pageSize: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal fetch helper — calls local proxy, never kiduna.studio directly
// THROWS on failure so callers can set their error state correctly
// ─────────────────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * GET via local proxy route. Path is the proxy path (e.g. /api/markets/my-slug).
 * THROWS on network error or non-2xx response.
 */
async function proxyGet<T>(
  proxyPath: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(proxyPath, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
    })
  } catch (err) {
    console.error(`[MarketAPI] Network error for ${proxyPath}:`, err)
    throw new Error(`Network error: ${err}`)
  }

  if (!res.ok) {
    console.error(`[MarketAPI] ${proxyPath} → HTTP ${res.status}`)
    throw new Error(`HTTP ${res.status}`)
  }

  return (await res.json()) as T
}

/**
 * POST via local proxy route.
 * Returns null on failure (join is best-effort).
 */
async function proxyPost<T>(
  proxyPath: string,
  body: unknown
): Promise<T | null> {
  try {
    const res = await fetch(proxyPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`[MarketAPI] POST ${proxyPath} → HTTP ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`[MarketAPI] POST ${proxyPath} error:`, err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — all mirror Flutter MarketService methods exactly
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all live/discoverable markets.
 * Mirrors: MarketService.getLiveMarkets()
 * Mobile: GET {STUDIO_BASE_URL}/api/v1/markets?discovery=true&page=1&pageSize=50
 * Web:    GET /api/markets?discovery=true&page=1&pageSize=50  (proxy)
 * THROWS on failure.
 */
export async function getLiveMarkets(opts?: {
  page?: number
  pageSize?: number
  search?: string
}): Promise<MarketSummary[]> {
  const params: Record<string, string> = {
    discovery: 'true',
    page: String(opts?.page ?? 1),
    pageSize: String(opts?.pageSize ?? 50),
  }
  if (opts?.search?.trim()) params.q = opts.search.trim()

  const data = await proxyGet<MarketsPageResponse>('/api/v1/markets', params)
  if (Array.isArray(data)) return data as unknown as MarketSummary[]
  return data?.items ?? []
}

/**
 * Fetch a single market by slug — includes myMembership.
 * Mirrors: MarketService.getMarketDetail(slug)
 * Mobile: GET {STUDIO_BASE_URL}/api/v1/markets/{slug}
 * Web:    GET /api/markets/{slug}  (proxy)
 * Response: { market: MarketDetail }  ← same shape mobile checks response.data['market']
 */
export async function getMarketDetail(
  slug: string
): Promise<MarketDetail | null> {
  try {
    // Proxy path: /api/markets/{slug}
    const data = await proxyGet<{ market: MarketDetail }>(`/api/markets/${slug}`)
    // Mobile: response.data['market'] — same mapping here
    return data?.market ?? null
  } catch (err) {
    console.error(`[MarketAPI] getMarketDetail(${slug}) error:`, err)
    return null
  }
}

/**
 * Fetch markets the current user owns or has joined.
 * Mirrors: MarketService.getMyMarkets()
 */
export async function getMyMarkets(): Promise<MarketSummary[]> {
  try {
    const data = await proxyGet<MarketsPageResponse>('/api/markets', { pageSize: '50' })
    if (Array.isArray(data)) return data as unknown as MarketSummary[]
    return (data?.items ?? []).filter((m) => m.launchStatus === 'live')
  } catch (err) {
    console.error('[MarketAPI] getMyMarkets error:', err)
    return []
  }
}

/**
 * Join a market (creates MarketMember row).
 * Mirrors: MarketService.joinMarket(slug, role)
 * Mobile: POST {STUDIO_BASE_URL}/api/v1/markets/{slug}/join  body: { role }
 * Web:    POST /api/markets/{slug}/join  (proxy)
 */
export async function joinMarket(
  slug: string,
  role = 'member'
): Promise<Record<string, unknown> | null> {
  return proxyPost<Record<string, unknown>>(`/api/markets/${slug}/join`, { role })
}

/**
 * Fetch proposals for a market.
 * Fetch proposals for a market.
 * Mirrors: MarketService.getProposals(slug)
 * Mobile: GET {STUDIO_BASE_URL}/api/v1/markets/{slug}/proposals?page=1&pageSize=50
 *         NO status filter sent — all fetched, filtered client-side for live
 * Web:    GET /api/markets/{slug}/proposals  (proxy → avoids CORS redirect block)
 */
export async function getProposals(
  slug: string,
  opts?: { page?: number; pageSize?: number; kind?: string; status?: string }
): Promise<ProposalsPageResponse | null> {
  try {
    const params: Record<string, string> = {
      page: String(opts?.page ?? 1),
      pageSize: String(opts?.pageSize ?? 50),
    }
    // Only add optional filters if explicitly set — mobile sends none by default
    if (opts?.kind) params.kind = opts.kind
    if (opts?.status) params.status = opts.status

    // Route through proxy — avoids browser CORS preflight redirect block from kiduna.studio
    const data = await proxyGet<ProposalsPageResponse>(
      `/api/markets/${slug}/proposals`,
      params
    )
    return data ?? null
  } catch (err) {
    console.error(`[MarketAPI] getProposals(${slug}) error:`, err)
    return null
  }
}
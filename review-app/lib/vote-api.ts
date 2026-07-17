/**
 * Vote API Client
 *
 * Mirrors the Flutter app's MarketService voting methods. The read side
 * (markets, proposals, market detail) is reused from lib/market-api.ts; this
 * file adds the vote-specific endpoints on the Studio backend
 * (NEXT_PUBLIC_STUDIO_API_URL = Flutter STUDIO_BASE_URL):
 *
 *   GET  /api/v1/proposals/{id}/vote          → live prices + myVote
 *   POST /api/v1/proposals/{id}/vote/build    → { usdcMint, vaultAddress, decimals }
 *   POST /api/v1/proposals/{id}/vote          → record vote in DB
 *
 * The actual on-chain USDC transfer + FrostWallet signing lives in
 * lib/vote-onchain.ts (client-only). Auth: Bearer token from localStorage,
 * same key ("token") as the rest of the app.
 */

import type { Proposal } from '@/lib/market-api'

export type { Proposal } from '@/lib/market-api'
export {
  getMyMarkets,
  getMarketDetail,
  getProposals,
  type MarketSummary,
  type MarketDetail,
  type ProposalsPageResponse,
} from '@/lib/market-api'

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

// All Studio API calls are proxied through /api/proposals/... to avoid CORS.
export const HELIUS_RPC =
  process.env.NEXT_PUBLIC_HELIUS_RPC ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  'http://127.0.0.1:8899'

/** USDC cost per vote (Flutter VOTE_COST_USDC, default 1). */
export function voteCostUsdc(): number {
  const raw = process.env.NEXT_PUBLIC_VOTE_COST_USDC
  if (!raw) return 1
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 1
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VotePrices {
  passPrice: number
  failPrice: number
  tradeCount: number
  totalVolume: number
}

export interface MyVote {
  voted: boolean
  side?: 'pass' | 'fail' | null
  txSignature?: string | null
}

/** Server response from POST /vote/build. */
export interface VoteBuildInfo {
  usdcMint: string
  vaultAddress: string
  decimals: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth + fetch helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET via Next.js proxy (same origin — no CORS preflight).
 * proxyPath: e.g. '/api/proposals/abc/vote'
 */
async function proxyGet<T>(proxyPath: string): Promise<T | null> {
  try {
    const res = await fetch(proxyPath, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    })
    if (!res.ok) {
      console.error(`[VoteAPI] GET ${proxyPath} → ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`[VoteAPI] GET ${proxyPath} error:`, err)
    return null
  }
}

/**
 * POST via Next.js proxy (same origin — no CORS preflight).
 */
async function proxyPost(
  proxyPath: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; data: any; error?: string }> {
  try {
    const res = await fetch(proxyPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const error =
        (data?.error && (data.error.message || data.error)) ||
        data?.message ||
        `Request failed (${res.status})`
      return {
        ok: false,
        data,
        error: typeof error === 'string' ? error : 'Request failed',
      }
    }
    return { ok: true, data }
  } catch (err) {
    console.error(`[VoteAPI] POST ${proxyPath} error:`, err)
    return { ok: false, data: null, error: 'Could not connect to server.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vote endpoints (mirror MarketService)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Live prices + my-vote for a proposal.
 * Mirrors the GET used by both _loadPrices() and checkMyVote().
 */
export async function getProposalVote(
  proposalId: string
): Promise<{ prices: VotePrices | null; myVote: MyVote }> {
  // Use proxy — avoids CORS from kiduna.studio
  const data = await proxyGet<any>(`/api/proposals/${proposalId}/vote`)
  const p = data?.prices
  const prices: VotePrices | null = p
    ? {
        passPrice: Number(p.passPrice) || 0,
        failPrice: Number(p.failPrice) || 0,
        tradeCount: Number(p.tradeCount) || 0,
        totalVolume: Number(p.totalVolume) || 0,
      }
    : null
  const mv = data?.myVote
  const myVote: MyVote = mv
    ? {
        voted: mv.voted === true,
        side: (mv.side as 'pass' | 'fail' | null) ?? null,
        txSignature: (mv.txSignature as string | null) ?? null,
      }
    : { voted: false }
  return { prices, myVote }
}

/** Just the my-vote portion. Mirrors MarketService.checkMyVote(). */
export async function checkMyVote(proposalId: string): Promise<MyVote> {
  const { myVote } = await getProposalVote(proposalId)
  return myVote
}

/**
 * Step 1 of voting: ask the server to validate membership / no-prior-vote and
 * return the on-chain targets. Mirrors POST /vote/build.
 */
export async function buildVote(
  proposalId: string,
  side: 'pass' | 'fail',
  amount: number
): Promise<{ ok: boolean; info?: VoteBuildInfo; error?: string }> {
  const { ok, data, error } = await proxyPost(
    `/api/proposals/${proposalId}/vote/build`,
    { side, amount }
  )
  if (!ok) return { ok: false, error }
  return {
    ok: true,
    info: {
      usdcMint: data.usdcMint as string,
      vaultAddress: data.vaultAddress as string,
      decimals: Number(data.decimals),
    },
  }
}

/**
 * Final step: record the confirmed on-chain vote in the DB.
 * Mirrors POST /vote with { side, txSignature, stakeUsd }.
 */
export async function recordVote(
  proposalId: string,
  params: { side: 'pass' | 'fail'; txSignature: string; stakeUsd: number }
): Promise<boolean> {
  const { ok } = await proxyPost(`/api/proposals/${proposalId}/vote`, {
    side: params.side,
    txSignature: params.txSignature,
    stakeUsd: params.stakeUsd,
  })
  return ok
}

/**
 * Live token supply for a mint (mint proposals). Mirrors the Helius RPC
 * getTokenSupply call in _loadOnchainSupply().
 */
export async function getTokenSupply(
  mintAddress: string
): Promise<number | null> {
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenSupply',
        params: [mintAddress],
      }),
    })
    const data = await res.json().catch(() => null)
    const ui = data?.result?.value?.uiAmount
    return typeof ui === 'number' && ui > 0 ? ui : null
  } catch (err) {
    console.error('[VoteAPI] getTokenSupply error:', err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers (mirror Proposal getters in proposal.dart)
// ─────────────────────────────────────────────────────────────────────────────

export const isLive = (p: Proposal) =>
  p.status === 'live' || p.status === 'resolving'
export const isPassed = (p: Proposal) =>
  p.status === 'passed' || p.status === 'executed'
export const isFailed = (p: Proposal) => p.status === 'failed'

export function kindLabel(kind: string): string {
  switch (kind) {
    case 'spend':
      return 'Spend'
    case 'param':
      return 'Param'
    case 'mint':
      return 'Mint'
    case 'metadata':
      return 'Metadata'
    case 'liquidity':
      return 'Liquidity'
    case 'perf':
      return 'Perf'
    default:
      return kind.toUpperCase()
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'live':
      return 'LIVE'
    case 'resolving':
      return 'RESOLVING'
    case 'passed':
      return 'PASSED'
    case 'failed':
      return 'FAILED'
    case 'executed':
      return 'EXECUTED'
    default:
      return 'DRAFT'
  }
}

// Status / kind colors (mirror vote_screen.dart design tokens)
export const VOTE_COLORS = {
  accent: '#FF29C3',
  market: '#BB86FC',
  success: '#4CAF50',
  fail: '#EF5350',
  draft: '#78909C',
  live: '#66BB6A',
  warn: '#FFD54F',
}

export function statusColor(status: string): string {
  switch (status) {
    case 'live':
    case 'resolving':
      return VOTE_COLORS.live
    case 'passed':
    case 'executed':
      return VOTE_COLORS.success
    case 'failed':
      return VOTE_COLORS.fail
    default:
      return VOTE_COLORS.draft
  }
}

export function kindColor(kind: string): string {
  switch (kind) {
    case 'spend':
      return VOTE_COLORS.accent
    case 'param':
      return VOTE_COLORS.warn
    default:
      return VOTE_COLORS.market
  }
}
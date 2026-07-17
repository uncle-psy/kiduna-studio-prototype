'use client'

/**
 * FrostContribute — FROST wallet contribution widget for the launchpad.
 *
 * Two modes:
 *   mode='first-commit' — Auto-commit full amount (from signup/onramp flow).
 *                          No input box. Consumes co-founder credit. Redirects to /cofounder.
 *   mode='additional'   — Manual input box. User types any amount. Stays on page.
 *
 * Signing: POST /sign on kinship-backend (FROST threshold signature).
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { signWithLoginWallet } from '@/lib/sign-with-login-wallet'
import { Icon } from '@iconify/react'

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'http://127.0.0.1:8899'
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const IS_MAINNET = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta'
const FIRST_COMMIT_AMOUNT = IS_MAINNET ? 100 : 1
const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

interface FrostContributeProps {
  campaignSlug: string
  mode: 'first-commit' | 'additional'
}

export default function FrostContribute({ campaignSlug, mode }: FrostContributeProps) {
  const router = useRouter()
  const { token, user, checkAuth } = useAuth()
  const wallet = user?.wallet || null

  // Balance states
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)
  const [solBalance, setSolBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  // Manual amount input (additional mode only)
  const [amountInput, setAmountInput] = useState('')

  // Action states
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const commitAmount = mode === 'first-commit'
    ? FIRST_COMMIT_AMOUNT
    : parseFloat(amountInput) || 0

  function makeHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  // ── Fetch balances ──
  const fetchBalances = useCallback(async () => {
    if (!wallet) return
    setBalanceLoading(true)
    try {
      const connection = new Connection(RPC_URL, { commitment: 'confirmed' })
      const pubkey = new PublicKey(wallet)

      const sol = await connection.getBalance(pubkey, 'confirmed')
      setSolBalance(sol / 1e9)

      try {
        const mint = new PublicKey(USDC_MINT)
        const ata = getAssociatedTokenAddressSync(mint, pubkey)
        const resp = await connection.getTokenAccountBalance(ata)
        setUsdcBalance(parseFloat(resp.value.uiAmountString || '0'))
      } catch {
        setUsdcBalance(0)
      }
    } catch (err) {
      console.error('[FrostContribute] balance fetch failed:', err)
    } finally {
      setBalanceLoading(false)
    }
  }, [wallet])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  // ── Commit USDC via FROST wallet ──
  async function handleCommit() {
    if (!wallet || !token) {
      setError('Wallet or session not found. Please sign in again.')
      return
    }
    if (commitAmount < 1) {
      setError('Minimum commit is 1 USDC.')
      return
    }

    setCommitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Step 1: Build tx
      const buildRes = await fetch(`/api/v1/markets/${campaignSlug}/ico/fund/build`, {
        method: 'POST',
        headers: makeHeaders(),
        body: JSON.stringify({ wallet, amountUsdc: commitAmount }),
      })
      if (!buildRes.ok) {
        const d = await buildRes.json()
        throw new Error(d.error?.message || d.message || d.error || 'Failed to build transaction')
      }
      const { serializedTransaction } = await buildRes.json()

      // Step 2: FROST wallet sign via POST /sign
      const tx = Transaction.from(Buffer.from(serializedTransaction, 'base64'))
      const messageHex = Buffer.from(tx.serializeMessage()).toString('hex')
      const { signature: sigHex } = await signWithLoginWallet(messageHex, token)
      tx.addSignature(new PublicKey(wallet), Buffer.from(sigHex, 'hex'))

      // Step 3: Submit signed tx
      const submitRes = await fetch(`/api/v1/markets/${campaignSlug}/ico/fund/submit`, {
        method: 'POST',
        headers: makeHeaders(),
        body: JSON.stringify({
          signedTransaction: Buffer.from(tx.serialize()).toString('base64'),
          wallet,
          amountUsdc: commitAmount,
        }),
      })
      if (!submitRes.ok) {
        const d = await submitRes.json()
        throw new Error(d.error?.message || d.message || d.error || 'Failed to submit transaction')
      }
      const result = await submitRes.json()

      setSuccess(`Successfully committed! Tx: ${result.txSignature?.slice(0, 16)}...`)

      // Always try to consume the co-founder credit after a successful commit.
      // The backend endpoint is idempotent — if credit is already consumed,
      // it returns { ok: true, alreadyConsumed: true }.
      try {
        const creditRes = await fetch(`${AUTH_API_URL}/stripe/consume-cofounder-credit`, {
          method: 'POST',
          headers: makeHeaders(),
          // Fastify rejects an empty body when Content-Type is application/json
          // (FST_ERR_CTP_EMPTY_JSON_BODY → 400), so always send a JSON body even
          // though this endpoint takes no parameters.
          body: '{}',
        })
        const creditData = await creditRes.json()
        if (creditData?.ok) {
          // Credit consumed (or already consumed + status reconciled) — refresh
          // auth so the in-memory user reflects onboardingStatus='committed'.
          await checkAuth()
        }
      } catch {
        // non-blocking
      }

      if (mode === 'first-commit') {
        // Redirect to co-founder page
        setTimeout(() => router.push('/cofounder'), 2000)
      } else {
        // Additional mode — refresh balances, stay on page
        await fetchBalances()
        setAmountInput('')
      }
    } catch (err: any) {
      console.error('[FrostContribute] commit failed:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setCommitting(false)
    }
  }

  const hasEnoughUsdc = usdcBalance !== null && usdcBalance >= commitAmount
  const hasEnoughSol = solBalance !== null && solBalance > 0.001
  const canCommit = commitAmount >= 1 && hasEnoughUsdc && hasEnoughSol && !committing

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <Icon icon="lucide:wallet" width={16} height={16} className="text-accent" />
        Your Wallet
      </h2>

      {wallet && (
        <div className="rounded-lg border border-white/[0.06] px-3 py-2 mb-4">
          <p className="text-[10px] text-muted mb-0.5">FROST Wallet</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-white/80 font-mono truncate flex-1">{wallet}</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(wallet)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="shrink-0 p-1 rounded hover:bg-white/[0.06] transition-colors"
              title="Copy address"
            >
              <Icon
                icon={copied ? 'lucide:check' : 'lucide:copy'}
                width={13}
                height={13}
                className={copied ? 'text-green-400' : 'text-white/40'}
              />
            </button>
          </div>
        </div>
      )}

      {balanceLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted mb-4">
          <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
          Loading balances…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-white/[0.06] p-3 text-center">
            <p className="text-[10px] text-muted mb-1">USDC</p>
            <p className="text-lg font-bold text-white">
              {usdcBalance !== null ? usdcBalance.toFixed(2) : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] p-3 text-center">
            <p className="text-[10px] text-muted mb-1">SOL</p>
            <p className="text-lg font-bold text-white">
              {solBalance !== null ? solBalance.toFixed(4) : '—'}
            </p>
          </div>
        </div>
      )}

      {/* SOL warning */}
      {!balanceLoading && solBalance !== null && solBalance === 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 flex items-start gap-2">
          <Icon icon="lucide:alert-triangle" width={14} height={14} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/90">
            Your wallet has no SOL. A small amount of SOL is required to pay Solana transaction fees.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2.5 flex items-start gap-2">
          <Icon icon="lucide:check-circle-2" width={14} height={14} className="text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-green-400">{success}</p>
            {mode === 'first-commit' && (
              <p className="text-[10px] text-green-400/60 mt-1">Redirecting to your Co-founder page…</p>
            )}
          </div>
        </div>
      )}

      {!success && (
        <>
          {/* Additional mode: manual amount input */}
          {mode === 'additional' && (
            <input
              type="number"
              placeholder="Amount (USDC)"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              min="1"
              step="1"
              className="w-full bg-input border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 mb-3"
            />
          )}

          <button
            type="button"
            onClick={handleCommit}
            disabled={!canCommit}
            className="w-full bg-accent hover:bg-accent-dark text-on-accent font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
          >
            {committing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-on-accent/30 border-t-on-accent rounded-full animate-spin" />
                Signing transaction…
              </span>
            ) : mode === 'first-commit' ? (
              'Commit to Kiduna'
            ) : (
              'Commit USDC'
            )}
          </button>

          {!wallet && (
            <p className="text-[10px] text-muted text-center mt-2">No wallet found. Please sign in first.</p>
          )}
        </>
      )}
    </div>
  )
}
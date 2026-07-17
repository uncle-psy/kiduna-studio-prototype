'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { tierLabel } from '@/lib/tier-utils'
import { ensureDirectoryPresence } from '@/lib/agents-api'
import { Icon } from '@iconify/react'

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

const LAUNCHPAD_SLUG = process.env.NEXT_PUBLIC_LAUNCHPAD_SLUG || 'kiduna'
const LAUNCHPAD_URL = `/launchpad/${LAUNCHPAD_SLUG}`
const COFOUNDER_URL = '/cofounder'

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token, checkAuth, user, isLoading } = useAuth()
  const tier = searchParams.get('tier') || 'cofounder'

  // Detect mode: regular Stripe checkout OR crypto onramp
  const checkoutSessionId = searchParams.get('session_id')
  const [onrampSessionId, setOnrampSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('onramp_session_id')
  })

  const isOnramp = !checkoutSessionId && !!onrampSessionId
  const sessionId = checkoutSessionId || onrampSessionId

  const [status, setStatus] = useState<
    'verifying' | 'processing' | 'success' | 'error'
  >('verifying')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Raw Stripe onramp status from verify-onramp — distinguishes "awaiting
  // payment" (resumable) from "fulfillment in progress / done" (locked), so we
  // only offer to reopen the payment window when it's actually safe to.
  const [rawStatus, setRawStatus] = useState<string | null>(null)
  const [reopening, setReopening] = useState(false)
  const verifiedRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  const activateAndFinish = useCallback(async () => {
    await checkAuth()

    // Sync directory presence — only for regular checkout where tier changes.
    // Onramp users stay on guest tier, no presence sync needed.
    if (!isOnramp) {
      try {
        const wallet = user?.wallet
        if (wallet && tier) { 
          await ensureDirectoryPresence({
            wallet,
            role: tier,
            name: user?.name || undefined,
            handle: (user as any)?.username || user?.name || undefined,
          })
        }
      } catch {
        // non-blocking
      }
    }

    // Clean up signup + onramp localStorage
    localStorage.removeItem('duna-signup-data')
    localStorage.removeItem('onramp_session_id')
    localStorage.removeItem('onramp_stripe_url')
    localStorage.removeItem('onramp_session_ts')

    setStatus('success')
  }, [checkAuth, user, tier, isOnramp])

  // Guard: if no token and no checkout session, user landed here by accident
  useEffect(() => {
    if (isLoading) return
    if (!token && !checkoutSessionId) {
      // Clear stale onramp data and redirect to login
      localStorage.removeItem('onramp_session_id')
      localStorage.removeItem('onramp_stripe_url')
      localStorage.removeItem('onramp_session_ts')
      router.replace('/login')
    }
  }, [isLoading, token, checkoutSessionId, router])

  // ── Onramp verification with polling ──
  const verifyOnramp = useCallback(async () => {
    if (!token || !onrampSessionId) return

    try {
      const res = await fetch(`${AUTH_API_URL}/stripe/verify-onramp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: onrampSessionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      if (data.ok && data.status === 'complete') {
        await activateAndFinish()
        return
      }

      if (data.status === 'processing') {
        // USDC fulfillment underway — the session is locked; no reopen.
        setRawStatus('fulfillment_processing')
        setStatus('processing')
        // Poll again in 5 seconds
        pollRef.current = setTimeout(verifyOnramp, 5000)
        return
      }

      if (data.status === 'rejected') {
        throw new Error('Your verification was rejected. Please contact support.')
      }

      // Still initialised or requires_payment — user hasn't finished paying.
      setRawStatus(data.status || 'requires_payment')
      setStatus('processing')
      pollRef.current = setTimeout(verifyOnramp, 5000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong')
      setStatus('error')
    }
  }, [token, onrampSessionId, activateAndFinish])

  // ── Regular checkout verification ──
  const verifyCheckout = useCallback(async () => {
    if (!token || !checkoutSessionId) return

    try {
      const res = await fetch(`${AUTH_API_URL}/stripe/verify-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: checkoutSessionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      await activateAndFinish()
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong')
      setStatus('error')
    }
  }, [token, checkoutSessionId, activateAndFinish])

  // ── Reopen the payment window with a FRESH session ──
  // Reopening the previous Stripe onramp URL after its session has locked (quote
  // committed / paid) makes Stripe's hosted page call its internal update
  // endpoint on a locked session → `crypto_onramp_locked_state_change`. To avoid
  // that we always mint a brand-new session (which starts in `initialized`),
  // re-point the verification polling at it, and open that instead.
  const openFreshPayment = useCallback(async () => {
    if (!token || reopening) return
    setReopening(true)
    try {
      const res = await fetch(`${AUTH_API_URL}/stripe/onramp-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || !data.url || !data.sessionId) {
        throw new Error(data.error || 'Could not reopen the payment window')
      }
      localStorage.setItem('onramp_session_id', data.sessionId)
      localStorage.setItem('onramp_stripe_url', data.url)
      localStorage.setItem('onramp_session_ts', String(Date.now()))
      if (pollRef.current) clearTimeout(pollRef.current)
      setRawStatus(null)
      verifiedRef.current = false // let the verify effect re-run against the new id
      setOnrampSessionId(data.sessionId) // re-point polling to the fresh session
      setStatus('verifying')
      window.open(data.url, '_blank', 'noopener')
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not reopen the payment window')
      setStatus('error')
    } finally {
      setReopening(false)
    }
  }, [token, reopening])

  useEffect(() => {
    if (verifiedRef.current) return
    if (!token || !sessionId) return
    verifiedRef.current = true

    if (isOnramp) {
      verifyOnramp()
    } else {
      verifyCheckout()
    }
  }, [token, sessionId, isOnramp, verifyOnramp, verifyCheckout])

  // Reopening is only safe while the session is still awaiting payment. Once
  // fulfillment is processing/complete/rejected the session is locked, so we
  // hide the reopen control (polling finishes the flow on its own).
  const awaitingPayment =
    rawStatus === null ||
    rawStatus === 'initialized' ||
    rawStatus === 'requires_payment'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'linear-gradient(180deg, #0A0D33 0%, #03011B 100%)',
      }}
    >
      <div className="w-full max-w-[460px]">
        {/* ── Card ── */}
        <div
          className="rounded-2xl p-8 sm:p-10 text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* ── Verifying ── */}
          {status === 'verifying' && (
            <>
              <div
                className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(234,170,0,0.1)',
                  border: '1.5px solid rgba(234,170,0,0.25)',
                }}
              >
                <div className="w-6 h-6 border-2 border-[#EAAA00] border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="font-display text-xl sm:text-2xl text-white mb-2">
                {isOnramp ? 'Waiting for payment' : 'Activating your membership'}
              </h1>
              <p className="text-sm text-white/40 leading-relaxed">
                {isOnramp
                  ? 'Complete the payment in the Stripe window. This page will update automatically once your payment is confirmed.'
                  : 'Please wait while we confirm your payment. This usually takes a few seconds.'}
              </p>
              {isOnramp && (
                <button
                  type="button"
                  onClick={openFreshPayment}
                  disabled={reopening}
                  className="mt-6 w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {reopening
                    ? 'Opening a fresh payment window…'
                    : 'Closed the payment window? Open it again →'}
                </button>
              )}
            </>
          )}

          {/* ── Processing (onramp USDC delivery in progress) ── */}
          {status === 'processing' && (
            <>
              <div
                className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(234,170,0,0.1)',
                  border: '1.5px solid rgba(234,170,0,0.25)',
                }}
              >
                <div className="w-6 h-6 border-2 border-[#EAAA00] border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="font-display text-xl sm:text-2xl text-white mb-2">
                {awaitingPayment
                  ? 'Waiting for payment'
                  : 'Delivering USDC to your wallet'}
              </h1>
              <p className="text-sm text-white/40 leading-relaxed">
                {awaitingPayment
                  ? 'Complete the payment in the Stripe window. This page updates automatically once your payment is confirmed.'
                  : 'Your payment was confirmed. USDC is being delivered to your Solana wallet — this can take up to a minute.'}
              </p>
              {/* Only offer to reopen while the session is still awaiting
                  payment — reopening a locked session triggers
                  crypto_onramp_locked_state_change. */}
              {isOnramp && awaitingPayment && (
                <button
                  type="button"
                  onClick={openFreshPayment}
                  disabled={reopening}
                  className="mt-6 w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {reopening
                    ? 'Opening a fresh payment window…'
                    : 'Closed the payment window? Open it again →'}
                </button>
              )}
            </>
          )}

          {/* ── Success ── */}
          {status === 'success' && (
            <>
              <div
                className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(234,170,0,0.12)',
                  border: '1.5px solid rgba(234,170,0,0.4)',
                }}
              >
                <Icon
                  icon="lucide:check"
                  width={28}
                  height={28}
                  className="text-[#EAAA00]"
                />
              </div>
              <h1 className="font-display text-2xl sm:text-[1.75rem] text-white mb-2">
                {isOnramp ? 'USDC delivered to your wallet' : `Welcome, ${tierLabel(tier)}`}
              </h1>
              <p className="text-sm text-white/45 leading-relaxed mb-8">
                {isOnramp
                  ? 'Your payment was successful and USDC has been deposited into your wallet. Head to the launchpad to commit your funds.'
                  : `Your payment was successful and your ${tierLabel(tier)} membership is now active.`}
              </p>

              <button
                onClick={() => router.push(isOnramp ? LAUNCHPAD_URL : '/chat')}
                className="w-full py-3 rounded-lg text-sm font-bold cursor-pointer transition-all duration-150 hover:scale-[1.01]"
                style={{
                  background:
                    'linear-gradient(135deg, #EAAA00 0%, #D4950A 100%)',
                  color: '#0A0D33',
                  border: 'none',
                }}
              >
                {isOnramp ? 'Enter the DUNAVERSE' : 'Enter the Studio'}
              </button>

              <button
                onClick={() => router.push(isOnramp ? '/chat' : '/')}
                className="mt-3 w-full py-2.5 text-xs text-white/35 hover:text-white/60 bg-transparent border-0 cursor-pointer transition-colors"
              >
                {isOnramp ? 'Go to Studio' : 'Back to home'}
              </button>
            </>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <>
              <div
                className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1.5px solid rgba(239,68,68,0.3)',
                }}
              >
                <Icon
                  icon="lucide:alert-triangle"
                  width={26}
                  height={26}
                  className="text-red-400"
                />
              </div>
              <h1 className="font-display text-xl sm:text-2xl text-white mb-2">
                Verification failed
              </h1>
              <p className="text-sm text-white/45 leading-relaxed mb-1">
                {errorMsg ||
                  'We could not verify your payment at this time.'}
              </p>
              <p className="text-xs text-white/25 leading-relaxed mb-8">
                Your payment may not have completed. You can start a fresh
                payment session or contact support if you believe you were charged.
              </p>

              <button
                onClick={() => {
                  // Clear stale onramp session so user gets a fresh start
                  localStorage.removeItem('onramp_session_id')
                  localStorage.removeItem('onramp_stripe_url')
                  localStorage.removeItem('onramp_session_ts')
                  router.push('/checkout')
                }}
                className="w-full py-3 rounded-lg text-sm font-bold cursor-pointer transition-all duration-150 hover:scale-[1.01]"
                style={{
                  background:
                    'linear-gradient(135deg, #EAAA00 0%, #D4950A 100%)',
                  color: '#0A0D33',
                  border: 'none',
                }}
              >
                Try again with a new session
              </button>

              <button
                onClick={() => router.push('/')}
                className="mt-3 w-full py-2.5 text-xs text-white/35 hover:text-white/60 bg-transparent border-0 cursor-pointer transition-colors"
              >
                Back to home
              </button>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-[11px] text-white/20 mt-6">
          Secured by Stripe. Your payment details are never stored on our
          servers.
        </p>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() { 
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{
            background:
              'linear-gradient(180deg, #0A0D33 0%, #03011B 100%)',
          }}
        >
          <div className="w-10 h-10 border-2 border-[#EAAA00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
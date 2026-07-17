'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ShieldCheck, Sparkles, ArrowUpRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import Eyebrow from './ui/Eyebrow'
import DisplayHeading from './ui/DisplayHeading'
import GoldEmphasis from './ui/GoldEmphasis'
import StarDivider from './ui/StarDivider'

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

// Feature flag — set to "true" in Vercel env vars after Stripe approves the
// onramp application. When false, falls back to standard Stripe checkout.
const ONRAMP_ENABLED = process.env.NEXT_PUBLIC_STRIPE_ONRAMP_ENABLED === 'true'

// Contribution amount — driven by env so testing and production can differ.
const PRICE_USD = Number(process.env.NEXT_PUBLIC_COFOUNDER_AMOUNT || '100')
const TIER = 'cofounder'

const BENEFITS = [
  'Become a Co-founder of Kinship DUNA — the Genesis Kiduna.',
  'Founding-member status, recognition, and a permanent place in the network.',
  'Bonus WVDUNA Coins for you and your Host the moment you join.',
  'Early access to the DUNAVERSE — build, govern, and create from day one.',
  'Your own unique Kinship Code to invite and sponsor others.',
]

export default function CheckoutView() {
  const router = useRouter()
  const { token, isAuthenticated, isLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [redirectedToStripe, setRedirectedToStripe] = useState(false)

  // The checkout requires an account (created in signup Step 3). If the user
  // somehow lands here unauthenticated, send them back to sign up.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/signup')
  }, [isLoading, isAuthenticated, router])

  // If the user returns from Stripe onramp (back button / manual navigation),
  // detect the pending session in localStorage and redirect to checkout-success
  // so the verify-onramp polling can activate their membership.
  // Sessions older than 30 minutes are considered stale and cleared.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pendingSession = localStorage.getItem('onramp_session_id')
    if (pendingSession) {
      const storedAt = Number(localStorage.getItem('onramp_session_ts') || '0')
      const ageMinutes = (Date.now() - storedAt) / 60000
      if (storedAt && ageMinutes > 30) {
        // Stale session — clear it so user can start fresh
        localStorage.removeItem('onramp_session_id')
        localStorage.removeItem('onramp_stripe_url')
        localStorage.removeItem('onramp_session_ts')
        return
      }
      router.replace('/checkout-success')
    }
  }, [router])

  const handlePay = async () => {
    if (!token) {
      setError('Your session expired. Please sign in again.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (ONRAMP_ENABLED) {
        // Clear any previous onramp session before creating a new one
        localStorage.removeItem('onramp_session_id')
        localStorage.removeItem('onramp_stripe_url')
        localStorage.removeItem('onramp_session_ts')

        // ── Crypto onramp path: USD → USDC → FROST wallet ──
        const res = await fetch(`${AUTH_API_URL}/stripe/onramp-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to start crypto onramp')

        // Store session ID + timestamp so checkout-success can verify after the user returns
        if (data.sessionId) {
          localStorage.setItem('onramp_session_id', data.sessionId)
          localStorage.setItem('onramp_session_ts', String(Date.now()))
        }

        if (data.url) {
          setRedirectedToStripe(true)
          // Store the Stripe URL for retry if user closes the tab accidentally
          localStorage.setItem('onramp_stripe_url', data.url)
          // Open Stripe onramp in a new tab — Stripe's hosted crypto page
          // has no return_url, so the user stays on Stripe after payment.
          // The current page navigates to /checkout-success which polls
          // the verify-onramp endpoint until payment completes.
          window.open(data.url, '_blank', 'noopener')
          router.push('/checkout-success')
        } else {
          throw new Error('No onramp URL returned')
        }
      } else {
        // ── Standard Stripe checkout fallback ──
        const res = await fetch(`${AUTH_API_URL}/stripe/checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tier: TIER,
            cancelUrl: `${window.location.origin}/checkout`,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
        if (data.url) {
          window.location.href = data.url
        } else {
          throw new Error('No checkout URL returned')
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <section
      className="relative overflow-hidden min-h-[70vh] py-16 max-md:py-10"
      style={{
        background: `
          radial-gradient(900px 380px at 88% -18%, rgba(234,170,0,0.20), transparent 56%),
          radial-gradient(640px 440px at -8% 75%, rgba(3,204,217,0.12), transparent 60%),
          linear-gradient(135deg, #100E59, #09073A 80%)
        `,
      }}
    >
      {/* Ambient orb */}
      <div
        aria-hidden
        className="comm-float comm-glow pointer-events-none absolute -top-24 right-[6%] h-72 w-72 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(234,170,0,0.28), transparent 70%)' }}
      />

      <div className="relative z-[2] w-full max-w-[1080px] mx-auto px-6">
        <div className="comm-rise mb-8">
          <Eyebrow className="mb-4">
            Genesis Kiduna <StarDivider /> Co-founder
          </Eyebrow>
          <DisplayHeading as="h1" className="mb-3">
            Claim Your <GoldEmphasis>Founding Place</GoldEmphasis>
          </DisplayHeading>
          <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-white/80 max-w-[60ch] leading-[1.55]">
            One contribution unlocks lifetime Co-founder status in Kinship DUNA.
            A <span className="text-white font-semibold">${PRICE_USD} USD</span> payment
            {ONRAMP_ENABLED
              ? ' is converted to USDC and deposited into your wallet — ready for the DUNAVERSE.'
              : ' is required to continue and enter the DUNAVERSE.'}
          </p>
        </div>

        <div className="grid grid-cols-[1.1fr_0.9fr] max-lg:grid-cols-1 gap-6 items-start">
          {/* Benefits */}
          <div
            className="comm-rise rounded-[18px] border border-card-border bg-card p-7"
            style={{ animationDelay: '0.08s' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={18} className="text-accent" />
              <h2 className="font-display text-[1.35rem] font-semibold text-white">
                What you get
              </h2>
            </div>
            <ul className="space-y-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-[2px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="text-white/80 text-[0.97rem] leading-[1.5]">
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment card */}
          <div
            className="comm-rise relative overflow-hidden rounded-[18px] border border-accent/30 p-7"
            style={{
              animationDelay: '0.16s',
              background:
                'linear-gradient(135deg, rgba(234,170,0,0.12), rgba(3,204,217,0.05))',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl"
              style={{ background: 'radial-gradient(circle, rgba(234,170,0,0.35), transparent 70%)' }}
            />

            <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-accent mb-4">
              One-time contribution
            </span>

            <div className="flex items-end gap-2 mb-1">
              <span className="font-display text-[3rem] leading-none text-white">
                ${PRICE_USD}
              </span>
              <span className="text-white/60 text-[0.95rem] mb-2">USD</span>
            </div>
            <p className="text-white/60 text-[0.9rem] mb-6">
              {ONRAMP_ENABLED
                ? 'Converts to USDC on Solana via Stripe. Delivered to your wallet.'
                : 'Secure payment, powered by Stripe.'}
            </p>

            {error && (
              <div className="mb-4 rounded-[10px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-[0.85rem] text-red-400">
                {error}
              </div>
            )}

            {/* Return instruction — shown after redirect to Stripe onramp */}
            {redirectedToStripe && ONRAMP_ENABLED && (
              <div className="mb-4 rounded-[10px] border border-accent/25 bg-accent/10 px-4 py-4 text-center">
                <p className="text-[0.9rem] text-white/90 font-semibold mb-1">
                  Complete your payment on Stripe
                </p>
                <p className="text-[0.8rem] text-white/50 mb-3">
                  After payment, come back to this page — we'll activate your membership automatically.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/checkout-success')}
                  className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent/20 px-4 py-2 text-[0.82rem] font-semibold text-accent transition-colors hover:bg-accent/30"
                >
                  I've completed payment
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handlePay}
              disabled={loading || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent py-4 font-sans text-[1rem] font-bold text-on-accent transition-all duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-accent/30 border-t-on-accent" />
                  Redirecting to Stripe…
                </>
              ) : ONRAMP_ENABLED ? (
                `Buy $${PRICE_USD} USDC & Enter the DUNAVERSE`
              ) : (
                `Pay $${PRICE_USD} & Enter the DUNAVERSE`
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.78rem] text-white/45">
              <ShieldCheck size={13} />
              <span>256-bit encrypted · Cancel anytime before paying</span>
            </div>

            {/* Not ready → community */}
            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <p className="text-[0.9rem] text-white/65 leading-[1.5]">
                Not ready to commit?{' '}
                <Link
                  href="/community"
                  className="font-semibold text-skyblue transition-colors hover:text-white"
                >
                  Join our active communities to learn more.
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
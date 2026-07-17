'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { LoginErrorCode } from '@/lib/auth-types'
import { listAgents } from '@/lib/agents-api'
import { getOnboarding, isOnboardingComplete } from '@/lib/onboarding'

/* ── Onboarding check ── */

async function checkNeedsOnboarding(
  wallet: string,
  role: string,
): Promise<string | null> {
  if (role === 'wizard') return null
  const ob = await getOnboarding(wallet)
  if (ob && ob.currentStep !== 'complete') return '/onboarding'
  try {
    const result = await listAgents({ wallet })
    const agents = result.agents || []
    const hasBigAvatar = agents.some(
      (a: any) =>
        (a.presenceSubtype || a.presence_subtype || '').toUpperCase() === 'BIG_AVATAR',
    )
    if (!hasBigAvatar) return '/onboarding'
    const completed = await isOnboardingComplete(wallet)
    if (!completed) {
      const hasWorker = agents.some(
        (a: any) => (a.type || a.agent_type || '').toLowerCase() === 'worker',
      )
      if (!hasWorker) return '/onboarding'
    }
  } catch {}
  return null
}

/* ── Login destination resolver ── */

const LAUNCHPAD_SLUG = process.env.NEXT_PUBLIC_LAUNCHPAD_SLUG || 'kiduna'

/**
 * Determine where to redirect the user after login.
 * Handles both new users (with onboardingStatus set) and old users
 * (with onboardingStatus null/incomplete but who already completed the flow).
 * Checks backend for email-based payment skip.
 */
async function resolveLoginDestination(user: any): Promise<string> {
  if (!user) return '/login'

  // Wizards have unrestricted access — straight to the studio, never funneled
  // through the onboarding/payment flow regardless of onboardingStatus/credit.
  if (user.role === 'wizard') return '/chat'

  const status = user.onboardingStatus
  const tier = user.subscription
  const hasCredit = user.hasCofounderCredit

  // Explicit onboarding statuses (set by the new flow)
  if (status === 'needs_code') return '/community'
  if (status === 'committed') return '/cofounder'
  // 'paid' — check if credit was already consumed (user committed but status not updated)
  if (status === 'paid') {
    return hasCredit === false ? '/cofounder' : `/launchpad/${LAUNCHPAD_SLUG}`
  }

  // For 'incomplete' or null/undefined status, check other signals
  // to determine if the user actually completed the flow before
  // the onboardingStatus column was added.

  // User has a paid membership tier → skip onboarding entirely
  const paidTiers = ['member', 'founder', 'builder', 'sponsor', 'catalyst', 'luminary']
  if (tier && paidTiers.includes(tier)) return '/chat'

  // User has cofounder credit → they paid but haven't committed
  if (hasCredit === true) return `/launchpad/${LAUNCHPAD_SLUG}`

  // Check if this user should skip payment (email-based, backend-validated)
  try {
    const { shouldSkipPayment } = await import('@/lib/payment-skip')
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token && await shouldSkipPayment(token)) {
      return '/onboarding'
    }
  } catch { /* fallback to normal flow */ }

  // If status is explicitly 'incomplete' AND user was created through the
  // new flow, redirect to signup to resume. But if status is null/undefined
  // (old user), let them through to the normal flow.
  if (status === 'incomplete') return '/signup'

  // Default — old user or status=complete/null → normal guest/studio flow
  return user.wallet ? '/guest' : '/upgrade'
}

/* ── Error icon ── */

function ErrorIcon({ code }: { code: LoginErrorCode | null }) {
  if (code === 'NO_MEMBERSHIP' || code === 'MEMBERSHIP_EXPIRED') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

/* ── Eye icon for password toggle ── */

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

/* ── Error maps ── */

const RAW_ERROR_MAP: Record<string, { message: string; code: LoginErrorCode }> = {
  'invalid-credentials': { message: 'The email or password you entered is incorrect. Please try again.', code: 'INVALID_PASSWORD' },
  'user-not-found': { message: 'We couldn\u2019t find an account with that email address. Please check your email or create a new account.', code: 'USER_NOT_FOUND' },
  'invalid-password': { message: 'The password you entered is incorrect. Please try again or reset your password.', code: 'INVALID_PASSWORD' },
  'no-membership': { message: 'Your account doesn\u2019t have an active membership. Please sign up or contact support.', code: 'NO_MEMBERSHIP' },
  'membership-expired': { message: 'Your membership has expired. Please renew to continue.', code: 'MEMBERSHIP_EXPIRED' },
  'missing-credentials': { message: 'Please enter both your email address and password.', code: 'MISSING_CREDENTIALS' },
}

const FRIENDLY_ERRORS: Record<LoginErrorCode, string> = {
  USER_NOT_FOUND: 'We couldn\u2019t find an account with that email address. Please check your email or create a new account.',
  INVALID_PASSWORD: 'The email or password you entered is incorrect. Please try again.',
  NO_MEMBERSHIP: 'Your account doesn\u2019t have an active membership. Please sign up or contact support.',
  MEMBERSHIP_EXPIRED: 'Your membership has expired. Please renew to continue.',
  MISSING_CREDENTIALS: 'Please enter both your email address and password.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again in a moment.',
}

function resolveError(code: LoginErrorCode | null, raw: string): { message: string; code: LoginErrorCode } {
  const normalized = (raw || '').trim().toLowerCase()
  if (RAW_ERROR_MAP[normalized]) return RAW_ERROR_MAP[normalized]
  const resolvedCode = code ?? 'SERVER_ERROR'
  return { message: FRIENDLY_ERRORS[resolvedCode] || raw || 'Something went wrong. Please try again.', code: resolvedCode }
}

/* ── Login Form ── */

export default function LoginForm() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, user } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<LoginErrorCode | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const didRedirect = useRef(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated && !didRedirect.current) {
      didRedirect.current = true
      resolveLoginDestination(user).then((dest) => router.push(dest))
    }
  }, [isAuthenticated, isLoading, user, router])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setErrorCode(null)
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setErrorCode('MISSING_CREDENTIALS')
      setError(FRIENDLY_ERRORS.MISSING_CREDENTIALS)
      return
    }
    setIsSubmitting(true)
    try {
      const result = await login(trimmedEmail, password)
      if (result.success) {
        didRedirect.current = true
        const dest = await resolveLoginDestination(result.user)
        router.push(dest)
      } else {
        const resolved = resolveError(result.code, result.error)
        setErrorCode(resolved.code)
        setError(resolved.message)
      }
    } catch {
      setErrorCode('SERVER_ERROR')
      setError('Unable to connect to the server. Please check your internet connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      {/* Error alert */}
      {error && (
        <div
          className={`flex items-start gap-3 p-4 rounded-[10px] mb-5 ${
            errorCode === 'NO_MEMBERSHIP' || errorCode === 'MEMBERSHIP_EXPIRED'
              ? 'bg-accent/10 border border-accent/20 text-accent'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          <ErrorIcon code={errorCode} />
          <span className="text-sm leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Email or handle */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: 6, color: '#fff' }}>
            Email or handle
          </label>
          <input
            type="email"
            placeholder="name@example.com"
            style={{
              width: '100%', padding: '0.72rem 0.9rem', borderRadius: 6,
              background: '#03011B', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: '0.95rem',
              fontFamily: '"Avenir", "Avenir Next", sans-serif',
              backgroundColor: '#03011B',
              outline: 'none',
            }}
            value={email}
            onChange={(e) => { e.target.setCustomValidity(''); setEmail(e.target.value.replace(/\s/g, '')) }}
            onInvalid={(e) => {
              const t = e.currentTarget
              if (t.validity.typeMismatch || t.validity.patternMismatch) {
                t.setCustomValidity("Please enter a valid email address (must include both '@' and '.').")
              }
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#EAAA00' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
            required maxLength={254} pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
            disabled={isSubmitting} autoComplete="email"
          />
        </div>

        {/* Password with eye icon */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: 6, color: '#fff' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              style={{
                width: '100%', padding: '0.72rem 2.8rem 0.72rem 0.9rem', borderRadius: 6,
                background: '#03011B', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: '0.95rem',
                fontFamily: '"Avenir", "Avenir Next", sans-serif',
                backgroundColor: '#03011B',
                outline: 'none',
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#EAAA00' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              required maxLength={64} disabled={isSubmitting} autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: 'rgba(255,255,255,0.50)', display: 'flex', alignItems: 'center',
              }}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        {/* Sign in button — btn-lg size from app.css */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%', padding: '1rem 1.8rem',
            background: '#EAAA00', color: '#09073A',
            fontFamily: '"Avenir", "Avenir Next", sans-serif',
            fontWeight: 700, fontSize: '1.02rem',
            borderRadius: 6, border: 'none', cursor: 'pointer',
            transition: 'background 140ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: isSubmitting ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#FFC229' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#EAAA00' }}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            'Sign in →'
          )}
        </button>

        {/* Forgot password */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <a
            href="/forgot-password"
            style={{ color: '#03CCD9', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#5ee3ed' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#03CCD9' }}
          >
            Forgot password?
          </a>
        </div>
      </form>

      {/* New here section — hidden in UI only (functionality unchanged) */}
      <div style={{ display: 'none' }}>
      {/* NEW HERE divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>
          New here
        </span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
      </div>

      {/* Create account ghost button */}
      <Link
        href="/signup"
        className="signup-ghost"
        style={{
          display: 'block', width: '100%', padding: '0.7rem 1.25rem',
          textAlign: 'center', fontWeight: 700, fontSize: '0.92rem',
          borderRadius: 6, border: '1px solid rgba(255,255,255,0.22)',
          background: 'transparent', color: '#ffffff',
          textDecoration: 'none', transition: 'border-color 140ms',
          outline: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffffff' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}
        onFocus={(e) => { e.currentTarget.style.color = '#ffffff' }}
onBlur={(e) => { e.currentTarget.style.color = '#ffffff' }}
      >
        Create your account
      </Link>

      {/* Note */}
      <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.85rem', color: 'rgba(255,255,250,0.40)' }}>
        Creating an account takes about a minute and includes a short onboarding.
      </p>
      </div>
      {/* end New here section */}
    </div>
  )
}
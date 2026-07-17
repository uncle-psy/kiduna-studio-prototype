'use client'

/**
 * Login Page
 *
 * Handles user authentication with email and password.
 * Displays appropriate error messages for different failure scenarios.
 *
 * CHANGE: After login, checks if user needs onboarding and redirects
 * directly to /onboarding instead of /agents (fixes the 1-second flash).
 */

import React, { useState, useRef, FormEvent, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { LoginErrorCode } from '@/lib/auth-types'
import { listAgents } from '@/lib/agents-api'
import { getOnboarding, isOnboardingComplete } from '@/lib/onboarding'

/**
 * Check if a member/sponsor user needs onboarding.
 * Returns '/onboarding' if yes, null if no.
 */
async function checkNeedsOnboarding(wallet: string, role: string): Promise<string | null> {
  // Wizards never need onboarding
  if (role === 'wizard') return null

  // Check database for in-progress onboarding
  const ob = await getOnboarding(wallet)
  if (ob && ob.currentStep !== 'complete') return '/onboarding'

  // Check API for existing Big Avatar + Worker
  try {
    const result = await listAgents({ wallet })
    const agents = result.agents || []
    const hasBigAvatar = agents.some(
      (a: any) => (a.presenceSubtype || a.presence_subtype || '').toUpperCase() === 'BIG_AVATAR'
    )
    if (!hasBigAvatar) return '/onboarding'

    // Big Avatar exists but onboarding never completed and no worker → incomplete
    const completed = await isOnboardingComplete(wallet)
    if (!completed) {
      const hasWorker = agents.some(
        (a: any) => (a.type || a.agent_type || '').toLowerCase() === 'worker'
      )
      if (!hasWorker) return '/onboarding'
    }
  } catch {
    // On error, don't block — let the studio layout handle it
  }

  return null
}

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, user } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<LoginErrorCode | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Tracks whether handleSubmit already handled the redirect.
  // Prevents the useEffect from firing a second router.push('/agents')
  // that would override the correct redirect path.
  const didRedirect = useRef(false)

  // Redirect if already authenticated when the page first loads
  // (e.g. user navigated to /login while already logged in).
  // Skipped when the form-based login already triggered a redirect.
  useEffect(() => {
    if (!isLoading && isAuthenticated && !didRedirect.current) {
      didRedirect.current = true
      if (user?.subscription !== 'member' && user?.subscription !== 'sponsor') {
        router.push('/wallet')
      } else {
        // Check onboarding before redirecting
        if (user?.wallet) {
          checkNeedsOnboarding(user.wallet, user.role || '').then((onboardingPath) => {
            router.push(onboardingPath || '/chat')
          })
        } else {
          router.push('/agents')
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setErrorCode(null)
    setIsSubmitting(true)

    try {
      const result = await login(email, password)

      if (result.success) {
        // Mark that we already handled the redirect so the useEffect
        // (which re-fires when isAuthenticated flips to true) doesn't
        // override with the fallback route.
        didRedirect.current = true

        // Guest subscribers can only access the wallet page
        if (result.user.subscription !== 'member' && result.user.subscription !== 'sponsor') {
          router.push('/wallet')
        } else {
          // Check if user needs onboarding before choosing redirect
          const onboardingPath = await checkNeedsOnboarding(
            result.user.wallet,
            result.user.role || ''
          )
          router.push(onboardingPath || '/chat')
        }
      } else {
        setError(result.error)
        setErrorCode(result.code)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setErrorCode('SERVER_ERROR')
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Get error icon based on error code
   */
  const getErrorIcon = () => {
    switch (errorCode) {
      case 'NO_MEMBERSHIP':
      case 'MEMBERSHIP_EXPIRED':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{
      background: 'radial-gradient(900px 360px at 90% -20%, rgba(234,170,0,0.20), transparent 55%), radial-gradient(600px 420px at -8% 70%, rgba(3,204,217,0.12), transparent 60%), linear-gradient(135deg, #100E59, #09073A 80%)',
    }}>
      <div className="w-full max-w-md">
        {/* Login Card — WV DUNA form-card style */}
        <div style={{
          background: '#0A0D33',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
          padding: '34px',
          boxShadow: '0 18px 48px rgba(3, 1, 27, 0.55)',
        }}>
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <img
                src="/favicon.ico"
                alt="Kiduna logo"
                className="w-10 h-10 rounded-full"
                />
            </div>
            <h1 style={{
              fontFamily: '"Goudy Heavyface", "Goudy Old Style", Georgia, serif',
              fontSize: '24px',
              fontWeight: 400,
              color: '#ffffff',
              letterSpacing: 0,
              lineHeight: 1.1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              KIDUNA
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#09073A',
                background: '#EAAA00',
                padding: '3px 10px',
                borderRadius: '4px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, system-ui, sans-serif',
              }}>
                STUDIO
              </span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.60)', marginTop: '12px', fontSize: '14px' }}>
              Sign in to your account
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl mb-6 ${
                errorCode === 'NO_MEMBERSHIP' ||
                errorCode === 'MEMBERSHIP_EXPIRED'
                  ? 'bg-accent/10 border border-accent/20 text-accent'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {getErrorIcon()}
              <span className="text-sm leading-relaxed">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-input border border-card-border rounded-[6px] text-white placeholder-white/40 focus:outline-none focus:border-[#EAAA00] focus:ring-0 transition-all"
                value={email}
                onChange={(e) => {
                  e.target.setCustomValidity('')
                  setEmail(e.target.value.replace(/\s/g, ''))
                }}
                onInvalid={(e) => {
                  const target = e.currentTarget
                  if (
                    target.validity.typeMismatch ||
                    target.validity.patternMismatch
                  ) {
                    target.setCustomValidity(
                      "Please enter a valid email address (must include both '@' and '.')."
                    )
                  }
                }}
                required
                maxLength={254}
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                disabled={isSubmitting}
                autoComplete="email"
              />
              <div className="mt-1 text-xs text-muted text-right">
                {email.length} / 254
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 bg-input border border-card-border rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  maxLength={64}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-1 text-xs text-muted text-right">
                {password.length} / 64
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 mt-2 bg-accent hover:bg-[#FFC229] text-[#09073A] font-bold rounded-[4px] transition-all duration-200 shadow-lg shadow-accent/20 hover:shadow-accent/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
            <div className="text-center mt-1">
              <p className="text-sm text-muted">
                <a
                  href="/forgot-password"
                  className="text-accent hover:text-[#c96d00] transition-colors font-medium"
                >
                  Forgot password?
                </a>
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-card-border">
            <p className="text-sm text-muted">
              Don&apos;t have an account?{' '}
              <a
                href="https://www.kiduna.news"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#EAAA00] hover:text-[#FFC229] transition-colors font-medium"
              >
                Sign up on Kiduna
              </a>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
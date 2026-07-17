'use client'

/**
 * Forgot Password Page
 *
 * Multi-step flow:
 *   Step 1 — Enter email → POST /forgot-password-verification (no code)
 *   Step 2 — Enter 6-digit code sent to email → verifies code
 *   Step 3 — Enter new password → POST /forgot-password-verification (with code + newPassword)
 *   Step 4 — Success screen → redirect to /login
 */

import React, { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

// ─── Config ──────────────────────────────────────────────────────────────────
const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'email' | 'code' | 'password' | 'success'

// ─── Component ────────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ─── Step 1: Request reset code ───────────────────────────────────────────
  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`${AUTH_API_URL}/forgot-password-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'user-not-exists') {
          setError('No account found with this email address.')
        } else {
          setError(data.error || 'Something went wrong. Please try again.')
        }
        return
      }

      setStep('code')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Step 2: Verify code (simple — just advance to password step) ─────────
  // We don't verify the code standalone; the backend verifies it together with
  // the new password in step 3. We just collect it here so UX is clear.
  const handleCodeSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const numCode = parseInt(code, 10)
    if (isNaN(numCode) || code.length !== 6) {
      setError('Please enter the 6-digit code from your email.')
      return
    }

    setStep('password')
  }

  // ─── Step 3: Submit new password with code ────────────────────────────────
  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`${AUTH_API_URL}/forgot-password-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: parseInt(code, 10),
          newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'invalid-code') {
          setError('The verification code is incorrect or has expired. Please start over.')
        } else {
          setError(data.error || 'Something went wrong. Please try again.')
        }
        return
      }

      setStep('success')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Resend code ──────────────────────────────────────────────────────────
  const handleResendCode = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`${AUTH_API_URL}/forgot-password-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to resend code. Please try again.')
      } else {
        setCode('')
        setError(null)
        // Brief visual feedback
      }
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Step progress indicator ──────────────────────────────────────────────
  const steps: { key: Step; label: string }[] = [
    { key: 'email', label: 'Email' },
    { key: 'code', label: 'Verify' },
    { key: 'password', label: 'Reset' },
  ]
  const currentStepIndex = steps.findIndex((s) => s.key === step)

  // ─── Go back one step (code → email, password → code) ─────────────────────
  const handleBack = () => {
    setError(null)
    if (step === 'code') {
      setStep('email')
    } else if (step === 'password') {
      setStep('code')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-card-border rounded-2xl p-8 shadow-2xl shadow-black/50">

          {/* Back to login */}
          {step === 'email' && (
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="flex items-center gap-1 text-sm text-muted hover:text-white transition-colors mb-4"
            >
              ← Back to login
            </button>
          )}

          {/* Back one step (code → email, password → code) */}
          {(step === 'code' || step === 'password') && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-muted hover:text-white transition-colors mb-4"
            >
              ← Back
            </button>
          )}

          {/* Logo / Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <img
                src="/review/screens/assets/kiduna-logo.svg"
                alt="Kiduna logo"
                className="h-10 w-auto"
              />
            </div>
          </div>

          {/* Step indicators (hidden on success) */}
          {step !== 'success' && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {steps.map((s, idx) => (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        idx < currentStepIndex
                          ? 'bg-accent text-white'
                          : idx === currentStepIndex
                          ? 'bg-accent text-white ring-2 ring-accent/40'
                          : 'bg-card-border text-muted'
                      }`}
                    >
                      {idx < currentStepIndex ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className="text-xs text-muted">{s.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-px mb-4 transition-all ${
                        idx < currentStepIndex ? 'bg-accent' : 'bg-card-border'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5 bg-red-500/10 border border-red-500/20 text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm leading-relaxed">{error}</span>
            </div>
          )}

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-1">Forgot your password?</h2>
                <p className="text-sm text-muted">
                  Enter the email address linked to your account and we'll send you a reset code.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-input border border-card-border rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
                    required
                    maxLength={254}
                    disabled={isSubmitting}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-accent hover:bg-accent-dark text-black font-semibold rounded-[4px] transition-all duration-200 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending code...</span>
                    </>
                  ) : (
                    'Send Reset Code'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Enter code ── */}
          {step === 'code' && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-1">Check your email</h2>
                <p className="text-sm text-muted">
                  We sent a 6-digit code to{' '}
                  <span className="text-white font-medium">{email}</span>.
                  Enter it below.
                </p>
              </div>

              <form onSubmit={handleCodeSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-input border border-card-border rounded-xl text-white text-center text-2xl tracking-[0.4em] placeholder-white/20 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setCode(val)
                    }}
                    required
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || code.length !== 6}
                  className="w-full py-3.5 bg-accent hover:bg-accent-dark text-black font-semibold rounded-[4px] transition-all duration-200 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Verify Code
                </button>
              </form>

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setError(null) }}
                  className="text-sm text-muted hover:text-white transition-colors"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isSubmitting}
                  className="text-sm text-accent hover:text-accent-dark transition-colors disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: New password ── */}
          {step === 'password' && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-1">Set a new password</h2>
                <p className="text-sm text-muted">
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 12 characters"
                      className="w-full px-4 py-3 pr-12 bg-input border border-card-border rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={12}
                      maxLength={64}
                      disabled={isSubmitting}
                      autoComplete="new-password"
                      autoFocus
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
                  
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      className={`w-full px-4 py-3 pr-12 bg-input border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-1 transition-all ${
                        confirmPassword && newPassword !== confirmPassword
                          ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                          : 'border-card-border focus:border-accent/50 focus:ring-accent/20'
                      }`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      maxLength={64}
                      disabled={isSubmitting}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
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
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-400">Passwords do not match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword || !confirmPassword}
                  className="w-full py-3.5 bg-accent hover:bg-accent-dark text-black font-semibold rounded-[4px] transition-all duration-200 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Step 4: Success ── */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="flex items-center justify-center w-16 h-16 bg-accent/15 rounded-full mx-auto mb-5">
                <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password reset!</h2>
              <p className="text-sm text-muted mb-8">
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3.5 bg-accent hover:bg-accent-dark text-black font-semibold rounded-[4px] transition-all duration-200 shadow-lg shadow-accent/20"
              >
                Go to Sign In
              </button>
            </div>
          )}

          {/* Footer link back to login (steps 1–3 only) */}
          {step !== 'success' && (
            <div className="text-center mt-6 pt-5 border-t border-card-border">
              <p className="text-sm text-muted">
                Remember your password?{' '}
                <a
                  href="/login"
                  className="text-accent hover:text-accent-dark transition-colors font-medium"
                >
                  Sign in
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



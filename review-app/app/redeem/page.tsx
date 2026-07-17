'use client'

/**
 * Redeem Page - Manual Code Entry
 *
 * Allows users to type an invitation code, verify it, and redeem it.
 * State machine: IDLE → VERIFYING → DETAILS → REDEEMING → SUCCESS
 *                                  ↘  ERROR  ↙
 */

import React, { useState, FormEvent } from 'react'
import { useAuth } from '@/lib/auth-context'
import { previewCode, redeemByCode } from '@/lib/codes-api'
import type { CodePreviewResponse, RedeemByCodeResponse } from '@/lib/types'
import CodeDetails from '@/components/redeem/CodeDetails'
import RedeemSuccess from '@/components/redeem/RedeemSuccess'
import RedeemError from '@/components/redeem/RedeemError'

type PageState = 'idle' | 'verifying' | 'details' | 'redeeming' | 'success' | 'error'

export default function RedeemManualPage() {
  const { user } = useAuth()

  const [codeInput, setCodeInput] = useState('')
  const [state, setState] = useState<PageState>('idle')
  const [preview, setPreview] = useState<CodePreviewResponse | null>(null)
  const [redeemResult, setRedeemResult] = useState<RedeemByCodeResponse | null>(null)
  const [errorCode, setErrorCode] = useState<string | undefined>()
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [redeemError, setRedeemError] = useState<string | null>(null)

  /**
   * Format code input as KIN-XXXXXX-XXX
   */
  const formatCodeInput = (raw: string) => {
    // Strip everything except letters and digits, then uppercase
    const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

    // Build formatted string: KIN-XXXXXX-XXX
    let formatted = ''
    for (let i = 0; i < clean.length && i < 12; i++) {
      if (i === 3 || i === 9) formatted += '-'
      formatted += clean[i]
    }
    return formatted
  }

  /**
   * Verify the entered code
   */
  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = codeInput.trim().toUpperCase()
    if (!trimmed) return

    setState('verifying')
    setPreview(null)
    setErrorCode(undefined)
    setErrorMessage(undefined)
    setRedeemError(null)

    try {
      const result = await previewCode(trimmed)
      if (result.valid) {
        setPreview(result)
        setState('details')
      } else {
        setErrorCode(result.errorCode)
        setErrorMessage(result.message)
        setState('error')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to verify code')
      setState('error')
    }
  }

  /**
   * Redeem the verified code
   */
  const handleRedeem = async () => {
    if (!preview || !user?.wallet) return

    setState('redeeming')
    setRedeemError(null)

    try {
      const result = await redeemByCode(preview.code, user.wallet)
      if (result.success) {
        setRedeemResult(result)
        setState('success')
      } else {
        setRedeemError(result.message || 'Redemption failed')
        setState('details') // Stay on details so user can retry
      }
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Failed to redeem code')
      setState('details')
    }
  }

  /**
   * Reset to try a different code
   */
  const handleReset = () => {
    setCodeInput('')
    setPreview(null)
    setRedeemResult(null)
    setErrorCode(undefined)
    setErrorMessage(undefined)
    setRedeemError(null)
    setState('idle')
  }

  // ─── Success screen ───
  if (state === 'success' && redeemResult) {
    return <RedeemSuccess result={redeemResult} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Redeem Invitation</h1>
        <p className="text-muted mt-2 text-sm">
          Enter your invitation code below
        </p>
      </div>

      {/* Code input form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Invitation Code
          </label>
          <input
            type="text"
            placeholder="KIN-XXXXXX-XXX"
            className="w-full px-4 py-3 bg-input border border-card-border rounded-xl text-white font-mono tracking-wider placeholder-white/30 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all uppercase"
            value={codeInput}
            onChange={(e) => setCodeInput(formatCodeInput(e.target.value))}
            maxLength={15}
            disabled={state === 'verifying' || state === 'details' || state === 'redeeming'}
          />
        </div>

        {/* Verify button — shown in idle/verifying/error states */}
        {(state === 'idle' || state === 'verifying' || state === 'error') && (
          <button
            type="submit"
            disabled={!codeInput.trim() || state === 'verifying'}
            className="w-full py-3.5 bg-accent hover:bg-accent-dark text-white font-semibold rounded-full transition-all duration-200 shadow-lg shadow-accent/20 hover:shadow-accent/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {state === 'verifying' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Verify Code</span>
              </>
            )}
          </button>
        )}
      </form>

      {/* Error state */}
      {state === 'error' && (
        <div className="pt-2">
          <RedeemError
            errorCode={errorCode}
            message={errorMessage}
            hideTryAnother
          />
        </div>
      )}

      {/* Separator between input and details */}
      {(state === 'details' || state === 'redeeming') && preview && (
        <>
          <div className="border-t border-card-border" />
          <CodeDetails
            preview={preview}
            onRedeem={handleRedeem}
            isRedeeming={state === 'redeeming'}
            redeemError={redeemError}
          />
          {/* Reset link */}
          <div className="text-center pt-2">
            <button
              onClick={handleReset}
              className="text-sm text-muted hover:text-accent transition-colors"
            >
              Try a different code
            </button>
          </div>
        </>
      )}
    </div>
  )
}
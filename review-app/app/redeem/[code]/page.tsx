'use client'

/**
 * Redeem Code Page - Deep Link Landing
 *
 * Auto-verifies the code from the URL param on mount.
 * State machine: VERIFYING → DETAILS → REDEEMING → SUCCESS
 *                          ↘  ERROR  ↙
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { previewCode, redeemByCode } from '@/lib/codes-api'
import type { CodePreviewResponse, RedeemByCodeResponse } from '@/lib/types'
import CodeDetails from '@/components/redeem/CodeDetails'
import RedeemSuccess from '@/components/redeem/RedeemSuccess'
import RedeemError from '@/components/redeem/RedeemError'

type PageState = 'verifying' | 'details' | 'redeeming' | 'success' | 'error'

export default function RedeemCodePage() {
  const params = useParams()
  const { user, token } = useAuth()
  const codeString = (params.code as string) || ''

  const [state, setState] = useState<PageState>('verifying')
  const [preview, setPreview] = useState<CodePreviewResponse | null>(null)
  const [redeemResult, setRedeemResult] = useState<RedeemByCodeResponse | null>(null)
  const [errorCode, setErrorCode] = useState<string | undefined>()
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [redeemError, setRedeemError] = useState<string | null>(null)

  /**
   * Auto-verify on mount
   */
  const verifyCode = useCallback(async () => {
    if (!codeString) {
      setErrorMessage('No invitation code provided')
      setState('error')
      return
    }

    setState('verifying')

    try {
      const result = await previewCode(codeString)
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
  }, [codeString])

  useEffect(() => {
    verifyCode()
  }, [verifyCode])

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
        // For market codes, also join the market in the Prisma DB
        if (preview.accessType === 'market' && result.marketId) {
          const joinHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
          if (token) joinHeaders.Authorization = `Bearer ${token}`
          
          console.log('[Redeem] Market join attempt:', {
            marketId: result.marketId,
            role: result.role,
            hasToken: !!token,
            accessType: preview.accessType,
          })
          
          const joinRes = await fetch(`/api/v1/markets/${result.marketId}/join`, {
            method: 'POST',
            headers: joinHeaders,
            body: JSON.stringify({ role: result.role || 'member' }),
          })
          
          if (!joinRes.ok) {
            const joinError = await joinRes.json().catch(() => ({}))
            console.error('[Redeem] Market join failed:', joinRes.status, joinError)
          } else {
            console.log('[Redeem] Market join success')
          }
        } else {
          console.log('[Redeem] Skipping market join:', {
            accessType: preview.accessType,
            marketId: result.marketId,
          })
        }

        setRedeemResult(result)
        setState('success')
      } else {
        setRedeemError(result.message || 'Redemption failed')
        setState('details')
      }
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Failed to redeem code')
      setState('details')
    }
  }

  // ─── Loading state ───
  if (state === 'verifying') {
    return (
      <div className="flex flex-col items-center py-10">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted mt-4">Verifying invitation...</p>
        <p className="text-xs text-white/30 mt-1 font-mono tracking-wider">{codeString}</p>
      </div>
    )
  }

  // ─── Success screen ───
  if (state === 'success' && redeemResult) {
    return <RedeemSuccess result={redeemResult} />
  }

  // ─── Error screen ───
  if (state === 'error') {
    return <RedeemError errorCode={errorCode} message={errorMessage} />
  }

  // ─── Details + Redeem ───
  if ((state === 'details' || state === 'redeeming') && preview) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">You're Invited!</h1>
          <p className="text-muted mt-2 text-sm">
            Review the details below and redeem your invitation
          </p>
        </div>

        <CodeDetails
          preview={preview}
          onRedeem={handleRedeem}
          isRedeeming={state === 'redeeming'}
          redeemError={redeemError}
        />
      </div>
    )
  }

  return null
}
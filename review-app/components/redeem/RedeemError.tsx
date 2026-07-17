'use client'

/**
 * RedeemError - Error display for invalid/expired/exhausted codes
 *
 * Shows an appropriate icon, message, and a link to try a different code.
 */

import React from 'react'
import Link from 'next/link'

interface RedeemErrorProps {
  errorCode?: string
  message?: string
  /** Hide the "try another code" link (e.g. on the manual entry page where the input is already visible) */
  hideTryAnother?: boolean
}

const ERROR_CONFIG: Record<string, { icon: string; title: string; fallbackMessage: string }> = {
  not_found: {
    icon: '🔍',
    title: 'Code Not Found',
    fallbackMessage: 'This invitation code doesn\'t exist. Please check the code and try again.',
  },
  expired: {
    icon: '⏰',
    title: 'Invitation Expired',
    fallbackMessage: 'This invitation has expired and can no longer be redeemed.',
  },
  exhausted: {
    icon: '🚫',
    title: 'Usage Limit Reached',
    fallbackMessage: 'This invitation has reached its maximum number of uses.',
  },
  disabled: {
    icon: '🔒',
    title: 'Invitation Disabled',
    fallbackMessage: 'This invitation has been disabled by its creator.',
  },
}

const DEFAULT_ERROR = {
  icon: '⚠️',
  title: 'Invalid Code',
  fallbackMessage: 'This invitation code could not be verified. Please try again.',
}

export default function RedeemError({ errorCode, message, hideTryAnother }: RedeemErrorProps) {
  const config = (errorCode && ERROR_CONFIG[errorCode]) || DEFAULT_ERROR

  return (
    <div className="flex flex-col items-center text-center space-y-5">
      {/* Error icon */}
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl">
        {config.icon}
      </div>

      {/* Title + message */}
      <div>
        <h2 className="text-xl font-bold text-white">{config.title}</h2>
        <p className="text-subtle mt-2 text-sm leading-relaxed max-w-[300px] mx-auto">
          {message || config.fallbackMessage}
        </p>
      </div>

      {/* Try another code */}
      {!hideTryAnother && (
        <Link
          href="/redeem"
          className="text-sm text-accent hover:text-accent-dark transition-colors font-medium"
        >
          Try a different code →
        </Link>
      )}
    </div>
  )
}

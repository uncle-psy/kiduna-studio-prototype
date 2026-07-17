'use client'

/**
 * RedeemSuccess - Success confirmation screen after code redemption
 *
 * Shows a checkmark, welcome message, and navigation button.
 */

import React from 'react'
import { useRouter } from 'next/navigation'
import type { RedeemByCodeResponse } from '@/lib/types'

interface RedeemSuccessProps {
  result: RedeemByCodeResponse
}

export default function RedeemSuccess({ result }: RedeemSuccessProps) {
  const router = useRouter()
  const { message, contextName, marketId, marketName, role, alreadyMember, context } = result

  const contextColor = context?.color || '#EAAA00'
  const isMarketCode = !!marketId

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* Animated checkmark */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center animate-[scaleIn_0.3s_ease-out]"
        style={{ backgroundColor: alreadyMember ? '#3b82f622' : '#22c55e22' }}
      >
        {alreadyMember ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          {alreadyMember ? 'Already a Member' : 'Welcome!'}
        </h2>
        <p className="text-subtle mt-2 text-sm leading-relaxed max-w-[280px] mx-auto">
          {message}
        </p>
      </div>

      {/* Context + role summary */}
      {(contextName || marketName || role) && (
        <div className="bg-white/[0.04] border border-card-border rounded-xl p-4 w-full">
          {context && (
            <div className="flex items-center justify-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: contextColor + '22', border: `1px solid ${contextColor}44` }}
              >
                {context.icon || '🎮'}
              </div>
              <span className="font-semibold text-white">{context.name}</span>
            </div>
          )}
          {!context && isMarketCode && marketName && (
            <div className="flex items-center justify-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: '#f59e0b22', border: '1px solid #f59e0b44' }}
              >
                ⚖️
              </div>
              <span className="font-semibold text-white">{marketName}</span>
            </div>
          )}
          {!context && !isMarketCode && contextName && (
            <p className="font-semibold text-white mb-2">{contextName}</p>
          )}
          {role && (
            <p className="text-sm text-muted">
              Role: <span className="text-white capitalize font-medium">{role}</span>
            </p>
          )}
        </div>
      )}

      {/* Navigate to dashboard or market */}
      <button
        onClick={() => router.push(isMarketCode && marketId ? `/market/proposals` : '/dashboard')}
        className="w-full py-3.5 bg-accent hover:bg-accent-dark text-white font-semibold rounded-full transition-all duration-200 shadow-lg shadow-accent/20 hover:shadow-accent/30 flex items-center justify-center gap-2"
      >
        <span>{isMarketCode ? 'Go to Market' : 'Go to Dashboard'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </button>

      {/* App download section */}
      <div className="w-full pt-4 border-t border-card-border space-y-3">
        <div className="flex items-center gap-2 justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium text-white">Get the Kinship App</p>
        </div>
        <p className="text-xs text-muted leading-relaxed max-w-[300px] mx-auto">
          Download the Kinship app to chat with AI agents, receive notifications, and access your membership on the go.
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <a
            href="https://play.google.com/store/apps/details?id=com.kinship.bigagent"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-card-border rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path className="text-emerald-400" d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 2.302-2.698-2.302 2.698-2.302zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
            </svg>
            <div className="text-left">
              <p className="text-[9px] text-muted leading-none">GET IT ON</p>
              <p className="text-xs font-semibold text-white leading-tight">Google Play</p>
            </div>
          </a>
          <a
            href="https://apps.apple.com/app/kinship/id6504907836"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-card-border rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-left">
              <p className="text-[9px] text-muted leading-none">Download on the</p>
              <p className="text-xs font-semibold text-white leading-tight">App Store</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
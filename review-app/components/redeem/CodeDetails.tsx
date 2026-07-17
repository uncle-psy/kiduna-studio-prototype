'use client'

/**
 * CodeDetails - Displays verified code information
 *
 * Shows context icon/name/color, role, expiry, and a Redeem button.
 * Used by both /redeem and /redeem/[code] pages.
 */

import React from 'react'
import type { CodePreviewResponse } from '@/lib/types'

interface CodeDetailsProps {
  preview: CodePreviewResponse
  onRedeem: () => void
  isRedeeming: boolean
  redeemError?: string | null
}

export default function CodeDetails({
  preview,
  onRedeem,
  isRedeeming,
  redeemError,
}: CodeDetailsProps) {
  const { context, scope, expiresAt, code } = preview

  // Format the expiry date
  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  // Determine context color (fallback to accent)
  const contextColor = context?.color || '#EAAA00'

  return (
    <div className="space-y-6">
      {/* Context badge */}
      {context && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
            style={{ backgroundColor: contextColor + '22', border: `2px solid ${contextColor}44` }}
          >
            {context.icon || '🎮'}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">{context.name}</h2>
            <p className="text-sm text-muted mt-1">is inviting you to join</p>
          </div>
        </div>
      )}

      {/* Market badge — shown for market codes (no context) */}
      {!context && preview.accessType === 'market' && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
            style={{ backgroundColor: '#f59e0b22', border: '2px solid #f59e0b44' }}
          >
            ⚖️
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">{preview.marketName || 'Market'}</h2>
            <p className="text-sm text-muted mt-1">is inviting you to join as {preview.role === 'admin' ? 'an Admin' : 'a Member'}</p>
          </div>
        </div>
      )}

      {/* Details card */}
      <div className="bg-white/[0.04] border border-card-border rounded-xl p-5 space-y-4">
        {/* Code */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Invitation Code</span>
          <span className="font-mono text-sm font-semibold text-accent tracking-wider">
            {code}
          </span>
        </div>

        {/* Access Level */}
        {preview.accessType && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Access Level</span>
            <span className="text-sm font-medium text-white capitalize px-3 py-1 bg-white/[0.08] rounded-full">
              {preview.accessType}
            </span>
          </div>
        )}

        {/* Scope name */}
        {scope && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Scope</span>
            <span className="text-sm font-medium text-blue-300 px-3 py-1 bg-blue-500/[0.1] rounded-full">
              {scope.name}
            </span>
          </div>
        )}

        {/* Permissions */}
        {scope && scope.permissions.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Permissions</span>
            <div className="flex gap-1.5">
              {scope.permissions.map((p) => (
                <span
                  key={p}
                  className="text-xs font-medium text-purple-300 px-2.5 py-0.5 bg-purple-500/[0.1] border border-purple-500/20 rounded-full capitalize"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Expiry */}
        {formattedExpiry && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Expires</span>
            <span className="text-sm text-subtle">{formattedExpiry}</span>
          </div>
        )}
      </div>

      {/* Avatars & Workers */}
      {scope && scope.avatars.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-0.5 h-3.5 rounded-full" style={{ backgroundColor: contextColor + 'AA' }} />
            <span className="text-xs font-semibold text-white/50 tracking-wider uppercase">
              Your Avatars
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ color: contextColor, backgroundColor: contextColor + '18' }}
            >
              {scope.avatars.length}
            </span>
          </div>

          {scope.avatars.map((avatar) => (
            <div
              key={avatar.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
            >
              {/* Avatar header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: contextColor + '1F',
                    border: `1.5px solid ${contextColor}40`,
                    color: contextColor + 'CC',
                  }}
                >
                  {avatar.name[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{avatar.name}</p>
                  {avatar.handle && (
                    <p className="text-[10px] text-white/30">@{avatar.handle}</p>
                  )}
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded"
                  style={{ color: contextColor + '99', backgroundColor: contextColor + '14' }}
                >
                  {avatar.workers.length} worker{avatar.workers.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Workers list */}
              {avatar.workers.length > 0 && (
                <div className="mt-3 pl-11 space-y-1.5">
                  {avatar.workers.map((worker) => (
                    <div key={worker.id} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white/70">{worker.name}</p>
                        {worker.description && (
                          <p className="text-[10px] text-white/30 truncate">{worker.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Redeem error */}
      {redeemError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 shrink-0 text-red-400 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-red-400 leading-relaxed">{redeemError}</span>
        </div>
      )}

      {/* Redeem button */}
      <button
        onClick={onRedeem}
        disabled={isRedeeming}
        className="w-full py-3.5 bg-accent hover:bg-accent-dark text-white font-semibold rounded-full transition-all duration-200 shadow-lg shadow-accent/20 hover:shadow-accent/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isRedeeming ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Redeeming...</span>
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <span>Redeem Invitation</span>
          </>
        )}
      </button>
    </div>
  )
}
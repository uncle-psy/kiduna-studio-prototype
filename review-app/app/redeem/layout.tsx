'use client'

/**
 * Redeem Layout
 *
 * Wraps all /redeem routes with AuthGuard and a minimal centered layout.
 * No studio sidebar or header — just a clean, focused card experience.
 */

import React from 'react'
import Link from 'next/link'
import { AuthGuard } from '@/components/AuthGuard'

export default function RedeemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        {/* Kinship logo - links to studio home */}
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EAAA00] to-amber-700 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:shadow-accent/30 transition-shadow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-wide">KINSHIP</span>
          </Link>
        </div>

        {/* Content card */}
        <div className="w-full max-w-md">
          <div className="bg-card border border-card-border rounded-2xl p-8 shadow-2xl shadow-black/50">
            {children}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-8">
          Kinship Studio v1.0
        </p>
      </div>
    </AuthGuard>
  )
}

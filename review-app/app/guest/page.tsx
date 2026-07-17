'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Icon } from '@iconify/react'
import { WalletContent } from '@/components/wallet/WalletContent.tsx'
import { AuthGuard } from '@/components/AuthGuard'

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

function GuestPageContent() {
  const router = useRouter()
  const { logout, user } = useAuth()
  const [verified, setVerified] = useState(false)

  // On mount, call /is-auth directly to check FRESH subscription.
  // If the user has a paid tier, redirect to studio.
  // This runs ONCE — no deps that cause re-fire.
  useEffect(() => {
    let cancelled = false

    async function checkFreshSubscription() {
      try {
        const token = localStorage.getItem('token')
        if (!token) { setVerified(true); return }

        const res = await fetch(`${AUTH_API_URL}/is-auth`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { setVerified(true); return }

        const data = await res.json()
        const apiUser = data?.data?.user
        const tier = apiUser?.subscriptionTier
        const role = apiUser?.role
        const onboardingStatus = apiUser?.onboardingStatus
        const hasCredit = apiUser?.hasCofounderCredit

        console.log('[GuestPage] fresh check:', { tier, role, onboardingStatus, hasCredit })

        const slug = process.env.NEXT_PUBLIC_LAUNCHPAD_SLUG || 'kiduna'

        // Wizards have unrestricted access — send them straight to the studio,
        // bypassing every onboarding/payment route restriction below.
        if (role === 'wizard') { if (!cancelled) router.replace('/chat'); return }

        // Explicit onboarding statuses
        if (onboardingStatus === 'needs_code')  { if (!cancelled) router.replace('/community'); return }

        // 'paid' but the co-founder credit hasn't been consumed yet → the user
        // still needs to commit USDC on the launchpad.
        if (onboardingStatus === 'paid' && hasCredit === true) {
          if (!cancelled) router.replace(`/launchpad/${slug}`)
          return
        }

        // Committed co-founders (onboardingStatus 'committed', or 'paid' with the
        // credit already consumed) who are still on the guest tier stay HERE.
        // /guest is their home until they upgrade their membership. Redirecting
        // them to /cofounder would loop: /cofounder → Enter Studio → /chat →
        // AuthGuard (guest, no studio access) → /guest → back to /cofounder.

        // Wizard or any REAL paid tier → go to studio
        const isRealPaidTier = tier && tier !== 'guest' && tier !== 'cofounder'
        if (role === 'wizard' || isRealPaidTier) {
          if (!cancelled) router.replace('/chat')
          return
        }

        // User has cofounder credit → paid but not committed
        if (hasCredit === true) {
          if (!cancelled) router.replace(`/launchpad/${slug}`)
          return
        }

        // Only redirect to /signup for explicitly 'incomplete' users
        // (NOT for null/undefined — those are old users)
        if (onboardingStatus === 'incomplete') {
          if (!cancelled) router.replace('/signup')
          return
        }
      } catch {
        // Fetch failed — stay on guest page
      }

      if (!cancelled) setVerified(true)
    }

    checkFreshSubscription()
    return () => { cancelled = true }
  }, [router])

  // Check if user has completed the Co-founder purchase (launchpad contribution)
  const isCofounder = user?.hasCofounderCredit === false && user?.subscription === 'guest'
  // More accurately: check if they ever had a cofounder credit (contributed to launchpad)
  // For now, we detect co-founders by checking if their subscription was 'cofounder' in the raw API
  // OR if they have contributed to the launchpad. Since we map cofounder→guest in transformUser,
  // we can check the raw value isn't available here. Instead, use a simpler heuristic:
  // If wallet has USDC or the user came from the onramp flow, they're likely a co-founder.
  // TODO: Add a dedicated `isCofounder` field to the user model for accurate detection.

  function handleLogout() {
    logout()
    router.push('/login')
  }

  // Show loading while verifying — prevents flash of guest UI for paid users
  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted text-sm">Checking membership...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 lg:p-8">

      {/* ── Upgrade Banner ─────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-6" style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(234,88,12,0.08) 40%, rgba(139,92,246,0.06) 100%)',
        border: '1px solid rgba(245,158,11,0.2)',
      }}>
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)' }} />

        <div className="relative p-5 sm:p-6">
          {/* Warning strip */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-md bg-amber-500/25 flex items-center justify-center">
              <Icon icon="lucide:alert-triangle" width={11} height={11} className="text-amber-400" />
            </div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Access Restricted</p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Message */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Unlock the Full Kiduna Studio
              </h2>
              <p className="text-sm text-white/50 leading-relaxed max-w-xl">
                Members and Sponsors get access to AI agents, decentralized markets, governance tools, and much more. Your wallet is ready — upgrade to start building.
              </p>
            </div>

            {/* CTA */}
            <div className="shrink-0">
              <a
                href="/upgrade"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/20"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                }}
              >
                <Icon icon="lucide:crown" width={15} height={15} />
                Upgrade Membership
                <Icon icon="lucide:arrow-right" width={14} height={14} />
              </a>
            </div>
          </div>

          {/* User info bar */}
          <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center text-white/70 text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white/80">{user?.name}</p>
                  <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/25">
                    Guest
                  </span>
                </div>
                <p className="text-xs text-white/30">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
             className="text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Icon icon="lucide:log-out" width={12} height={12} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Wallet ─────────────────────────────────────────────────── */}
      <WalletContent hideHeader />

    </div>
  )
}

export default function GuestPage() {
  return (
    <AuthGuard>
      <GuestPageContent />
    </AuthGuard>
  )
}
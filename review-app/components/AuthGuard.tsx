'use client'

/**
 * Auth Guard Component
 *
 * Protects routes by requiring authentication.
 * Redirects unauthenticated users to the login page.
 *
 * Access rules:
 *   - Wizard role → always allowed
 *   - subscriptionTier is member/founder/builder/sponsor/catalyst/luminary → allowed
 *   - subscriptionTier is guest or null → redirected to /guest
 */

import React, { useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { hasMinTier } from '@/lib/tier-utils'

// Session storage key for post-login redirect
export const POST_LOGIN_REDIRECT_KEY = 'postLoginRedirect'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Returns true if the user has studio access:
 *   - role is 'wizard', OR
 *   - subscriptionTier is member or above (not guest, not null)
 */
function hasStudioAccess(user: { role?: string; subscription?: string } | null): boolean {
  if (!user) return false
  if (user.role === 'wizard') return true
  return hasMinTier(user.subscription, 'member')
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (isLoading) return

    // Not authenticated → login
    if (!isAuthenticated) {
      try {
        const fullPath = pathname + window.location.search
        sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, fullPath)
      } catch {}
      router.push('/login')
      return
    }

    // Authenticated but no studio access → guest page
    // (skip if already on /guest, /wallet, or /role to prevent loop —
    // /role is the membership upgrade page, must be accessible to guests)
    const bypassPaths = ['/guest', '/wallet', '/role']
    if (!hasStudioAccess(user) && !bypassPaths.includes(pathname)) {
      router.replace('/guest')
    }
  }, [isAuthenticated, isLoading, user?.subscription, user?.role, router, pathname])

  // Loading
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted text-sm">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // Not authenticated — will redirect
  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted text-sm">Redirecting to login...</p>
          </div>
        </div>
      )
    )
  }

  // Guest on restricted page — spinner while redirecting
  if (!hasStudioAccess(user) && pathname !== '/guest' && pathname !== '/wallet') {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted text-sm">Redirecting...</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuthComponent(props: P) {
    return (
      <AuthGuard>
        <WrappedComponent {...props} />
      </AuthGuard>
    )
  }
}

export default AuthGuard
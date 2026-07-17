'use client'

/**
 * Authentication Context Provider
 *
 * Manages authentication state across the application.
 * Uses the Kinship API for authentication.
 *
 * API Response Format:
 *   { data: { token: "...", user: { ... } } }
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import {
  AuthContextValue,
  AuthUser,
  LoginResponse,
  LoginSuccessResponse,
} from '@/lib/auth-types'
import { ensureDirectoryPresence } from '@/lib/agents-api'

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Auth API URL from environment
const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

// Local storage key — only token is stored; user data is always fetched fresh
const TOKEN_KEY = 'token'
const REVIEW_MODE = process.env.NEXT_PUBLIC_REVIEW_MODE === 'true'
const REVIEW_GUEST_PATHS = new Set(['/login', '/login_', '/signup', '/forgot-password'])
const REVIEW_USER: AuthUser = {
  id: 'review-user',
  email: 'review@kiduna.design',
  name: 'Review Member',
  username: 'review.member',
  wallet: 'ReviewWallet111111111111111111111111111111',
  kinshipCode: 'KIDUNA-REVIEW',
  role: 'sponsor',
  subscription: 'luminary',
  hasCofounderCredit: true,
  onboardingStatus: 'complete',
  membership: { type: 'lifetime', membershipType: 'luminary', expiryDate: '' },
}

// Tiers that map to a public directory tab. Used by the self-healing tier sync.
const DIRECTORY_TIERS = new Set([
  'member',
  'founder',
  'builder',
  'sponsor',
  'catalyst',
  'luminary',
])

// Tracks which wallet+tier pairs were already synced this page load (idempotency).
const syncedTierKeys = new Set<string>()

// Create context with default values
const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * API Response Types
 *
 * The API returns: { data: { token, user } }
 */
interface ApiLoginResponse {
  data: {
    token: string
    user: {
      id?: string
      _id?: string
      uuid?: string
      email?: string
      name?: string
      firstName?: string
      wallet?: string
      kinshipCode?: string
      role?: string
      subscription?: string
      subscriptionTier?: string | null
      hasCofounderCredit?: boolean
      onboardingStatus?: string
      profile?: {
        username?: string
        displayName?: string
        image?: string
      }
      membership?: {
        type?: string
        membershipType?: string
        expiryDate?: string
      }
    }
  }
}

/**
 * Transform API user to our AuthUser format
 */
function transformUser(apiUser: ApiLoginResponse['data']['user']): AuthUser {
  // cofounder is a launchpad credit, not a membership tier.
  // If the DB still has 'cofounder' from old webhook runs, treat as 'guest'.
  const rawTier = apiUser.subscriptionTier || getSubscription(apiUser.email || '') || 'guest'
  const subscription = (rawTier === 'cofounder' ? 'guest' : rawTier) as AuthUser['subscription']

  return {
    id: apiUser.id || apiUser._id || apiUser.uuid || '',
    email: apiUser.email || '',
    name: apiUser.name || apiUser.firstName || apiUser.profile?.displayName || 'User',
    username: apiUser.profile?.username,
    wallet: apiUser.wallet || '',
    kinshipCode: apiUser.kinshipCode,
    role: apiUser.role || 'member',
    subscription,
    profileImage: apiUser.profile?.image,
    hasCofounderCredit: apiUser.hasCofounderCredit ?? false,
    onboardingStatus: (apiUser.onboardingStatus || 'incomplete') as AuthUser['onboardingStatus'],
    membership: {
      type: apiUser.membership?.type || 'free',
      membershipType: apiUser.membership?.membershipType || 'basic',
      expiryDate: apiUser.membership?.expiryDate || '',
    },
  }
}
const getSubscription = (_email: string): any => {
  //  let subscription = "guest"
  const subscription = ""
  // Hardcoded email→tier overrides disabled — the tier now comes from
  // apiUser.subscriptionTier (the auth service). Kept here, commented, for
  // reference only.
  // if (email === 'aashik1@yopmail.com') {
  //   subscription = 'guest'
  // } else if (email === 'aashik2002@yopmail.com') {
  //   subscription = 'member'
  // } else if (email === 'aashik200227@yopmail.com') {
  //   subscription = 'sponsor'
  // } else if (email === 'aashik200227@gmail.com') {
  //   subscription = 'sponsor'
  // } else if (email === 'krishdmuthu@gmail.com') {
  //   subscription = 'sponsor'
  // } else if (email === 'sriramtecneural+1@gmail.com'){
  //   subscription = 'sponsor'
  // } else if (email === 'mahaaa142000@gmail.com'){
  //   subscription = 'sponsor'
  // } else if (email === 'superdev0505@gmail.com'){
  //   subscription = 'sponsor'
  // } else if (email === 'motodave@gmail.com'){
  //   subscription = 'Luminary'
  // }
  return subscription
}

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname()
  const reviewAsGuest = REVIEW_MODE && REVIEW_GUEST_PATHS.has(pathname)
  const [user, setUser] = useState<AuthUser | null>(REVIEW_MODE ? REVIEW_USER : null)
  const [token, setToken] = useState<string | null>(REVIEW_MODE ? 'review-token' : null)
  const [isLoading, setIsLoading] = useState(!REVIEW_MODE)

  /**
   * Check if there's an existing auth session on mount
   * Reads token from localStorage, then calls /is-auth API to get fresh user data
   */
  useEffect(() => {
    if (REVIEW_MODE) return
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY)

        if (storedToken) {
          // Token exists — verify it and get fresh user data from API
          try {
            const res = await fetch(`${AUTH_API_URL}/is-auth`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            })

            if (res.ok) {
              const responseData = await res.json()
              const apiUser = responseData?.data?.user
              if (apiUser) {
                const transformedUser = transformUser(apiUser)
                setToken(storedToken)
                setUser(transformedUser)
                console.log('[AUTH] Session verified via /is-auth')
              } else {
                console.log('[AUTH] /is-auth returned no user data')
                clearAuthStorage()
              }
            } else {
              // Token invalid or expired
              console.log('[AUTH] Token invalid/expired, clearing session')
              clearAuthStorage()
            }
          } catch (err) {
            console.error('[AUTH] /is-auth call failed:', err)
            clearAuthStorage()
          }
        } else {
          console.log('[AUTH] No stored token found')
        }
      } catch (error) {
        console.error('[AUTH] Initialization error:', error)
        clearAuthStorage()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  /**
   * Self-healing membership-tier sync.
   *
   * The user's tier lives on the auth service (user.subscription); the public
   * allies directory filters avatars by Agent.role on the agents backend. This
   * effect bridges the two: whenever an authenticated user's tier is known, it
   * tags that wallet's avatars with the matching tier so they appear under the
   * correct directory tab — regardless of how the tier was acquired (Stripe,
   * USDC/coins, admin, or a purchase made before this sync existed).
   *
   * It is idempotent and runs at most once per wallet+tier per page load.
   */
  useEffect(() => {
    if (REVIEW_MODE) return
    const wallet = user?.wallet
    const tier = (user?.subscription || '').toLowerCase()
    if (!wallet || !DIRECTORY_TIERS.has(tier)) return

    const key = `${wallet}:${tier}`
    if (syncedTierKeys.has(key)) return
    syncedTierKeys.add(key)

    // Tags the user's avatars with their tier, and — if they have no avatar yet —
    // creates a minimal listable member profile so purchasing alone lists them.
    ensureDirectoryPresence({
      wallet,
      role: tier,
      name: user?.name || undefined,
      handle: user?.username || user?.name || undefined,
    }).catch((err) => {
      // Best-effort: a sync failure must never break auth. Allow a retry next load.
      syncedTierKeys.delete(key)
      console.error('[AUTH] tier sync failed:', err)
    })
  }, [user?.wallet, user?.subscription])

  /**
   * Clear auth data from storage
   */
  const clearAuthStorage = () => {
    localStorage.removeItem(TOKEN_KEY)
    // Clear signup/onramp flow data to prevent stale redirects
    localStorage.removeItem('onramp_session_id')
    localStorage.removeItem('onramp_completed')
    localStorage.removeItem('onramp_stripe_url')
    localStorage.removeItem('duna-signup-data')
    setToken(null)
    setUser(null)
  }

  /**
   * Login function - calls Kinship Auth API
   *
   * Request:
   *   POST {AUTH_API_URL}/login
   *   Body: { "handle": "email", "password": "password" }
   *
   * Response:
   *   { "data": { "token": "...", "user": { ... } } }
   */
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      try {
        const endpoint = `${AUTH_API_URL}/login`
        console.log('[AUTH] Logging in via:', endpoint)

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            handle: email, // API uses "handle" not "email"
            password,
          }),
        })

        // Parse response
        const responseData = await response.json()
        console.log('[AUTH] Response received:', {
          status: response.status,
          hasData: !!responseData.data,
          hasToken: !!responseData.data?.token,
        })

        // Check for HTTP errors
        if (!response.ok) {
          console.warn('[AUTH] Login failed:', response.status, responseData)

          const errorMessage =
            responseData.message ||
            responseData.error ||
            responseData.data?.message ||
            'Login failed. Please check your credentials.'

          return {
            success: false,
            error: errorMessage,
            code:
              response.status === 401
                ? 'INVALID_PASSWORD'
                : response.status === 404
                  ? 'USER_NOT_FOUND'
                  : 'SERVER_ERROR',
          }
        }

        // Extract token and user from response.data
        const apiData = responseData.data

        if (!apiData || !apiData.token) {
          console.error('[AUTH] Invalid response structure:', responseData)
          return {
            success: false,
            error: 'Invalid response from server. Expected data.token',
            code: 'SERVER_ERROR',
          }
        }

        const { token: authToken, user: apiUser } = apiData
        console.log('[AUTH] ✅ Login successful, token received')

        // Transform user data to our format
        const transformedUser = transformUser(apiUser || {})

        // Store only token in localStorage — user data fetched via /is-auth
        localStorage.setItem(TOKEN_KEY, authToken)
        console.log('[AUTH] ✅ Token stored in localStorage')

        // Update state
        setToken(authToken)
        setUser(transformedUser)

        // Return success response
        const successResponse: LoginSuccessResponse = {
          success: true,
          message: 'Login successful',
          token: authToken,
          user: transformedUser,
        }

        return successResponse
      } catch (error) {
        console.error('[AUTH] Login error:', error)
        return {
          success: false,
          error: 'Network error. Please check your connection.',
          code: 'SERVER_ERROR',
        }
      }
    },
    []
  )

  /**
   * Logout function
   */
  const logout = useCallback(() => {
    console.log('[AUTH] Logging out, clearing storage')
    clearAuthStorage()
  }, [])

  /**
   * Check authentication status via API and refresh user data
   */
  const checkAuth = useCallback(async (): Promise<boolean> => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (!storedToken) return false
    try {
      const res = await fetch(`${AUTH_API_URL}/is-auth`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
      if (!res.ok) return false
      const responseData = await res.json()
      const apiUser = responseData?.data?.user
      if (apiUser) {
        const transformedUser = transformUser(apiUser)
        setToken(storedToken)
        setUser(transformedUser)
      }
      return true
    } catch { return false }
  }, [])

  const value: AuthContextValue = {
    user: reviewAsGuest ? null : user,
    token: reviewAsGuest ? null : token,
    isAuthenticated: reviewAsGuest ? false : !!user && !!token,
    isLoading: REVIEW_MODE ? false : isLoading,
    login,
    logout,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

/**
 * Get stored auth token (for use outside React components)
 * This is used by the chat page to add Authorization header
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Get stored user data — no longer available from localStorage.
 * Use the useAuth() hook inside React components instead.
 * @deprecated Use useAuth() hook for user data
 */
export function getStoredUser(): AuthUser | null {
  return null
}

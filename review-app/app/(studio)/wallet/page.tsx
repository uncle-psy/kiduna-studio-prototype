'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { isPaidTier } from '@/lib/tier-utils'
import { WalletContent } from '@/components/wallet/WalletContent.tsx'

export default function WalletPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Source of truth for the tier is `user.subscription` (subscriptionTier from
  // the auth service). The `membership` object is never returned by /is-auth,
  // so the old `membership.type` check always read 'free' and redirected
  // everyone — including paid members — to /offerings.
  const hasMembership = isPaidTier(user?.subscription)

  useEffect(() => {
    if (isLoading) return
    // Redirect to membership/offerings page if user has no active subscription
    if (!hasMembership) {
      router.replace('/offerings')
    }
  }, [hasMembership, isLoading, router])

  // Show nothing while checking
  if (isLoading) return null
  if (!hasMembership) return null

  return <WalletContent />
}
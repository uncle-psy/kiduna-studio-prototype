'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SectionWrapper from './ui/SectionWrapper'
import SectionHead from './ui/SectionHead'
import GoldEmphasis from './ui/GoldEmphasis'
import StarDivider from './ui/StarDivider'
import TierCard from './ui/TierCard'
import LuminaryCard from './ui/LuminaryCard'
import { useAuth } from '@/lib/auth-context'
import {
  TIERS_ROW_1,
  TIERS_ROW_2,
  LUMINARY_FEATURES,
} from '@/lib/landing-data'
import type { TierName } from '@/lib/tier-utils'
import { tierLevel } from '@/lib/tier-utils'

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

export default function MembershipTiers() {
  const router = useRouter()
  const { user, token, isAuthenticated, isLoading } = useAuth()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Current user tier (null if not logged in)
  const userTier = isAuthenticated ? (user?.subscription ?? null) : null

  const handleTierSelect = useCallback(
    async (tierId: TierName) => {
      setError(null)

      // ── Not logged in → navigate to signup with tier pre-selected ──
      if (!isAuthenticated || !token) {
        router.push(`/signup?tier=${tierId}`)
        return
      }

      // ── Guest tier → activate directly (no Stripe) ──
      if (tierId === 'guest') {
        setLoadingTier('guest')
        try {
          const res = await fetch(`${AUTH_API_URL}/select-guest-tier`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to activate guest tier')
          }
          // Refresh to reflect the new tier
          window.location.reload()
        } catch (err: any) {
          setError(err.message || 'Something went wrong')
          setLoadingTier(null)
        }
        return
      }

      // ── Paid tier → create Stripe checkout session ──
      setLoadingTier(tierId)
      try {
        const res = await fetch(`${AUTH_API_URL}/stripe/checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tier: tierId }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to create checkout session')
        }

        // Redirect to Stripe hosted checkout page
        if (data.url) {
          window.location.href = data.url
        } else {
          throw new Error('No checkout URL returned')
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
        setLoadingTier(null)
      }
    },
    [isAuthenticated, token, router],
  )

  return (
    <SectionWrapper>
      <SectionHead
        eyebrow={
          <>
            Join WV DUNA <StarDivider /> The genesis DUNA
          </>
        }
        title={
          <>
            Choose your role in the{' '}
            <GoldEmphasis>genesis DUNA.</GoldEmphasis>
          </>
        }
        lede="WV DUNA is the genesis DUNA, the legal and economic root every other DUNA grows from. Joining gives you a role in it, and with that role the identity, authority, and accountability you need to conduct agentic commerce on the open internet, plus real legal standing for everything that comes next."
      />

      {/* Second lede paragraph */}
      <p className="max-w-[760px] text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted leading-[1.55] -mt-6 mb-10">
        One membership, one payment, yours forever. Choose your level and pay
        once — no subscriptions, no renewals. Each level comes with a starting
        allotment of resources; when you need more, you can reload.
      </p>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-[8px] bg-[rgba(255,60,60,0.12)] border border-[rgba(255,60,60,0.3)] text-[0.92rem] text-[#ff6b6b]">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-[0.8rem] underline opacity-70 hover:opacity-100"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Row 1: Guest, Member, Founder */}
      <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4">
        {TIERS_ROW_1.map((tier) => {
          const isActive = userTier === tier.id
          const isLower = userTier ? tierLevel(tier.id) < tierLevel(userTier) : false
          return (
            <TierCard
              key={tier.name}
              {...tier}
              featured={isActive ? true : (!userTier ? tier.featured : false)}
              ribbon={isActive ? 'Active' : (isLower ? 'Included' : (!userTier ? tier.ribbon : undefined))}
              onSelect={() => handleTierSelect(tier.id as TierName)}
              loading={loadingTier === tier.id}
              disabled={isActive || isLower}
            />
          )
        })}
      </div>

      {/* Row 2: Builder, Sponsor, Catalyst */}
      <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4 mt-4">
        {TIERS_ROW_2.map((tier) => {
          const isActive = userTier === tier.id
          const isLower = userTier ? tierLevel(tier.id) < tierLevel(userTier) : false
          return (
            <TierCard
              key={tier.name}
              {...tier}
              featured={isActive ? true : (!userTier ? tier.featured : false)}
              ribbon={isActive ? 'Active' : (isLower ? 'Included' : (!userTier ? tier.ribbon : undefined))}
              onSelect={() => handleTierSelect(tier.id as TierName)}
              loading={loadingTier === tier.id}
              disabled={isActive || isLower}
            />
          )
        })}
      </div>

      {/* Row 3: Luminary */}
      <LuminaryCard
        features={LUMINARY_FEATURES}
        href="/signup?tier=luminary"
        onSelect={() => handleTierSelect('luminary')}
        loading={loadingTier === 'luminary'}
        isActive={userTier === 'luminary'}
      />

      <p className="mt-4 text-[0.82rem] text-muted">
        Membership is permanent once purchased. Upgrade to a higher level
        anytime by paying the difference.
      </p>
    </SectionWrapper>
  )
}

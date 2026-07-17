'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import '../dunathon-landing.css'
import LandingFooter from '@/components/landing/LandingFooter'
import type { TierName } from '@/lib/tier-utils'
import { tierLevel } from '@/lib/tier-utils'

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

const TIERS: {
  id: TierName; name: string; price: string; priceNum: number
  coins: number; bonus: number; features: string[]
  accent: string; glow: string; popular?: boolean; tagline: string
}[] = [
  {
    id: 'member', name: 'Member', price: '$10', priceNum: 10,
    coins: 100, bonus: 10, tagline: 'Start your journey',
    features: ['AI agent access', 'Community chat', 'Basic governance', '110 WVDUNA Coins'],
    accent: '#3B82F6', glow: 'rgba(59,130,246,0.15)',
  },
  {
    id: 'founder', name: 'Founder', price: '$100', priceNum: 100,
    coins: 1000, bonus: 100, tagline: 'Build and govern', popular: true,
    features: ['Everything in Member', 'Create DUNAs', 'Proposal creation', '1,100 WVDUNA Coins'],
    accent: '#EAAA00', glow: 'rgba(234,170,0,0.15)',
  },
  {
    id: 'builder', name: 'Builder', price: '$1,000', priceNum: 1000,
    coins: 10000, bonus: 1000, tagline: 'Shape the future',
    features: ['Everything in Founder', 'Advanced agent tools', 'Priority support', '11,000 WVDUNA Coins'],
    accent: '#8B5CF6', glow: 'rgba(139,92,246,0.15)',
  },
  {
    id: 'sponsor', name: 'Sponsor', price: '$10,000', priceNum: 10000,
    coins: 100000, bonus: 10000, tagline: 'Launch movements',
    features: ['Everything in Builder', 'Launch campaigns', 'Sponsor DUNAs', '110,000 WVDUNA Coins'],
    accent: '#EC4899', glow: 'rgba(236,72,153,0.15)',
  },
  {
    id: 'catalyst', name: 'Catalyst', price: '$100,000', priceNum: 100000,
    coins: 1000000, bonus: 100000, tagline: 'Drive transformation',
    features: ['Everything in Sponsor', 'Strategic governance', 'Exclusive access', '1,100,000 WVDUNA Coins'],
    accent: '#F97316', glow: 'rgba(249,115,22,0.15)',
  },
  {
    id: 'luminary', name: 'Luminary', price: '$1,000,000', priceNum: 1000000,
    coins: 10000000, bonus: 1000000, tagline: 'Define the era',
    features: ['Everything in Catalyst', 'Founding council seat', 'Maximum influence', '11,000,000 WVDUNA Coins'],
    accent: '#EF4444', glow: 'rgba(239,68,68,0.15)',
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, token } = useAuth()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hoveredTier, setHoveredTier] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  const currentTierLevel = tierLevel(user?.subscription)

  const handleUpgrade = useCallback(
    async (tierId: TierName) => {
      if (!token) { router.push('/login'); return }
      setLoadingTier(tierId)
      setError(null)
      try {
        const res = await fetch(`${AUTH_API_URL}/stripe/checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tier: tierId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create checkout session')
        if (data.url) window.location.href = data.url
        else throw new Error('No checkout URL returned')
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
        setLoadingTier(null)
      }
    },
    [token, router],
  )

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#03011B' }}>
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="duna-landing">
      <DunaLandingNav />

      <style jsx global>{`
        @keyframes up-rise {
          from { opacity: 0; transform: translateY(30px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes up-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes up-float {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(8px, -12px); }
        }
        @keyframes up-glow-pulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 0.8; }
        }
        @keyframes up-badge-bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-2px); }
        }
        .up-rise {
          opacity: 0;
          animation: up-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .up-float { animation: up-float 7s ease-in-out infinite; }
        .up-glow-pulse { animation: up-glow-pulse 4s ease-in-out infinite; }
        .up-card {
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                      border-color 0.35s ease,
                      box-shadow 0.35s ease;
        }
        .up-card:hover {
          transform: translateY(-8px) scale(1.01);
        }
        .up-card-inner {
          position: relative;
          overflow: hidden;
        }
        .up-card-inner::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          transition: left 0.6s ease;
          pointer-events: none;
        }
        .up-card:hover .up-card-inner::before {
          left: 120%;
        }
        .up-btn {
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .up-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .up-btn::after {
          content: '';
          position: absolute;
          top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .up-btn:hover::after { opacity: 1; }
        .up-feature-check {
          transition: transform 0.2s ease;
        }
        .up-card:hover .up-feature-check {
          transform: scale(1.15);
        }
        .up-popular-badge {
          animation: up-badge-bounce 2s ease-in-out infinite;
        }
      `}</style>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden pt-[76px] pb-[64px]"
        style={{
          background: `
            radial-gradient(900px 350px at 50% -15%, rgba(234,170,0,0.18), transparent 50%),
            radial-gradient(600px 350px at 85% 90%, rgba(139,92,246,0.1), transparent 55%),
            radial-gradient(500px 300px at 10% 70%, rgba(59,130,246,0.08), transparent 50%),
            linear-gradient(180deg, #0A0D33, #03011B)
          `,
        }}
      >
        {/* Ambient orbs */}
        <div aria-hidden className="up-float up-glow-pulse pointer-events-none absolute -top-20 right-[12%] h-64 w-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(234,170,0,0.2), transparent 70%)' }} />
        <div aria-hidden className="up-float up-glow-pulse pointer-events-none absolute bottom-[-40px] left-[5%] h-52 w-52 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)', animationDelay: '2s' }} />

        <div className="relative z-[2] w-full max-w-[1200px] mx-auto px-6 text-center">
          <p className="up-rise text-[0.7rem] font-bold tracking-[0.18em] uppercase text-accent/70 mb-4">
            Choose your path
          </p>
          <h1
            className="up-rise font-display text-[clamp(2.2rem,5vw,3.2rem)] font-normal text-white leading-[1.08] mb-4"
            style={{ animationDelay: '0.06s', textWrap: 'balance' as any }}
          >
            Upgrade your <em className="text-accent" style={{ fontStyle: 'italic' }}>Membership</em>
          </h1>
          <p
            className="up-rise text-[clamp(1rem,1.4vw,1.15rem)] text-white/50 max-w-[54ch] mx-auto leading-[1.65]"
            style={{ animationDelay: '0.12s' }}
          >
            Unlock AI agents, governance tools, and WVDUNA Coins.
            Every tier includes a permanent 10% bonus on coins.
          </p>

          {user?.subscription && user.subscription !== 'guest' && (
            <div className="up-rise inline-flex items-center gap-2 mt-5 px-4 py-1.5 rounded-full" style={{ animationDelay: '0.18s', background: 'rgba(234,170,0,0.1)', border: '1px solid rgba(234,170,0,0.2)' }}>
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-xs font-semibold text-accent">
                Current: {user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="w-full max-w-[1200px] mx-auto px-6 -mt-3 mb-2 relative z-[4]">
          <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* ── Tier Grid ── */}
      <section className="w-full max-w-[1240px] mx-auto px-6 -mt-6 pb-20 relative z-[3]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TIERS.map((tier, i) => {
            const isCurrentOrBelow = tierLevel(tier.id) <= currentTierLevel && currentTierLevel > 0
            const isCurrent = tierLevel(tier.id) === currentTierLevel && currentTierLevel > 0
            const isUpgrade = tierLevel(tier.id) > currentTierLevel || currentTierLevel === 0
            const isHovered = hoveredTier === tier.id

            return (
              <div
                key={tier.id}
                className="up-rise up-card"
                style={{ animationDelay: `${0.18 + i * 0.07}s` }}
                onMouseEnter={() => setHoveredTier(tier.id)}
                onMouseLeave={() => setHoveredTier(null)}
              >
                <div
                  className="rounded-[22px] p-[1.5px] relative"
                  style={{
                    background: isHovered
                      ? `linear-gradient(160deg, ${tier.accent}60, ${tier.accent}20, rgba(255,255,255,0.08))`
                      : tier.popular
                        ? `linear-gradient(160deg, ${tier.accent}35, ${tier.accent}10, rgba(255,255,255,0.04))`
                        : 'rgba(255,255,255,0.06)',
                    transition: 'background 0.4s ease',
                  }}
                >
                  {/* Popular badge */}
                  {tier.popular && (
                    <div
                      className="up-popular-badge absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] z-10"
                      style={{ background: `linear-gradient(135deg, ${tier.accent}, ${tier.accent}DD)`, color: '#0A0D33', boxShadow: `0 4px 16px ${tier.glow}` }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div
                    className="up-card-inner rounded-[21px] p-6 h-full flex flex-col"
                    style={{ background: '#07052E' }}
                  >
                    {/* Hover glow orb */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl transition-opacity duration-500"
                      style={{ background: tier.glow, opacity: isHovered ? 1 : 0 }}
                    />

                    {/* Header */}
                    <div className="relative mb-5">
                      <div className="flex items-center gap-3 mb-1">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-transform duration-300"
                          style={{
                            background: `${tier.accent}12`,
                            color: tier.accent,
                            border: `1.5px solid ${tier.accent}25`,
                            transform: isHovered ? 'scale(1.1) rotate(-3deg)' : 'scale(1)',
                          }}
                        >
                          {tier.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-[1.1rem] font-bold text-white">{tier.name}</h3>
                          <p className="text-[11px] text-white/30">{tier.tagline}</p>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="relative mb-5">
                      <span className="text-[2.2rem] font-bold text-white leading-none">{tier.price}</span>
                      <span className="text-[11px] text-white/30 ml-2">USD · one-time · forever</span>
                    </div>

                    {/* Coins breakdown */}
                    <div
                      className="relative rounded-2xl p-4 mb-5 transition-all duration-300"
                      style={{
                        background: isHovered ? `${tier.accent}0A` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isHovered ? tier.accent + '18' : 'rgba(255,255,255,0.04)'}`,
                      }}
                    >
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-white/35">Base coins</span>
                        <span className="text-white/70 font-mono font-semibold">{tier.coins.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-white/35">Bonus (10%)</span>
                        <span className="font-mono font-semibold" style={{ color: tier.accent }}>+{tier.bonus.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-white/[0.05] pt-2 flex justify-between items-center text-xs">
                        <span className="text-white/50 font-bold">Total coins</span>
                        <span className="text-white font-bold font-mono text-sm">{(tier.coins + tier.bonus).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="relative flex-1 mb-6 space-y-2.5">
                      {tier.features.map((f) => (
                        <div key={f} className="flex items-start gap-2.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="up-feature-check mt-0.5 shrink-0" stroke={tier.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="text-[13px] text-white/55 leading-snug">{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    {isCurrent ? (
                      <div
                        className="relative w-full py-3 rounded-xl text-center text-sm font-semibold"
                        style={{ background: `${tier.accent}10`, color: tier.accent, border: `1px solid ${tier.accent}20` }}
                      >
                        ✓ Current plan
                      </div>
                    ) : isCurrentOrBelow ? (
                      <div
                        className="relative w-full py-3 rounded-xl text-center text-[13px] font-medium"
                        style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        Included in your plan
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpgrade(tier.id)}
                        disabled={loadingTier !== null}
                        className="up-btn relative w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer border-0"
                        style={{
                          background: `linear-gradient(135deg, ${tier.accent}, ${tier.accent}CC)`,
                          color: '#0A0D33',
                          boxShadow: isHovered ? `0 8px 24px -4px ${tier.glow}` : 'none',
                        }}
                      >
                        {loadingTier === tier.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            Processing…
                          </span>
                        ) : (
                          `Upgrade to ${tier.name}`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom note */}
        <div className="up-rise text-center mt-10" style={{ animationDelay: '0.65s' }}>
          <p className="text-xs text-white/25">
            All payments are one-time via Stripe. Membership is permanent and non-refundable.
          </p>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
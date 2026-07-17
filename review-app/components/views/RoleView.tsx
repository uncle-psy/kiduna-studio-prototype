'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { LUMINARY_FEATURES } from '@/lib/landing-data'
import type { TierName } from '@/lib/tier-utils'
import { tierLevel } from '@/lib/tier-utils'
import { CreditCard, Repeat, Landmark, Wallet, Send } from 'lucide-react'

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

// Tier data matching the wireframe design exactly (Coins / Bonus / Total layout)
const TIERS = [
  {
    id: 'guest',
    name: 'Guest',
    price: 'Free',
    priceNote: 'no Coins required',
    coins: 0,
    bonus: 0,
    total: 0,
  },
  {
    id: 'member',
    name: 'Member',
    price: '$10',
    priceNote: 'in WVDUNA (USDC)',
    coins: 100,
    bonus: 10,
    total: 110,
  },
  {
    id: 'founder',
    name: 'Founder',
    price: '$100',
    priceNote: 'in WVDUNA (USDC)',
    coins: 1000,
    bonus: 100,
    total: 1100,
  },
  {
    id: 'builder',
    name: 'Builder',
    price: '$1,000',
    priceNote: 'in WVDUNA (USDC)',
    coins: 10000,
    bonus: 1000,
    total: 11000,
  },
  {
    id: 'sponsor',
    name: 'Sponsor',
    price: '$10,000',
    priceNote: 'in WVDUNA (USDC)',
    coins: 100000,
    bonus: 10000,
    total: 110000,
  },
  {
    id: 'catalyst',
    name: 'Catalyst',
    price: '$100,000',
    priceNote: 'in WVDUNA (USDC)',
    coins: 1000000,
    bonus: 100000,
    total: 1100000,
  },
  {
    id: 'luminary',
    name: 'Luminary',
    price: '$1,000,000',
    priceNote: 'in WVDUNA (USDC)',
    coins: 10000000,
    bonus: 1000000,
    total: 11000000,
  },
]

const PROVIDERS = [
  {
    name: 'Stripe',
    sub: 'On-ramp · card → USDC',
    color: '#635BFF',
    Icon: CreditCard,
    comingSoon: false,
  },
  {
    name: 'Onramper',
    sub: 'Aggregator · best rate',
    color: '#FF6B35',
    Icon: Repeat,
    comingSoon: true,
  },
  {
    name: 'Sphere',
    sub: 'Bank / wire → USDC',
    color: '#1A73E8',
    Icon: Landmark,
    comingSoon: true,
  },
]

/* Small "COMING SOON" pill — matches the Avatar Template modal treatment */
function ComingSoon() {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: 'rgba(255,255,255,0.5)',
        background: 'rgba(255,255,255,0.08)',
        padding: '2px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap' as const,
        lineHeight: 1.6,
      }}
    >
      Coming soon
    </span>
  )
}

export default function RoleView() {
  const router = useRouter()
  const { user, token, isAuthenticated, isLoading, checkAuth } = useAuth()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // Active payment rail — Stripe is selected by default and the only live option.
  const [selectedProvider, setSelectedProvider] = useState('Stripe')

  // Current user tier from /is-auth — prefer subscriptionTier (updated after purchase)
  const userTier = isAuthenticated
    ? (
        ((user as any)?.subscriptionTier ??
          user?.subscription ??
          'guest') as string
      ).toLowerCase()
    : null

  const walletAddress = user?.wallet || ''

  // Selected card — defaults to user's current tier
  const [selected, setSelected] = useState<string | null>(null)

  // Sync selection when userTier arrives or changes (e.g. after purchase + auth refresh)
  useEffect(() => {
    if (userTier) {
      setSelected(userTier)
    }
  }, [userTier])
  const effectiveSelected = selected ?? userTier ?? 'guest'
  const selectedLevel =
    TIERS.find((l) => l.id === effectiveSelected) || TIERS[0]
  const moveInAmount =
    effectiveSelected === 'guest'
      ? 0
      : parseInt(selectedLevel.price.replace(/[^0-9]/g, ''))

  // ── Same Stripe + guest logic as Home page MembershipTiers ──
  const handleTierSelect = useCallback(
    async (tierId: TierName) => {
      setError(null)

      if (!isAuthenticated || !token) {
        router.push(`/signup?tier=${tierId}`)
        return
      }

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
          await checkAuth()
          setLoadingTier(null)
        } catch (err: any) {
          setError(err.message || 'Something went wrong')
          setLoadingTier(null)
        }
        return
      }

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
        if (!res.ok)
          throw new Error(data.error || 'Failed to create checkout session')
        if (data.url) window.location.href = data.url
        else throw new Error('No checkout URL returned')
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
        setLoadingTier(null)
      }
    },
    [isAuthenticated, token, router]
  )

  function handleCopy() {
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto',
          padding: '60px 0',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Loading...
        </div>
      </div>
    )
  }

  // Check if user can upgrade to a tier
  const isCurrentTier = (id: string) => userTier === id
  const isLowerTier = (id: string) =>
    userTier ? tierLevel(id) < tierLevel(userTier) : false
  const showStartHere = (id: string) => !userTier && id === 'member'

  return (
   <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 0' }}>
      {/* Header */}
      <div
        style={{
          fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
          fontSize: '0.66rem',
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase' as const,
          color: '#03CCD9',
          marginBottom: 8,
        }}
      >
        {userTier ? 'Your Account' : 'Welcome — one more step'}
      </div>
      <h1
        style={{
          fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
          fontSize: 34,
          fontWeight: 600,
          color: '#fff',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}
      >
        {userTier ? 'Manage your role' : 'Set your role'}
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.55)',
          margin: '0 0 24px',
        }}
      >
        Your role in <b style={{ color: '#fff' }}>WV DUNA</b> is set by how many
        WVDUNA Coins you hold. Pick a role to buy the Coins that unlock it.
      </p>

      {/* Error */}
      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(255,60,60,0.12)',
            border: '1px solid rgba(255,60,60,0.3)',
            color: '#ff6b6b',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: 12,
              textDecoration: 'underline',
              opacity: 0.7,
              fontFamily: 'inherit',
            }}
          >
            dismiss
          </button>
        </div>
      )}

      {/* ── Tier cards: exact wireframe design ── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          overflowX: 'auto' as const,
          paddingTop: 12, paddingBottom: 4,
        }}
      >
        {TIERS.map((l) => {
          const isCurrent = isCurrentTier(l.id)
          const isSelected = effectiveSelected === l.id
          const isLower = isLowerTier(l.id)
          const isDisabled = isLower && !isCurrent

          return (
            <div
              key={l.id}
              onClick={() => {
                if (!isDisabled) setSelected(l.id)
              }}
              style={{
                flex: '0 0 172px',
                background: isSelected ? 'rgba(234,170,0,0.08)' : '#0A0D33',
                border: `1px solid ${isSelected ? '#EAAA00' : 'rgba(255,255,255,0.10)'}`,
                borderRadius: 12,
                padding: '16px 16px 14px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                position: 'relative' as const,
                transition: 'all 0.15s',
                // marginTop: isCurrent || showStartHere(l.id) ? 10 : 0,
                opacity: isDisabled ? 0.45 : 1,
              }}
            >
              {/* CURRENT badge */}
              {isCurrent && (
                <div
                  style={{
                    position: 'absolute' as const,
                    top: -11,
                    left: 12,
                    background: '#EAAA00',
                    color: '#09073A',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase' as const,
                    padding: '3px 8px',
                    borderRadius: 4,
                  }}
                >
                  Current
                </div>
              )}
              {/* START HERE badge */}
              {showStartHere(l.id) && (
                <div
                  style={{
                    position: 'absolute' as const,
                    top: -11,
                    left: 12,
                    background: '#EAAA00',
                    color: '#09073A',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase' as const,
                    padding: '3px 8px',
                    borderRadius: 4,
                  }}
                >
                  Start here
                </div>
              )}

              {/* Name + radio */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontFamily:
                      '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#fff',
                  }}
                >
                  {l.name}
                </div>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#EAAA00' : 'rgba(255,255,255,0.25)'}`,
                    background: isSelected ? '#EAAA00' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#09073A',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Price */}
              <div
                style={{
                  fontFamily:
                    '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#EAAA00',
                  marginBottom: 2,
                }}
              >
                {l.price}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 14,
                }}
              >
                {l.priceNote}
              </div>

              {/* Coins / Bonus / Total */}
              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  paddingTop: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.55)',
                    marginBottom: 4,
                  }}
                >
                  <span>Coins</span>
                  <span
                    style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
                  >
                    {l.coins.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.55)',
                    marginBottom: 4,
                  }}
                >
                  <span>Bonus (Code)</span>
                  <span
                    style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
                  >
                    +{l.bonus.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: 8,
                    marginTop: 4,
                  }}
                >
                  <span>Total WVDUNA</span>
                  <span>{l.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          margin: '0 0 28px',
          lineHeight: 1.6,
        }}
      >
        Showing Guest through Luminary. Coin counts use the current Coin price;{' '}
        <b style={{ color: 'rgba(255,255,255,0.7)' }}>bonus Coins</b> come from
        the Kinship Code you used.
      </p>

      {/* ── Load Wallet ── */}
      <h2
        style={{
          fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
          fontSize: 26,
          fontWeight: 600,
          color: '#fff',
          margin: '0 0 6px',
        }}
      >
        Load Wallet
      </h2>
      <p
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.55)',
          margin: '0 0 16px',
        }}
      >
        Add <b style={{ color: '#fff' }}>USDC</b> to reach{' '}
        <b style={{ color: '#fff' }}>{selectedLevel.name}</b>. We&apos;ll move
        in at least ${moveInAmount.toLocaleString()} (enough to cross the
        level); set a higher amount if you like.
      </p>

      {/* Providers */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {PROVIDERS.map((p, i) => {
          const disabled = p.comingSoon
          const selected = !disabled && selectedProvider === p.name
          const Icon = p.Icon
          return (
            <div
              key={i}
              aria-disabled={disabled}
              onClick={disabled ? undefined : () => setSelectedProvider(p.name)}
              onMouseEnter={
                disabled
                  ? undefined
                  : (e) => {
                      if (!selected)
                        e.currentTarget.style.borderColor =
                          'rgba(255,255,255,0.22)'
                    }
              }
              onMouseLeave={
                disabled
                  ? undefined
                  : (e) => {
                      if (!selected)
                        e.currentTarget.style.borderColor =
                          'rgba(255,255,255,0.10)'
                    }
              }
              style={{
                flex: 1,
                background: selected ? 'rgba(234,170,0,0.08)' : '#0A0D33',
                border: selected
                  ? '1px solid rgba(234,170,0,0.55)'
                  : '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: disabled ? 'rgba(255,255,255,0.10)' : p.color,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} strokeWidth={2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap' as const,
                  }}
                >
                  {p.name}
                  {disabled && <ComingSoon />}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                  {p.sub}
                </div>
              </div>
              {selected && (
                <div
                  style={{
                    marginLeft: 'auto',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: '2px solid #EAAA00',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#EAAA00',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Connect wallet + Send USDC */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            flex: 1,
            background: '#0A0D33',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12,
            padding: '16px 20px',
            opacity: 0.5,
            cursor: 'not-allowed',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap' as const,
              marginBottom: 8,
            }}
          >
            <Wallet size={14} style={{ color: '#03CCD9', flexShrink: 0 }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: '#03CCD9',
              }}
            >
              Connect an external wallet
            </span>
            <ComingSoon />
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.55)',
              marginBottom: 16,
            }}
          >
            Phantom, Solflare, or any Solana wallet.
          </div>
          <button
            disabled
            aria-disabled="true"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            Connect wallet
          </button>
        </div>
        <div
          style={{
            flex: 1,
            background: '#0A0D33',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12,
            padding: '16px 20px',
            opacity: 0.5,
            cursor: 'not-allowed',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap' as const,
              marginBottom: 8,
            }}
          >
            <Send size={14} style={{ color: '#03CCD9', flexShrink: 0 }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: '#03CCD9',
              }}
            >
              Or send USDC to your address
            </span>
            <ComingSoon />
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 11,
                color: 'rgba(255,255,255,0.6)',
                fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {walletAddress || 'No wallet connected'}
            </span>
            {walletAddress && (
              <button
                onClick={handleCopy}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontFamily: 'inherit',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            USDC only. Funds appear here once confirmed.
          </div>
        </div>
      </div>

      {/* ── Pay CTA — matches wireframe "YOU'RE BUYING" / "MOVE IN" section ── */}
      <div
        style={{
          background: 'rgba(234,170,0,0.08)',
          border: '1px solid rgba(234,170,0,0.25)',
          borderRadius: 12,
          padding: '18px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: '#EAAA00',
              marginBottom: 4,
            }}
          >
            {isCurrentTier(effectiveSelected) ? "You're buying" : 'Move in'}
          </div>
          <div
            style={{
              fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {selectedLevel.price === 'Free'
              ? '$0 USDC'
              : `${selectedLevel.price} USDC`}
          </div>
          {effectiveSelected !== 'guest' && (
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                marginTop: 2,
              }}
            >
              Secure card payment via{' '}
              <b style={{ color: 'rgba(255,255,255,0.7)' }}>Stripe</b>
            </div>
          )}
        </div>
        <button
          onClick={() => handleTierSelect(effectiveSelected as TierName)}
          disabled={
            !!loadingTier ||
            isCurrentTier(effectiveSelected) ||
            isLowerTier(effectiveSelected)
          }
          style={{
            background: isCurrentTier(effectiveSelected)
              ? 'rgba(234,170,0,0.15)'
              : '#EAAA00',
            border: '1px solid #EAAA00',
            color: isCurrentTier(effectiveSelected) ? '#EAAA00' : '#09073A',
            fontWeight: 700,
            fontSize: 14,
            padding: '12px 24px',
            borderRadius: 10,
            cursor: isCurrentTier(effectiveSelected) ? 'default' : 'pointer',
            fontFamily: 'inherit',
            opacity: loadingTier ? 0.6 : 1,
          }}
        >
          {loadingTier === effectiveSelected
            ? 'Processing…'
            : isCurrentTier(effectiveSelected)
              ? 'Current plan'
              : isLowerTier(effectiveSelected)
                ? 'Included in your plan'
                : 'Confirm & update role'}
        </button>
      </div>

      <p
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.35)',
          margin: '12px 0 0',
          lineHeight: 1.6,
        }}
      >
        Initial Coin purchases can&apos;t be traded for 30 days. Once inside,
        there are more ways to fill your wallet (external wallet, USDC transfer,
        on-ramps). Stripe purchases are capped near $25,000 —{' '}
        <b style={{ color: 'rgba(255,255,255,0.55)' }}>Catalyst</b> and{' '}
        <b style={{ color: 'rgba(255,255,255,0.55)' }}>Luminary</b> are acquired
        inside.
      </p>
    </div>
  )
}
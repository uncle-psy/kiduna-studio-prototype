'use client'

import { useState } from 'react'

/* ─── Types ──────────────────────────────────────────────── */
type TxBadge = 'bonus' | 'earned' | 'royalty' | 'deposit'

interface Transaction {
  id: number
  icon: string
  iconBg: string
  name: string
  balanceAfter: string
  badge: TxBadge
  time: string
  group: 'TODAY' | 'EARLIER'
}

/* ─── Static data — matches WV DUNA reference exactly ───── */
const TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    icon: '★',
    iconBg: 'rgba(234,170,0,0.18)',
    name: 'Host bonus from your Kinship Code',
    balanceAfter: 'Balance $1,240',
    badge: 'bonus',
    time: '11:21',
    group: 'TODAY',
  },
  {
    id: 2,
    icon: '↑',
    iconBg: 'rgba(34,197,94,0.15)',
    name: 'Earned from Quest: First conversation',
    balanceAfter: 'Balance $1,190',
    badge: 'earned',
    time: '11:02',
    group: 'TODAY',
  },
  {
    id: 3,
    icon: '⟲',
    iconBg: 'rgba(59,130,246,0.15)',
    name: 'Royalties — The Alchemist (published)',
    balanceAfter: 'Balance $1,140',
    badge: 'royalty',
    time: '5/30',
    group: 'EARLIER',
  },
]

const BADGE_LABELS: Record<TxBadge, string> = {
  bonus:   'Bonus',
  earned:  'Earned',
  royalty: 'Royalties',
  deposit: 'Deposit',
}

const TIERS = [
  'Guest', 'Member', 'Founder', 'Builder', 'Sponsor', 'Catalyst', 'Luminary',
] as const

const CURRENT_TIER     = 'Member'
const CURRENT_TIER_IDX = TIERS.indexOf(CURRENT_TIER)
const TIER_FILL_PCT    = (CURRENT_TIER_IDX / (TIERS.length - 1)) * 100

/* ─── Component ─────────────────────────────────────────── */
export default function EarnPage() {
  const [_dummy] = useState(0)

  return (
    <div style={{
      width: '100%',
      overflowY: 'auto',
      color: '#ffffff',
      fontFamily: '"Avenir", "Avenir Next", system-ui, sans-serif',
    }}>
      <div style={{
        maxWidth:1200,
        margin: '0 auto',
        padding: '30px 30px 80px',
      }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
      }}>
        <div>
          {/* ACTIVE MODE label */}
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '1.8px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            marginBottom: 6,
          }}>
            Active mode
          </div>
          <h1 style={{
            fontFamily: '"Goudy Heavyface", Georgia, serif',
            fontSize: 32,
            fontWeight: 400,
            color: '#ffffff',
            margin: '0 0 4px',
            lineHeight: 1.05,
          }}>
            Earn
          </h1>
          <p style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.45)',
            margin: 0,
          }}>
            Your wallet, your WVDUNA, and your standing in the network.
          </p>
        </div>

        {/* + Load Wallet button */}
        <button style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '10px 20px',
          borderRadius: 4,
          background: '#EAAA00',
          color: '#09073A',
          fontSize: 13,
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          boxShadow: '0 4px 14px -2px rgba(234,170,0,0.4)',
        }}>
          + Load Wallet
        </button>
      </div>

      {/* ── Two-column grid: left content + right sidebar ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 450px',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* ════════ LEFT COLUMN ════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Balance card ── */}
          <div style={{
            background: '#0A0D33',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 16,
            padding: '28px 28px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.40)',
              marginBottom: 10,
            }}>
              Current Balance
            </div>
            <div style={{
              fontFamily: '"Goudy Heavyface", Georgia, serif',
              fontSize: 52,
              fontWeight: 400,
              color: '#ffffff',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}>
              $1,240
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.35)',
              marginTop: 8,
            }}>
              ≈ 12,400 WVDUNA · held in your personal wallet
            </div>
          </div>

          {/* ── Stats: 3 separate cards ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}>
            {[
              { dot: '#22c55e', label: 'Deposits',    value: '$432'  },
              { dot: '#EAAA00', label: 'Earnings',    value: '$300'  },
              { dot: '#f97316', label: 'Withdrawals', value: '−$300' },
            ].map(({ dot, label, value }) => (
              <div key={label} style={{
                background: '#0A0D33',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 14,
                padding: '16px 20px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.40)',
                  marginBottom: 8,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: dot, flexShrink: 0,
                  }} />
                  {label}
                </div>
                <div style={{
                  fontFamily: '"Goudy Heavyface", Georgia, serif',
                  fontSize: 22,
                  fontWeight: 400,
                  color: '#ffffff',
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Activity feed ── */}
          <div>
            {(['TODAY', 'EARLIER'] as const).map(group => {
              const rows = TRANSACTIONS.filter(tx => tx.group === group)
              if (!rows.length) return null
              return (
                <div key={group}>
                  {/* Group label */}
                  <div style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '1.8px',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.28)',
                    padding: '14px 0 8px',
                  }}>
                    {group === 'TODAY' ? 'Today' : 'Earlier'}
                  </div>

                  {/* Each transaction: its own card */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {rows.map(tx => (
                      <div key={tx.id} style={{
                        background: '#0A0D33',
                        border: '1px solid rgba(255,255,255,0.10)',
                        borderRadius: 14,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                      }}>
                        {/* Icon */}
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, flexShrink: 0,
                          background: tx.iconBg,
                        }}>
                          {tx.icon}
                        </div>

                        {/* Name + balance */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {tx.name}
                          </div>
                          <div style={{
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.35)',
                            marginTop: 2,
                          }}>
                            {tx.balanceAfter}
                          </div>
                        </div>

                        {/* Badge + time */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
                        }}>
                          <span style={{
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: '0.8px',
                            padding: '3px 9px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            ...(tx.badge === 'bonus'   ? { background: 'rgba(234,170,0,0.18)',  color: '#EAAA00' } :
                               tx.badge === 'earned'   ? { background: 'rgba(34,197,94,0.15)',  color: '#22c55e' } :
                               tx.badge === 'royalty'  ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' } :
                                                         { background: 'rgba(168,85,247,0.15)', color: '#c084fc' }),
                          }}>
                            {BADGE_LABELS[tx.badge]}
                          </span>
                          <span style={{
                            fontSize: 10.5,
                            color: 'rgba(255,255,255,0.25)',
                          }}>
                            {tx.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
        {/* ════════ END LEFT COLUMN ════════ */}

        {/* ════════ RIGHT SIDEBAR ════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Your Standing card ── */}
          <div style={{
            background: '#0A0D33',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 16,
            padding: 22,
          }}>
            <div style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              color: '#03ccd9',
              marginBottom: 10,
            }}>
              Your Standing
            </div>
            <div style={{
              fontFamily: '"Goudy Heavyface", Georgia, serif',
              fontSize: 26,
              fontWeight: 400,
              color: '#ffffff',
              marginBottom: 8,
            }}>
              {CURRENT_TIER}
            </div>
            <div style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.55,
              marginBottom: 18,
            }}>
              Your level is set by the WVDUNA Coins you hold — no subscription.
              Hold more to rise, sell anytime to step down.
            </div>

            {/* Tier progress track */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
              {/* Background line */}
              <div style={{
                height: 3,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 99,
                margin: '0 6px',
                marginBottom: 12,
                position: 'relative',
                overflow: 'visible',
              }}>
                {/* Gold fill */}
                <div style={{
                  position: 'absolute', left: 0, top: 0,
                  height: '100%',
                  width: `${TIER_FILL_PCT}%`,
                  background: '#EAAA00',
                  borderRadius: 99,
                }} />
              </div>

              {/* Dots + labels */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: -19,
              }}>
                {TIERS.map((tier, i) => (
                  <div key={tier} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                    <div style={{
                      width:  i === CURRENT_TIER_IDX ? 14 : 12,
                      height: i === CURRENT_TIER_IDX ? 14 : 12,
                      borderRadius: '50%',
                      background: i <= CURRENT_TIER_IDX ? '#EAAA00' : '#0A0D33',
                      border: `2px solid ${i <= CURRENT_TIER_IDX ? '#EAAA00' : 'rgba(255,255,255,0.15)'}`,
                      boxShadow: i === CURRENT_TIER_IDX
                        ? '0 0 0 4px rgba(234,170,0,0.30)'
                        : i < CURRENT_TIER_IDX
                        ? '0 0 0 3px rgba(234,170,0,0.25)'
                        : 'none',
                      transition: 'all 0.2s',
                    }} />
                    <span style={{
                      fontSize: 9,
                      fontWeight: i === CURRENT_TIER_IDX ? 800 : 700,
                      color: i === CURRENT_TIER_IDX ? '#EAAA00' : 'rgba(255,255,255,0.30)',
                      letterSpacing: '0.3px',
                      whiteSpace: 'nowrap',
                    }}>
                      {tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reach Founder CTA */}
            <div style={{
              background: 'rgba(234,170,0,0.08)',
              border: '1px solid rgba(234,170,0,0.22)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 14,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(234,170,0,0.15)',
                border: '1px solid rgba(234,170,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                ↑
              </div>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: '#ffffff', marginBottom: 3,
                }}>
                  Reach Founder
                </div>
                <div style={{
                  fontSize: 11.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4,
                }}>
                  Hold $100 in WVDUNA to unlock the next tier and its allies.
                </div>
              </div>
              
            </div>
               <div style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              color:'#03ccd9',
              marginTop: 30,
              marginBottom:5
            }}>
              Resource Allotment
            </div>
            <div style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.55)',
                    lineHeight: 1.55,
                  }}>
                    <strong style={{ color: '#ffffff', fontWeight: 700 }}>Monthly</strong>{' '}
                    allotment for your allies.{' '}
                    <span style={{ color: '#EAAA00', fontWeight: 600, cursor: 'pointer' }}>
                      Reload or boost →
                    </span>
                  </div>
          </div>

       

        </div>
        {/* ════════ END RIGHT SIDEBAR ════════ */}

      </div>
      </div>
    </div>
  )
}
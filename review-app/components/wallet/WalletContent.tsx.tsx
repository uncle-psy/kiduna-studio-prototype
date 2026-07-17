'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Lock, Clock, ShoppingBag, User, CheckCircle2, Sparkles } from 'lucide-react'

/* ─── Lineage Rewards — real API types ──────────────────────────────────── */
import {
  getLineageRewards,
  getLineageRewardSummary,
  claimLineageRewards,
  type LineageRewardRow,
  type LineageRewardSummary,
} from '@/lib/offerings-api'

const fmtU = (n: number) => n.toFixed(2)

/* ── Shared field label style ── */
const fldLbl: React.CSSProperties = {
  fontSize:'0.59rem', fontWeight:700, letterSpacing:'0.1em',
  textTransform:'uppercase', color:'rgba(255,255,255,0.25)', margin:0, marginBottom:3,
}

/* ─── SummaryCard — driven by real API data ─────────────────────────────── */
function SummaryCard({
  summary,
  onClaim,
  claiming,
  claimError,
}: {
  summary: LineageRewardSummary | null
  onClaim: () => void
  claiming: boolean
  claimError: string | null
}) {
  if (!summary) {
    // Loading skeleton
    return (
      <div style={{ background:'var(--color-card,#0D0B3E)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'20px 20px 18px', marginBottom:16, opacity:0.6 }}>
        <div style={{ height:32, width:'40%', background:'rgba(255,255,255,0.06)', borderRadius:8, marginBottom:8 }} />
        <div style={{ height:16, width:'60%', background:'rgba(255,255,255,0.04)', borderRadius:6 }} />
      </div>
    )
  }

  const {
    totalPending, totalEarned, isEligible,
    thresholdMet, claimThreshold,
    daysRemaining, claimDaysLock,
  } = summary

  const progressPct = Math.min(100, Math.round((totalPending / claimThreshold) * 100))
  const cardBorder  = isEligible ? '1px solid rgba(234,170,0,0.2)' : '1px solid rgba(255,255,255,0.07)'
  const barFill     = isEligible
    ? 'linear-gradient(90deg,#ca8a04,#EAAA00)'
    : 'linear-gradient(90deg,rgba(255,255,255,0.15),rgba(255,255,255,0.25))'
  const amtColor    = isEligible ? '#EAAA00' : 'rgba(255,255,255,0.4)'

  return (
    <div style={{ background:'var(--color-card,#0D0B3E)', border:cardBorder, borderRadius:14, padding:'20px 20px 18px', marginBottom:16 }}>
      {/* top: total + icon */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <p style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.13em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', margin:'0 0 5px' }}>
            Total Rewards Earned
          </p>
          <p style={{ fontSize:'2rem', fontWeight:700, color:amtColor, margin:0, lineHeight:1 }}>
            {fmtU(totalPending)}{' '}
            <span style={{ fontSize:'1rem', fontWeight:600, opacity:0.65 }}>USDC</span>
          </p>
        </div>
        <span style={{ width:42, height:42, borderRadius:11, flexShrink:0, marginLeft:14,
          background: isEligible ? 'rgba(234,170,0,0.1)' : 'rgba(255,255,255,0.04)',
          border: isEligible ? '1px solid rgba(234,170,0,0.2)' : '1px solid rgba(255,255,255,0.08)',
          display:'grid', placeItems:'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={isEligible ? '#EAAA00' : 'rgba(255,255,255,0.3)'}
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v2m0 8v2M9 9.5A2.5 2.5 0 0 1 12 8a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 0 3-2.5"/>
          </svg>
        </span>
      </div>

      {/* progress */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <p style={{ ...fldLbl, marginBottom:0 }}>Claim Threshold</p>
            <span style={{ fontSize:'0.72rem', fontWeight:600, color:'rgba(255,255,255,0.45)' }}>
              {fmtU(totalPending)} / {fmtU(claimThreshold)} USDC
            </span>
          </div>
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.58rem', fontWeight:700,
            letterSpacing:'0.07em', textTransform:'uppercase',
            background: isEligible ? 'rgba(234,170,0,0.1)'  : 'rgba(255,255,255,0.05)',
            border:     isEligible ? '1px solid rgba(234,170,0,0.25)' : '1px solid rgba(255,255,255,0.09)',
            color:      isEligible ? '#EAAA00' : 'rgba(255,255,255,0.3)',
            borderRadius:99, padding:'3px 9px' }}>
            {isEligible ? '✓ Ready to Claim' : <><Lock size={11} strokeWidth={2.5} />Locked</>}
          </span>
        </div>
        <div style={{ height:7, borderRadius:99, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progressPct}%`, background:barFill, borderRadius:99 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
          <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.25)' }}>0 USDC</span>
          <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.25)' }}>{progressPct}% — {fmtU(claimThreshold)} USDC</span>
        </div>
      </div>

      {/* stat cells */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
        <div style={{ background:'rgba(52,211,153,0.04)', border:'1px solid rgba(52,211,153,0.13)', borderRadius:10, padding:'10px 12px' }}>
          <p style={{ ...fldLbl, marginBottom:4, color:'rgba(110,231,183,0.45)' }}>Total Earned</p>
          <p style={{ fontSize:'0.92rem', fontWeight:700, color:'#6ee7b7', margin:0 }}>
            {fmtU(totalEarned)} <span style={{ fontSize:'0.68rem', color:'rgba(110,231,183,0.4)' }}>USDC</span>
          </p>
        </div>
        {isEligible ? (
          <div style={{ background:'rgba(234,170,0,0.06)', border:'1px solid rgba(234,170,0,0.15)', borderRadius:10, padding:'10px 12px' }}>
            <p style={{ ...fldLbl, marginBottom:4, color:'rgba(234,170,0,0.5)' }}>Threshold</p>
            <p style={{ fontSize:'0.92rem', fontWeight:700, color:'#EAAA00', margin:0 }}>Reached ✓</p>
          </div>
        ) : (
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 12px' }}>
            <p style={{ ...fldLbl, marginBottom:4 }}>Still Needed</p>
            <p style={{ fontSize:'0.92rem', fontWeight:700, color:'rgba(255,255,255,0.45)', margin:0 }}>
              {fmtU(Math.max(0, claimThreshold - totalPending))} <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.25)' }}>USDC</span>
            </p>
          </div>
        )}
      </div>

      {/* hint if locked */}
      {!isEligible && (
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)', margin:0, lineHeight:1.5 }}>
            Claim unlocks when you reach <strong style={{ color:'rgba(255,255,255,0.55)' }}>{fmtU(claimThreshold)} USDC</strong>, or after{' '}
            <strong style={{ color:'rgba(255,255,255,0.55)' }}>{daysRemaining} more days</strong>.
            You need <strong style={{ color:'rgba(255,255,255,0.55)' }}>{fmtU(Math.max(0, claimThreshold - totalPending))} USDC more</strong> to unlock now.
          </p>
        </div>
      )}

      {/* claim error */}
      {claimError && (
        <div style={{ background:'rgba(255,58,58,0.08)', border:'1px solid rgba(255,58,58,0.2)', borderRadius:10, padding:'8px 12px', marginBottom:12, fontSize:'0.78rem', color:'#f87171' }}>
          {claimError}
        </div>
      )}

      {/* CTA button */}
      <button
        disabled={!isEligible || claiming}
        onClick={isEligible && !claiming ? onClaim : undefined}
        style={{
          width:'100%', borderRadius:10, fontSize:'0.83rem', fontWeight:700,
          padding:'10px 16px', letterSpacing:'0.02em',
          cursor: isEligible && !claiming ? 'pointer' : 'not-allowed',
          ...(isEligible
            ? { background:'rgba(234,170,0,0.13)', border:'1px solid rgba(234,170,0,0.35)', color:'#EAAA00' }
            : { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.2)' }
          ),
        }}
      >
        {claiming ? 'Claiming…' : isEligible ? 'Claim All Rewards' : 'Locked'}
      </button>
    </div>
  )
}

/* ─── Individual Reward Card — driven by real LineageRewardRow data ─────── */
function rewardCardCfg(status: string, claimStatus: string) {
  if (status === 'CLAIMED') return {
    cardBorder: 'rgba(52,211,153,0.12)',
    iconBox:  { background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.12)', color:'#6ee7b7' } as React.CSSProperties,
    badge:    { label:'Claimed', bg:'rgba(52,211,153,0.07)', border:'1px solid rgba(52,211,153,0.14)', color:'#6ee7b7' },
    icon:     <CheckCircle2 size={16} />,
    nameColor:'rgba(255,255,255,0.5)',
    amtColor: '#6ee7b7',
  }
  if (claimStatus === 'CLAIMABLE') return {
    cardBorder: 'rgba(52,211,153,0.18)',
    iconBox:  { background:'rgba(52,211,153,0.07)', border:'1px solid rgba(52,211,153,0.15)', color:'#6ee7b7' } as React.CSSProperties,
    badge:    { label:'Ready to Claim', bg:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.18)', color:'#6ee7b7' },
    icon:     <Sparkles size={16} />,
    nameColor:'#fff',
    amtColor: '#EAAA00',
  }
  return {
    cardBorder: 'rgba(255,255,255,0.07)',
    iconBox:  { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.3)' } as React.CSSProperties,
    badge:    { label:'Locked', bg:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.35)' },
    icon:     <Lock size={16} />,
    nameColor:'rgba(255,255,255,0.5)',
    amtColor: 'rgba(255,255,255,0.4)',
  }
}

function RewardCard({ row }: { row: LineageRewardRow }) {
  const { reward, offeringName, buyerName } = row
  const c = rewardCardCfg(reward.status, reward.claimStatus)
  const daysAgo = Math.floor((Date.now() - new Date(reward.createdAt).getTime()) / 86_400_000)
  const daysLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`

  return (
    <div style={{ background:'var(--color-card,#0D0B3E)', border:`1px solid ${c.cardBorder}`, borderRadius:14, padding:'18px 18px 16px', display:'flex', flexDirection:'column' }}>
      {/* top: icon + badge */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ ...c.iconBox, width:34, height:34, borderRadius:9, display:'grid', placeItems:'center', flexShrink:0 }}>{c.icon}</span>
        <span style={{ fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase' as const,
          background:c.badge.bg, border:c.badge.border, color:c.badge.color, borderRadius:99, padding:'3px 9px' }}>
          {c.badge.label}
        </span>
      </div>
      {/* purchase */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:10 }}>
        <ShoppingBag size={12} style={{ color:'rgba(255,255,255,0.2)', marginTop:2, flexShrink:0 }} />
        <div>
          <p style={fldLbl}>Purchase</p>
          <p style={{ margin:0, fontSize:'0.88rem', fontWeight:600, color:c.nameColor, lineHeight:1.2 }}>{offeringName || 'Offering'}</p>
        </div>
      </div>
      {/* purchased by */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:14, flex:1 }}>
        <User size={12} style={{ color:'rgba(255,255,255,0.2)', marginTop:2, flexShrink:0 }} />
        <div>
          <p style={fldLbl}>Purchased By</p>
          <p style={{ margin:0, fontSize:'0.84rem', color:'rgba(255,255,255,0.45)' }}>{buyerName || '—'}</p>
        </div>
      </div>
      {/* reward + date */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:11 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <span style={fldLbl}>Reward</span>
          <span style={{ fontSize:'0.9rem', fontWeight:700, color:c.amtColor }}>{parseFloat(reward.rewardAmount).toFixed(2)} USDC</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={fldLbl}>Date Earned</span>
          <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.3)' }}>{daysLabel}</span>
        </div>
      </div>
    </div>
  )
}

/* ─── LineageRewards (section wrapper) — live API data ──────────────────── */
function LineageRewards() {
  const { token } = useAuth() as { token: string | null }

  const [summary,    setSummary]    = useState<LineageRewardSummary | null>(null)
  const [rewards,    setRewards]    = useState<LineageRewardRow[]>([])
  const [loadingRew, setLoadingRew] = useState(true)
  const [claiming,   setClaiming]   = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimMsg,   setClaimMsg]   = useState<string | null>(null)

  /* ── Server-side pagination — 8 cards per page (mirrors offerings page) ── */
  const REW_PER_PAGE = 8
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadData = useCallback(async (pageNum: number) => {
    setLoadingRew(true)
    try {
      const [s, r] = await Promise.all([
        getLineageRewardSummary(token),
        getLineageRewards(token, 'all', pageNum, REW_PER_PAGE),
      ])
      setSummary(s)
      setRewards(r.data)
      setTotalPages(r.pagination.totalPages)
    } catch { /* silent — wallet page still loads */ }
    setLoadingRew(false)
  }, [token])

  useEffect(() => { loadData(page) }, [loadData, page])

  async function handleClaim() {
    setClaimError(null); setClaimMsg(null); setClaiming(true)
    try {
      const result = await claimLineageRewards(token)
      setClaimMsg(`Successfully claimed ${result.claimedAmount.toFixed(2)} USDC!`)
      loadData(page)
    } catch (e: any) {
      setClaimError(e?.message || 'Claim failed. Please try again.')
    }
    setClaiming(false)
  }

  return (
    <div style={{ marginTop:36 }}>
      {/* section header */}
      <div style={{ marginBottom:16 }}>
        <p style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#03CCD9', margin:'0 0 4px' }}>
          Economics · Lineage
        </p>
        <h2 style={{ fontSize:'1.3rem', fontWeight:400, color:'#fff', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>
          Lineage Rewards
        </h2>
        <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.5)', margin:0 }}>
          Earn USDC every time someone purchases an offering through your lineage network.
          Claim when you reach <strong style={{ color:'rgba(255,255,255,0.65)' }}>50 USDC</strong> or after <strong style={{ color:'rgba(255,255,255,0.65)' }}>60 days</strong>.
        </p>
      </div>

      {/* claim success message */}
      {claimMsg && (
        <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:'0.82rem', color:'#6ee7b7' }}>
          {claimMsg}
        </div>
      )}

      {/* summary card */}
      <SummaryCard
        summary={summary}
        onClaim={handleClaim}
        claiming={claiming}
        claimError={claimError}
      />

      {/* individual reward cards */}
      {loadingRew ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background:'var(--color-card,#0D0B3E)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'18px', height:200, opacity:0.4 }}>
              <div style={{ height:34, width:34, borderRadius:9, background:'rgba(255,255,255,0.06)', marginBottom:14 }} />
              <div style={{ height:12, width:'70%', background:'rgba(255,255,255,0.05)', borderRadius:6, marginBottom:8 }} />
              <div style={{ height:10, width:'50%', background:'rgba(255,255,255,0.04)', borderRadius:6 }} />
            </div>
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 0', color:'rgba(255,255,255,0.3)', fontSize:'0.88rem' }}>
          No lineage rewards yet. Share your offerings to start earning!
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
            {rewards.map((r) => <RewardCard key={r.reward.id} row={r} />)}
          </div>

          {/* ── Pagination — Previous / Next, mirrors offerings page ── */}
          {totalPages > 1 && (() => {
            const btnBase: React.CSSProperties = {
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 38, padding: '0 20px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'rgba(255,255,255,0.65)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }
            const dis: React.CSSProperties = { ...btnBase, opacity: 0.25, cursor: 'not-allowed' }
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 20 }}>
                <button style={page === 1 ? dis : btnBase} disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{page} / {totalPages}</span>
                <button style={page === totalPages ? dis : btnBase} disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</button>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}


import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Connection,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token'
import { Icon } from '@iconify/react'
import QRCode from 'qrcode'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

const METAPLEX_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Canonical USDC mint — uses env var so it works on local/devnet/mainnet.
// Falls back to the mainnet Circle USDC address.
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

// Native SOL mint (wrapped SOL)
const SOL_MINT = 'So11111111111111111111111111111111111111112'

// On-chain verified token logos from Solana token-list registry
const TOKEN_LOGOS: Record<string, string> = {
  SOL: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  [USDC_MINT]: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
}

// TODO: Remove hardcoded address after testing
const TEST_WALLET = '8fiZnTjCbLkPsedvry2ZXY2BuJ7umJJ64XWhwo9d4jYV'

// Fee constants — only values WE choose, not Solana runtime values
const SIGNATURE_FEE = 5000 // always 5000 lamports per signer on Solana
const COMPUTE_UNITS = 1_400_000 // compute unit limit we set for our transactions

// Fallback values used while on-chain fetch is loading
const FALLBACK_RENT_EXEMPT = 890_880
const FALLBACK_ATA_RENT = 2_039_280
const FALLBACK_PRIORITY_FEE = 1000

/* ─── On-chain fee fetcher ─────────────────────────────────────────────── */

interface OnChainFees {
  rentExemptMinimum: number   // lamports — from getMinimumBalanceForRentExemption(0)
  ataRentLamports: number     // lamports — from getMinimumBalanceForRentExemption(165)
  priorityFeeMicroLamports: number // microLamports — from getRecentPrioritizationFees()
  totalTxFee: number          // lamports — signature + priority + rent-exempt
  loaded: boolean
}

async function fetchOnChainFees(): Promise<OnChainFees> {
  try {
    const connection = getSolanaConnection()

    // Fetch rent-exempt minimums and priority fees in parallel
    const [rentExempt, ataRent, recentFees] = await Promise.all([
      connection.getMinimumBalanceForRentExemption(0),    // basic wallet account
      connection.getMinimumBalanceForRentExemption(165),  // SPL token account (165 bytes)
      connection.getRecentPrioritizationFees().catch(() => []),
    ])

    // Calculate average priority fee from recent blocks, minimum 1000
    let avgPriorityFee = FALLBACK_PRIORITY_FEE
    if (recentFees.length > 0) {
      const nonZeroFees = recentFees.filter((f: any) => f.prioritizationFee > 0)
      if (nonZeroFees.length > 0) {
        avgPriorityFee = Math.max(
          FALLBACK_PRIORITY_FEE,
          Math.ceil(nonZeroFees.reduce((sum: number, f: any) => sum + f.prioritizationFee, 0) / nonZeroFees.length)
        )
      }
    }

    const priorityFeeLamports = Math.ceil(avgPriorityFee * COMPUTE_UNITS / 1_000_000)
    const totalTxFee = SIGNATURE_FEE + priorityFeeLamports + rentExempt

    console.log('[Fees] On-chain:', { rentExempt, ataRent, avgPriorityFee, priorityFeeLamports, totalTxFee })

    return {
      rentExemptMinimum: rentExempt,
      ataRentLamports: ataRent,
      priorityFeeMicroLamports: avgPriorityFee,
      totalTxFee,
      loaded: true,
    }
  } catch (err) {
    console.warn('[Fees] Failed to fetch on-chain fees, using fallbacks:', err)
    const priorityFeeLamports = Math.ceil(FALLBACK_PRIORITY_FEE * COMPUTE_UNITS / 1_000_000)
    return {
      rentExemptMinimum: FALLBACK_RENT_EXEMPT,
      ataRentLamports: FALLBACK_ATA_RENT,
      priorityFeeMicroLamports: FALLBACK_PRIORITY_FEE,
      totalTxFee: SIGNATURE_FEE + priorityFeeLamports + FALLBACK_RENT_EXEMPT,
      loaded: true,
    }
  }
}

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface TokenInfo {
  mint: string
  balance: number
  decimals: number
  symbol: string
  name: string
  logoUri: string | null
  isVerified: boolean
}

interface SolPrice {
  usd: number
  change24h: number
}

interface SendableToken {
  type: 'SOL' | 'SPL'
  mint: string
  symbol: string
  name: string
  balance: number
  decimals: number
  logoUri: string | null
}

type SendStep = 'select' | 'form' | 'sending' | 'success'

/* ─── Frost Wallet — server-side signing (mirrors mobile FrostWallet) ─── */

/**
 * Signs a serialized transaction message via the Kinship backend.
 * Same flow as mobile FrostWallet.signTransaction():
 *   1. Serialize the compiled message to hex
 *   2. POST to BACKEND_URL/sign with Bearer token
 *   3. Backend signs with user's private key
 *   4. Returns hex-encoded ed25519 signature
 *
 * Uses the same NEXT_PUBLIC_AUTH_API_URL that auth-context uses
 * for /login and /is-auth — no proxy route needed.
 */
const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

async function frostSign(messageHex: string): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (!token) throw new Error('Not authenticated. Please log in again.')

  const res = await fetch(`${AUTH_API_URL}/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: messageHex }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || err?.message || `Signing failed (${res.status})`)
  }

  const data = await res.json()
  const sig = data?.data?.signature
  if (!sig) throw new Error('Backend did not return a signature.')
  return sig
}

/** Create a direct Solana Connection (no wallet adapter needed). */
function getSolanaConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed')
}

async function pollSignatureStatus(
  connection: Connection,
  signature: string,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1_000));
    try {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value?.[0];
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        return true;
      }
      if (status?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
    } catch (err) {
      if ((err as Error).message?.startsWith("Transaction failed:")) throw err;
    }
  }
  return false;
}

/* ─── Solana RPC ────────────────────────────────────────────────────────── */

async function rpcCall(method: string, params: any[]) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  return res.json()
}

/* ─── Validate wallet address exists on-chain ─────────────────────────── */

async function validateWalletOnChain(wallet: string): Promise<boolean> {
  try {
    new PublicKey(wallet)
    const res = await rpcCall('getAccountInfo', [wallet, { encoding: 'base64' }])
    return res.result?.value !== null
  } catch {
    return false
  }
}

/* ─── SOL balance (validated on-chain) ─────────────────────────────────── */

async function fetchSolBalance(wallet: string): Promise<number> {
  const res = await rpcCall('getBalance', [wallet, { commitment: 'confirmed' }])
  return (res.result?.value ?? 0) / 1e9
}

/* ─── SOL Price — Jupiter Price API (on-chain oracle aggregator) ──────── */

async function fetchSolPrice(): Promise<SolPrice> {
  // Jupiter Price API v3 on the keyless `lite-api.jup.ag` host. The old
  // `api.jup.ag/price/v2` endpoint now requires an API key and rejects keyless
  // browser requests (→ "Failed to fetch"). v3 returns the price map keyed
  // directly by mint with `usdPrice` and `priceChange24h` fields.
  try {
    const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${SOL_MINT}`)
    if (res.ok) {
      const data = await res.json()
      const solData = data?.[SOL_MINT]
      if (solData?.usdPrice) {
        return {
          usd: Number(solData.usdPrice),
          change24h: Number(solData.priceChange24h ?? 0),
        }
      }
    }
  } catch (err) {
    console.warn('[Wallet] Jupiter price fetch failed, trying CoinGecko:', err)
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true'
    )
    const data = await res.json()
    return {
      usd: data?.solana?.usd ?? 0,
      change24h: data?.solana?.usd_24h_change ?? 0,
    }
  } catch {
    return { usd: 0, change24h: 0 }
  }
}

/* ─── Metaplex on-chain metadata ────────────────────────────────────────── */

function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METAPLEX_PROGRAM.toBuffer(), mint.toBuffer()],
    METAPLEX_PROGRAM,
  )
  return pda
}

function parseMetadata(data: number[]): { name: string; symbol: string; uri: string } | null {
  try {
    let offset = 1 + 32 + 32
    const nameLen = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
    offset += 4
    const name = String.fromCharCode(...data.slice(offset, offset + nameLen)).replace(/\0+$/, '').trim()
    offset += nameLen
    const symLen = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
    offset += 4
    const symbol = String.fromCharCode(...data.slice(offset, offset + symLen)).replace(/\0+$/, '').trim()
    offset += symLen
    const uriLen = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
    offset += 4
    const uri = String.fromCharCode(...data.slice(offset, offset + uriLen)).replace(/\0+$/, '').trim()
    if (symbol) return { name: name || symbol, symbol, uri }
    return null
  } catch {
    return null
  }
}

async function fetchTokenLogoFromUri(uri: string): Promise<string | null> {
  if (!uri || uri.length < 5) return null
  try {
    const res = await fetch(uri)
    const json = await res.json()
    return json?.image || json?.logo || null
  } catch {
    return null
  }
}

async function fetchAllMetadata(
  mints: string[]
): Promise<Record<string, { name: string; symbol: string; uri: string }>> {
  const result: Record<string, { name: string; symbol: string; uri: string }> = {}
  if (mints.length === 0) return result
  const pdas: { mint: string; pda: string }[] = []
  for (const mint of mints) {
    try {
      pdas.push({ mint, pda: getMetadataPDA(new PublicKey(mint)).toBase58() })
    } catch {}
  }
  const res = await rpcCall('getMultipleAccounts', [pdas.map((p) => p.pda), { encoding: 'base64' }])
  const accounts = res.result?.value ?? []
  for (let i = 0; i < pdas.length; i++) {
    const acct = accounts[i]
    if (!acct?.data?.[0]) continue
    const bytes = Uint8Array.from(atob(acct.data[0]), (c) => c.charCodeAt(0))
    const parsed = parseMetadata(Array.from(bytes))
    if (parsed) result[pdas[i].mint] = parsed
  }
  return result
}

/* ─── Validate USDC by mint address (not symbol string) ───────────────── */

function isValidUsdc(mint: string): boolean {
  return mint === USDC_MINT
}

/* ─── Fetch all tokens (on-chain only, validated, skip zero balances) ─── */

async function fetchTokenAccounts(wallet: string): Promise<TokenInfo[]> {
  const res = await rpcCall('getTokenAccountsByOwner', [
    wallet,
    { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
    { encoding: 'jsonParsed' },
  ])
  const accounts = res.result?.value ?? []
  const rawTokens: { mint: string; balance: number; decimals: number }[] = []
  for (const acct of accounts) {
    const info = acct.account?.data?.parsed?.info
    if (!info) continue
    const balance = info.tokenAmount?.uiAmount ?? 0
    if (balance <= 0) continue
    rawTokens.push({ mint: info.mint, balance, decimals: info.tokenAmount?.decimals ?? 0 })
  }
  const metaMap = await fetchAllMetadata(rawTokens.map((t) => t.mint))
  const logoPromises = rawTokens.map(async (t) => {
    if (TOKEN_LOGOS[t.mint]) return { mint: t.mint, logo: TOKEN_LOGOS[t.mint] }
    const meta = metaMap[t.mint]
    if (meta?.uri) {
      const logo = await fetchTokenLogoFromUri(meta.uri)
      return { mint: t.mint, logo }
    }
    return { mint: t.mint, logo: null }
  })
  const logoResults = await Promise.all(logoPromises)
  const logoMap: Record<string, string | null> = {}
  for (const lr of logoResults) logoMap[lr.mint] = lr.logo
  return rawTokens
    .map((t) => {
      const meta = metaMap[t.mint]
      const isUsdc = isValidUsdc(t.mint)

      return {
        mint: t.mint, balance: t.balance, decimals: t.decimals,
        // USDC is the canonical Circle mint — always show its real name/symbol,
        // even when its on-chain metadata isn't resolved (would show "Unknown").
        symbol: isUsdc ? 'USDC' : (meta?.symbol || 'Unknown'),
        name: isUsdc ? 'USD Coin' : (meta?.name || 'Unknown'),
        logoUri: logoMap[t.mint] || null, isVerified: isUsdc,
      }
    })
    .sort((a, b) => {
      if (a.mint === USDC_MINT) return -1
      if (b.mint === USDC_MINT) return 1
      return b.balance - a.balance
    })
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function truncAddr(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ''
}

function fmtNum(n: number, maxDecimals?: number) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals ?? 9,
  })
}

function fmtUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/* ─── Token Logo Component ─────────────────────────────────────────────── */

function TokenLogo({ src, symbol, fallbackColor }: { src: string | null; symbol: string; fallbackColor?: string }) {
  const [imgError, setImgError] = useState(false)
  if (src && !imgError) {
    return (
      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-white/5">
        <img src={src} alt={symbol} width={36} height={36} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: fallbackColor || 'rgba(255,255,255,0.1)' }}>
      {symbol.charAt(0)}
    </div>
  )
}

/* ─── Receive Modal ────────────────────────────────────────────────────── */

function ReceiveModal({ address, onClose }: { address: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [addrCopied, setAddrCopied] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!address) return
    QRCode.toDataURL(address, { width: 280, margin: 2, color: { dark: '#000000', light: '#ffffff' }, errorCorrectionLevel: 'H' })
      .then((url) => setQrDataUrl(url)).catch(() => setQrDataUrl(null))
  }, [address])

  const handleBackdropClick = (e: React.MouseEvent) => { if (e.target === backdropRef.current) onClose() }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address); setAddrCopied(true); setTimeout(() => setAddrCopied(false), 2000)
  }

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:qr-code" width={16} height={16} className="text-accent" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Receive</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors cursor-pointer">
            <Icon icon="lucide:x" width={16} height={16} />
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-xl p-3 mb-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Wallet QR Code" width={256} height={256} className="w-64 h-64 rounded-lg" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted mb-3">Scan to copy wallet address</p>
          <div className="w-full bg-white/[0.04] border border-card-border rounded-xl px-3.5 py-3 flex items-center gap-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-0.5">Froste Wallet Address</p>
              <p className="font-mono text-xs text-foreground truncate">{address}</p>
            </div>
            <button onClick={handleCopyAddress} className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer" title="Copy address">
              <Icon icon={addrCopied ? 'lucide:check' : 'lucide:copy'} width={14} height={14} className={addrCopied ? 'text-green-400' : ''} />
            </button>
          </div>
          {addrCopied && (
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <Icon icon="lucide:check-circle" width={12} height={12} />
              Address copied to clipboard
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Send Modal (Frost Wallet signing — no external wallet needed) ──── */

function SendModal({
  solBalance,
  tokens,
  walletAddress,
  onClose,
  onSuccess,
}: {
  solBalance: number
  tokens: TokenInfo[]
  walletAddress: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<SendStep>('select')
  const [selectedToken, setSelectedToken] = useState<SendableToken | null>(null)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [addressError, setAddressError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)
  const [needsAta, setNeedsAta] = useState(false)
  const [checkingAta, setCheckingAta] = useState(false)
  const [tokenSearch, setTokenSearch] = useState('')
  const [selectPage, setSelectPage] = useState(0)
  const SELECT_PER_PAGE = 5

  // On-chain fees — fetched when modal opens
  const [fees, setFees] = useState<OnChainFees>({
    rentExemptMinimum: FALLBACK_RENT_EXEMPT,
    ataRentLamports: FALLBACK_ATA_RENT,
    priorityFeeMicroLamports: FALLBACK_PRIORITY_FEE,
    totalTxFee: SIGNATURE_FEE + Math.ceil(FALLBACK_PRIORITY_FEE * COMPUTE_UNITS / 1_000_000) + FALLBACK_RENT_EXEMPT,
    loaded: false,
  })
  const [estimatedFee, setEstimatedFee] = useState(fees.totalTxFee / LAMPORTS_PER_SOL)

  const backdropRef = useRef<HTMLDivElement>(null)

  // ── Fetch on-chain fees when modal opens ──────────────────────────────
  useEffect(() => {
    fetchOnChainFees().then((f) => {
      setFees(f)
      setEstimatedFee(f.totalTxFee / LAMPORTS_PER_SOL)
    })
  }, [])

  // Sendable tokens list — SOL first, then SPL tokens with balance > 0
  const sendableTokens: SendableToken[] = [
    ...(solBalance > 0
      ? [{ type: 'SOL' as const, mint: SOL_MINT, symbol: 'SOL', name: 'Solana', balance: solBalance, decimals: 9, logoUri: TOKEN_LOGOS.SOL }]
      : []),
    ...tokens.map((t) => ({
      type: 'SPL' as const, mint: t.mint, symbol: t.symbol, name: t.name, balance: t.balance, decimals: t.decimals, logoUri: t.logoUri,
    })),
  ]

  // Filtered tokens (by search query)
  const filteredTokens = tokenSearch.trim()
    ? sendableTokens.filter((t) =>
        t.symbol.toLowerCase().includes(tokenSearch.toLowerCase()) ||
        t.name.toLowerCase().includes(tokenSearch.toLowerCase()) ||
        t.mint.toLowerCase().includes(tokenSearch.toLowerCase())
      )
    : sendableTokens

  // Paginated filtered tokens
  const selectTotalPages = Math.ceil(filteredTokens.length / SELECT_PER_PAGE)
  const paginatedSelectTokens = filteredTokens.slice(selectPage * SELECT_PER_PAGE, (selectPage + 1) * SELECT_PER_PAGE)

  // ── Address validation ────────────────────────────────────────────────
  const validateAddress = useCallback(
    (addr: string): boolean => {
      if (!addr.trim()) { setAddressError(null); return false }
      try {
        const pk = new PublicKey(addr.trim())
        if (pk.toBase58() === walletAddress) { setAddressError("Cannot send to your own wallet"); return false }
        setAddressError(null)
        return true
      } catch {
        setAddressError('Invalid Solana address')
        return false
      }
    },
    [walletAddress],
  )

  // ── Check if recipient ATA exists (fee estimation for SPL tokens) ─────
  useEffect(() => {
    if (!selectedToken || selectedToken.type === 'SOL' || !recipient.trim()) {
      setNeedsAta(false)
      setEstimatedFee(fees.totalTxFee / LAMPORTS_PER_SOL)
      return
    }
    let isValid = false
    try {
      new PublicKey(recipient.trim())
      if (recipient.trim() !== walletAddress) isValid = true
    } catch {}
    if (!isValid) { setNeedsAta(false); setEstimatedFee(fees.totalTxFee / LAMPORTS_PER_SOL); return }

    let cancelled = false
    setCheckingAta(true)
    ;(async () => {
      try {
        const connection = getSolanaConnection()
        const mintPk = new PublicKey(selectedToken.mint)
        const recipientPk = new PublicKey(recipient.trim())
        // allowOwnerOffCurve=true so PDA/vault recipients (e.g. alliance vaults) work
        const ata = getAssociatedTokenAddressSync(mintPk, recipientPk, true)
        const info = await connection.getAccountInfo(ata)
        if (cancelled) return
        const ataNeeded = !info
        setNeedsAta(ataNeeded)
        setEstimatedFee(ataNeeded ? (fees.totalTxFee + fees.ataRentLamports) / LAMPORTS_PER_SOL : fees.totalTxFee / LAMPORTS_PER_SOL)
      } catch {
        if (!cancelled) { setNeedsAta(false); setEstimatedFee(fees.totalTxFee / LAMPORTS_PER_SOL) }
      } finally {
        if (!cancelled) setCheckingAta(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedToken, recipient, walletAddress, fees])

  // ── Amount validation ─────────────────────────────────────────────────
  const validateAmount = useCallback(
    (raw: string): boolean => {
      if (!raw.trim() || !selectedToken) { setAmountError(null); return false }
      const num = parseFloat(raw)
      if (isNaN(num) || num <= 0) { setAmountError('Enter a valid amount greater than 0'); return false }
      if (selectedToken.type === 'SOL') {
        const maxSendable = solBalance - estimatedFee
        if (num > solBalance) { setAmountError(`Exceeds balance of ${fmtNum(solBalance)} SOL`); return false }
        if (num > maxSendable) {
          setAmountError(`Must reserve ~${fmtNum(estimatedFee, 6)} SOL for gas. Max sendable: ${fmtNum(Math.max(0, maxSendable))} SOL`)
          return false
        }
      } else {
        if (num > selectedToken.balance) { setAmountError(`Exceeds balance of ${fmtNum(selectedToken.balance)} ${selectedToken.symbol}`); return false }
        if (solBalance < estimatedFee) {
          setAmountError(`Insufficient SOL for gas fee. Need ~${fmtNum(estimatedFee, 6)} SOL, have ${fmtNum(solBalance)} SOL`)
          return false
        }
      }
      setAmountError(null)
      return true
    },
    [selectedToken, solBalance, estimatedFee],
  )

  // ── Max amount ────────────────────────────────────────────────────────
  const handleMax = () => {
    if (!selectedToken) return
    if (selectedToken.type === 'SOL') {
      const max = Math.max(0, solBalance - estimatedFee)
      const val = parseFloat(max.toFixed(9)).toString()
      setAmount(val); validateAmount(val)
    } else {
      const val = parseFloat(selectedToken.balance.toFixed(selectedToken.decimals)).toString()
      setAmount(val); validateAmount(val)
    }
  }

  // ── Send: build tx → sign via Frost backend → submit to Solana ────────
  const handleSend = async () => {
    // Re-validate inputs
    const addrOk = validateAddress(recipient)
    const amtOk = validateAmount(amount)
    if (!addrOk || !amtOk || !selectedToken) return

    setStep('sending')
    setSendError(null)

    try {
      const connection = getSolanaConnection()
      const senderPk = new PublicKey(walletAddress)
      const recipientPk = new PublicKey(recipient.trim())
      const tx = new Transaction()

      // Priority fees (matches mobile FrostWallet pattern)
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNITS }))
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fees.priorityFeeMicroLamports }))

      if (selectedToken.type === 'SOL') {
        /* ─── Native SOL transfer ─────────────────────────────────────── */
        const lamports = Math.round(parseFloat(amount) * LAMPORTS_PER_SOL)
        tx.add(
          SystemProgram.transfer({
            fromPubkey: senderPk,
            toPubkey: recipientPk,
            lamports,
          }),
        )
      } else {
        /* ─── SPL token transfer ──────────────────────────────────────── */
        const mintPk = new PublicKey(selectedToken.mint)
        const senderAta = getAssociatedTokenAddressSync(mintPk, senderPk)
        // allowOwnerOffCurve=true so PDA/vault recipients (e.g. alliance vaults) work
        const recipientAta = getAssociatedTokenAddressSync(mintPk, recipientPk, true)

        // Check if recipient ATA exists — create if needed
        const recipientAtaInfo = await connection.getAccountInfo(recipientAta)
        if (!recipientAtaInfo) {
          tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
              senderPk,      // payer
              recipientAta,  // associated token account
              recipientPk,   // wallet owner
              mintPk,        // token mint
            ),
          )
        }

        const rawAmount = BigInt(Math.floor(parseFloat(amount) * 10 ** selectedToken.decimals))
        tx.add(
          createTransferCheckedInstruction(
            senderAta,             // source ATA
            mintPk,                // mint (for decimal verification)
            recipientAta,          // destination ATA
            senderPk,             // owner of source ATA
            rawAmount,             // amount in raw units
            selectedToken.decimals, // decimals
          ),
        )
      }

      // Set fee payer and blockhash
      tx.feePayer = senderPk
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash

      // Serialize message → hex (same as mobile FrostWallet.signTransaction)
      const messageBytes = tx.serializeMessage()
      const messageHex = Buffer.from(messageBytes).toString('hex')

      // Sign via Frost backend (same /sign endpoint mobile uses)
      const signatureHex = await frostSign(messageHex)

      // Add signature to transaction
      tx.addSignature(senderPk, Buffer.from(signatureHex, 'hex'))

      // Submit to Solana RPC
      const rawTx = tx.serialize()
      const sig = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      })

      // Poll for on-chain confirmation (avoids WebSocket-based confirmTransaction timeout)
      const confirmed = await pollSignatureStatus(connection, sig, 15_000)
      if (!confirmed && selectedToken!.type !== 'SOL') {
        // Transaction likely landed — check recipient token balance before reporting failure
        try {
          const mintPk = new PublicKey(selectedToken!.mint)
          const recipientAta = getAssociatedTokenAddressSync(mintPk, new PublicKey(recipient.trim()), true)
          const balInfo = await connection.getTokenAccountBalance(recipientAta)
          if (Number(balInfo.value.uiAmount ?? 0) > 0) {
            setTxSignature(sig)
            setStep('success')
            onSuccess()
            setTimeout(() => onSuccess(), 3000)
            return
          }
        } catch { /* balance check failed — still treat as success since tx was sent */ }
      }

      setTxSignature(sig)
      setStep('success')

      // Refresh balances immediately after successful send
      onSuccess()
      // SPL token balances take longer to propagate on RPC — refresh again after delay
      setTimeout(() => onSuccess(), 3000)
    } catch (err: any) {
      console.error('[Send]', err)
      let msg = err?.message?.split('\n')[0] || 'Transaction failed. Please try again.'
      if (msg.includes('Not authenticated')) msg = 'Session expired. Please log in again.'
      else if (msg.includes('Blockhash not found')) msg = 'Network congestion — please try again.'
      else if (msg.includes('insufficient lamports')) msg = 'Insufficient SOL to cover the transaction and gas fee.'
      else if (msg.includes('insufficient funds')) msg = 'Insufficient token balance for this transfer.'
      setSendError(msg)
      setStep('form')
    }
  }

  // ── Close / Escape ────────────────────────────────────────────────────
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current && step !== 'sending') {
      onClose()
      if (step === 'success') {
        setTimeout(() => onSuccess(), 1500)
      }
    }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'sending') {
        onClose()
        if (step === 'success') {
          setTimeout(() => onSuccess(), 1500)
        }
      }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose, onSuccess, step])

  // ── Explorer URL ──────────────────────────────────────────────────────
  const explorerCluster =
    RPC_URL.includes('mainnet')      ? ''
    : RPC_URL.includes('devnet')     ? '?cluster=devnet'
    : RPC_URL.includes('testnet')    ? '?cluster=testnet'
    : RPC_URL                        ? '?cluster=custom&customUrl=' + encodeURIComponent(RPC_URL)
    : ''

  const canSend = !!selectedToken && !!recipient.trim() && !!amount.trim() && !addressError && !amountError && !checkingAta

  /* ─────────────────────────── RENDER ───────────────────────────────────── */

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-2.5">
            {step === 'form' && (
              <button onClick={() => { setStep('select'); setSelectedToken(null); setRecipient(''); setAmount(''); setAddressError(null); setAmountError(null); setSendError(null); setTokenSearch(''); setSelectPage(0) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors cursor-pointer">
                <Icon icon="lucide:arrow-left" width={16} height={16} />
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:arrow-up-right" width={16} height={16} className="text-accent" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {step === 'select' && 'Select Token'}
              {step === 'form' && `Send ${selectedToken?.symbol ?? ''}`}
              {step === 'sending' && 'Sending…'}
              {step === 'success' && 'Sent!'}
            </h2>
          </div>
          {step !== 'sending' && (
            <button onClick={() => {
                onClose()
                if (step === 'success') {
                  setTimeout(() => onSuccess(), 1500)
                }
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors cursor-pointer">
              <Icon icon="lucide:x" width={16} height={16} />
            </button>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto flex-1">

          {/* ▸ STEP: select token ───────────────────────────────────── */}
          {step === 'select' && (
            sendableTokens.length === 0 ? (
              <div className="text-center py-10">
                <Icon icon="lucide:wallet" width={36} height={36} className="text-muted mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">No tokens to send</p>
                <p className="text-xs text-muted">Fund your wallet first.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search input */}
                <div className="relative">
                  <Icon icon="lucide:search" width={14} height={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={tokenSearch}
                    onChange={(e) => { setTokenSearch(e.target.value); setSelectPage(0) }}
                    placeholder="Search by name, symbol, or address"
                    className="w-full bg-white/[0.04] border border-card-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50 transition-colors"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  {tokenSearch && (
                    <button
                      onClick={() => { setTokenSearch(''); setSelectPage(0) }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Icon icon="lucide:x" width={14} height={14} />
                    </button>
                  )}
                </div>

                {/* Token list */}
                {filteredTokens.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted">No tokens match "{tokenSearch}"</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {paginatedSelectTokens.map((t) => (
                      <button key={t.mint}
                        onClick={() => { setSelectedToken(t); setStep('form'); setSendError(null); setTokenSearch(''); setSelectPage(0) }}
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-card-border hover:bg-white/[0.04] transition-colors cursor-pointer text-left">
                        <TokenLogo src={t.logoUri} symbol={t.symbol} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{t.symbol}</p>
                          <p className="text-xs text-muted truncate">{t.name}</p>
                        </div>
                        <p className="text-sm font-semibold font-mono text-foreground shrink-0">{fmtNum(t.balance)}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {selectTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted">
                      {selectPage * SELECT_PER_PAGE + 1}–{Math.min((selectPage + 1) * SELECT_PER_PAGE, filteredTokens.length)} of {filteredTokens.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectPage((p) => Math.max(0, p - 1))}
                        disabled={selectPage === 0}
                        className="px-2 py-1 rounded-lg text-xs font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Icon icon="lucide:chevron-left" width={12} height={12} />
                        Prev
                      </button>
                      <button
                        onClick={() => setSelectPage((p) => Math.min(selectTotalPages - 1, p + 1))}
                        disabled={selectPage >= selectTotalPages - 1}
                        className="px-2 py-1 rounded-lg text-xs font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Next
                        <Icon icon="lucide:chevron-right" width={12} height={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* ▸ STEP: form ─────────────────────────────────────────────── */}
          {step === 'form' && selectedToken && (
            <div className="space-y-4">
              {/* Selected token summary */}
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.03] border border-card-border">
                <TokenLogo src={selectedToken.logoUri} symbol={selectedToken.symbol} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{selectedToken.symbol}</p>
                  <p className="text-xs text-muted">{selectedToken.name}</p>
                </div>
                <p className="text-xs text-muted">Balance: <span className="text-foreground font-mono font-semibold">{fmtNum(selectedToken.balance)}</span></p>
              </div>

              {/* Recipient address */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5 block">Recipient Address</label>
                <input
                  type="text" value={recipient} spellCheck={false} autoComplete="off"
                  placeholder="Enter Solana wallet address"
                  onChange={(e) => { setRecipient(e.target.value); if (e.target.value.trim()) validateAddress(e.target.value); else setAddressError(null) }}
                  onBlur={() => { if (recipient.trim()) validateAddress(recipient) }}
                  className={`w-full bg-white/[0.04] border rounded-xl px-3.5 py-3 text-sm text-foreground font-mono placeholder:text-muted/50 outline-none transition-colors ${
                    addressError ? 'border-red-500/50 focus:border-red-500' : 'border-card-border focus:border-accent/50'
                  }`}
                />
                {addressError && (
                  <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" width={12} height={12} />{addressError}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5 block">Amount</label>
                <div className="relative">
                  <input
                    type="text" inputMode="decimal" value={amount} placeholder="0.00"
                    onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'); setAmount(v); if (v.trim()) validateAmount(v); else setAmountError(null) }}
                    onBlur={() => { if (amount.trim()) validateAmount(amount) }}
                    className={`w-full bg-white/[0.04] border rounded-xl px-3.5 py-3 pr-20 text-sm text-foreground font-mono placeholder:text-muted/50 outline-none transition-colors ${
                      amountError ? 'border-red-500/50 focus:border-red-500' : 'border-card-border focus:border-accent/50'
                    }`}
                  />
                  <button onClick={handleMax}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-wider hover:bg-accent/25 transition-colors cursor-pointer">
                    Max
                  </button>
                </div>
                {amountError && (
                  <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" width={12} height={12} />{amountError}
                  </p>
                )}
              </div>

              {/* Fee info */}
              <div className="bg-white/[0.03] border border-card-border rounded-xl px-3.5 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Estimated gas fee</span>
                  <span className="text-xs font-mono text-foreground">
                    ~{fmtNum(estimatedFee, 6)} SOL
                    {checkingAta && <span className="ml-1.5 inline-block w-3 h-3 border border-muted border-t-accent rounded-full animate-spin align-middle" />}
                  </span>
                </div>
                {needsAta && (
                  <div className="flex items-start gap-1.5">
                    <Icon icon="lucide:info" width={12} height={12} className="text-muted mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted leading-snug">
                      Recipient doesn't have a {selectedToken.symbol} token account. One will be created automatically (includes ~0.002 SOL rent).
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-card-border pt-2">
                  <span className="text-xs text-muted">Signed by</span>
                  <span className="text-xs text-foreground flex items-center gap-1">
                    <Icon icon="lucide:shield-check" width={10} height={10} className="text-accent" />
                    Froste Wallet
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-card-border pt-2">
                  <span className="text-xs text-muted">You send</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{amount || '0'} {selectedToken.symbol}</span>
                </div>
              </div>

              {/* Send error */}
              {sendError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 flex items-start gap-2">
                  <Icon icon="lucide:alert-circle" width={14} height={14} className="mt-0.5 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Send button — no wallet connection needed, Frost signs server-side */}
              <button onClick={handleSend} disabled={!canSend}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Icon icon="lucide:arrow-up-right" width={16} height={16} />
                Send {selectedToken.symbol}
              </button>
            </div>
          )}

          {/* ▸ STEP: sending ──────────────────────────────────────────── */}
          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground mb-1">Confirming on-chain…</p>
                <p className="text-xs text-muted">Your Froste wallet is signing and submitting the transaction.</p>
              </div>
            </div>
          )}

          {/* ▸ STEP: success ──────────────────────────────────────────── */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                <Icon icon="lucide:check" width={28} height={28} className="text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground mb-1">Transaction Sent!</p>
                <p className="text-xs text-muted">{amount} {selectedToken?.symbol} sent to {truncAddr(recipient)}</p>
              </div>
              {txSignature && (
                <a href={`https://explorer.solana.com/tx/${txSignature}${explorerCluster}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-accent hover:underline">
                  <Icon icon="lucide:external-link" width={12} height={12} />View on Solana Explorer
                </a>
              )}
              <button onClick={() => {
                  onClose()
                  // Small delay to let on-chain state propagate before refreshing balances
                  setTimeout(() => onSuccess(), 1500)
                }}
                className="w-full mt-2 py-3 rounded-xl text-sm font-semibold border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export function WalletContent({ hideHeader = false }: { hideHeader?: boolean }) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [solBalance, setSolBalance] = useState(0)
  const [solPrice, setSolPrice] = useState<SolPrice>({ usd: 0, change24h: 0 })
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [walletValid, setWalletValid] = useState(true)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [tokenPage, setTokenPage] = useState(0)
  const TOKENS_PER_PAGE = 5

  const walletAddress = user?.wallet || null
  const userName = user?.name || 'User'

  const usdcToken = tokens.find((t) => isValidUsdc(t.mint)) || null
  const otherTokens = tokens.filter((t) => !isValidUsdc(t.mint))

  // Pagination for other tokens
  const totalPages = Math.ceil(otherTokens.length / TOKENS_PER_PAGE)
  const paginatedTokens = otherTokens.slice(tokenPage * TOKENS_PER_PAGE, (tokenPage + 1) * TOKENS_PER_PAGE)

  const solValueUsd = solBalance * solPrice.usd
  const usdcValueUsd = usdcToken?.balance ?? 0
  const totalValueUsd = solValueUsd + usdcValueUsd

  const networkLabel = RPC_URL.includes('mainnet')
    ? 'Mainnet'
    : RPC_URL.includes('devnet')
      ? 'Devnet'
      : RPC_URL.includes('testnet')
        ? 'Testnet'
        : 'Localnet'

  const loadBalances = useCallback(
    async (isRefresh = false) => {
      if (!walletAddress) return
      isRefresh ? setRefreshing(true) : setLoading(true)
      setError(null)
      try {
        const isValid = await validateWalletOnChain(walletAddress)
        setWalletValid(isValid)
        const [sol, tkns, price] = await Promise.all([
          isValid ? fetchSolBalance(walletAddress) : Promise.resolve(0),
          isValid ? fetchTokenAccounts(walletAddress) : Promise.resolve([]),
          fetchSolPrice(),
        ])
        setSolBalance(sol); setTokens(tkns); setSolPrice(price)
        setTokenPage(0) // reset pagination on refresh
      } catch (err: any) {
        console.error('[Wallet]', err)
        setError('Failed to load balances. Check RPC connection.')
      } finally {
        setLoading(false); setRefreshing(false)
      }
    },
    [walletAddress]
  )

  useEffect(() => { loadBalances() }, [loadBalances])

  useEffect(() => {
    const interval = setInterval(async () => {
      try { const price = await fetchSolPrice(); setSolPrice(price) } catch {}
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleCopy = () => {
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (!walletAddress)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Icon icon="lucide:wallet" width={48} height={48} className="text-muted mx-auto mb-4" />
          <p className="text-lg font-semibold text-white">No wallet connected</p>
          <p className="text-sm text-muted">Please log in to view your balances.</p>
        </div>
      </div>
    )

  const hasAnyBalance = solBalance > 0 || tokens.length > 0

  return (
    <div>
      {/* Header */}
      {!hideHeader && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">Account</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Wallet.</h1>
          <p className="text-muted mt-1">On-chain balances for your account.</p>
        </div>
        <button onClick={() => loadBalances(true)} disabled={refreshing}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 self-start">
          <Icon icon="lucide:refresh-cw" width={14} height={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      )}

      {/* Address card */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center text-accent text-lg font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{userName}</p>
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 mt-0.5 text-muted hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0">
                <span className="font-mono text-xs">{truncAddr(walletAddress)}</span>
                <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} width={12} height={12} className={copied ? 'text-green-400' : 'text-accent'} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">{networkLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Send & Receive buttons ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button onClick={() => setShowSendModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-card-border text-foreground bg-card hover:bg-white/[0.04] transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
            <Icon icon="lucide:arrow-up-right" width={14} height={14} className="text-accent" />
          </div>
          Send
        </button>
        <button onClick={() => setShowReceiveModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-card-border text-foreground bg-card hover:bg-white/[0.04] transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
            <Icon icon="lucide:arrow-down-left" width={14} height={14} className="text-green-400" />
          </div>
          Receive
        </button>
      </div>

      {/* Send Modal */}
      {showSendModal && walletAddress && (
        <SendModal solBalance={solBalance} tokens={tokens} walletAddress={walletAddress}
          onClose={() => setShowSendModal(false)} onSuccess={() => loadBalances(true)} />
      )}

      {/* Receive Modal */}
      {showReceiveModal && walletAddress && (
        <ReceiveModal address={walletAddress} onClose={() => setShowReceiveModal(false)} />
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5 text-sm text-red-400 flex items-center gap-2">
          <Icon icon="lucide:alert-circle" width={16} height={16} />{error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading on-chain balances…</p>
        </div>
      ) : (
        <>
          {/* Balance cards — SOL and USDC always shown (even at 0 balance);
              "Other Tokens" only appears when the wallet holds SPL tokens. */}
          <div className={`grid gap-3 mb-5 ${
            otherTokens.length > 0 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
          }`}>
            {/* SOL card — always shown */}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">SOL Balance</span>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5">
                  <img src={TOKEN_LOGOS.SOL} alt="SOL" width={32} height={32} className="w-full h-full object-cover" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{fmtNum(solBalance)}</p>
              <p className="text-xs text-muted mt-1">
                {solPrice.usd > 0 ? (
                  <>
                    {fmtUsd(solValueUsd)}
                    <span className="text-muted/60 ml-1">@ {fmtUsd(solPrice.usd)}/SOL</span>
                  </>
                ) : (
                  'Price unavailable'
                )}
              </p>
            </div>

            {/* USDC card — always shown; validated by canonical mint address */}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">USDC Balance</span>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5">
                  <img src={TOKEN_LOGOS[USDC_MINT]} alt="USDC" width={32} height={32} className="w-full h-full object-cover" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{fmtNum(usdcToken?.balance ?? 0)}</p>
              <p className="text-xs text-muted mt-1">
                {fmtUsd(usdcToken?.balance ?? 0)}
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-green-400">
                  <Icon icon="lucide:shield-check" width={10} height={10} />
                  Verified
                </span>
              </p>
            </div>

            {/* Other tokens count */}
            {otherTokens.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Other Tokens</span>
                  <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                    <Icon icon="lucide:coins" width={18} height={18} className="text-accent" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{otherTokens.length}</p>
                <p className="text-xs text-muted mt-1">SPL tokens held</p>
              </div>
            )}
          </div>

          {/* Portfolio value — shown under the SOL / USDC balance cards */}
          {totalValueUsd > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-5 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Portfolio Value</p>
              <p className="text-3xl font-bold text-foreground">{fmtUsd(totalValueUsd)}</p>
              {solPrice.change24h !== 0 && (
                <p className={`text-xs mt-1 ${solPrice.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  SOL {solPrice.change24h >= 0 ? '↑' : '↓'} {Math.abs(solPrice.change24h).toFixed(2)}% (24h)
                </p>
              )}
            </div>
          )}

          {/* Token list table — name, logo, balance only */}
          {hasAnyBalance && (
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="flex items-center px-4 py-3 border-b border-card-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex-1">Token</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted text-right w-32">Balance</span>
              </div>

              {/* SOL row */}
              {solBalance > 0 && (
                <div className="flex items-center px-4 py-3.5 border-b border-card-border hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TokenLogo src={TOKEN_LOGOS.SOL} symbol="SOL" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">SOL</p>
                      <p className="text-xs text-muted truncate">Solana</p>
                    </div>
                  </div>
                  <div className="text-right w-32">
                    <p className="text-sm font-semibold font-mono text-foreground">{fmtNum(solBalance)}</p>
                  </div>
                </div>
              )}

              {/* USDC row — validated by mint address */}
              {usdcToken && (
                <div className="flex items-center px-4 py-3.5 border-b border-card-border hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TokenLogo src={TOKEN_LOGOS[USDC_MINT]} symbol="USDC" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground truncate">USDC</p>
                        <span title={`Verified mint: ${USDC_MINT}`}>
                          <Icon icon="lucide:shield-check" width={12} height={12} className="text-green-400 shrink-0" />
                        </span>
                      </div>
                      <p className="text-xs text-muted truncate">USD Coin</p>
                    </div>
                  </div>
                  <div className="text-right w-32">
                    <p className="text-sm font-semibold font-mono text-foreground">{fmtNum(usdcToken.balance)}</p>
                  </div>
                </div>
              )}

              {/* Other SPL tokens (paginated) */}
              {paginatedTokens.map((token, i) => (
                <div key={token.mint}
                  className={`flex items-center px-4 py-3.5 hover:bg-white/[0.02] transition-colors ${
                    i < paginatedTokens.length - 1 ? 'border-b border-card-border' : ''
                  }`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TokenLogo src={token.logoUri} symbol={token.symbol} fallbackColor="rgba(255,255,255,0.08)" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{token.symbol}</p>
                      <p className="text-xs text-muted truncate">{token.name}</p>
                    </div>
                  </div>
                  <div className="text-right w-32">
                    <p className="text-sm font-semibold font-mono text-foreground">{fmtNum(token.balance)}</p>
                  </div>
                </div>
              ))}

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-card-border">
                  <span className="text-xs text-muted">
                    {tokenPage * TOKENS_PER_PAGE + 1}–{Math.min((tokenPage + 1) * TOKENS_PER_PAGE, otherTokens.length)} of {otherTokens.length} tokens
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTokenPage((p) => Math.max(0, p - 1))}
                      disabled={tokenPage === 0}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Icon icon="lucide:chevron-left" width={14} height={14} />
                      Prev
                    </button>
                    <button
                      onClick={() => setTokenPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={tokenPage >= totalPages - 1}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Next
                      <Icon icon="lucide:chevron-right" width={14} height={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!hasAnyBalance && (
            <div className="bg-card border border-card-border rounded-xl p-8 text-center">
              <Icon icon="lucide:wallet" width={40} height={40} className="text-muted mx-auto mb-3" />
              <p className="text-base font-semibold text-foreground mb-1">Wallet is empty</p>
              <p className="text-sm text-muted">
                No SOL or tokens found. Fund your wallet to get started.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Lineage Rewards ─────────────────────────────────────────────── */}
      <LineageRewards />
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useAuth } from '@/lib/auth-context'
import {
  listOfferings,
  listMyPurchases,
  getCreatorWallet,
  recordPurchase,
  recordRenewal,
  getOfferingImages,
  type Offering,
  type Purchase,
} from '@/lib/offerings-api'
import { transferUsdc } from '@/lib/usdc-transfer'

/* ──────────────────────────────────────────────────────────────────────────
   Offerings — pixel-perfect match to AgentsListPage / Avatar card design
   ────────────────────────────────────────────────────────────────────────── */

type Filter = 'all' | 'buy' | 'purchased' | 'created'

// Badge styles — same as AgentsListPage
type BadgeStyle = { background: string; color: string; border?: string }
const BADGE: Record<string, BadgeStyle> = {
  OWNER:       { background: '#EAAA00', color: '#09073A' },
  AVAILABLE:   { background: 'rgba(0,235,117,0.15)', color: '#00EB75', border: '1px solid rgba(0,235,117,0.3)' },
  PURCHASED:   { background: 'rgba(234,170,0,0.18)', color: '#EAAA00', border: '1px solid rgba(234,170,0,0.35)' },
  ACTIVE:      { background: 'rgba(0,235,117,0.15)', color: '#00EB75', border: '1px solid rgba(0,235,117,0.3)' },
  EXPIRED:     { background: 'rgba(255,58,58,0.12)', color: '#f87171', border: '1px solid rgba(255,58,58,0.25)' },
  'ONE-TIME':  { background: 'rgba(3,204,217,0.12)', color: '#03CCD9', border: '1px solid rgba(3,204,217,0.25)' },
  SUBSCRIPTION:{ background: 'rgba(236,0,140,0.12)', color: '#EC008C', border: '1px solid rgba(236,0,140,0.25)' },
  DISCOUNT:    { background: 'rgba(0,235,117,0.12)', color: '#00EB75', border: '1px solid rgba(0,235,117,0.25)' },
}
function badge(label: string) {
  const s = BADGE[label.toUpperCase()] ?? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }
  return (
    <span key={label} style={{
      background: s.background, color: s.color, border: s.border,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 999,
      whiteSpace: 'nowrap' as const, lineHeight: 1,
    }}>{label}</span>
  )
}

/* ── Card image carousel ───────────────────────────────────────────────── */
function CardCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0)
  const hasMult = images.length > 1

  return (
    <div style={{ position: 'relative', width: '100%', height: 180, background: '#100E59', overflow: 'hidden' }}>
      {images.length === 0 ? (
        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 32, color: '#EAAA00', opacity: 0.3 }}>✦</span>
      ) : (
        <img
          key={images[idx]}
          src={images[idx]}
          alt={name}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block', transition: 'opacity 200ms' }}
        />
      )}
      {hasMult && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i > 0 ? i - 1 : images.length - 1)) }}
            style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            ‹
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i < images.length - 1 ? i + 1 : 0)) }}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            ›
          </button>
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setIdx(i) }}
                style={{ width: i === idx ? 16 : 5, height: 5, borderRadius: 3, padding: 0, border: 'none', background: i === idx ? '#EAAA00' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'width 200ms, background 200ms' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OfferingsPage() {
  const router = useRouter()
  const { user, token } = useAuth() as { user: any; token: string | null }
  const [filter, setFilter] = useState<Filter>('all')

  const [allOfferings, setAllOfferings] = useState<Offering[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 9
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Load the full offerings catalog (all pages) plus the user's purchases.
  // We fetch everything once and paginate client-side so that every filter
  // (All / Buy / Purchased / Created) gets consistent counts AND Prev/Next.
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [first, pl] = await Promise.all([
        listOfferings(token, 1, 100).catch(() => ({ data: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 1, hasMore: false } })),
        listMyPurchases(token).catch(() => []),
      ])
      let all: Offering[] = first.data
      for (let p = 2; p <= first.pagination.totalPages; p++) {
        const next = await listOfferings(token, p, 100).catch(() => null)
        if (next) all = all.concat(next.data)
      }
      setAllOfferings(all)
      setTotal(first.pagination.total)
      setPurchases(pl)
    } catch {}
    setLoading(false)
  }, [token])
  useEffect(() => { loadAll() }, [token])

  const purchaseMap = useMemo(() => {
    const m = new Map<string, Purchase>()
    for (const p of purchases) {
      const ex = m.get(p.purchase.offeringId)
      if (!ex || new Date(p.purchase.purchaseDate) > new Date(ex.purchase.purchaseDate)) m.set(p.purchase.offeringId, p)
    }
    return m
  }, [purchases])

  function cardStatus(o: Offering) {
    const own = o.creatorId === user?.id
    const p = purchaseMap.get(o.id)
    if (own) return { label: 'Your Offering', badge: 'OWNER', action: null as null }
    if (!p)  return { label: 'Available', badge: 'AVAILABLE', action: 'buy' as const }
    if (p.purchase.purchaseType === 'one-time') return { label: 'Purchased', badge: 'PURCHASED', action: 'view' as const }
    if (p.purchase.status === 'expired')        return { label: 'Expired', badge: 'EXPIRED', action: 'renew' as const }
    return { label: 'Active', badge: 'ACTIVE', action: 'view' as const }
  }

  const myId = user?.id
  // purchasedCount comes from the full purchase list (all pages), not the current
  // page's offerings — otherwise a purchase only counts once its offering happens
  // to land on the visible page.
  const purchasedCount = purchaseMap.size
  // Counts are computed from the full catalog (all pages), not the current page,
  // so the chip totals stay stable while paginating.
  const buyCount       = allOfferings.filter(o => o.creatorId !== myId && !purchaseMap.has(o.id)).length
  const createdCount   = allOfferings.filter(o => o.creatorId === myId).length

  useEffect(() => { setPage(1) }, [filter])

  const filtered = useMemo(() => {
    // The "purchased" filter is backed by the full purchase list (all pages), which
    // already carries the offering details — so it shows every purchase regardless
    // of which page the offering lives on. Buy/created still operate on the current
    // page (they mirror the paginated "all" list).
    if (filter === 'purchased') {
      return [...purchaseMap.values()].map((p): Offering => ({
        id: p.purchase.offeringId,
        creatorId: p.purchase.creatorId,
        name: p.offering?.name ?? 'Offering',
        image: p.offering?.image ?? null,
        images: p.offering?.images ?? null,
        description: p.offering?.description ?? null,
        pricingType: p.offering?.pricingType ?? p.purchase.purchaseType,
        price: p.offering?.price ?? p.purchase.amountPaid,
        offerPercentage: '0',
        status: 'live',
        createdAt: p.purchase.purchaseDate,
      }))
    }
    if (filter === 'buy')       return allOfferings.filter(o => o.creatorId !== myId && !purchaseMap.has(o.id))
    if (filter === 'created')   return allOfferings.filter(o => o.creatorId === myId)
    return allOfferings
  }, [allOfferings, purchaseMap, filter, myId])

  // Client-side pagination — applies to every filter, so all tabs get Prev/Next.
  const viewTotalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, viewTotalPages)
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  /* ── Purchase — Step 1: Buyer → Creator (60%), Step 2: Buyer → Admin Frost Wallet (40%) ── */
  async function handlePurchase(id: string) {
    setErr(''); setMsg(''); setPurchasing(id)
    try {
      const info = await getCreatorWallet(id, token)
      if (!info.creatorWallet) throw new Error('Creator has no wallet')
      if (!user?.wallet) throw new Error('You need a wallet to purchase')

      const price      = parseFloat(info.price)
      const offerPct    = parseFloat(info.offerPercentage || '0')
      const finalPrice  = offerPct > 0 ? price * (1 - offerPct / 100) : price

      // Lineage percentage comes from backend (e.g. 40); creator gets the remainder.
      const lineagePct    = (info as any).lineagePct ?? 40
      const creatorPct    = 100 - lineagePct
      const creatorAmount = parseFloat((finalPrice * creatorPct / 100).toFixed(6))
      const lineageAmount = parseFloat((finalPrice * lineagePct / 100).toFixed(6))

      // Step 1: Buyer → Creator Frost Wallet
      const creatorTx = await transferUsdc(user.wallet, info.creatorWallet, creatorAmount, token)

      // Step 2: Buyer → Admin Frost Wallet (lineage custody)
      let lineageTxId: string | undefined
      const adminWallet = (info as any).adminLineageWallet
      if (adminWallet && lineageAmount > 0) {
        lineageTxId = await transferUsdc(user.wallet, adminWallet, lineageAmount, token)
      }

      // Record purchase — backend inserts PENDING lineage_rewards rows
      await recordPurchase(id, creatorTx, finalPrice, token, lineageTxId)
      setMsg('Purchase successful!'); loadAll()
    } catch (e: any) { setErr(e?.message || 'Purchase failed') }
    setPurchasing(null)
  }

  /* ── Renew — same two-step payment as purchase ── */
  async function handleRenew(purchaseId: string, offeringId: string) {
    setErr(''); setMsg(''); setRenewingId(purchaseId)
    try {
      const info = await getCreatorWallet(offeringId, token)
      if (!info.creatorWallet) throw new Error('Creator has no wallet')
      if (!user?.wallet) throw new Error('You need a wallet to renew')

      const price      = parseFloat(info.price)
      const offerPct    = parseFloat(info.offerPercentage || '0')
      const finalPrice  = offerPct > 0 ? price * (1 - offerPct / 100) : price

      const lineagePct    = (info as any).lineagePct ?? 40
      const creatorPct    = 100 - lineagePct
      const creatorAmount = parseFloat((finalPrice * creatorPct / 100).toFixed(6))
      const lineageAmount = parseFloat((finalPrice * lineagePct / 100).toFixed(6))

      const creatorTx = await transferUsdc(user.wallet, info.creatorWallet, creatorAmount, token)

      let lineageTxId: string | undefined
      const adminWallet = (info as any).adminLineageWallet
      if (adminWallet && lineageAmount > 0) {
        lineageTxId = await transferUsdc(user.wallet, adminWallet, lineageAmount, token)
      }

      await recordRenewal(purchaseId, creatorTx, finalPrice, token, lineageTxId)
      setMsg('Subscription renewed!'); loadAll()
    } catch (e: any) { setErr(e?.message || 'Renewal failed') }
    setRenewingId(null)
  }

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
  }

  // ─── Filter chip (same pill style as AgentsListPage) ───────────
  const chip = (key: Filter, label: string, count: number) => {
    const active = filter === key
    return (
      <button
        key={key}
        onClick={() => setFilter(key)}
        style={{
          fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif',
          fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 999,
          background: active ? 'rgba(234,170,0,0.14)' : '#0A0D33',
          border: `1px solid ${active ? 'rgba(234,170,0,0.5)' : 'rgba(255,255,255,0.12)'}`,
          color: active ? '#EAAA00' : 'rgba(255,255,255,0.6)',
          cursor: 'pointer', transition: '140ms', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
        {label}
        <span style={{
          fontSize: 10, background: active ? 'rgba(234,170,0,0.2)' : 'rgba(255,255,255,0.08)',
          padding: '1px 7px', borderRadius: 999,
        }}>{count}</span>
      </button>
    )
  }

  return (
    <div style={{ fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#03CCD9', marginBottom: 8 }}>Building mode · Economics</p>
        <h1 style={{ fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif', fontWeight: 400, fontSize: '2.1rem', lineHeight: 1, margin: 0 }}>Offerings</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: 6, lineHeight: 1.5 }}>
          Anything your DUNA, alliances, and allies offer — <b>physical or digital</b>, sold <b>one-time</b>, by <b>subscription</b>, or unlocked by <b>holding a coin</b>.
        </p>
        <button
          onClick={() => router.push('/offerings/new')}
          style={{
            background: 'rgb(234, 170, 0)', color: '#09073A',
            fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif',
            fontWeight: 700, fontSize: '0.92rem', padding: '0.7rem 1.25rem',
            borderRadius: 6, border: 'none', cursor: 'pointer', transition: '140ms',
            display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' as const,
            marginTop: 16,
          }}
        >
          ＋ New offering
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {chip('all', 'All', total)}
        {chip('buy', 'Buy', buyCount)}
        {chip('purchased', 'Purchased', purchasedCount)}
        {chip('created', 'Created', createdCount)}
      </div>

      {/* Messages */}
      {msg && <div style={{ padding: '10px 16px', borderRadius: 6, fontSize: '0.84rem', marginBottom: 16, background: 'rgba(0,235,117,0.08)', border: '1px solid rgba(0,235,117,0.25)', color: '#00EB75' }}>{msg}</div>}
      {err && <div style={{ padding: '10px 16px', borderRadius: 6, fontSize: '0.84rem', marginBottom: 16, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>{err}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          <style>{`@keyframes of-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              background: '#0A0D33', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                animation: 'of-shimmer 1.4s ease-in-out infinite',
              }} />
              {/* image banner */}
              <div style={{ width: '100%', height: 180, background: '#100E59' }} />
              <div style={{ padding: '20px 20px 16px' }}>
                {/* icon + badges row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 56, height: 20, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }} />
                    <div style={{ width: 44, height: 20, borderRadius: 99, background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
                {/* name */}
                <div style={{ height: 20, width: '60%', borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />
                {/* desc lines */}
                <div style={{ height: 13, width: '95%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 6 }} />
                <div style={{ height: 13, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 16 }} />
                {/* footer */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ height: 16, width: '30%', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ height: 26, width: '22%', borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid — same as AgentsListPage */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {paged.map((o) => {
            const cs = cardStatus(o)
            const price = parseFloat(o.price)
            const pct = parseFloat(o.offerPercentage || '0')
            const final_ = pct > 0 ? price * (1 - pct / 100) : price
            const p = purchaseMap.get(o.id)
            const isOwn = o.creatorId === myId

            return (
              <div
                key={o.id}
                className="group relative transition-all"
                style={{
                  background: '#0A0D33', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(3,1,27,0.45)', transition: '160ms',
                }}
                onClick={() => router.push(`/offerings/${o.id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
              >{/* Image banner — carousel if multiple images */}
<CardCarousel images={getOfferingImages(o)} name={o.name} />

                <div style={{ padding: '20px 20px 16px' }}>
                  {/* Top row: icon + badges */}
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: isOwn ? 'rgba(234,170,0,0.18)' : 'rgba(101,54,187,0.25)', border: `1px solid ${isOwn ? 'rgba(234,170,0,0.4)' : 'rgba(101,54,187,0.4)'}` }}
                    >
                      <Icon icon={isOwn ? 'lucide:crown' : 'lucide:package'} width={20} height={20} style={{ color: isOwn ? '#EAAA00' : '#a07aee' }} />
                    </div>
                    <div className="flex flex-wrap justify-end gap-1 ml-2">
                      {isOwn && badge('OWNER')}
                      {!isOwn && badge(cs.badge)}
                      {badge(o.pricingType === 'subscription' ? 'SUBSCRIPTION' : 'ONE-TIME')}
                      {pct > 0 && badge(`${pct}% OFF`)}
                    </div>
                  </div>

                  {/* Name */}
                  <h3 style={{ fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif', fontWeight: 600, fontSize: 18, lineHeight: 1.2, color: '#fff', marginBottom: 2, marginTop: 8, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {o.name}
                  </h3>

                  {/* Description */}
                  {o.description ? (
                    <p style={{ fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{o.description}</p>
                  ) : (
                    <p style={{ fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,0.28)', marginBottom: 16 }}>No description yet</p>
                  )}

                  {/* Footer — matches avatar card footer exactly */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.55)' }}>
                      <span style={{ fontFamily: '"Goudy Heavyface",Georgia,serif', fontSize: 16, color: '#fff' }}>
                        {pct > 0 && <span style={{ textDecoration: 'line-through', opacity: 0.35, marginRight: 4, fontSize: 13 }}>${price.toFixed(2)}</span>}
                        ${final_.toFixed(2)}
                      </span>
                      <span>USDC {o.pricingType === 'subscription' ? '/mo' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{fmtDate(p.purchase.purchaseDate)}</span>}
                      {cs.action === 'buy' && (
                        <button
                          disabled={purchasing === o.id}
                          onClick={(e) => { e.stopPropagation(); handlePurchase(o.id) }}
                          style={{ background: '#EAAA00', color: '#09073A', fontWeight: 700, fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', opacity: purchasing === o.id ? 0.45 : 1 }}
                        >
                          {purchasing === o.id ? 'Processing…' : 'Buy Now'}
                        </button>
                      )}
                      {cs.action === 'renew' && p && (
                        <button
                          disabled={renewingId === p.purchase.id}
                          onClick={(e) => { e.stopPropagation(); handleRenew(p.purchase.id, o.id) }}
                          style={{ background: '#EAAA00', color: '#09073A', fontWeight: 700, fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', opacity: renewingId === p.purchase.id ? 0.45 : 1 }}
                        >
                          {renewingId === p.purchase.id ? 'Renewing…' : 'Renew'}
                        </button>
                      )}
                      {cs.action === 'view' && <span style={{ color: '#EAAA00', fontSize: 12, fontWeight: 600 }}>Owned</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* ── Create New Offering tile — placed right after the last offering card,
              BEFORE pagination so it always appears at the end of the card grid ── */}
          <button
            onClick={() => router.push('/offerings/new')}
            style={{
              background: '#0A0D33', border: '1px dashed rgba(255,255,255,0.18)',
              borderRadius: 14, display: 'flex', flexDirection: 'column' as const,
              alignItems: 'center', justifyContent: 'center', gap: 12,
              minHeight: 240, cursor: 'pointer', transition: '160ms', width: '100%',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(234,170,0,0.5)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#1a2a5e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 300, lineHeight: 1, color: '#EAAA00', marginBottom: 4,
            }}>+</div>
            <div>
              <p style={{ fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif', color: '#fff', fontWeight: 700, fontSize: 16, margin: 0, textAlign: 'center' as const, letterSpacing: '-0.01em' }}>
                Create a new Offering
              </p>
              <p style={{ fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 5, textAlign: 'center' as const, fontWeight: 400 }}>
                Create and manage a new Offering.
              </p>
            </div>
          </button>

          {/* ── Pagination ── now placed after the Create card, so it always sits
              at the very bottom of the section, below all grid items ── */}
          {viewTotalPages > 1 && (() => {
            const btnBase: React.CSSProperties = {
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 38, padding: '0 20px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'rgba(255,255,255,0.65)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              fontFamily: '"Avenir","Avenir Next",ui-sans-serif,sans-serif',
            }
            const dis: React.CSSProperties = { ...btnBase, opacity: 0.25, cursor: 'not-allowed' }
            return (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 8 }}>
                <button style={pageSafe === 1 ? dis : btnBase} disabled={pageSafe === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{pageSafe} / {viewTotalPages}</span>
                <button style={pageSafe === viewTotalPages ? dis : btnBase} disabled={pageSafe === viewTotalPages} onClick={() => setPage(p => Math.min(viewTotalPages, p + 1))}>Next →</button>
              </div>
            )
          })()}

          {/* Empty state inside grid */}
          {filtered.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center' as const, padding: '48px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(234,170,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Icon icon="lucide:package" width={28} height={28} style={{ color: '#EAAA00' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>
                {filter === 'purchased' ? 'No purchases yet' : filter === 'buy' ? 'No new offerings available' : filter === 'created' ? 'You haven\'t created any offerings' : 'No offerings yet'}
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                {filter === 'purchased' ? 'Browse the Buy filter to find offerings.' : 'Click the card above to create one.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useAuth } from '@/lib/auth-context'
import {
    getOfferingById,
    getOfferingImages,
    listMyPurchases,
    getCreatorWallet,
    recordPurchase,
    recordRenewal,
    type Offering,
    type Purchase,
} from '@/lib/offerings-api'
import { transferUsdc } from '@/lib/usdc-transfer'

/* ──────────────────────────────────────────────────────────────────────────
   Offering Detail — premium full-page view of a single offering.

   Design language is intentionally identical to the Offerings list / Avatar
   cards: #0A0D33 cards, #EAAA00 accent, Goudy serif headings, Avenir body,
   14px radius, soft shadow. Nothing here introduces a new design system.
   ────────────────────────────────────────────────────────────────────────── */

const SERIF = '"Goudy Heavyface","Goudy Old Style",Georgia,serif'
const SANS = '"Avenir","Avenir Next",ui-sans-serif,sans-serif'
const CARD_SHADOW = '0 6px 20px rgba(3,1,27,0.45)'

const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return d }
}

/* ── Badge ─────────────────────────────────────────────────────────────── */
type BadgeStyle = { background: string; color: string; border?: string }
const BADGE: Record<string, BadgeStyle> = {
    OWNER: { background: '#EAAA00', color: '#09073A' },
    AVAILABLE: { background: 'rgba(0,235,117,0.15)', color: '#00EB75', border: '1px solid rgba(0,235,117,0.3)' },
    PURCHASED: { background: 'rgba(234,170,0,0.18)', color: '#EAAA00', border: '1px solid rgba(234,170,0,0.35)' },
    ACTIVE: { background: 'rgba(0,235,117,0.15)', color: '#00EB75', border: '1px solid rgba(0,235,117,0.3)' },
    EXPIRED: { background: 'rgba(255,58,58,0.12)', color: '#f87171', border: '1px solid rgba(255,58,58,0.25)' },
    'ONE-TIME': { background: 'rgba(3,204,217,0.12)', color: '#03CCD9', border: '1px solid rgba(3,204,217,0.25)' },
    SUBSCRIPTION: { background: 'rgba(236,0,140,0.12)', color: '#EC008C', border: '1px solid rgba(236,0,140,0.25)' },
    DISCOUNT: { background: 'rgba(0,235,117,0.12)', color: '#00EB75', border: '1px solid rgba(0,235,117,0.25)' },
}
function Badge({ label }: { label: string }) {
    const s = BADGE[label.toUpperCase()] ?? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }
    return (
        <span style={{
            background: s.background, color: s.color, border: s.border,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999,
            whiteSpace: 'nowrap', lineHeight: 1, display: 'inline-block',
        }}>{label}</span>
    )
}

/* ── ImageGallery ──────────────────────────────────────────────────────── */
function ImageGallery({ images, name }: { images: string[]; name: string }) {
    const [sel, setSel] = useState(0)
    const has = images.length > 0

    return (
        <div className="od-fade">
            <div
                className="od-zoom"
                style={{
                    position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden',
                    background: '#100E59', border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: CARD_SHADOW, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                {has ? (
                    <>
                        {/* Blurred backdrop fills the frame so the full image can sit uncropped on top */}
                        <img
                            key={`bg-${images[sel]}`}
                            src={images[sel]}
                            alt=""
                            aria-hidden
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(34px) brightness(0.55)', transform: 'scale(1.15)' }}
                        />
                        {/* Full image — always fully visible (contain) */}
                        <img
                            key={images[sel]}
                            src={images[sel]}
                            alt={name}
                            className="od-zoom-img od-fade"
                            style={{ position: 'relative', zIndex: 1, maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                        />
                    </>
                ) : (
                    <span style={{ fontSize: 46, color: '#EAAA00', opacity: 0.3 }}>✦</span>
                )}
            </div>

            {images.length > 1 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                    {images.slice(0, 6).map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setSel(i)}
                            className="od-thumb"
                            style={{
                                width: 76, height: 56, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', padding: 0,
                                border: i === sel ? '2px solid #EAAA00' : '2px solid rgba(255,255,255,0.12)',
                                opacity: i === sel ? 1 : 0.55, background: '#100E59',
                                transition: 'opacity 160ms, border-color 160ms, transform 160ms',
                            }}
                        >
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

/* ── PriceCard ─────────────────────────────────────────────────────────── */
function PriceCard({ price, final_, pct, isSub }: { price: number; final_: number; pct: number; isSub: boolean }) {
    return (
        <div style={{ background: '#0E0C3A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 20, boxShadow: CARD_SHADOW }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: '0 0 8px' }}>Current price</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: SERIF, fontSize: 38, lineHeight: 1, color: '#fff' }}>${final_.toFixed(2)}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>USDC{isSub ? ' / month' : ''}</span>
                {pct > 0 && (
                    <span style={{ fontFamily: SERIF, fontSize: 18, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>${price.toFixed(2)}</span>
                )}
            </div>
            {pct > 0 && (
                <p style={{ fontSize: 12.5, color: '#00EB75', margin: '10px 0 0', fontWeight: 600 }}>
                    You save ${(price - final_).toFixed(2)} ({pct}% off)
                </p>
            )}
        </div>
    )
}

export default function OfferingDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { user, token } = useAuth() as { user: any; token: string | null }

    const [offering, setOffering] = useState<Offering | null>(null)
    const [purchase, setPurchase] = useState<Purchase | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [purchasing, setPurchasing] = useState(false)
    const [renewing, setRenewing] = useState(false)
    const [msg, setMsg] = useState('')

    const id = params?.id as string

    const loadData = useCallback(async () => {
        if (!id) return
        setLoading(true)
        setError('')
        try {
            const [o, purchases] = await Promise.all([
                getOfferingById(id, token),
                listMyPurchases(token).catch(() => []),
            ])
            setOffering(o)
            // Keep the most recent purchase for this offering (renewals create new rows).
            const p = purchases
                .filter((p: Purchase) => p.purchase.offeringId === id)
                .sort((a: Purchase, b: Purchase) =>
                    new Date(b.purchase.purchaseDate).getTime() - new Date(a.purchase.purchaseDate).getTime())[0]
            setPurchase(p || null)
        } catch (e: any) {
            setError(e?.message || 'Failed to load offering')
        } finally {
            setLoading(false)
        }
    }, [id, token])

    useEffect(() => { loadData() }, [loadData])

    // Two-step payment — Step 1: Buyer → Creator Frost Wallet (creator %),
    // Step 2: Buyer → Admin Frost Wallet (lineage custody). Matches the list page.
    async function handlePurchase() {
        if (!offering || purchasing) return
        setPurchasing(true)
        setMsg('')
        setError('')
        try {
            const info = await getCreatorWallet(offering.id, token)
            if (!info.creatorWallet) throw new Error('Creator has no wallet')
            if (!user?.wallet) throw new Error('You need a wallet to purchase')

            const price = parseFloat(info.price)
            const offerPct = parseFloat(info.offerPercentage || '0')
            const finalPrice = offerPct > 0 ? price * (1 - offerPct / 100) : price

            const lineagePct = (info as any).lineagePct ?? 40
            const creatorPct = 100 - lineagePct
            const creatorAmount = parseFloat((finalPrice * creatorPct / 100).toFixed(6))
            const lineageAmount = parseFloat((finalPrice * lineagePct / 100).toFixed(6))

            const creatorTx = await transferUsdc(user.wallet, info.creatorWallet, creatorAmount, token)

            let lineageTxId: string | undefined
            const adminWallet = (info as any).adminLineageWallet
            if (adminWallet && lineageAmount > 0) {
                lineageTxId = await transferUsdc(user.wallet, adminWallet, lineageAmount, token)
            }

            await recordPurchase(offering.id, creatorTx, finalPrice, token, lineageTxId)
            setMsg('Purchase successful!')
            loadData()
        } catch (e: any) {
            setError(e?.message || 'Purchase failed')
        } finally {
            setPurchasing(false)
        }
    }

    async function handleRenew() {
        if (!offering || !purchase || renewing) return
        setRenewing(true)
        setMsg('')
        setError('')
        try {
            const info = await getCreatorWallet(offering.id, token)
            if (!info.creatorWallet) throw new Error('Creator has no wallet')
            if (!user?.wallet) throw new Error('You need a wallet to renew')

            const price = parseFloat(info.price)
            const offerPct = parseFloat(info.offerPercentage || '0')
            const finalPrice = offerPct > 0 ? price * (1 - offerPct / 100) : price

            const lineagePct = (info as any).lineagePct ?? 40
            const creatorPct = 100 - lineagePct
            const creatorAmount = parseFloat((finalPrice * creatorPct / 100).toFixed(6))
            const lineageAmount = parseFloat((finalPrice * lineagePct / 100).toFixed(6))

            const creatorTx = await transferUsdc(user.wallet, info.creatorWallet, creatorAmount, token)

            let lineageTxId: string | undefined
            const adminWallet = (info as any).adminLineageWallet
            if (adminWallet && lineageAmount > 0) {
                lineageTxId = await transferUsdc(user.wallet, adminWallet, lineageAmount, token)
            }

            await recordRenewal(purchase.purchase.id, creatorTx, finalPrice, token, lineageTxId)
            setMsg('Renewed successfully!')
            loadData()
        } catch (e: any) {
            setError(e?.message || 'Renewal failed')
        } finally {
            setRenewing(false)
        }
    }

    /* ── loading / error / empty ── */
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <style>{`@keyframes od-spin{to{transform:rotate(360deg)}}`}</style>
                <div style={{ textAlign: 'center' }}>
                    <Icon icon="lucide:loader-2" width={28} height={28} style={{ color: '#EAAA00', animation: 'od-spin 1s linear infinite' }} />
                    <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 14 }}>Loading offering…</p>
                </div>
            </div>
        )
    }
    if (error && !offering) {
        return (
            <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
                <Icon icon="lucide:alert-circle" width={40} height={40} style={{ color: '#f87171', marginBottom: 16 }} />
                <p style={{ color: '#f87171', fontSize: 15, marginBottom: 20 }}>{error}</p>
                <button onClick={() => router.push('/offerings')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 20px', color: '#fff', cursor: 'pointer', fontSize: 14 }}>← Back to Offerings</button>
            </div>
        )
    }
    if (!offering) return null

    /* ── derived ── */
    const images = getOfferingImages(offering)
    const price = parseFloat(offering.price)
    const pct = parseFloat(offering.offerPercentage || '0')
    const final_ = pct > 0 ? +(price * (1 - pct / 100)).toFixed(2) : price
    const isOwn = offering.creatorId === user?.id
    const isSub = offering.pricingType === 'subscription'
    const hasPurchase = !!purchase
    const isExpired = purchase?.purchase.expiryDate ? new Date(purchase.purchase.expiryDate) < new Date() : false
    const canBuy = !isOwn && !hasPurchase

    const primaryBtn: React.CSSProperties = {
        background: '#EAAA00', color: '#09073A', fontWeight: 700, fontSize: 15,
        padding: '13px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontFamily: SANS, width: '100%', transition: 'transform 140ms, box-shadow 140ms, opacity 140ms',
    }

    return (
        <div style={{ width: '100%', padding: '0 4px 96px', fontFamily: SANS, color: '#fff' }}>
            {/* Scoped styles: responsive grid, animations, hover, mobile bar */}
            <style>{`
                @keyframes odFade { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
                .od-fade { animation: odFade .5s cubic-bezier(.4,0,.2,1) both; }
                .od-grid {
                    display: grid; gap: 32px; align-items: start;
                    grid-template-columns: 45% 1fr;
                    grid-template-areas: "gallery info" "desc info";
                }
                .od-gallery { grid-area: gallery; }
                .od-info    { grid-area: info; position: sticky; top: 16px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
                .od-desc    { grid-area: desc; margin-top: 4px; max-width: 720px; }
                @media (max-width: 1024px) {
                    .od-grid { grid-template-columns: 58% 1fr; gap: 24px; }
                }
                @media (max-width: 768px) {
                    .od-grid { grid-template-columns: 1fr; grid-template-areas: "gallery" "info" "desc"; gap: 22px; }
                    .od-info { position: static; }
                }
                .od-zoom-img { transition: transform 500ms cubic-bezier(.2,0,.2,1); }
                .od-zoom:hover .od-zoom-img { transform: scale(1.05); }
                .od-thumb:hover { transform: translateY(-2px); opacity: 1 !important; }
                .od-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(234,170,0,0.35); }
                .od-primary:disabled { opacity: .5; cursor: default; transform: none; box-shadow: none; }
                .od-mobile-buy { display: none; }
                @media (max-width: 768px) {
                    .od-mobile-buy {
                        display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
                        align-items: center; gap: 12px; padding: 12px 16px;
                        background: rgba(9,7,58,0.92); backdrop-filter: blur(10px);
                        border-top: 1px solid rgba(255,255,255,0.12);
                    }
                }
            `}</style>

            {/* Back */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                <span onClick={() => router.push('/offerings')} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, cursor: 'pointer', fontFamily: SANS }}>Offerings</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 700 }}>›</span>
                <span style={{ color: '#fff', fontSize: 13, fontFamily: SANS }}>
  {offering?.name 
    ? offering.name.length > 20 
      ? offering.name.slice(0, 15) + '...' 
      : offering.name 
    : 'Details'}
</span>
            </div>

            <div className="od-grid">
                {/* ── Gallery (left) ── */}
                <div className="od-gallery">
                    <ImageGallery images={images} name={offering.name} />
                </div>

                {/* ── Info + purchase (right, sticky) ── */}
                <div className="od-info od-fade">
                    {/* Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {isOwn && <Badge label="Your Offering" />}
                        {!isOwn && hasPurchase && !isExpired && <Badge label="Purchased" />}
                        {!isOwn && !hasPurchase && <Badge label="Available" />}
                        <Badge label={isSub ? 'Subscription' : 'One-time'} />
                        {pct > 0 && <Badge label={`${pct}% OFF`} />}
                        {isExpired && <Badge label="Expired" />}
                    </div>

                    {/* Title */}
                    <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 30, lineHeight: 1.12, color: '#fff', margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0 }}>
                        {offering.name}
                    </h1>

                    <PriceCard price={price} final_={final_} pct={pct} isSub={isSub} />

                    {/* Purchase card */}
                    <div style={{ background: '#0A0D33', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 18, boxShadow: CARD_SHADOW }}>
                        {canBuy && (
                            <button className="od-primary" disabled={purchasing} onClick={handlePurchase} style={primaryBtn}>
                                {purchasing ? 'Processing…' : `Buy Now — $${final_.toFixed(2)} USDC`}
                            </button>
                        )}
                        {!isOwn && hasPurchase && isSub && isExpired && (
                            <button className="od-primary" disabled={renewing} onClick={handleRenew} style={primaryBtn}>
                                {renewing ? 'Renewing…' : 'Renew Subscription'}
                            </button>
                        )}
                        {!isOwn && hasPurchase && !isExpired && (
                            <div style={{ ...primaryBtn, background: 'rgba(0,235,117,0.14)', color: '#00EB75', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'default' }}>
                                <Icon icon="lucide:check-circle" width={16} height={16} /> You own this
                            </div>
                        )}
                        {isOwn && (
                            <div style={{ ...primaryBtn, background: 'rgba(234,170,0,0.14)', color: '#EAAA00', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'default' }}>
                                <Icon icon="lucide:crown" width={16} height={16} /> This is your offering
                            </div>
                        )}

                        {msg && <p style={{ color: '#00EB75', fontSize: 13, margin: '12px 0 0', textAlign: 'center' }}>{msg}</p>}
                        {error && <p style={{ color: '#f87171', fontSize: 13, margin: '12px 0 0', textAlign: 'center' }}>{error}</p>}
                    </div>

                    {/* Purchase receipt (if owned) */}
                    {purchase && (
                        <div style={{ background: 'rgba(234,170,0,0.06)', border: '1px solid rgba(234,170,0,0.2)', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EAAA00', marginBottom: 8 }}>Your purchase</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 13 }}>
                                <div><span style={{ color: 'rgba(255,255,255,0.45)' }}>Purchased:</span> <span style={{ color: '#fff' }}>{fmtDate(purchase.purchase.purchaseDate)}</span></div>
                                <div><span style={{ color: 'rgba(255,255,255,0.45)' }}>Paid:</span> <span style={{ color: '#fff' }}>${parseFloat(purchase.purchase.amountPaid).toFixed(2)}</span></div>
                                {purchase.purchase.expiryDate && (
                                    <div><span style={{ color: 'rgba(255,255,255,0.45)' }}>Expires:</span> <span style={{ color: isExpired ? '#f87171' : '#fff' }}>{fmtDate(purchase.purchase.expiryDate)}</span></div>
                                )}
                                <div><span style={{ color: 'rgba(255,255,255,0.45)' }}>Status:</span> <span style={{ color: '#fff' }}>{purchase.purchase.status}</span></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Mobile sticky buy bar ── */}
            {canBuy && (
                <div className="od-mobile-buy">
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Total</p>
                        <p style={{ margin: 0, fontFamily: SERIF, fontSize: 18, color: '#fff' }}>${final_.toFixed(2)} USDC{isSub ? '/mo' : ''}</p>
                    </div>
                    <button className="od-primary" disabled={purchasing} onClick={handlePurchase} style={{ ...primaryBtn, width: 'auto', padding: '12px 24px' }}>
                        {purchasing ? 'Processing…' : 'Buy Now'}
                    </button>
                </div>
            )}
        </div>
    )
}

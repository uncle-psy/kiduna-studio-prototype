'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createOffering } from '@/lib/offerings-api'
import { uploadImages } from '@/lib/firebase'

const MAX_IMAGES = 5
const MAX_MB = 1
const NAME_MAX = 60
const DESC_MAX = 500
// Detects emoji / pictographic "smiley" characters so they can be rejected.
const EMOJI_RE = /\p{Extended_Pictographic}/u

/* ─────────────────────────────────────────────────────────────────────────
   New Offering — multi-image gallery upload (up to 5 images)
   ───────────────────────────────────────────────────────────────────────── */

export default function NewOfferingPage() {
  const router = useRouter()
  const { token } = useAuth() as { token: string | null }
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Form state ───────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [pricing, setPricing] = useState<'one-time' | 'subscription'>('one-time')
  const [price, setPrice] = useState('')
  const [offer, setOffer] = useState('')

  // ── Multi-image state ─────────────────────────────────────────────
  // Each entry: { preview (blob URL), file (File object) }
  const [images, setImages] = useState<{ preview: string; file: File }[]>([])
  const [activeIdx, setActiveIdx] = useState(0)

  // ── Status ────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Image handlers ────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`)
      return
    }

    const toAdd = files.slice(0, remaining)
    const sizeErr = toAdd.find(f => f.size > MAX_MB * 1024 * 1024)
    if (sizeErr) {
      setError(`"${sizeErr.name}" exceeds the ${MAX_MB} MB limit `)
      e.target.value = ''
      return
    }

    const newEntries = toAdd.map(f => ({ preview: URL.createObjectURL(f), file: f }))
    setImages(prev => {
      const next = [...prev, ...newEntries]
      setActiveIdx(next.length - 1)
      return next
    })
    setError('')
    e.target.value = ''
  }

  function removeImage(idx: number) {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      const next = prev.filter((_, i) => i !== idx)
      setActiveIdx(Math.min(activeIdx, Math.max(0, next.length - 1)))
      return next
    })
  }

  function prev() { setActiveIdx(i => (i > 0 ? i - 1 : images.length - 1)) }
  function next() { setActiveIdx(i => (i < images.length - 1 ? i + 1 : 0)) }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    if (EMOJI_RE.test(name)) { setError('Name can’t contain emojis'); return }
    if (name.trim().length > NAME_MAX) { setError(`Name must be ${NAME_MAX} characters or fewer`); return }
    if (!desc.trim()) { setError('Description is required'); return }
    if (EMOJI_RE.test(desc)) { setError('Description can’t contain emojis'); return }
    if (desc.trim().length > DESC_MAX) { setError(`Description must be ${DESC_MAX} characters or fewer`); return }
    if (!price || parseFloat(price) <= 0) { setError('Price must be greater than 0'); return }
    const offerPct = offer ? parseFloat(offer) : 0
    if (Number.isNaN(offerPct) || offerPct < 0 || offerPct > 100) { setError('Offer percentage must be between 0 and 100'); return }

    setSaving(true)
    try {
      let imageUrls: string[] = []
      if (images.length > 0) {
        setUploading(true)
        imageUrls = await uploadImages(images.map(i => i.file))
        setUploading(false)
      }

      await createOffering({
        name: name.trim(),
        description: desc.trim(),
        pricingType: pricing,
        price: parseFloat(price),
        offerPercentage: offerPct,
        image: imageUrls[0],
        images: imageUrls,
      }, token)

      router.push('/offerings')
    } catch (e: any) {
      setUploading(false)
      setError(e?.message || 'Failed to create offering')
    }
    setSaving(false)
  }

  const canAddMore = images.length < MAX_IMAGES
  const btnLabel = uploading
    ? `Uploading ${images.length} image${images.length !== 1 ? 's' : ''}…`
    : saving ? 'Creating…' : 'Create Offering'

  return (
    <div className="w-full py-6 px-4">
      <div className="max-w-[680px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[0.68rem] tracking-[0.16em] uppercase text-accent font-bold mb-1">Economics</p>
            <h2 className="text-[1.6rem] font-display italic text-white m-0 leading-none">New Offering</h2>
            <p className="text-muted text-[0.82rem] mt-1">Create something for the network to buy.</p>
          </div>
          <button onClick={() => router.push('/offerings')}
            className="font-sans font-bold text-[0.78rem] px-4 py-2 rounded-lg border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer">
            Cancel
          </button>
        </div>

        {/* Form card */}
        <div className="bg-surface border border-card-border rounded-[14px] p-6 mt-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* ── Multi-image upload ─────────────────────────────────── */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[0.68rem] tracking-[0.08em] uppercase font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Images <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({images.length}/{MAX_IMAGES})</span>
              </label>
              {canAddMore && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-[0.72rem] font-bold px-3 py-1 rounded-md transition-colors cursor-pointer"
                  style={{ background: 'rgba(234,170,0,0.12)', border: '1px solid rgba(234,170,0,0.35)', color: '#EAAA00' }}>
                  + Add image
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Gallery preview */}
            {images.length === 0 ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
                style={{ height: 220, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25, color: '#EAAA00' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                  </svg>
                <div className="text-muted text-sm">Click to upload images</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Up to {MAX_IMAGES} images · max {MAX_MB} MB each</div>
              </div>
            ) : (
              <>
                {/* Main preview with nav arrows */}
                <div className="relative" style={{ borderRadius: 14, overflow: 'hidden', background: '#100E59', height: 260 }}>
                  <img
                    key={images[activeIdx].preview}
                    src={images[activeIdx].preview}
                    alt={`Preview ${activeIdx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', transition: 'opacity 180ms' }}
                  />

                  {/* Arrow navigation */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
                        style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 16, backdropFilter: 'blur(4px)' }}>
                        ‹
                      </button>
                      <button
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
                        style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 16, backdropFilter: 'blur(4px)' }}>
                        ›
                      </button>
                    </>
                  )}

                  {/* Image counter badge */}
                  <div className="absolute top-2 right-2" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '3px 9px', fontSize: 11, color: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(4px)' }}>
                    {activeIdx + 1} / {images.length}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeImage(activeIdx)}
                    className="absolute top-2 left-2 flex items-center justify-center cursor-pointer"
                    style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(248,113,113,0.85)', border: 'none', color: '#fff', fontSize: 14, backdropFilter: 'blur(4px)' }}>
                    ×
                  </button>
                </div>

                {/* Thumbnail strip */}
                <div className="flex gap-2 mt-2" style={{ overflowX: 'auto', paddingBottom: 2 }}>
                  {images.map((img, i) => (
                    <button
                      key={img.preview}
                      onClick={() => setActiveIdx(i)}
                      className="flex-shrink-0 cursor-pointer transition-all"
                      style={{
                        width: 56, height: 56, borderRadius: 8, overflow: 'hidden', padding: 0,
                        border: `2px solid ${i === activeIdx ? '#EAAA00' : 'rgba(255,255,255,0.15)'}`,
                        opacity: i === activeIdx ? 1 : 0.65,
                      }}>
                      <img src={img.preview} alt={`thumb ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}

                  {/* Add more thumbnail */}
                  {canAddMore && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex-shrink-0 cursor-pointer flex items-center justify-center"
                      style={{ width: 56, height: 56, borderRadius: 8, border: '1px dashed rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', fontSize: 22 }}>
                      +
                    </button>
                  )}
                </div>

                {/* Dot indicators */}
                {images.length > 1 && (
                  <div className="flex gap-1.5 justify-center mt-2">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className="cursor-pointer transition-all"
                        style={{ width: i === activeIdx ? 18 : 6, height: 6, borderRadius: 3, padding: 0, border: 'none', background: i === activeIdx ? '#EAAA00' : 'rgba(255,255,255,0.25)', transition: 'width 200ms, background 200ms' }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-[0.68rem] tracking-[0.08em] uppercase font-bold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Name <span className="text-accent">*</span>
            </label>
            <input type="text" placeholder="e.g. Appalachian Roast — 12 oz" value={name} maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors" />
            <div className="flex items-center justify-between mt-1.5 gap-2">
              <span className="text-[0.72rem]" style={{ color: '#f87171' }}>
                {EMOJI_RE.test(name) ? 'Emojis aren’t allowed in the name.' : ''}
              </span>
              <span className="text-[0.72rem] flex-shrink-0" style={{ color: name.length >= NAME_MAX ? '#fff' : 'rgba(255,255,255,0.4)' }}>{name.length}/{NAME_MAX}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-[0.68rem] tracking-[0.08em] uppercase font-bold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Description <span className="text-accent">*</span>
            </label>
            <textarea rows={3} placeholder="What the buyer gets." value={desc} maxLength={DESC_MAX}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors resize-y" />
            <div className="flex items-center justify-between mt-1.5 gap-2">
              <span className="text-[0.72rem]" style={{ color: '#f87171' }}>
                {EMOJI_RE.test(desc) ? 'Emojis aren’t allowed in the description.' : ''}
              </span>
              <span className="text-[0.72rem] flex-shrink-0" style={{ color: desc.length >= DESC_MAX ? '#fff' : 'rgba(255,255,255,0.4)' }}>{desc.length}/{DESC_MAX}</span>
            </div>
          </div>

          {/* Pricing type */}
          <div className="mb-4">
            <label className="block text-[0.68rem] tracking-[0.08em] uppercase font-bold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Pricing type</label>
            <div className="flex gap-2">
              {([['one-time', 'One-time'], ['subscription', 'Subscription (1 Month)']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setPricing(val as any)}
                  className="text-[0.78rem] font-bold px-4 py-2 rounded-full border transition-colors cursor-pointer"
                  style={{ borderColor: pricing === val ? 'rgba(234,170,0,0.5)' : 'rgba(255,255,255,0.12)', background: pricing === val ? 'rgba(234,170,0,0.14)' : 'rgba(3,1,27,1)', color: pricing === val ? '#EAAA00' : 'rgba(255,255,255,0.6)' }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Price + Offer */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[0.68rem] tracking-[0.08em] uppercase font-bold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Price (USDC) <span className="text-accent">*</span>
              </label>
              <input type="text" inputMode="decimal" placeholder="0.00" value={price}
                onChange={(e) => {
                  const v = e.target.value
                  // Allow up to 9 digits before the decimal and 2 after; block anything else.
                  if (v === '' || /^\d{0,9}(\.\d{0,2})?$/.test(v)) setPrice(v)
                }}
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors" />
            </div>
            <div>
              <label className="block text-[0.68rem] tracking-[0.08em] uppercase font-bold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Offer percentage (%)</label>
              <input type="number" placeholder="0" min="0" max="100" value={offer}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') { setOffer(''); return }
                  const n = parseFloat(v)
                  if (Number.isNaN(n)) return
                  setOffer(String(Math.min(100, Math.max(0, n))))
                }}
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSubmit} disabled={saving}
              className="font-sans font-bold text-[0.88rem] px-6 py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              style={{ background: '#EAAA00', color: '#09073A' }}>
              {btnLabel}
            </button>
            <button onClick={() => router.push('/offerings')}
              className="font-sans font-bold text-[0.88rem] px-6 py-3 rounded-lg border border-card-border text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
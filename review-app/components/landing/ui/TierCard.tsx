'use client'

import ButtonGold from './ButtonGold'
import ButtonGhost from './ButtonGhost'

export default function TierCard({
  name,
  price,
  priceNote,
  features,
  href,
  featured = false,
  ribbon,
  onSelect,
  loading = false,
  disabled = false,
}: {
  name: string
  price: string
  priceNote: string
  features: string[]
  href: string
  featured?: boolean
  ribbon?: string
  onSelect?: () => void
  loading?: boolean
  disabled?: boolean
}) {
  const isActive = ribbon === 'Active'
  const isIncluded = ribbon === 'Included'

  const cardClass = featured || isActive
    ? 'border-[rgba(234,170,0,0.4)] shadow-[0_0_0_1px_rgba(234,170,0,0.40),0_8px_28px_rgba(234,170,0,0.20)]'
    : 'border-border'

  const cardBg = featured || isActive
    ? 'linear-gradient(180deg, rgba(234,170,0,0.12), transparent 70%), #0A0D33'
    : undefined

  // CTA button logic
  let cta
  if (isActive) {
    cta = (
      <div className="w-full text-center py-3 rounded-[4px] bg-[rgba(234,170,0,0.15)] text-accent font-bold text-[0.95rem] border border-[rgba(234,170,0,0.3)]">
        Current plan
      </div>
    )
  } else if (isIncluded) {
    cta = (
      <div className="w-full text-center py-3 rounded-[4px] bg-[rgba(255,255,255,0.05)] text-muted font-bold text-[0.95rem] border border-border">
        Included in your plan
      </div>
    )
  } else if (onSelect) {
    cta = (
      <button
        onClick={onSelect}
        disabled={loading || disabled}
        className={`w-full font-sans font-bold text-center rounded-[4px] text-[0.95rem] px-6 py-3 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          featured
            ? 'bg-accent text-on-accent hover:bg-accent-hover'
            : 'border border-border-strong text-white hover:border-white'
        }`}
      >
        {loading ? 'Processing…' : 'Upgrade'}
      </button>
    )
  } else {
    cta = featured ? (
      <ButtonGold href={href} className="w-full">Get started</ButtonGold>
    ) : (
      <ButtonGhost href={href} className="w-full">Get started</ButtonGhost>
    )
  }

  return (
    <div
      className={`bg-surface border rounded-[14px] px-[26px] py-[30px] flex flex-col ${cardClass}`}
      style={cardBg ? { background: cardBg } : undefined}
    >
      {ribbon && (
        <span
          className={`self-start text-[0.64rem] tracking-[0.16em] uppercase font-bold px-[0.7rem] py-[0.25rem] rounded-full mb-4 ${
            isActive
              ? 'bg-accent text-on-accent'
              : isIncluded
              ? 'bg-[rgba(255,255,255,0.1)] text-muted'
              : 'bg-accent text-on-accent'
          }`}
        >
          {ribbon}
        </span>
      )}

      <h3 className="font-display font-normal text-white text-[1.6rem] m-0 mb-[0.3rem]">
        {name}
      </h3>

      <div className="font-display text-[1.3rem] text-white">
        {price}
        <small className="block font-sans font-normal text-muted text-[0.85rem]">
          {priceNote}
        </small>
      </div>

      <ul className="list-none p-0 my-5 flex-1">
        {features.map((f, i) => (
          <li
            key={i}
            className="relative pl-6 my-[0.55rem] text-muted text-[0.94rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-bold"
          >
            {f}
          </li>
        ))}
      </ul>

      {cta}
    </div>
  )
}

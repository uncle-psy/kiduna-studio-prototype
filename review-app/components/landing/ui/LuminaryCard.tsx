'use client'

import ButtonGold from './ButtonGold'

export default function LuminaryCard({
  features,
  href,
  onSelect,
  loading = false,
  isActive = false,
}: {
  features: string[]
  href: string
  onSelect?: () => void
  loading?: boolean
  isActive?: boolean
}) {
  const cta = isActive ? (
    <div className="w-full text-center py-3 rounded-[4px] bg-[rgba(234,170,0,0.15)] text-accent font-bold text-[0.95rem] border border-[rgba(234,170,0,0.3)]">
      Current plan
    </div>
  ) : onSelect ? (
    <button
      onClick={onSelect}
      disabled={loading}
      className="w-full font-sans font-bold text-center rounded-[4px] text-[0.95rem] px-6 py-3 bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? 'Processing…' : 'Get started'}
    </button>
  ) : (
    <ButtonGold href={href} className="w-full">
      Get started
    </ButtonGold>
  )

  return (
    <div
      className="mt-4 border border-[rgba(234,170,0,0.4)] rounded-[14px] px-[26px] py-[30px] shadow-[0_0_0_1px_rgba(234,170,0,0.40),0_8px_28px_rgba(234,170,0,0.20)]"
      style={{
        background:
          'linear-gradient(180deg, rgba(234,170,0,0.12), transparent 70%), #0A0D33',
      }}
    >
      <div className="grid grid-cols-[0.8fr_1.6fr] gap-[30px] items-center max-md:grid-cols-1 max-md:gap-[18px]">
        {/* Left — name + price + CTA */}
        <div>
          <h3 className="font-display font-normal text-white text-[1.6rem] m-0 mb-[0.3rem]">
            Luminary
          </h3>
          <div className="font-display text-[1.3rem] text-white mt-[0.4rem]">
            $1,000,000
            <small className="block font-sans font-normal text-muted text-[0.85rem]">
              one-time payment
            </small>
          </div>
          <p className="text-muted text-[0.94rem] mt-4 mb-5">
            Everything in Catalyst
          </p>
          {cta}
        </div>

        {/* Right — feature list */}
        <ul className="list-none p-0 m-0">
          {features.map((f, i) => (
            <li
              key={i}
              className="relative pl-6 my-[0.55rem] text-muted text-[0.94rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-bold"
            >
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

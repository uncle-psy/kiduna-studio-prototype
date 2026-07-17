import type { ReactNode } from 'react'
import LandingHeader from './LandingHeader'
import LandingFooter from './LandingFooter'
import Eyebrow from './ui/Eyebrow'
import DisplayHeading from './ui/DisplayHeading'
import GoldEmphasis from './ui/GoldEmphasis'
import SectionWrapper from './ui/SectionWrapper'
import SectionHead from './ui/SectionHead'
import ButtonGold from './ui/ButtonGold'
import ButtonGhost from './ui/ButtonGhost'
import RidgeMotif from './ui/RidgeMotif'
import type { AlliesPageConfig } from '@/lib/allies-data'

export default function AlliesPageTemplate({
  config: c,
  children,
}: {
  config: AlliesPageConfig
  children: ReactNode
}) {
  return (
    <>
      <LandingHeader />

      {/* ── Page Hero ── */}
      <section
        className="relative overflow-hidden pt-[68px] pb-[56px]"
        style={{
          background: `
            radial-gradient(900px 360px at 90% -20%, rgba(234,170,0,0.20), transparent 55%),
            radial-gradient(600px 420px at -8% 70%, rgba(3,204,217,0.12), transparent 60%),
            linear-gradient(135deg, #100E59, #09073A 80%)
          `,
        }}
      >
        <div className="w-full max-w-[1180px] mx-auto px-6 relative z-[2]">
          <Eyebrow className="mb-5">{c.heroEyebrow}</Eyebrow>
          <DisplayHeading as="h1">
            {c.heroTitle} <GoldEmphasis>{c.heroEmphasis}</GoldEmphasis>
          </DisplayHeading>
          <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55] mb-8">
            {c.heroLede}
          </p>
          <div className="flex flex-wrap gap-3">
            {c.heroCtas.map((cta) =>
              cta.style === 'gold' ? (
                <ButtonGold key={cta.label} size="lg" href={cta.href}>{cta.label}</ButtonGold>
              ) : (
                <ButtonGhost key={cta.label} size="lg" href={cta.href}>{cta.label}</ButtonGhost>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── Directory Section ── */}
      <SectionWrapper style={{ paddingTop: 28 }}>
        {c.dirTitle && (
          <SectionHead
            eyebrow={c.dirEyebrow}
            title={<>{c.dirTitle} <GoldEmphasis>{c.dirEmphasis}</GoldEmphasis></>}
            lede={c.dirLede}
          />
        )}

        {/* Toolbar */}
        <div className="mb-[18px]">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex-[1_1_280px] relative">
              <span className="absolute left-[0.85rem] top-1/2 -translate-y-1/2 text-dim pointer-events-none" aria-hidden="true">⌕</span>
              <input
                type="search"
                readOnly
                tabIndex={-1}
                placeholder={c.dirSearch}
                className="w-full py-[0.72rem] pr-4 pl-[2.4rem] rounded-[8px] bg-surface border border-border text-white font-sans text-[0.98rem] cursor-default focus:outline-none"
              />
            </div>
            <span className="text-[0.7rem] tracking-[0.14em] uppercase text-dim font-bold">Sort</span>
            <div className="flex flex-wrap gap-2">
              {c.dirSort.map((s, i) => (
                <button
                  key={s}
                  className={`font-sans font-bold text-[0.84rem] py-2 px-[0.9rem] rounded-full border cursor-pointer transition-all duration-150 ${
                    i === 0
                      ? 'bg-[rgba(234,170,0,0.08)] border-[rgba(234,170,0,0.5)] text-accent'
                      : 'bg-surface border-border text-muted hover:border-border-strong hover:text-white'
                  }`}
                >
                  {s}{i === 0 && ' ↓'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card grid — injected via children */}
        {children}

        <p className="mt-5 text-[0.82rem] text-muted">{c.footnote}</p>
      </SectionWrapper>

      {/* ── CTA Band (optional per page) ── */}
      {c.hasCta && (
        <section
          className="text-center py-[88px] relative overflow-hidden"
          style={{
            background: `
              radial-gradient(900px 380px at 50% -20%, rgba(234,170,0,0.20), transparent 60%),
              linear-gradient(135deg, #100E59, #09073A 80%)
            `,
          }}
        >
          <div className="w-full max-w-[1180px] mx-auto px-6 relative z-[2]">
            {c.ctaEyebrow && <Eyebrow className="text-center mb-4">{c.ctaEyebrow}</Eyebrow>}
            <DisplayHeading as="h2" className="max-w-[22ch] mx-auto">
              {c.ctaTitle} <GoldEmphasis>{c.ctaEmphasis}</GoldEmphasis>
            </DisplayHeading>
            <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55] mx-auto mb-8">
              {c.ctaLede}
            </p>
            <ButtonGold size="lg" href={c.ctaButtonHref}>{c.ctaButton}</ButtonGold>
          </div>
          <RidgeMotif />
        </section>
      )}

      <LandingFooter />
    </>
  )
}
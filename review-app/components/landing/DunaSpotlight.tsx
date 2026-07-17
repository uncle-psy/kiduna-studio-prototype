import Image from 'next/image'
import SectionWrapper from './ui/SectionWrapper'
import SectionHead from './ui/SectionHead'
import ButtonGold from './ui/ButtonGold'
import ButtonGhost from './ui/ButtonGhost'
import StarDivider from './ui/StarDivider'
import { SPOTLIGHT_DUNA } from '@/lib/landing-data'

export default function DunaSpotlight() {
  const d = SPOTLIGHT_DUNA

  return (
    <SectionWrapper style={{ paddingTop: 0 }}>
      <SectionHead
        eyebrow={
          <>
            DUNAs in Motion <StarDivider /> Check this out!
          </>
        }
        title="DUNA of the Day"
      />

      <div
        className="grid grid-cols-[1.1fr_0.9fr] max-md:grid-cols-1 border border-border rounded-[14px] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #100E59, #0A0D33)',
        }}
      >
        {/* Text panel */}
        <div className="px-10 py-[42px] max-sm:px-[22px] max-sm:py-7">
          <span className="text-accent font-bold tracking-[0.16em] uppercase text-[0.72rem]">
            Spotlight
          </span>
          <h3 className="font-display font-normal text-[2rem] text-white mt-2 mb-3 leading-[1.1]">
            {d.name}
          </h3>
          <p className="text-muted text-[1rem] leading-[1.55]">
            {d.description}
          </p>

          {/* Stats row */}
          <div className="flex gap-8 my-[1.4rem]">
            {[
              { value: d.members, label: 'Members' },
              { value: d.treasury, label: 'Treasury' },
              { value: d.marketCap, label: 'Market Cap' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-[1.4rem] text-white">
                  {s.value}
                </div>
                <div className="text-muted text-[0.72rem] tracking-[0.12em] uppercase">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonGold href={d.href}>View Mountain Mesh →</ButtonGold>
            <ButtonGhost href="/dunas">Browse all DUNAs</ButtonGhost>
          </div>
        </div>

        {/* Art panel */}
        <div
          className="flex items-center justify-center min-h-[280px] max-md:min-h-[200px]"
          style={{
            background: `radial-gradient(circle at 50% 40%, rgba(234,170,0,0.28), transparent 60%), #100E59`,
          }}
        >
          <Image
            src="/review/screens/assets/wv-mark-gold.svg"
            alt=""
            aria-hidden="true"
            width={150}
            height={150}
            className="w-[150px] opacity-95"
          />
        </div>
      </div>
    </SectionWrapper>
  )
}

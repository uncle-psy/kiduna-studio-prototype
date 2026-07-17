import type { Metadata } from 'next'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import '../dunathon-landing.css'
import DunaLandingFooter from '@/components/landing/DunaLandingFooter'
import SectionWrapper from '@/components/landing/ui/SectionWrapper'
import Eyebrow from '@/components/landing/ui/Eyebrow'
import DisplayHeading from '@/components/landing/ui/DisplayHeading'
import GoldEmphasis from '@/components/landing/ui/GoldEmphasis'
import StarDivider from '@/components/landing/ui/StarDivider'
import StatBox from '@/components/landing/ui/StatBox'
import ButtonGold from '@/components/landing/ui/ButtonGold'
import ButtonGhost from '@/components/landing/ui/ButtonGhost'
import RidgeMotif from '@/components/landing/ui/RidgeMotif'
import LaunchpadBoard from './LaunchpadBoard'

export const metadata: Metadata = {
  title: 'Launchpad — WV DUNA',
  description:
    'Discover and back DUNAs raising into their treasuries — with built-in protection: capped spending, market-based governance, and refunds if a raise falls short.',
}

/** Format USDC cents/units into a human-readable string */
function formatCommitted(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`
  return `$${amount}`
}

async function getLaunchpadStats() {
  return [
    { value: '12', label: 'Total Launches' },
    { value: '3', label: 'Live Now' },
    { value: formatCommitted(384000), label: 'Committed to date' },
    { value: '8', label: 'Funded & Launched' },
  ]
}

export default async function LaunchpadPage() {
  const stats = await getLaunchpadStats()

  return (
      <>
      <div className="duna-landing" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <DunaLandingNav />
      </div>

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
          <Eyebrow className="mb-5">
            Launchpad <StarDivider /> DUNAs raising now
          </Eyebrow>
          <DisplayHeading as="h1">
            Back the DUNAs <GoldEmphasis>about to launch.</GoldEmphasis>
          </DisplayHeading>
          <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55] mb-8">
            Discover DUNAs raising into their treasuries and fund the ones you
            believe in, with protection built into the form. Raises are capped,
            spending is governed by the membership and market-based decision
            rules, and if a raise falls short, backers are refunded. Commit
            early, share in the upside, and help a movement reach escape
            velocity.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonGold size="lg" href="/start">Launch a DUNA</ButtonGold>
            <ButtonGhost size="lg" href="/learn-more">How it works</ButtonGhost>
          </div>
        </div>
      </section>

      {/* ── Stats Line ── */}
      <SectionWrapper tight>
        <style>{`
          .lp-stats .stat-box { border-right: 1px solid rgba(255,255,255,0.12); }
          .lp-stats .stat-box:last-child { border-right: 0; }
          @media (max-width: 920px) {
            .lp-stats { grid-template-columns: repeat(2, 1fr); }
            .lp-stats .stat-box:nth-child(2) { border-right: 0; }
          }
          @media (max-width: 560px) {
            .lp-stats { grid-template-columns: 1fr; }
            .lp-stats .stat-box { border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.12); }
            .lp-stats .stat-box:last-child { border-bottom: 0; }
          }
        `}</style>
        <div
          className="lp-stats grid grid-cols-4 border border-border rounded-[14px] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #100E59, #0A0D33)' }}
        >
          {stats.map((s) => (
            <StatBox key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </SectionWrapper>

      {/* ── Launch Board (client component with API data) ── */}
      <SectionWrapper style={{ paddingTop: 8 }}>
        <LaunchpadBoard />
      </SectionWrapper>

      {/* ── CTA Band ── */}
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
          <Eyebrow className="text-center mb-4">
            Ready to raise <StarDivider /> From idea to treasury
          </Eyebrow>
          <DisplayHeading as="h2" className="max-w-[20ch] mx-auto">
            Put your DUNA on the <GoldEmphasis>Launchpad.</GoldEmphasis>
          </DisplayHeading>
          <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55] mx-auto mb-8">
            Register your DUNA, set a raise goal, and open it to backers. Capped
            spending and market-based governance come built in, so members can
            fund you with confidence.
          </p>
          <ButtonGold size="lg" href="/start">Launch a DUNA</ButtonGold>
        </div>
        <RidgeMotif />
      </section>

      {/* ===== FOOTER ===== */}
      <div className="duna-landing">
      <DunaLandingFooter />
      </div>
    </>
  )
}

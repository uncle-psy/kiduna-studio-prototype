import type { Metadata } from 'next'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import SectionWrapper from '@/components/landing/ui/SectionWrapper'
import SectionHead from '@/components/landing/ui/SectionHead'
import Eyebrow from '@/components/landing/ui/Eyebrow'
import DisplayHeading from '@/components/landing/ui/DisplayHeading'
import GoldEmphasis from '@/components/landing/ui/GoldEmphasis'
import StarDivider from '@/components/landing/ui/StarDivider'
import StatBox from '@/components/landing/ui/StatBox'
import MetricCard from '@/components/landing/ui/MetricCard'

export const metadata: Metadata = {
  title: 'Metrics — WV DUNA',
  description:
    'The WV DUNA network at a glance: registered DUNAs, member treasuries, members, token market cap, and a breakdown by cause.',
}

/* ── Sample computed metrics (from 10 prototype DUNAs) ── */

const HEADLINE_STATS = [
  { value: '10', label: 'DUNAs registered' },
  { value: '$8.8M', label: 'Total treasuries' },
  { value: '29,319', label: 'Members' },
  { value: '$82.2M', label: 'Token market cap' },
]

const HEALTH_CARDS = [
  { kicker: 'Open vs. closed', big: '7 / 3', desc: 'Public DUNAs with a live token vs. private associations.' },
  { kicker: 'Average treasury', big: '$880k', desc: 'Mean treasury held across all registered DUNAs.' },
  { kicker: 'Largest treasury', big: '$2.9M', desc: 'Rhododendron AI leads the network.' },
  { kicker: 'Newest DUNA', big: 'May 2026', desc: 'Rhododendron AI is the most recently registered.' },
]

const BREAKDOWN = [
  { tag: 'Commerce', count: 1, members: '4,180', treasury: '$2.1M' },
  { tag: 'Agents', count: 1, members: '760', treasury: '$2.9M' },
  { tag: 'DePIN', count: 1, members: '1,420', treasury: '$1.3M' },
  { tag: 'Veterans', count: 1, members: '9,640', treasury: '$880k' },
  { tag: 'Agriculture', count: 1, members: '2,015', treasury: '$640k' },
  { tag: 'Health', count: 1, members: '3,210', treasury: '$410k' },
  { tag: 'Mutual Aid', count: 1, members: '5,400', treasury: '$276k' },
  { tag: 'Civic', count: 1, members: '842', treasury: '$96k' },
  { tag: 'Land & Water', count: 1, members: '1,240', treasury: '$81.4k' },
  { tag: 'Arts', count: 1, members: '612', treasury: '$17.2k' },
]

export default function MetricsPage() {
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
          <Eyebrow className="mb-5">
            Metrics <StarDivider /> The network at a glance
          </Eyebrow>
          <DisplayHeading as="h1">
            Every action, <GoldEmphasis>on the ledger.</GoldEmphasis>
          </DisplayHeading>
          <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55]">
            DUNAs coordinate in the open. These figures roll up the registry and
            the on-chain treasuries across the network, settled on the
            high-performance Solana network.
          </p>
        </div>
      </section>

      {/* ── Headline Stats Strip ── */}
      <SectionWrapper tight>
        <style>{`
          .metrics-stats .stat-box { border-right: 1px solid rgba(255,255,255,0.12); }
          .metrics-stats .stat-box:last-child { border-right: 0; }
          @media (max-width: 920px) {
            .metrics-stats { grid-template-columns: repeat(2, 1fr); }
            .metrics-stats .stat-box:nth-child(2) { border-right: 0; }
          }
          @media (max-width: 560px) {
            .metrics-stats { grid-template-columns: 1fr; }
            .metrics-stats .stat-box { border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.12); }
            .metrics-stats .stat-box:last-child { border-bottom: 0; }
          }
        `}</style>
        <div
          className="metrics-stats grid grid-cols-4 border border-border rounded-[14px] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #100E59, #0A0D33)' }}
        >
          {HEADLINE_STATS.map((s) => (
            <StatBox key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
        <p className="mt-3.5 text-[0.82rem] text-muted">
          Across 10 registered DUNAs · 7 public, 3 private.
        </p>
      </SectionWrapper>

      {/* ── Network Health ── */}
      <SectionWrapper style={{ paddingTop: 8 }}>
        <SectionHead
          eyebrow={<>Health <StarDivider /> A closer look</>}
          title="Network health"
        />
        <div className="grid grid-cols-4 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4">
          {HEALTH_CARDS.map((c) => (
            <MetricCard key={c.kicker} kicker={c.kicker} big={c.big}>
              <p className="text-muted text-[0.96rem] mt-2 m-0">{c.desc}</p>
            </MetricCard>
          ))}
        </div>
      </SectionWrapper>

      <hr className="h-[1px] bg-border border-0 m-0" />

      {/* ── Breakdown by Cause ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>Composition <StarDivider /> By cause</>}
          title="Where the network is building"
          lede="DUNAs span land and water, mutual aid, commerce, agents, and more. Each category rolls up its own members and treasury."
        />
        <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4">
          {BREAKDOWN.map((b) => (
            <MetricCard key={b.tag} kicker={b.tag} title={`${b.count} DUNA`}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="font-display text-white text-[1rem]">{b.members}</div>
                  <div className="text-[0.62rem] tracking-[0.1em] uppercase text-dim">Members</div>
                </div>
                <div>
                  <div className="font-display text-white text-[1rem]">{b.treasury}</div>
                  <div className="text-[0.62rem] tracking-[0.1em] uppercase text-dim">Treasury</div>
                </div>
              </div>
            </MetricCard>
          ))}
        </div>
        <p className="mt-5 text-[0.82rem] text-muted">
          Sample directory data for this draft. At launch these read live from
          the West Virginia business registry and on-chain treasuries.
        </p>
      </SectionWrapper>

      <LandingFooter />
    </>
  )
}

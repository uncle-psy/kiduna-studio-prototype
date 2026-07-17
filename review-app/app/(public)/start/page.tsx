import type { Metadata } from 'next'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import LandingFooter from '@/components/landing/LandingFooter'
import '../dunathon-landing.css'
import SectionWrapper from '@/components/landing/ui/SectionWrapper'
import Eyebrow from '@/components/landing/ui/Eyebrow'
import DisplayHeading from '@/components/landing/ui/DisplayHeading'
import GoldEmphasis from '@/components/landing/ui/GoldEmphasis'
import StarDivider from '@/components/landing/ui/StarDivider'
import FormCard from '@/components/landing/ui/FormCard'
import FormField, { Input } from '@/components/landing/ui/FormField'
import MetricCard from '@/components/landing/ui/MetricCard'

export const metadata: Metadata = {
  title: 'Start a DUNA — WV DUNA',
  description:
    'Register a DUNA at the West Virginia Secretary of State. Pick a build path, name your association, and recruit your members.',
}

export default function StartPage() {
  return (
    <>
      {/* Shared home-page navigation. The .duna-landing wrapper scopes the
          nav's CSS + design tokens to the header only, so the rest of this
          page keeps its own styling. Sticky lives on the wrapper (whose
          containing block is the full page) so it stays pinned like on home. */}
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
            Register <StarDivider /> Fifteen minutes
          </Eyebrow>
          <DisplayHeading as="h1">
            Start <GoldEmphasis>a DUNA</GoldEmphasis>
          </DisplayHeading>
          <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55]">
            Three steps to a registered West Virginia entity with legal
            standing, a liability shield, and a public record at the Secretary
            of State.
          </p>
        </div>
      </section>

      {/* ── 3 Steps ── */}
      <SectionWrapper tight>
        <div className="max-w-[780px] grid gap-4">
          {[
            {
              t: 'Name your association',
              p: 'Choose a name and write the common, nonprofit purpose your members will agree to.',
            },
            {
              t: 'File with the Secretary of State',
              p: 'We prepare the filing, set your registered agent and address, and submit it for fifteen dollars.',
            },
            {
              t: 'Recruit members and fund the treasury',
              p: 'Onboard at least 100 members, wire up governance and the on-chain treasury, and start operating.',
            },
          ].map((s, i) => (
            <div key={s.t} className="relative pl-[62px]">
              <span className="absolute left-0 top-0 w-[42px] h-[42px] flex items-center justify-center font-display text-on-accent bg-accent rounded-full">
                {i + 1}
              </span>
              <h3 className="font-display font-normal text-[1.2rem] text-white m-0 mb-[0.3rem]">
                {s.t}
              </h3>
              <p className="text-muted text-[0.96rem] m-0">{s.p}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── 2-Column: Form + Info Cards ── */}
      <SectionWrapper style={{ paddingTop: 20 }}>
        <div className="grid grid-cols-2 max-md:grid-cols-1 gap-10 items-start">
          {/* Left — Form */}
          <div>
            <h2 className="font-display font-normal text-[1.8rem] text-white mb-4">
              Get on the list
            </h2>
            <p className="text-muted text-[0.96rem] mb-5">
              Tell us a little about what you want to build. This draft form
              doesn&apos;t submit anywhere yet — it previews the flow.
            </p>
            <FormCard>
              <FormField label="DUNA name">
                <Input
                  type="text"
                  placeholder="e.g. Mountain Mesh"
                  readOnly
                />
              </FormField>

              <FormField label="Common purpose">
                <textarea
                  rows={3}
                  placeholder="What is the mission your members share?"
                  readOnly
                  className="w-full py-[0.78rem] px-4 rounded-[8px] bg-bg-deep border border-border text-white font-sans text-[1rem] focus:outline-none focus:border-accent resize-none"
                />
              </FormField>

              <FormField label="Build path">
                <select
                  disabled
                  className="w-full py-[0.78rem] px-4 rounded-[8px] bg-bg-deep border border-border text-white font-sans text-[1rem] focus:outline-none focus:border-accent appearance-none"
                >
                  <option>Do It Yourself — $100 + $10/mo</option>
                  <option>Do It With Us — $1,000 + $100/mo</option>
                  <option>Done For You — $10K + $1K/mo</option>
                </select>
              </FormField>

              <FormField label="Email">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  readOnly
                />
              </FormField>

              <button
                type="button"
                className="w-full font-sans font-bold text-[1.02rem] py-4 rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150"
              >
                Reserve my DUNA
              </button>

              <p className="mt-3 text-[0.85rem] text-muted">
                Registration produces a public record. Members may remain
                anonymous; the entity has a registered agent and address on
                file.
              </p>
            </FormCard>
          </div>

          {/* Right — Info Cards */}
          <aside className="flex flex-col gap-[18px]">
            <MetricCard kicker="What you get" title="A real legal person">
              <p className="text-muted text-[0.96rem] m-0">
                The DUNA can hold property, sign contracts, employ people, pay
                taxes, and sue and be sued, in its own name, under West Virginia
                law.
              </p>
            </MetricCard>

            <MetricCard kicker="What it removes" title="Personal exposure">
              <p className="text-muted text-[0.96rem] m-0">
                Members, administrators, and software contributors are no longer
                general partners by default. The personal liability earlier DAO
                cases created is off the table.
              </p>
            </MetricCard>

            <MetricCard kicker="What it adds" title="Public standing">
              <p className="text-muted text-[0.96rem] m-0">
                Secretary of State registration produces a searchable record
                with a registered agent and address — what banks, regulators,
                and courts require to engage.
              </p>
            </MetricCard>
          </aside>
        </div>
      </SectionWrapper>

      <LandingFooter />
    </>
  )
}
import type { Metadata } from 'next'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import Eyebrow from '@/components/landing/ui/Eyebrow'
import DisplayHeading from '@/components/landing/ui/DisplayHeading'
import StarDivider from '@/components/landing/ui/StarDivider'
import ButtonGold from '@/components/landing/ui/ButtonGold'
import ButtonGhost from '@/components/landing/ui/ButtonGhost'

export const metadata: Metadata = {
  title: 'The Registered Agent — WV DUNA',
  description:
    'David Levine is the registered agent for WV DUNA, the person on public record with the West Virginia Secretary of State who receives legal and official correspondence on the entity\u2019s behalf.',
}

export default function RegisteredAgentPage() {
  return (
    <>
      <LandingHeader />

      {/* ── Page Hero — matches .page-hero from reference ── */}
      <section
        className="relative overflow-hidden"
        style={{
          padding: '68px 0 56px',
          background: `
            radial-gradient(900px 360px at 90% -20%, rgba(234,170,0,0.20), transparent 55%),
            radial-gradient(600px 420px at -8% 70%, rgba(3,204,217,0.12), transparent 60%),
            linear-gradient(135deg, #100E59, #09073A 80%)
          `,
        }}
      >
        <div className="w-full max-w-[1180px] mx-auto px-6 relative z-[2]">
          <Eyebrow className="mb-5">
            The Registered Agent <StarDivider /> On the public record
          </Eyebrow>
          <DisplayHeading as="h1">
            Meet <em className="font-display italic text-accent">David Levine.</em>
          </DisplayHeading>
          <p
            className="max-w-[62ch]"
            style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)', color: 'var(--fg-muted, #CDCDCD)', lineHeight: 1.55 }}
          >
            Every entity registered in West Virginia names a registered agent:
            the person on file with the Secretary of State who receives legal
            service and official correspondence on the entity&rsquo;s behalf.
            For WV DUNA, that&rsquo;s David Levine.
          </p>
        </div>
      </section>

      {/* ── Content — matches .agent-grid from reference ── */}
      <section style={{ paddingTop: 16, paddingBottom: 80 }}>
        <div className="w-full max-w-[1180px] mx-auto px-6">
          <style>{`
            .ra-grid { display: grid; grid-template-columns: 300px 1fr; gap: 44px; align-items: start; }
            @media (max-width: 760px) { .ra-grid { grid-template-columns: 1fr; } .ra-grid .ra-photo { max-width: 260px; } }
          `}</style>
          <div className="ra-grid">
            {/* Left — photo + meta */}
            <div>
              {/* .agent-photo */}
              <div
                className="ra-photo relative w-full overflow-hidden flex items-center justify-center"
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.22)',
                  background: 'radial-gradient(circle at 50% 32%, #100E59, #09073A)',
                  boxShadow: '0 6px 20px rgba(3,1,27,0.45)',
                }}
              >
                {/* .agent-initials — fallback behind image */}
                <span
                  className="absolute z-0"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '4.5rem',
                    color: 'var(--accent, #EAAA00)',
                  }}
                >
                  DL
                </span>
              </div>

              {/* .agent-meta */}
              <div className="mt-4 grid gap-1.5">
                <div style={{ fontSize: '0.85rem', color: 'var(--fg-soft, rgba(255,255,255,0.60))' }}>
                  Tech executive &amp; entrepreneur
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--fg-soft, rgba(255,255,255,0.60))' }}>
                  Washington, DC area
                </div>
                <a
                  href="https://linkedin.com/in/motodave"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 700, fontSize: '0.9rem' }}
                >
                  LinkedIn ↗
                </a>
              </div>
            </div>

            {/* Right — .agent-bio */}
            <div>
              <p style={{ color: 'var(--fg-muted, #CDCDCD)', fontSize: '1.05rem', margin: '0 0 1rem' }}>
                David Levine is the founder of the Kinship Intelligence
                Institute and the registered agent for WV DUNA. He is a
                product, operations, and systems-engineering executive who has
                spent three decades building companies at the edge of new
                technology, from the early commercial web to big-data geomatics,
                fintech, blockchain, and agentic AI.
              </p>
              <p style={{ color: 'var(--fg-muted, #CDCDCD)', fontSize: '1.05rem', margin: '0 0 1rem' }}>
                His connection to West Virginia runs deep. Appointed by
                then-Governor Manchin, he served as Director of Technology &amp;
                Transformation in the West Virginia Development Office, building
                a role in state government for technology-based economic
                development, helping small businesses and startups raise capital,
                and recruiting technology companies to create jobs in the state.
                WV DUNA continues that work: putting West Virginia entrepreneurs
                at the center of the agentic economy rather than at its margins.
              </p>
              <p style={{ color: 'var(--fg-muted, #CDCDCD)', fontSize: '1.05rem', margin: '0 0 1rem' }}>
                He has founded and led companies including Geostellar
                (cloud-based solar geomatics), Indeco Union (blockchain
                smart-city infrastructure), Ultraprise (the first whole-loan
                trading platform for the secondary market, and the origin of the
                MISMO data standards still in use today), and Gamebryo (a
                massively-multiplayer game platform partnered with Cisco, IBM,
                Intel, and Sony). More recently he led engineering
                communications and relations at Solana Labs and managed
                big-data, agentic-AI, and cloud infrastructure work for the
                Department of Homeland Security&rsquo;s Cybersecurity and
                Infrastructure Security Agency.
              </p>
              <p style={{ color: 'var(--fg-muted, #CDCDCD)', fontSize: '1.05rem', margin: '0 0 1rem' }}>
                His work has been featured on CBC, Fox Business News, and in the
                New York Times, Wall Street Journal, and Fast Company, and he
                holds patents in fintech, video-game technology, and big-data
                geomatics. He studied philosophy at Yale, where he earned a
                National Endowment for the Humanities Younger Scholar award.
              </p>

              {/* .strip — gold callout box */}
              <div
                style={{
                  marginTop: 24,
                  border: '1px solid rgba(234,170,0,0.4)',
                  borderRadius: 14,
                  padding: '26px 30px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.4rem',
                  flexWrap: 'wrap',
                  background: 'rgba(234,170,0,0.14)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--accent, #EAAA00)',
                    fontSize: '1.3rem',
                  }}
                >
                  What a registered agent does
                </span>
                <span style={{ color: 'var(--fg-muted, #CDCDCD)', fontSize: '0.95rem' }}>
                  Receives legal notices and state correspondence, keeps the
                  entity&rsquo;s public record current, and gives courts, banks,
                  and counterparties a verified point of contact, in-state,
                  under West Virginia law.
                </span>
              </div>

              {/* CTAs */}
              <div className="flex gap-3 flex-wrap" style={{ marginTop: 28 }}>
                <ButtonGold href="/start" size="lg">Start a DUNA</ButtonGold>
                <ButtonGhost href="/learn-more#act" size="lg">Read the Act</ButtonGhost>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </>
  )
}

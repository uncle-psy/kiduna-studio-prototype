import type { Metadata } from 'next'
import Link from 'next/link'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import LandingFooter from '@/components/landing/LandingFooter'
import '../dunathon-landing.css'
import SectionWrapper from '@/components/landing/ui/SectionWrapper'
import SectionHead from '@/components/landing/ui/SectionHead'
import Eyebrow from '@/components/landing/ui/Eyebrow'
import DisplayHeading from '@/components/landing/ui/DisplayHeading'
import GoldEmphasis from '@/components/landing/ui/GoldEmphasis'
import StarDivider from '@/components/landing/ui/StarDivider'
import MetricCard from '@/components/landing/ui/MetricCard'
import ButtonGold from '@/components/landing/ui/ButtonGold'
import ButtonGhost from '@/components/landing/ui/ButtonGhost'

export const metadata: Metadata = {
  title: 'Learn More — WV DUNA',
  description:
    'What a DUNA is, what the West Virginia DUNA Act gives and requires, how it compares to Wyoming and Alabama, and answers to common questions.',
}

/* ── Divider shorthand ── */
const Hr = () => <hr className="h-[1px] bg-border border-0 m-0" />

/* ── Card grid shorthand ── */
function Grid({ cols, children }: { cols: 2 | 3 | 4; children: React.ReactNode }) {
  const c = cols === 4 ? 'grid-cols-4 max-md:grid-cols-2' : cols === 3 ? 'grid-cols-3 max-md:grid-cols-2' : 'grid-cols-2'
  return <div className={`grid ${c} max-sm:grid-cols-1 gap-4`}>{children}</div>
}

export default function LearnMorePage() {
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
          <Eyebrow className="mb-5">Primer <StarDivider /> The form, the law, the questions</Eyebrow>
          <DisplayHeading as="h1">Learn More</DisplayHeading>
          <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55]">
            A DUNA is a Decentralized Unincorporated Nonprofit Association. West Virginia is the first state to register one at the Secretary of State, giving online, member-run organizations a legal home that banks, courts, and counterparties can verify.
          </p>
        </div>
      </section>

      {/* ── What's a DAO / DUNA ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>Primer <StarDivider /> The DAO</>}
          title="What's a DAO, and why a DUNA?"
          lede="A Decentralized Autonomous Organization coordinates members, money, and decisions through code on a public blockchain rather than through a corporate hierarchy. The rules are smart contracts; the network executes them. A DUNA is the legal wrapper that gives that network standing in the real world."
        />
        <Grid cols={2}>
          <MetricCard kicker="How it works" title="On-chain mechanics">
            <p className="text-muted text-[0.96rem] m-0 mb-2">Smart contracts hold the rules. Authority sits in code on a public blockchain, not in a CEO or board.</p>
            <p className="text-muted text-[0.96rem] m-0">The treasury lives on-chain and moves only when the membership votes. Tokens encode membership and voting power, and every action lands on a public, queryable ledger.</p>
          </MetricCard>
          <MetricCard kicker="What it's for" title="The coordination pattern">
            <p className="text-muted text-[0.96rem] m-0 mb-2">Trustless coordination among parties that don&apos;t want to rely on a single corporate counterparty, with programmable governance enforced by code rather than paperwork.</p>
            <p className="text-muted text-[0.96rem] m-0">Typical uses: protocol governance, grant-making, investment clubs, open-source funding, and increasingly, agentic AI networks.</p>
          </MetricCard>
        </Grid>
      </SectionWrapper>

      <Hr />

      {/* ── Inside the WV DUNA Act ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>The statute <StarDivider /> W. Va. Code §36-11</>}
          title="Inside the WV DUNA Act"
          lede="West Virginia's Decentralized Unincorporated Nonprofit Association Act grants DAOs and other autonomous online networks a recognized legal home in the state."
        />
        <Grid cols={2}>
          <MetricCard kicker="What the law gives" title="Legal standing">
            <p className="text-muted text-[0.96rem] m-0 mb-2">Recognized as a separate legal entity. The DUNA can hold property, sign contracts, hire workers, and pay taxes in its own name.</p>
            <p className="text-muted text-[0.96rem] m-0 mb-2">A liability shield means members, administrators, and software contributors are not personally liable for the entity&apos;s acts.</p>
            <p className="text-muted text-[0.96rem] m-0">Blockchain, distributed ledger technology, and smart-contract governance are explicitly permitted, and digital assets are recognized in the entity&apos;s permitted activities.</p>
          </MetricCard>
          <MetricCard kicker="What the law requires" title="Conditions for the form">
            <p className="text-muted text-[0.96rem] m-0 mb-2">At least 100 human members, joined by mutual consent. Members may remain anonymous.</p>
            <p className="text-muted text-[0.96rem] m-0 mb-2">A common, nonprofit purpose written into governing principles agreed by the members.</p>
            <p className="text-muted text-[0.96rem] m-0 mb-2">Profit-making activity is allowed, provided proceeds further the common purpose.</p>
            <p className="text-muted text-[0.96rem] m-0">Public registration in West Virginia, with a registered agent and address on file.</p>
          </MetricCard>
        </Grid>
      </SectionWrapper>

      <Hr />

      {/* ── Three-state comparison ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>Statutory comparison <StarDivider /> WY · AL · WV</>}
          title="Three DUNAs, one critical difference"
          lede="Wyoming, Alabama, and West Virginia all recognize the DUNA form. Only West Virginia requires Secretary of State registration, turning an unincorporated association into a publicly registered entity that courts, counterparties, and regulators can readily verify."
        />
        <Grid cols={3}>
          <MetricCard kicker="Wyoming" title="DAO LLC + DUNA">
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">Form:</strong> DAO LLC or DUNA</p>
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">SoS registration:</strong> LLC yes, DUNA no</p>
            <p className="text-muted text-[0.96rem] m-0 mb-2"><strong className="text-white">Public record:</strong> partial; the DUNA is unincorporated</p>
            <p className="text-dim text-[0.88rem] m-0">Created the DAO LLC model nationally.</p>
          </MetricCard>
          <MetricCard kicker="Alabama" title="DUNA Act">
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">Form:</strong> DUNA only</p>
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">SoS registration:</strong> not required</p>
            <p className="text-muted text-[0.96rem] m-0 mb-2"><strong className="text-white">Public record:</strong> none; entity exists by adoption</p>
            <p className="text-dim text-[0.88rem] m-0">Mirrors the Wyoming DUNA model.</p>
          </MetricCard>
          <MetricCard kicker="West Virginia ✓" title="DUNA Act">
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">Form:</strong> DUNA with SoS filing</p>
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">SoS registration:</strong> required, registered agent &amp; address</p>
            <p className="text-muted text-[0.96rem] m-0 mb-2"><strong className="text-white">Public record:</strong> yes, searchable WV business registry</p>
            <p className="text-dim text-[0.88rem] m-0">First DUNA with full public legal standing.</p>
          </MetricCard>
        </Grid>
      </SectionWrapper>

      <Hr />

      {/* ── FAQ ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>Questions <StarDivider /> Straight answers</>}
          title="Frequently asked"
        />
        <div className="max-w-[70ch]">
          {[
            { q: 'Do I need to live in West Virginia?', a: 'No. Participation is not limited to West Virginia. A founder in Charleston and a company in Lagos can stand up the same kind of entity. You register at the West Virginia Secretary of State and keep a registered agent and address on file in the state.' },
            { q: 'Do I need technical or blockchain skills?', a: 'No. A DUNA operates online, and Kiduna Studio handles the governance setup, member onboarding, and treasury wiring. If you would rather not touch any of it, the Done For You path builds the whole thing for you.' },
            { q: 'What does it cost to register?', a: 'The Secretary of State filing is fifteen dollars and takes about fifteen minutes. Our build plans, which add tooling and support on top of the filing, start at $100 upfront. See the three paths on the home page.' },
            { q: 'Is a DUNA a nonprofit?', a: 'The DUNA is a nonprofit association, but profit-making activity is allowed as long as proceeds further the common purpose the members agreed to. It can hold a treasury, raise capital, and pay people.' },
            { q: 'Am I personally on the hook if something goes wrong?', a: 'The Act provides a liability shield. Members, administrators, and software contributors are not general partners by default, which is the exposure that earlier court cases left DAO members carrying.' },
          ].map((faq) => (
            <div key={faq.q} className="mb-6">
              <h2 className="font-display font-normal text-[1.3rem] text-white mt-8 mb-2">{faq.q}</h2>
              <p className="text-muted text-[1.05rem] leading-[1.55]">{faq.a}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-9">
          <ButtonGold size="lg" href="/start">Start a DUNA</ButtonGold>
          <ButtonGhost size="lg" href="/founders">For founders &amp; investors</ButtonGhost>
        </div>
      </SectionWrapper>

      <Hr />

      {/* ── Founders & Capital ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>Founders &amp; capital <StarDivider /> Build, raise, bank</>}
          title={<>Build it here. Raise here. <GoldEmphasis>Bank here.</GoldEmphasis></>}
          lede="For the first time, an entrepreneur can launch a token-funded, code-governed organization without leaving the state, and without giving up legal standing, capital access, or institutional banking."
        />
        <Grid cols={4}>
          <MetricCard kicker="Formation" title="A WV entity">
            <p className="text-muted text-[0.96rem] m-0 mb-3">Register a DUNA at the Secretary of State for fifteen dollars in fifteen minutes. Skip the offshore foundation playbook and the Cayman counsel retainer.</p>
            <div className="text-[0.7rem] tracking-[0.14em] uppercase text-dim font-bold mt-4">From</div>
            <div className="font-display text-[1.7rem] text-accent leading-[1.1]">Cayman to WV</div>
          </MetricCard>
          <MetricCard kicker="Capital" title="Token + equity">
            <p className="text-muted text-[0.96rem] m-0 mb-3">Raise globally through token structuring events into a treasury controlled by the DUNA. State-certified growth funds can channel insurance-premium tax credits into WV startups.</p>
            <div className="text-[0.7rem] tracking-[0.14em] uppercase text-dim font-bold mt-4">Growth fund cap</div>
            <div className="font-display text-[1.7rem] text-accent leading-[1.1]">$15M / yr</div>
          </MetricCard>
          <MetricCard kicker="Operations" title="Banking & contracts">
            <p className="text-muted text-[0.96rem] m-0 mb-3">A registered WV entity passes institutional know-your-business checks. Banks, exchanges, and enterprise customers can onboard the entity directly, no offshore wrapper required.</p>
            <div className="text-[0.7rem] tracking-[0.14em] uppercase text-dim font-bold mt-4">KYB result</div>
            <div className="font-display text-[1.7rem] text-accent leading-[1.1]">Pass, in-state</div>
          </MetricCard>
          <MetricCard kicker="Ecosystem" title="Plugged into the stack">
            <p className="text-muted text-[0.96rem] m-0 mb-3">Co-locate with the hyperscale build-out. A 48-hour state-agency response under SB 878 puts talent, compute, and capital in one jurisdiction.</p>
            <div className="text-[0.7rem] tracking-[0.14em] uppercase text-dim font-bold mt-4">State response time</div>
            <div className="font-display text-[1.7rem] text-accent leading-[1.1]">48 hours</div>
          </MetricCard>
        </Grid>
      </SectionWrapper>

      <Hr />

      {/* ── SAFEs and STAMPs ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>Seed stage <StarDivider /> Paper instruments</>}
          title="SAFEs and STAMPs: one check, both sides"
          lede="A single seed-stage check can split across both halves of the DUNA-plus-corp stack. The SAFE invests into the for-profit corporation and converts to equity at the next priced round. The STAMP invests into the future DUNA token launch and gives investors on-chain protections before the token generation event."
        />
        <Grid cols={2}>
          <MetricCard kicker="Equity side · into the corp" title="SAFE">
            <p className="text-muted text-[0.96rem] m-0 mb-1 italic">Simple Agreement for Future Equity</p>
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">Investor:</strong> VCs, angels, strategic investors</p>
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">Conversion:</strong> equity in the corp at next priced round</p>
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">Terms:</strong> valuation cap, discount, or both</p>
            <p className="text-muted text-[0.96rem] m-0"><strong className="text-white">Why it works:</strong> paper-friendly; no priced round needed at seed</p>
          </MetricCard>
          <MetricCard kicker="Token side · into the DUNA" title="STAMP">
            <p className="text-muted text-[0.96rem] m-0 mb-1 italic">Simple Token Agreement, Market Protected</p>
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">Investor:</strong> same investor base, token-side allocation</p>
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">Conversion:</strong> tokens at the DUNA&apos;s token generation event</p>
            <p className="text-muted text-[0.96rem] m-0 mb-1"><strong className="text-white">Terms:</strong> on-chain protections via decision markets</p>
            <p className="text-muted text-[0.96rem] m-0"><strong className="text-white">Why it works:</strong> bridges private investment into a public launch</p>
          </MetricCard>
        </Grid>
        <div className="mt-[22px] bg-surface border border-border rounded-[14px] px-[22px] py-4 flex flex-wrap items-center gap-3">
          <span className="font-bold text-white text-[0.95rem]">One term sheet, two instruments.</span>
          <span className="text-muted text-[0.92rem]">Seed-stage investors price equity and tokens together, with aligned vesting across the corp and the DUNA.</span>
        </div>
      </SectionWrapper>

      <Hr />

      {/* ── Membership benefits ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>Why join <StarDivider /> What membership gives you</>}
          title="A real seat at the table"
        />
        <Grid cols={3}>
          {[
            { k: 'Voice', t: 'Vote on what matters', p: 'Propose and vote on the decisions that steer the DUNA, from how the treasury is spent to which agents get deployed. Quorums and thresholds are enforced by code, not by a boardroom.' },
            { k: 'Stake', t: 'Share in the treasury', p: 'Membership can carry a share of the value the community builds. The treasury lives on-chain and moves only when the membership says so.' },
            { k: 'Leverage', t: 'Put agents to work', p: 'Every member can hand routine coordination, administration, and outreach to the DUNA\u2019s intelligent agents, and spend their own time on the work only people can do.' },
            { k: 'Standing', t: 'Protected by the Act', p: 'Under the WV DUNA Act, members are not personally liable for the entity\u2019s acts. You participate without taking on the exposure earlier DAO members carried.' },
            { k: 'Privacy', t: 'Join from anywhere', p: 'Participation is permissionless and open worldwide. Members join by mutual consent and may remain pseudonymous while still counting toward the association.' },
            { k: 'Belonging', t: 'Build with your kin', p: 'A DUNA is a community first. You join people who share a purpose, whether that is a county wireless network, a farm co-op, or a global protocol.' },
          ].map((c) => (
            <MetricCard key={c.k} kicker={c.k} title={c.t}>
              <p className="text-muted text-[0.96rem] m-0">{c.p}</p>
            </MetricCard>
          ))}
        </Grid>
      </SectionWrapper>

      <Hr />

      {/* ── Roles ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>Roles <StarDivider /> How members participate</>}
          title="Three ways to show up"
          lede="Members choose how much they carry. Roles are set in each DUNA's governing principles and can change by vote."
        />
        <Grid cols={3}>
          {[
            { k: 'Member', t: 'Join and vote', p: 'Hold membership, vote on proposals, and share in the upside. The baseline role every DUNA is built on, and the one that satisfies the Act\u2019s hundred-member threshold.' },
            { k: 'Steward', t: 'Tend the day-to-day', p: 'Stewards keep things running: drafting proposals, configuring agents, and reporting on the treasury. They serve at the membership\u2019s pleasure, not above it.' },
            { k: 'Delegate', t: 'Carry others\u2019 votes', p: 'Members can delegate voting power to a delegate they trust, then reclaim it at any time. Delegation scales participation without concentrating control.' },
          ].map((c) => (
            <MetricCard key={c.k} kicker={c.k} title={c.t}>
              <p className="text-muted text-[0.96rem] m-0">{c.p}</p>
            </MetricCard>
          ))}
        </Grid>
      </SectionWrapper>

      <Hr />

      {/* ── Becoming a member (Steps) ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>Getting in <StarDivider /> Three steps</>}
          title="Becoming a member"
        />
        <div className="max-w-[780px] grid gap-4 counter-reset-[step]">
          {[
            { t: 'Find a DUNA', p: 'Browse the registry by cause, treasury, members, or token, and open the one whose purpose is yours.' },
            { t: 'Join and connect', p: 'Create an account, connect a wallet if the DUNA has a token, and accept the governing principles by mutual consent.' },
            { t: 'Participate', p: 'Vote, propose, delegate, and put the agents to work. Your membership counts from day one.' },
          ].map((s, i) => (
            <div key={s.t} className="relative pl-[62px]">
              <span className="absolute left-0 top-0 w-[42px] h-[42px] flex items-center justify-center font-display text-on-accent bg-accent rounded-full">
                {i + 1}
              </span>
              <h3 className="font-display font-normal text-[1.2rem] text-white m-0 mb-[0.3rem]">{s.t}</h3>
              <p className="text-muted text-[0.96rem] m-0">{s.p}</p>
            </div>
          ))}
        </div>
        <div className="mt-[34px]">
          <ButtonGold size="lg" href="/dunas">Browse DUNAs</ButtonGold>
        </div>
      </SectionWrapper>

      <Hr />

      {/* ── Agents you can trust ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>The foundation <StarDivider /> What sets these agents apart</>}
          title={<>Agents you can <GoldEmphasis>actually trust</GoldEmphasis></>}
          lede="An agent is only as trustworthy as what stands behind it. A DUNA gives every agent three things most agents on the open internet lack."
        />
        <Grid cols={3}>
          {[
            { k: 'Identity', t: 'Know who an agent is', p: 'Every agent is bound to a registered DUNA and its own cryptographic key. Counterparties can verify who an agent is, and who it represents, before they transact.' },
            { k: 'Authority', t: 'Know what it may do', p: 'Define exactly what an agent is allowed to do: which treasury limits, which contracts, which votes. Authority is granted by members and enforced on-chain, never assumed.' },
            { k: 'Accountability', t: 'Know what it did', p: 'Every action an agent takes lands on the ledger. Decisions can be traced, responsibility can be assigned, and members can revoke or retrain an agent by vote.' },
          ].map((c) => (
            <MetricCard key={c.k} kicker={c.k} title={c.t}>
              <p className="text-muted text-[0.96rem] m-0">{c.p}</p>
            </MetricCard>
          ))}
        </Grid>
      </SectionWrapper>

      <Hr />

      {/* ── Build it in five steps ── */}
      <SectionWrapper>
        <SectionHead
          eyebrow={<>How it works <StarDivider /> From code to credentialed agent</>}
          title={<>Build it in <GoldEmphasis>five steps</GoldEmphasis></>}
        />
        <Grid cols={3}>
          {[
            { k: 'Step 1', t: 'Register or join a DUNA', p: 'Your agent needs a legal home. Stand up a DUNA, or join one, to give the agent a real entity to operate under.' },
            { k: 'Step 2', t: 'Issue the agent an identity', p: 'Bind the agent to a cryptographic key tied to the DUNA\u2019s public record, so anyone can verify who it is and who it answers to.' },
            { k: 'Step 3', t: 'Scope its authority', p: 'Set permissions, spend limits, and the specific actions it may take. Members decide; the rules are enforced on-chain.' },
            { k: 'Step 4', t: 'Deploy and connect', p: 'Wire the agent to the treasury, governance, and the tools it needs, then put it to work on the DUNA\u2019s mission.' },
            { k: 'Step 5', t: 'Monitor and audit', p: 'Every action is recorded on the ledger. Watch what the agent does, and adjust, retrain, or revoke it by member vote.' },
            { k: 'Why build here', t: 'Legal standing, on tap', p: 'Programmable permissions, an on-chain audit trail, treasury access, and composability with other DUNAs and agents, all under a recognized legal framework.' },
          ].map((c) => (
            <MetricCard key={c.k} kicker={c.k} title={c.t}>
              <p className="text-muted text-[0.96rem] m-0">{c.p}</p>
            </MetricCard>
          ))}
        </Grid>
        <p className="mt-5 text-[0.82rem] text-muted">
          Building tools and templates for agent developers are part of this draft and will expand over time.
        </p>
      </SectionWrapper>

      <LandingFooter />
    </>
  )
}

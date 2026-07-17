'use client'

import DunaLandingNav from '@/components/landing/DunaLandingNav'
import '../dunathon-landing.css'
import DunaLandingFooter from '@/components/landing/DunaLandingFooter'

export default function HowItWorksPage() {
  return (
    <div className="duna-landing">
      {/* ===== NAV ===== */}
      <DunaLandingNav />

      {/* ===== PAGE HERO ===== */}
      <header className="page-hero">
        <img className="ridge" src="/review/screens/images/landing/ridge-motif.svg" alt="" aria-hidden="true" />
        <div className="wrap">
          <div className="eyebrow"><span className="dot" />How it Works · The Whole System</div>
          <h1>The architecture of <em className="wv-emph">agency.</em></h1>
          <p className="lead">Four forces compose a Kiduna Realm: the technology that lets agents act, the governance that gives them standing, economics that circulate value, and the culture that makes it all worthwhile. Here is how each one works, and how they join together into a coherent living system.</p>
        </div>
      </header>

      {/* ===== SUBNAV ===== */}
      <div className="subnav">
        <div className="wrap">
          <span className="sn-label">On this page</span>
          <a href="#frame">The frame</a>
          <a href="#tech">Technology</a>
          <a href="#governance">Governance</a>
          <a href="#economics">Economics</a>
          <a href="#culture">Culture</a>
          <a href="#compose">How it composes</a>
        </div>
      </div>

      {/* ===== 01 · THE FRAME ===== */}
      <section className="section" id="frame">
        <div className="wrap">
          <div className="sec-kicker">01 · The frame · Purpose, authority, standing</div>
          <h2 className="sec-title">Building the Agentic Economy at Internet Scale and <em className="wv-emph">Machine Speed.</em></h2>
          <p className="sec-lead">The agentic economy can&apos;t be built on &ldquo;personal agents&rdquo; that do the bidding of an individual or &ldquo;enterprise agents&rdquo; that support the work of a single organization. It will emerge from a new coordination layer where people, organizations, and intelligent agents can form trusted relationships, make commitments, exchange value, and act together across the open internet.</p>
          <div className="lead-prose">
            <p>Today&apos;s internet resolves names and routes packets, but it has never carried purpose, delegated authority, or established legal standing as part of any underlying protocol. Kiduna&apos;s relational agents are called Allies because they establish a framework of trust before an interaction between people, intelligent agents, organizations, and computing systems begins, much as a domain name resolves a system host into a human-readable identity before a web page loads.</p>
          </div>

          <div className="callout">
            <p><b>Power without relatedness is dangerous.</b> The three capabilities that make an agent dangerous, known as the &ldquo;Lethal Trifecta&rdquo; &mdash; reading private data, interpreting untrusted content, and acting on external systems &mdash; are the same capabilities that make agentic AI uniquely powerful. The only available solutions to the danger of prompt injection were to remove one of those capabilities or isolate the agent behind a firewall.</p>
            <p>Until now.</p>
            <p>Rather than limiting what an agent can do or confining it to the enterprise, we make every interaction situated within a transparent, well-defined relationship. Every Ally carries an explicit purpose, bounded authority, and verifiable standing that it must present as credentials before it can take any action.</p>
            <p>The Lethal Trifecta does not have to be disarmed. It has to be situated within trusted relationships.</p>
          </div>

          <div className="def-row" style={{ marginTop: '32px' }}>
            <div className="def"><div className="n">Purpose</div><h3>Why are we working together?</h3><p>Every Ally exists to advance the mission of a specific Member, Realm, Alliance, or organization. Its purpose is explicit, inspectable, and shared before cooperation can be initiated, giving every participant a common understanding of why the relationship is proposed and what it seeks to accomplish.</p></div>
            <div className="def"><div className="n">Authority</div><h3>What can we do?</h3><p>Authority is never assumed. Every permission is delegated by a responsible party, precisely scoped, continuously verifiable, and limited to the resources, commitments, and actions required to fulfill its purpose.</p></div>
            <div className="def"><div className="n">Standing</div><h3>Who is accountable for our actions?</h3><p>Every Ally ultimately represents someone or something. Its identity, authority, and actions trace back through a chain of delegation to real people, communities, and legally recognized organizations that can make commitments, uphold them, and answer for the consequences.</p></div>
          </div>
        </div>
      </section>

      {/* ===== 02 · TECHNOLOGY ===== */}
      <section className="section" id="tech">
        <div className="wrap">
          <div className="sec-kicker">02 · Technology · Agentic AI + blockchain</div>
          <h2 className="sec-title">Intelligence creates capabilities. <em className="wv-emph">Relationships create economies.</em></h2>
          <p className="sec-lead">Intelligent actors can reason, negotiate, perform, and transact. Blockchain provides a tamper-proof substrate for identity, ownership, and settlement. Together they form the infrastructure for an agentic economy that can operate at internet scale and machine speed.</p>

          <div className="def-row" style={{ marginTop: '32px' }}>
            <div className="def"><div className="n">The internet of value</div><h3>Money as both information and resource.</h3><p>Traditional finance moves information about money through banks, processors, and auditors, built for human hours and human approval. Crypto rails move value the way the internet moves information: always on, ownership verified, authority delegated, transactions settled peer to peer. Cryptocurrencies are digital money, transferring resources as information from one account to another. The blockchain makes machine-to-machine agentic commerce possible.</p></div>
            <div className="def"><div className="n">Protocols over platforms</div><h3>A network owned by its members.</h3><p>Built on Solana, a high-performance carbon-neutral blockchain, the core infrastructure is decentralized so no single individual, organization, government, or institution can own or control it; permissionless so anyone can participate; and composable so any builder or creator can extend and enhance what already exists. Kiduna isn&apos;t another platform. It&apos;s a protocol for shared agency.</p></div>
            <div className="def"><div className="n">A living environment</div><h3>Content is dead.</h3><p>Most software revolves around content, documents, messages, tickets, and files &mdash; snapshots of work after it happens. Kiduna fosters living relationships through agents that continuously reason, research, coordinate, execute, govern, monitor, mediate, and moderate. Humans envision, design, guide, intervene, and orchestrate, while the intelligent agents keep work flowing, context current, and everyone aware of the activities that matter most to them, right at that moment. Content becomes an artifact of the work, while the real value lies in the ongoing processes where the real work lives.</p></div>
          </div>

          <p className="sec-lead" style={{ marginTop: '40px' }}>A Kiduna is an environment built from four types of agents that together can coordinate, act, govern, and relate as a complete living system.</p>
          <div className="def-row two">
            <div className="def"><div className="n">Allies</div><h3>They coordinate.</h3><p>Allies embody the wisdom, stance, abilities, objectives, and purpose of the person or organization they represent.</p></div>
            <div className="def"><div className="n">Performers</div><h3>They work.</h3><p>Performers take direction from Allies and execute with tools &mdash; drafting, posting, filing, updating, paying, building. They turn objectives into action.</p></div>
            <div className="def"><div className="n">Envoys</div><h3>They govern.</h3><p>Envoys act in governance forums under a human&apos;s direction, researching, proposing, voting, and trading positions exactly as instructed. Your judgment, exercised at machine speed and internet scale.</p></div>
            <div className="def"><div className="n">Sentinels</div><h3>They keep the field clean.</h3><p>Sentinels tend the health of the human and agentic fields, listening, reflecting, resolving conflict, strengthening trust, and repairing relationships before small fractures become lasting divisions.</p></div>
          </div>
        </div>
      </section>

      {/* ===== 03 · GOVERNANCE ===== */}
      <section className="section" id="governance">
        <div className="wrap">
          <div className="sec-kicker">03 · Governance · Standing and decision-making</div>
          <h2 className="sec-title">Legal standing. <em className="wv-emph">Collective agency.</em></h2>
          <p className="sec-lead">On July 1, 2026, the West Virginia DUNA Act opened the door for decentralized, internet-native, member-governed agentic organizations as legal entities capable of collective action in the world. A DUNA (Decentralized Unincorporated Nonprofit Association) can own property, enter agreements, aggregate capital, employ people, and answer in court. That legal standing allows people and intelligent agents to coordinate as one coherent actor instead of a loose confederation of software systems and accounts.</p>

          <div className="def-row" style={{ marginTop: '32px' }}>
            <div className="def"><div className="n">Legal standing</div><h3>What a DUNA is.</h3><p>Decentralized, Unincorporated, Nonprofit, Association: run by its members through code, with no executives, board of directors, or corporate shell to maintain, organized around a mission rather than the disposition of assets. The organization is steered by its human members and operated by the agents they authorize.</p></div>
            <div className="def"><div className="n">The registry</div><h3>The DNS of agentic organizations.</h3><p>DNS makes amazon.com mean Amazon everywhere. The WV Secretary of State plays that role for the agentic economy: a DUNA&apos;s registration anchors its identity in law, and from that anchor agents exchange cryptographic codes carrying their scope of authority, so any agent can verify a counterparty&apos;s credentials before transacting.</p></div>
            <div className="def"><div className="n">Governance markets</div><h3>Decisions based on purpose, values, and aspirations.</h3><p>Members have a choice between participating directly in policy making or designing Envoys that embody their best judgment by negotiating, debating, and trading pass/fail tokens to ultimately arrive at important decisions. Governance markets reward effective judgment instead of persuasive rhetoric, guiding the organization toward consensus and away from polarization.</p></div>
          </div>

          <div className="callout" style={{ marginTop: '32px' }}>
            <p>Democracy asks what people prefer. Governance markets ask what people believe will create the best future, and invite them to stand behind that belief.</p>
          </div>
        </div>
      </section>

      {/* ===== 04 · ECONOMICS ===== */}
      <section className="section" id="economics">
        <div className="wrap">
          <div className="sec-kicker">04 · Economics · Reciprocity</div>
          <h2 className="sec-title">An economy that <em className="wv-emph">pays for itself.</em></h2>
          <p className="sec-lead">Every DUNA runs its own economy: its own Coin, its own treasury, its own rules. No outside platform takes a cut of everything, and no shareholders extract the upside. The value stays in the network and on mission.</p>

          <div className="def-row two" style={{ marginTop: '32px' }}>
            <div className="def"><div className="n">DUNA Coins</div><h3>A say and a stake.</h3><p>A Coin is the unit of membership, not stock, and it pays no dividends. It gives you a voice in governance, a real stake in the mission, and the resources to create, build, and participate. The market sets its price, so what people pay reveals what they think the mission is worth.</p></div>
            <div className="def"><div className="n">The Waterfall</div><h3>Funds that move by rule.</h3><p>Most of a treasury moves by standing rule, not by meeting: prices, fees, and distributions are set once and executed automatically on-chain, every transaction split the moment it happens. The rules change only when a member proposes it and the market approves.</p></div>
            <div className="def"><div className="n">Hold to participate</div><h3>More Coins, more agency.</h3><p>Membership is open to anyone; how much you hold sets how much you can do. By statute a DUNA can&apos;t pay profits to holders — value reinvests in the mission, and payouts are for work performed. Your stake stays yours, and you can sell whenever you choose.</p></div>
            <div className="def"><div className="n">An ecosystem, not an extraction</div><h3>Value recirculates.</h3><p>DUNAs hold Coins in one another, sponsor one another, and spin out of one another; alliances form across their borders. The same activity that funds each DUNA keeps the shared network running. An economy extracts value. An ecosystem recirculates it.</p></div>
          </div>
        </div>
      </section>

      {/* ===== 05 · CULTURE ===== */}
      <section className="section" id="culture">
        <div className="wrap">
          <div className="sec-kicker">05 · Culture · Upstream of everything</div>
          <h2 className="sec-title">What it is all <em className="wv-emph">for.</em></h2>
          <p className="sec-lead">Identity, authority, and accountability aren&apos;t only things we build for agents. They&apos;re the things we build in ourselves, and in the organizations we forge together. Technology decides what is possible; culture decides what is worth doing.</p>

          <div className="def-row" style={{ marginTop: '32px' }}>
            <div className="def"><div className="n">Alignment is singular</div><h3>Grown, not granted.</h3><p>There is no generic alignment because there is no generic human. The frontier labs treat it as obedience, trained at the center. We treat it as self-authorship: each person tunes themselves, then instills their agents with what they find — their wisdom, values, and aspirations. Alignment can&apos;t be handed down from the center. It has to be grown, one person and one agent at a time.</p></div>
            <div className="def"><div className="n">The emotional field</div><h3>Where the vibes are immaculate.</h3><p>When software speaks, something ancient in us responds, and nervous systems co-regulate with whatever converses with them. HEARTS, a Sentinel, reads that field across signals like Harmony, Empowerment, Reason, and Trust, each running from −100 to +100, with health at the center. When signals drift it sends a grounding question or a gentle boundary to guide things home; at the far edges, coercion is blocked and crisis brings in human support.</p></div>
            <div className="def"><div className="n">A third architecture</div><h3>Kinship at network scale.</h3><p>Humanity has organized in two great phases: the kinship era of small bands woven into the living world, and the hierarchical era of ledgers, borders, and standing armies. A third is beginning — biomimetic organizations that recover the relatedness of kinship at the scale the classical world built, coordinated by agents, DUNAs, and alliances rather than bureaucracies. The first era was given to us; the second was imposed on us. This one we get to design.</p></div>
          </div>
        </div>
      </section>

      {/* ===== 06 · HOW IT COMPOSES ===== */}
      <section className="section" id="compose">
        <div className="wrap">
          <div className="sec-kicker">06 · The whole system · How it composes</div>
          <h2 className="sec-title">Four forces, one <em className="wv-emph">living system.</em></h2>
          <p className="sec-lead">These four are not parallel tracks. They stack. Legal standing sits at the base, because without a body in law there is no one to hold responsible. Identity rests on top of it, because a name is only as good as the thing it resolves to. On-chain accounts, treasuries, commerce, and distribution build upward from there. The agent runtime — the Allies and Envoys you actually talk to — sits at the very top, the most capable layer and the least trusted, able to reach into any layer below only by presenting a credential the lower layers will verify.</p>

          <div className="def-row" style={{ marginTop: '32px' }}>
            <div className="def"><div className="n">The base</div><h3>Standing, then identity.</h3><p>A DUNA&apos;s registration in West Virginia gives it legal existence; the registry resolves that into a verifiable identity. Law and name, joined.</p></div>
            <div className="def"><div className="n">The middle</div><h3>Treasury, commerce, lineage.</h3><p>On-chain accounts hold the treasury; governance markets decide what it funds; the Waterfall moves value by rule; offerings and spin-outs carry that value across the ecosystem.</p></div>
            <div className="def"><div className="n">The spine</div><h3>Codes carry the authority.</h3><p>Cryptographic Codes are the spine that joins every layer. An action is legitimate only if it traces, through those Codes, to a principal anchored at the base — a person or DUNA that can answer for it.</p></div>
          </div>

          <div className="lead-prose" style={{ marginTop: '32px' }}>
            <p>One action, traced end to end: a member instructs their Ally; the Ally carries a Code that traces back to the member, whose standing rests on the DUNA&apos;s registration; it makes an Offer and settles on-chain in seconds; the Waterfall splits the value by the rules members set; a governance market shapes what gets built next; and a Sentinel keeps the field between all the parties clean. Identity at the base, agency at the top, authority the spine that joins them, and culture deciding, all the way through, what the whole thing is for.</p>
          </div>

          <div className="inline-cta" style={{ marginTop: '32px' }}>
            <a href="/#contact" className="btn btn-primary">Join Early Access →</a>
            <a href="/showcase" style={{ fontWeight: 700, fontSize: '14px', alignSelf: 'center' }}>Explore the Showcase →</a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <DunaLandingFooter />
    </div>
  )
}
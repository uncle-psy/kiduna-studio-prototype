/* =========================================================================
   Allies directory data — DUNAs + all role pages.
   ========================================================================= */

// ── DUNAs ────────────────────────────────────────────────────────────────

export interface DunaDef {
  id: string; name: string; by: string; tag: string; type: 'Public' | 'Private'
  coin: string; symbol: string; blurb: string; created: string
  treasury: string; members: string; mcap: string
}

export const DUNAS_LIST: DunaDef[] = [
  { id:'rhodo', name:'Rhododendron AI', by:'Charleston Agent Works', tag:'Agents', type:'Public', coin:'$RHODO', symbol:'RHODO', created:'May 2026', treasury:'$2.9M', members:'760', mcap:'$33M', blurb:'A fleet of AI agents that sign, settle, and answer for it at law.' },
  { id:'block', name:'Block Garden Charleston', by:'The Block', tag:'Civic', type:'Private', coin:'$BLOCK', symbol:'BLOCK', created:'Apr 2026', treasury:'$96k', members:'842', mcap:'—', blurb:'Turning vacant lots into neighborhood gardens, one block at a time.' },
  { id:'mesh', name:'Mountain Mesh', by:'Ridgeline Networks', tag:'DePIN', type:'Public', coin:'$MESH', symbol:'MESH', created:'Apr 2026', treasury:'$1.3M', members:'1,420', mcap:'$9.4M', blurb:'Community-deployed wireless coverage wiring rural counties.' },
  { id:'prov', name:'Appalachia Provisions', by:'Eastern Panhandle Growers', tag:'Agriculture', type:'Public', coin:'$PROV', symbol:'PROV', created:'Mar 2026', treasury:'$640k', members:'2,015', mcap:'$1.8M', blurb:'A farm co-op with agentic decision support and a shared route to buyers.' },
  { id:'nrlt', name:'New River Land Trust', by:'Fayette County Collective', tag:'Land & Water', type:'Public', coin:'$NRLT', symbol:'NRLT', created:'Feb 2026', treasury:'$81.4k', members:'1,240', mcap:'$3.2M', blurb:'Member-owned conservation of New River gorge land and water.' },
  { id:'srva', name:'Service Alliance', by:'2nd Cavalry Association', tag:'Veterans', type:'Private', coin:'$SRVA', symbol:'SRVA', created:'Jan 2026', treasury:'$880k', members:'9,640', mcap:'—', blurb:'Verified digital infrastructure helping veterans navigate benefits.' },
  { id:'hlth', name:'Holler Health', by:'Kanawha Care Network', tag:'Health', type:'Private', coin:'$HLTH', symbol:'HLTH', created:'Dec 2025', treasury:'$410k', members:'3,210', mcap:'—', blurb:'Healthcare-literacy agents and a member fund for rural clinic access.' },
  { id:'apc', name:'Appalachian Power Co-op', by:'Coalfield Mutual', tag:'Mutual Aid', type:'Public', coin:'$APC', symbol:'APC', created:'Nov 2025', treasury:'$276k', members:'5,400', mcap:'$12.8M', blurb:'A community energy co-op pooling rooftop solar and storage.' },
  { id:'opra', name:'The Wheeling Opera House', by:'Ohio Valley Arts', tag:'Arts', type:'Public', coin:'$OPRA', symbol:'OPRA', created:'Oct 2025', treasury:'$17.2k', members:'612', mcap:'$540k', blurb:'A member-owned revival of a historic venue.' },
  { id:'wvcc', name:'WV Commerce Club', by:'Mountain State Main Street', tag:'Commerce', type:'Public', coin:'$WVCC', symbol:'WVCC', created:'Sep 2025', treasury:'$2.1M', members:'4,180', mcap:'$21.5M', blurb:'Appalachian small businesses pooling reach, capital, and clients.' },
]

// ── Person Cards (Members, Founders, Builders, Catalysts, Luminaries) ────

export interface PersonDef {
  initials: string; name: string; role: string; bio: string
  links: { label: string; value: string }[]
}

export const MEMBERS: PersonDef[] = [
  { initials:'MV', name:'Marcus Vega', role:'Member · Huntington', bio:'Runs a two-person print shop and joined to pool reach and clients with other Main Street businesses across the state.', links:[{label:'Handle',value:'@marcusv'},{label:'Joined',value:'WV Commerce Club, Appalachia Provisions'},{label:'Ally',value:'Concierge Agent @concierge.marcus'}] },
  { initials:'DW', name:'Dana Whitfield', role:'Steward · Morgantown', bio:'Keeps two member-owned networks running, drafting proposals and tuning the agents that handle the day-to-day.', links:[{label:'Handle',value:'@danaw'},{label:'Joined',value:'Appalachian Power Co-op, Mountain Mesh'},{label:'Ally',value:'Steward Agent @steward.dana'}] },
  { initials:'LP', name:'Lena Park', role:'Delegate · Charleston', bio:'Carries the votes of members who would rather build than ballot, and reports back on every decision she casts.', links:[{label:'Handle',value:'@lenap'},{label:'Joined',value:'Rhododendron AI'},{label:'Ally',value:'Ballot Agent @ballot.lena'}] },
  { initials:'SO', name:'Sam Okafor', role:'Member · Beckley', bio:'An Army veteran who uses the network to navigate benefits and mentor others making the transition to civilian work.', links:[{label:'Handle',value:'@samok'},{label:'Joined',value:'Service Alliance'},{label:'Ally',value:'Benefits Agent @benefits.sam'}] },
  { initials:'RM', name:'Rosa Méndez', role:'Member · Wheeling', bio:'A neighborhood organizer bringing people into a shared garden and the work of reopening a local stage.', links:[{label:'Handle',value:'@rosam'},{label:'Joined',value:'Block Garden Charleston, Wheeling Opera House'},{label:'Ally',value:'Concierge Agent @concierge.rosa'}] },
  { initials:'TB', name:'Theo Banks', role:'Member · Fayetteville', bio:'Spends his weekends on land stewardship and trail access, and joined to have a real vote in how the land is held.', links:[{label:'Handle',value:'@theob'},{label:'Joined',value:'New River Land Trust'},{label:'Ally',value:'Privacy Agent @privacy.theo'}] },
]

export const FOUNDERS: PersonDef[] = [
  { initials:'MC', name:'Maya Calder', role:'Conservation organizer · Fayette County', bio:'Spent a decade fighting for the New River gorge before deciding the land should own itself. Maya now runs two member-governed organizations.', links:[{label:'Founded',value:'New River Land Trust, Appalachia Provisions'},{label:'Big Ally',value:'Steward Agent'}] },
  { initials:'CB', name:'Cole Branham', role:'Energy co-op builder · Coalfields', bio:'A third-generation coal-country electrician who wired his first community solar array in 2019. Cole built the Appalachian Power Co-op.', links:[{label:'Founded',value:'Appalachian Power Co-op'},{label:'Big Ally',value:'Treasury Agent'}] },
  { initials:'TR', name:'Tomás Reyes', role:'Main Street networker · Statewide', bio:'Ran a print shop, then a chamber of commerce, then realized small businesses needed a treasury and a vote, not another newsletter.', links:[{label:'Founded',value:'WV Commerce Club'},{label:'Big Ally',value:'Growth Agent'}] },
  { initials:'RV', name:'Renata Voss', role:'Veterans advocate · U.S. Army, ret.', bio:'After two tours and years untangling benefits paperwork, Renata built the Service Alliance so veterans get verified help.', links:[{label:'Founded',value:'Service Alliance'},{label:'Big Ally',value:'Concierge Agent'}] },
  { initials:'PN', name:'Priya Nair', role:'Agentic-AI engineer · Charleston', bio:'Left a big-lab research job to put fleets of agents to work under real legal standing. Priya now runs an agent company and a wireless network.', links:[{label:'Founded',value:'Rhododendron AI, Mountain Mesh'},{label:'Big Ally',value:'Launch Agent'}] },
  { initials:'JH', name:'Jules Hartwell', role:'Civic organizer · Kanawha County', bio:'Started with one vacant lot and a wheelbarrow. Jules organized the block into a member-governed garden network.', links:[{label:'Founded',value:'Block Garden Charleston'},{label:'Big Ally',value:'Governance Agent'}] },
]

export const BUILDERS: PersonDef[] = [
  { initials:'AS', name:'Ari Sloan', role:'Agent engineer · Charleston', bio:'Builds treasury and governance agents, then open-sources the hard parts so other DUNAs don\'t start from scratch.', links:[{label:'Handle',value:'@arisloan'},{label:'Projects',value:'Ledger Watch @ledger-watch, Quorum Bot @quorum-bot'},{label:'Ally',value:'Launch Agent @launch.ari'}] },
  { initials:'NO', name:'Nina Okonkwo', role:'ML engineer · Morgantown', bio:'Trains retrieval agents that keep member knowledge bases current and answer questions without leaking what shouldn\'t leave.', links:[{label:'Handle',value:'@ninao'},{label:'Projects',value:'Holler Index @holler-index'},{label:'Ally',value:'Counsel Agent @counsel.nina'}] },
  { initials:'DP', name:'Dev Patel', role:'Protocol developer · Remote', bio:'Writes the on-chain permission logic that scopes exactly what an agent may do, and proves it can\'t do more.', links:[{label:'Handle',value:'@devp'},{label:'Projects',value:'Scope Kit @scope-kit, Keyring @keyring'},{label:'Ally',value:'Charter Agent @charter.dev'}] },
  { initials:'SW', name:'Sage Whitman', role:'Mesh / DePIN builder · Elkins', bio:'Wires physical networks to agents that meter usage and settle payments automatically, no clipboard required.', links:[{label:'Handle',value:'@sagew'},{label:'Projects',value:'Mesh Relay @mesh-relay, Meter Daemon @meter-daemon'},{label:'Ally',value:'Steward Agent @steward.sage'}] },
  { initials:'BC', name:'Bex Coyle', role:'Frontend & UX · Huntington', bio:'Designs the dashboards members use to watch what their agents are doing and step in when they want to.', links:[{label:'Handle',value:'@bexc'},{label:'Projects',value:'Agent Console @agent-console'},{label:'Ally',value:'Concierge Agent @concierge.bex'}] },
  { initials:'MF', name:'Marco Ferreira', role:'Security researcher · Remote', bio:'Audits agent permissions and the contracts that enforce them, and writes the tooling to revoke an agent fast.', links:[{label:'Handle',value:'@marcof'},{label:'Projects',value:'Audit Trail @audit-trail, Revoke @revoke'},{label:'Ally',value:'Governance Agent @governance.marco'}] },
]

export const CATALYSTS: PersonDef[] = [
  { initials:'IB', name:'Imani Brooks', role:'Ecosystem catalyst · Atlanta', bio:'Funds cross-DUNA missions and connects founders to the capital and partners they need to get to scale.', links:[{label:'Handle',value:'@imanib'},{label:'Initiatives',value:'Appalachia Fund @appalachia-fund, Founder Bridge @founder-bridge'},{label:'Ally',value:'Capital Agent @capital.imani'}] },
  { initials:'HV', name:'Henrik Volkov', role:'Capital allocator · Zurich', bio:'Runs grant rounds and challenge prizes across the network, and reports openly on where every dollar lands.', links:[{label:'Handle',value:'@henrikv'},{label:'Initiatives',value:'Open Grants @open-grants'},{label:'Ally',value:'Growth Agent @growth.henrik'}] },
  { initials:'PA', name:'Priya Anand', role:'Network builder · Bangalore', bio:'Discovers emerging DUNAs and wires them into collaborative ventures, talent pools, and shared infrastructure.', links:[{label:'Handle',value:'@priyaa'},{label:'Initiatives',value:'Venture Mesh @venture-mesh, Talent Pool @talent-pool'},{label:'Ally',value:'Launch Agent @launch.priya'}] },
]

export const LUMINARIES: PersonDef[] = [
  { initials:'ES', name:'Dr. Eleanor Shaw', role:'Institute founder · Boston', bio:'Launches ecosystem funds and research institutes aimed at civilization-scale missions, and sets the standards others build on.', links:[{label:'Handle',value:'@eleanors'},{label:'Initiatives',value:'Kinship Fund @kinship-fund, Horizon Institute @horizon-institute'},{label:'Ally',value:'Counsel Agent @counsel.eleanor'}] },
  { initials:'KM', name:'Kofi Mensah', role:'Global coordinator · Accra', bio:'Coordinates alliances across founders, builders, sponsors, and catalysts worldwide, aligning many missions toward shared goals.', links:[{label:'Handle',value:'@kofim'},{label:'Initiatives',value:'Alliance Forum @alliance-forum'},{label:'Ally',value:'Governance Agent @governance.kofi'}] },
  { initials:'MC', name:'Mei-Ling Chen', role:'Strategic steward · Singapore', bio:'Directs dedicated infrastructure and long-range strategy for planetary-scale initiatives spanning the whole ecosystem.', links:[{label:'Handle',value:'@meilingc'},{label:'Initiatives',value:'Planet Grid @planet-grid, Futures Lab @futures-lab'},{label:'Ally',value:'Steward Agent @steward.mei'}] },
]

// ── Sponsors ─────────────────────────────────────────────────────────────

export interface SponsorDef {
  initials: string; color: string; kicker: string; name: string
  bio: string; sponsoring: string
}

export const SPONSORS: SponsorDef[] = [
  { initials:'AF', color:'#F7941D', kicker:'Nonprofit & philanthropy', name:'Allegheny Foundation', bio:'Grantmaking and capacity-building. Matches member contributions and funds land, training, and outreach programs.', sponsoring:'New River Land Trust, Appalachia Provisions' },
  { initials:'BR', color:'#03CCD9', kicker:'Hospitality', name:'Blue Ridge Hospitality Group', bio:'Hotels, venues, and event services across the region. Hosts member gatherings and donates room nights and catering to mission events.', sponsoring:'Wheeling Opera House, New River Land Trust' },
  { initials:'CC', color:'#6536BB', kicker:'Technology', name:'Cardinal Cloud', bio:'Cloud infrastructure and developer tools. Grants compute credits, security reviews, and engineering hours to agent-driven DUNAs.', sponsoring:'Rhododendron AI, Mountain Mesh' },
  { initials:'MS', color:'#BEEF00', kicker:'Healthcare', name:'Mountain State Health Partners', bio:'Clinics and telehealth statewide. Provides screenings, care navigation, and benefits expertise to member-governed health networks.', sponsoring:'Holler Health, Service Alliance' },
  { initials:'SP', color:'#EAAA00', kicker:'Consumer goods', name:'Summit Provisions Co.', bio:'A regional food and beverage maker. Supplies member pantries, runs co-branded product lines, and opens shelf space for goods that DUNAs produce.', sponsoring:'Appalachia Provisions, Block Garden Charleston' },
  { initials:'TM', color:'#EC008C', kicker:'Entertainment', name:'Tygart Media & Live', bio:'Production, ticketing, and streaming. Co-produces programming and shares box-office revenue with member-run venues.', sponsoring:'Wheeling Opera House, WV Commerce Club' },
]

// ── Page hero configs per allies page ────────────────────────────────────

export interface AlliesPageConfig {
  slug: string
  title: string
  metaTitle: string
  metaDesc: string
  heroEyebrow: string
  heroTitle: string
  heroEmphasis: string
  heroLede: string
  heroCtas: { label: string; href: string; style: 'gold' | 'ghost' }[]
  dirEyebrow: string
  dirTitle: string
  dirEmphasis: string
  dirLede: string
  dirSearch: string
  dirSort: string[]
  hasCta: boolean
  ctaEyebrow?: string
  ctaTitle: string
  ctaEmphasis: string
  ctaLede: string
  ctaButton: string
  ctaButtonHref: string
  footnote: string
}

export const ALLIES_PAGES: Record<string, AlliesPageConfig> = {
  dunas: {
    slug: 'dunas', title: 'DUNAs', metaTitle: 'DUNAs — WV DUNA',
    metaDesc: 'Browse every registered DUNA. Search, sort, and join a movement.',
    heroEyebrow: 'The registry ✦ DUNAs in motion',
    heroTitle: 'Explore the', heroEmphasis: 'DUNAVERSE',
    heroLede: 'Each DUNA is a member-owned and member-governed organization operated in concert with intelligent agents. Through registration with the West Virginia Secretary of State, the DUNA provides legal standing for members and agents recognized worldwide. Search, sort and join a DUNA right here, or start your own today!',
    heroCtas: [{ label: 'Start a DUNA', href: '/start', style: 'gold' }],
    dirEyebrow: '', dirTitle: '', dirEmphasis: '', dirLede: '',
    dirSearch: 'Search DUNAs by name, cause, or token…',
    dirSort: ['Creation date', 'Treasury', 'Members', 'Market cap'],
    hasCta: false,
    ctaTitle: '', ctaEmphasis: '', ctaLede: '', ctaButton: 'Start a DUNA', ctaButtonHref: '/start',
    footnote: 'Sample directory for this draft. The live registry links each entity to its public record on the West Virginia business registry, and Join connects you to the on-chain membership.',
  },
  members: {
    slug: 'members', title: 'Members', metaTitle: 'Members — WV DUNA',
    metaDesc: 'Members are the heart of every DUNA. Join, vote, share in the treasury.',
    heroEyebrow: 'Members ✦ The heart of every DUNA',
    heroTitle: 'Governed by', heroEmphasis: 'its members.',
    heroLede: 'A DUNA belongs to the people who join it. Members set the mission, vote on proposals, allocate funds in the treasury, and direct the agents that do the work. Anyone can join from anywhere in the world, members may stay anonymous, and members are legally protected from liability.',
    heroCtas: [{ label: 'Find a DUNA to join', href: '/dunas', style: 'gold' }, { label: 'Start your own', href: '/start', style: 'ghost' }],
    dirEyebrow: 'The members ✦ People in the movements',
    dirTitle: 'Faces of the', dirEmphasis: 'DUNAVERSE',
    dirLede: 'A DUNA belongs to the people who join it. Members back the missions they believe in, vote, and put their agents to work.',
    dirSearch: 'Search members by name, role, or DUNA…',
    dirSort: ['Name', 'DUNAs joined', 'Role'],
    hasCta: true,
    ctaTitle: 'The block governs', ctaEmphasis: 'the block.',
    ctaLede: 'Join a movement that is owned by the people in it, or start one and recruit your own.',
    ctaButton: 'Start a DUNA', ctaButtonHref: '/start',
    footnote: 'Sample member profiles for this draft. Each member chooses a handle, the DUNAs they join, and the ally that works on their behalf.',
  },
  founders: {
    slug: 'founders', title: 'Founders', metaTitle: 'Founders — WV DUNA',
    metaDesc: 'Share your vision. Build a movement. Create a market.',
    heroEyebrow: 'For founders, builders & visionaries ✦ From idea to institution',
    heroTitle: 'Share your Vision. Build a Movement.', heroEmphasis: 'Create a Market.',
    heroLede: 'A DUNA gives founders a new way to organize in the age of AI. Rally members around a mission, deploy intelligent agents to extend your reach, and build an organization that can contract, earn revenue, raise capital, and operate worldwide.',
    heroCtas: [{ label: 'Start a DUNA', href: '/start', style: 'gold' }, { label: 'Go Deeper', href: '/learn-more', style: 'ghost' }],
    dirEyebrow: 'The founders ✦ People behind the movements',
    dirTitle: 'Creators of the', dirEmphasis: 'DUNAVERSE',
    dirLede: 'Every DUNA starts with someone who refused to wait for permission. Meet the founders shaping accountability, identity, relationships, and agency.',
    dirSearch: 'Search founders by name or DUNA…',
    dirSort: ['Name', 'DUNAs founded', 'Role'],
    hasCta: true,
    ctaTitle: 'The Next Great Organization is', ctaEmphasis: 'about to be Born.',
    ctaLede: 'The most significant organizations of the agentic era will be founded by people who carry a powerful vision and see possibilities others don\u2019t. If you have passion, conviction, and a sense of purpose, now is the time to begin.',
    ctaButton: 'Start a DUNA', ctaButtonHref: '/start',
    footnote: 'Sample founder profiles for this draft. Allies link to each founder\u2019s network of agents and partners, coming soon.',
  },
  builders: {
    slug: 'builders', title: 'Builders', metaTitle: 'Builders — WV DUNA',
    metaDesc: 'Build intelligent agents with identity, authority & accountability.',
    heroEyebrow: 'For builders & developers ✦ Agents people can trust',
    heroTitle: 'Build intelligent agents with', heroEmphasis: 'identity, authority & accountability.',
    heroLede: 'Builders create the agents that power DUNAs. On WV DUNA, every agent operates under a real legal entity, so it carries a verifiable identity, clearly scoped authority, and an auditable record.',
    heroCtas: [{ label: 'Start building', href: '/start', style: 'gold' }, { label: 'Go Deeper', href: '/learn-more', style: 'ghost' }],
    dirEyebrow: 'The builders ✦ People shipping the agents',
    dirTitle: 'Makers of the', dirEmphasis: 'DUNAVERSE',
    dirLede: 'Builders create the intelligent agents that do the work. Each one ships under a registered DUNA, with a handle and a roster of projects.',
    dirSearch: 'Search builders by name or project…',
    dirSort: ['Name', 'Projects', 'Role'],
    hasCta: true,
    ctaEyebrow: 'For builders & developers ✦ Ready to ship?',
    ctaTitle: 'Build agents the world can', ctaEmphasis: 'rely on.',
    ctaLede: 'Give your agents a verifiable identity, scoped authority, and a public record of what they do. Start with a DUNA and build agents that earn trust by design.',
    ctaButton: 'Start building', ctaButtonHref: '/start',
    footnote: 'Sample builder profiles for this draft. Project and ally links will resolve to live pages as the directory grows.',
  },
  sponsors: {
    slug: 'sponsors', title: 'Sponsors', metaTitle: 'Sponsors — WV DUNA',
    metaDesc: 'Help ambitious communities do big things.',
    heroEyebrow: 'For brands, businesses & institutions ✦ Fueling movements that matter',
    heroTitle: 'Help Ambitious Communities', heroEmphasis: 'Do Big Things',
    heroLede: 'Sponsors partner with DUNAs through products, services, expertise, funding, and strategic support. From local businesses and emerging brands to global enterprises and nonprofits, sponsors help mission-driven communities succeed.',
    heroCtas: [{ label: 'Sponsor a DUNA', href: '/login', style: 'gold' }],
    dirEyebrow: 'The sponsors ✦ Across every industry',
    dirTitle: 'Brands backing the', dirEmphasis: 'DUNAVERSE',
    dirLede: 'Consumer goods, hospitality, technology, healthcare, entertainment, and the nonprofit world all show up here.',
    dirSearch: 'Search sponsors by name or industry…',
    dirSort: ['Name', 'Industry', 'DUNAs sponsored'],
    hasCta: true,
    ctaEyebrow: 'For sponsors, partners & institutions ✦ Ready to get involved?',
    ctaTitle: 'Fuel the Movements of the', ctaEmphasis: 'Intelligence Age.',
    ctaLede: 'Every DUNA begins with a vision, but no vision succeeds alone. Sponsors provide the products, services, expertise, opportunities, and resources that help communities thrive. Whether you\u2019re a local business, a growing brand, a nonprofit organization, or a global enterprise, sponsoring a DUNA is an opportunity to support meaningful work, build lasting relationships, and participate in the next generation of human organization. Find a DUNA aligned with your values, your customers, or your mission, and help it achieve something extraordinary.',
    ctaButton: 'Sponsor a DUNA', ctaButtonHref: '/login',
    footnote: 'Sample sponsor profiles for this draft. Sponsors set their own offerings and choose which DUNAs to back.',
  },
  catalysts: {
    slug: 'catalysts', title: 'Catalysts', metaTitle: 'Catalysts — WV DUNA',
    metaDesc: 'Spark the missions that move the whole network.',
    heroEyebrow: 'For ecosystem leaders ✦ Igniting missions at scale',
    heroTitle: 'Spark the missions that move the', heroEmphasis: 'whole network.',
    heroLede: 'Catalysts hold $100,000 in WVDUNA and put it to work across the ecosystem: launching missions, challenges, grants, and initiatives, allocating capital, discovering opportunity, and connecting founders, builders, and sponsors.',
    heroCtas: [{ label: 'Become a Catalyst', href: '/start', style: 'gold' }, { label: 'See the levels', href: '/', style: 'ghost' }],
    dirEyebrow: 'The catalysts ✦ Backing the whole network',
    dirTitle: 'Forces of the', dirEmphasis: 'DUNAVERSE',
    dirLede: 'Catalysts move capital and attention to where the ecosystem needs it.',
    dirSearch: 'Search catalysts by name or initiative…',
    dirSort: ['Name', 'Initiatives', 'Role'],
    hasCta: true,
    ctaEyebrow: 'For ecosystem leaders ✦ Ready to ignite?',
    ctaTitle: 'Move the network', ctaEmphasis: 'forward.',
    ctaLede: 'Hold $100,000 in WVDUNA to take on the Catalyst role and put missions, grants, and ventures in motion across the whole DUNAVERSE.',
    ctaButton: 'Become a Catalyst', ctaButtonHref: '/start',
    footnote: 'Sample catalyst profiles for this draft. Initiative and ally links will resolve to live pages as the directory grows.',
  },
  luminaries: {
    slug: 'luminaries', title: 'Luminaries', metaTitle: 'Luminaries — WV DUNA',
    metaDesc: 'Light the way for the whole ecosystem.',
    heroEyebrow: 'For visionaries ✦ Operating at planetary scale',
    heroTitle: 'Light the way for the', heroEmphasis: 'whole ecosystem.',
    heroLede: 'Luminaries hold $1,000,000 in WVDUNA and operate at the largest scale: launching ecosystem funds and institutes, coordinating global alliances, and illuminating the opportunities and directions that shape what everyone builds next.',
    heroCtas: [{ label: 'Become a Luminary', href: '/start', style: 'gold' }, { label: 'See the levels', href: '/', style: 'ghost' }],
    dirEyebrow: 'The luminaries ✦ Visionaries of the ecosystem',
    dirTitle: 'Lights of the', dirEmphasis: 'DUNAVERSE',
    dirLede: 'Luminaries set direction for the whole network.',
    dirSearch: 'Search luminaries by name or initiative…',
    dirSort: ['Name', 'Initiatives', 'Role'],
    hasCta: true,
    ctaEyebrow: 'For visionaries ✦ Ready to lead?',
    ctaTitle: 'Shape what everyone', ctaEmphasis: 'builds next.',
    ctaLede: 'Hold $1,000,000 in WVDUNA to take on the Luminary role and operate at planetary scale, launching funds, institutes, and alliances across the whole DUNAVERSE.',
    ctaButton: 'Become a Luminary', ctaButtonHref: '/start',
    footnote: 'Sample luminary profiles for this draft. Initiative and ally links will resolve to live pages as the directory grows.',
  },
}
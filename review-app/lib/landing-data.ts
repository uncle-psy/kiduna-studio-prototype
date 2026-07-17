/* =========================================================================
   Landing page static content — all data for the public marketing page.
   No API calls. Update this file to change landing page content.
   ========================================================================= */

// ── Stats ────────────────────────────────────────────────────────────────

export const STATS = [
  { value: '1,284', label: 'DUNAs Registered' },
  { value: '$48.6M', label: 'DUNA Treasuries' },
  { value: '312,000', label: 'DUNA Members' },
  { value: '$7,322,600', label: 'Market Cap (all Coins)' },
]

// ── Featured DUNAs ───────────────────────────────────────────────────────

export const FEATURED_DUNAS = [
  {
    badge: 'CC',
    tag: 'Commerce',
    title: 'WV Commerce Club',
    description:
      'A network of Appalachian small businesses pooling reach, capital, and clients on equal footing with the rest of the world.',
    members: '4,180',
    treasury: '$2.1M',
    href: '/duna/wvcc',
  },
  {
    badge: 'SA',
    tag: 'Veterans',
    title: 'Service Alliance',
    description:
      'Verified digital infrastructure helping veterans navigate benefits, health, and the transition to civilian work.',
    members: '9,640',
    treasury: '$880K',
    href: '/duna/srva',
  },
  {
    badge: 'AP',
    tag: 'Agriculture',
    title: 'Appalachia Provisions',
    description:
      'Member-governed co-op giving small farms agentic decision support and a shared route to buyers worldwide.',
    members: '2,015',
    treasury: '$640K',
    href: '/duna/prov',
  },
]

// ── Spotlight (DUNA of the Day) ──────────────────────────────────────────

export const SPOTLIGHT_DUNA = {
  name: 'Mountain Mesh',
  description:
    'A DePIN-style DUNA wiring rural West Virginia with community-deployed wireless coverage. Operators contribute hardware, smart contracts measure proof-of-coverage, and the treasury funds the next county. In its first eight weeks it has lit up four counties and signed two carrier agreements, in-state, under the DUNA\u2019s own name.',
  members: '1,420',
  treasury: '$1.3M',
  marketCap: '$27.3M',
  href: '/duna/mesh',
}

// ── Membership Tiers ─────────────────────────────────────────────────────

export interface TierDef {
  id: 'guest' | 'member' | 'founder' | 'builder' | 'sponsor' | 'catalyst' | 'luminary'
  name: string
  price: string
  priceNote: string
  features: string[]
  href: string
  featured?: boolean
  ribbon?: string
}

export const TIERS_ROW_1: TierDef[] = [
  {
    id: 'guest',
    name: 'Guest',
    price: 'Free',
    priceNote: 'no payment required',
    features: [
      'A WV DUNA identity and handle',
      'Browse the registry and follow DUNAs, founders, and movements',
      'Try an ally agent with a starter resource allotment',
      'Read-only view of governance and treasuries',
      'Upgrade anytime by purchasing a membership',
    ],
    href: '/signup?tier=guest',
  },
  {
    id: 'member',
    name: 'Member',
    price: '$10',
    priceNote: 'one-time payment',
    featured: true,
    ribbon: 'Start here',
    features: [
      'Everything in Guest',
      'Full member standing under the WV DUNA Act, with liability protection',
      'Join any DUNA, vote, and share in its treasury',
      'A personal Concierge ally with a monthly resource allotment',
      'Participate pseudonymously, from anywhere',
    ],
    href: '/signup?tier=member',
  },
  {
    id: 'founder',
    name: 'Founder',
    price: '$100',
    priceNote: 'one-time payment',
    features: [
      'Everything in Member',
      'Register and run your own DUNAs on genesis legal standing',
      'Founder allies: Launch, Capital, and Growth agents',
      'Governance templates, member onboarding, and treasury tools',
      'A larger resource allotment to put agents to work',
    ],
    href: '/signup?tier=founder',
  },
]

export const TIERS_ROW_2: TierDef[] = [
  {
    id: 'builder',
    name: 'Builder',
    price: '$1,000',
    priceNote: 'one-time payment',
    features: [
      'Everything in Founder',
      'Build and deploy custom agents with scoped on-chain authority',
      'Developer tooling: identity keys, permission scoping, audit trail',
      'High runtime allotment for fleets of agents',
      'Publish your projects and allies to the directory',
    ],
    href: '/signup?tier=builder',
  },
  {
    id: 'sponsor',
    name: 'Sponsor',
    price: '$10,000',
    priceNote: 'one-time payment',
    features: [
      'Everything in Builder',
      'Sponsor DUNAs with products, services, funding, and reach',
      'Co-branding and partnership tools across the DUNAVERSE',
      'The largest resource allotment, for agents and DUNAs at scale',
      'Featured placement and dedicated coordination',
    ],
    href: '/signup?tier=sponsor',
  },
  {
    id: 'catalyst',
    name: 'Catalyst',
    price: '$100,000',
    priceNote: 'one-time payment',
    features: [
      'Everything in Sponsor',
      'Launch missions, challenges, grants, and ecosystem-wide initiatives',
      'Catalyst allies for capital allocation, opportunity discovery, and network building',
      'Priority access to new DUNAs, founders, and collaborative ventures',
      'Expanded governance participation across network-level decisions',
      'Enterprise-scale resource allotment for large agent fleets and multiple DUNAs',
    ],
    href: '/signup?tier=catalyst',
  },
]

export const LUMINARY_FEATURES = [
  'Illuminate emerging opportunities, risks, and directions for the ecosystem',
  'Launch ecosystem funds, institutes, and civilization-scale missions',
  'Coordinate alliances across founders, builders, sponsors, and Catalysts',
  'Dedicated infrastructure and strategic support for global initiatives',
  'Maximum resource allotment for operating at planetary scale',
]

// ── Use Cases ────────────────────────────────────────────────────────────

export const USE_CASES = [
  {
    kicker: 'Capital formation',
    title: 'Pool money fast',
    body: 'Token sales can rapidly aggregate capital from a global contributor base into a treasury the members control. This method has funded protocols, technology development, major purchases and asset acquisitions, and civic causes.',
  },
  {
    kicker: 'DePIN',
    title: 'Run real hardware',
    body: 'Decentralized physical infrastructure networks use token incentives to deploy wireless coverage, storage, GPU compute, and data collection. Operators contribute equipment; the DUNA handles treasury, governance, and upgrades.',
  },
  {
    kicker: 'Fintech',
    title: 'Govern a protocol',
    body: 'Most large decentralized-finance protocols, from exchanges to lending markets to stablecoin issuers, are governed by member organizations that hold the treasury, set fees, issue tokens, and approve upgrades.',
  },
  {
    kicker: 'Community & co-ops',
    title: 'Share the upside',
    body: 'Member-governed commercial alliances can coordinate local and regional businesses for economic development, marketing, collaborative ventures, events, fundraisers, and cultural programs.',
  },
  {
    kicker: 'Intelligent agents',
    title: 'Real accountability',
    body: 'Fleets of AI agents that negotiate, transact, and settle need a recognized legal home to sign, settle, and answer for it at law. The DUNA supplies that missing layer.',
  },
  {
    kicker: 'Service & civic',
    title: 'Build a movement',
    body: "Veterans' support, healthcare literacy, social justice, addiction treatment, environmental protection, and civic engagement, run by the people closest to the need rather than a distant charity head office.",
  },
]

// ── Navigation ───────────────────────────────────────────────────────────

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Launchpad', href: '/launchpad' },
]

export const ALLIES_LINKS = [
  { label: 'DUNAs', href: '/dunas' },
  { label: 'Members', href: '/members' },
  { label: 'Founders', href: '/founders' },
  { label: 'Builders', href: '/builders' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Catalysts', href: '/catalysts' },
  { label: 'Luminaries', href: '/luminaries' },
]

// ── Footer ───────────────────────────────────────────────────────────────

export const FOOTER_EXPLORE = [
  { label: 'DUNAs', href: '/dunas' },
  { label: 'Founders', href: '/founders' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Members', href: '/members' },
  { label: 'Builders', href: '/builders' },
  { label: 'Catalysts', href: '/catalysts' },
  { label: 'Luminaries', href: '/luminaries' },
  { label: 'Metrics', href: '/metrics' },
  { label: 'Go Deeper', href: '/learn-more' },
]

export const FOOTER_EXPLORE_HOME = [
  { label: 'DUNAs', href: '/dunas' },
  { label: 'Founders', href: '/founders' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Members', href: '/members' },
  { label: 'Builders', href: '/builders' },
  { label: 'Metrics', href: '/metrics' },
  { label: 'Go Deeper', href: '/learn-more' },
]

export const FOOTER_START = [
  { label: 'Start a DUNA', href: '/start' },
  { label: 'Launchpad', href: '/launchpad' },
  { label: 'Login / Sign up', href: '/login' },
  { label: 'The Registered Agent', href: '/registered-agent' },
  { label: 'FAQ', href: '/learn-more#faq' },
]

export const FOOTER_START_HOME = [
  { label: 'Start a DUNA', href: '/start' },
  { label: 'Login / Sign up', href: '/login' },
  { label: 'The Registered Agent', href: '/registered-agent' },
  { label: 'FAQ', href: '/learn-more#faq' },
]

// ── Launchpad ────────────────────────────────────────────────────────────

export type LaunchStatus = 'live' | 'funded' | 'refunding'

export interface LaunchDef {
  title: string
  status: LaunchStatus
  fdv: string
  meta: string
  description: string
  committed: string
  goal: string
  progress: number
  cta: string
  ctaHref: string
  ctaStyle: 'gold' | 'ghost'
}

export const LAUNCHPAD_STATS = [
  { value: '69', label: 'Total Launches' },
  { value: '11', label: 'Live Now' },
  { value: '$42.8M', label: 'Committed to date' },
  { value: '38', label: 'Funded & Launched' },
]

export const LAUNCHES: LaunchDef[] = [
  {
    title: 'New River Solar Collective',
    status: 'live',
    fdv: '$72K FDV',
    meta: '4 days left',
    description: 'Community-owned solar for the New River valley, with payouts split among member households.',
    committed: '$32k',
    goal: '$50k goal · 64%',
    progress: 64,
    cta: 'Back this DUNA',
    ctaHref: '/login',
    ctaStyle: 'gold',
  },
  {
    title: 'Mountain Mesh Expansion',
    status: 'live',
    fdv: '$140K FDV',
    meta: '2 days left',
    description: 'Extending county wireless coverage to three more hollows, metered and settled on-chain.',
    committed: '$61k',
    goal: '$80k goal · 76%',
    progress: 76,
    cta: 'Back this DUNA',
    ctaHref: '/login',
    ctaStyle: 'gold',
  },
  {
    title: 'Coalfield Compute',
    status: 'live',
    fdv: '$210K FDV',
    meta: '6 days left',
    description: 'A member-run GPU and storage network turning idle coalfield power into agentic compute.',
    committed: '$54k',
    goal: '$120k goal · 45%',
    progress: 45,
    cta: 'Back this DUNA',
    ctaHref: '/login',
    ctaStyle: 'gold',
  },
  {
    title: 'Holler Health Network',
    status: 'live',
    fdv: '$96K FDV',
    meta: '5 days left',
    description: 'Telehealth and care navigation governed by the patients it serves.',
    committed: '$18k',
    goal: '$60k goal · 30%',
    progress: 30,
    cta: 'Back this DUNA',
    ctaHref: '/login',
    ctaStyle: 'gold',
  },
  {
    title: 'WV Commerce Club',
    status: 'funded',
    fdv: '$1.5M FDV',
    meta: 'Overraised · Launched',
    description: 'A network of Appalachian small businesses pooling reach, capital, and clients.',
    committed: '$2.1M',
    goal: '$100k goal · 2100%',
    progress: 100,
    cta: 'View DUNA',
    ctaHref: '/duna/wvcc',
    ctaStyle: 'ghost',
  },
  {
    title: 'Rhododendron AI',
    status: 'funded',
    fdv: '$2.1M FDV',
    meta: 'Overraised · Launched',
    description: 'Fleets of accountable agents operating under real legal standing.',
    committed: '$1.2M',
    goal: '$50k goal · 2400%',
    progress: 100,
    cta: 'View DUNA',
    ctaHref: '/duna/rhodo',
    ctaStyle: 'ghost',
  },
  {
    title: 'Appalachia Provisions',
    status: 'funded',
    fdv: '$516K FDV',
    meta: 'Overraised · Launched',
    description: 'Member-governed co-op giving small farms a shared route to buyers worldwide.',
    committed: '$640k',
    goal: '$60k goal · 1067%',
    progress: 100,
    cta: 'View DUNA',
    ctaHref: '/duna/prov',
    ctaStyle: 'ghost',
  },
  {
    title: 'Wheeling Opera House Revival',
    status: 'refunding',
    fdv: '$52K FDV',
    meta: 'Goal not met · Backers refunded',
    description: 'A member-owned plan to reopen and program the historic Wheeling stage.',
    committed: '$35k',
    goal: '$200k goal · 18%',
    progress: 18,
    cta: 'Refunding backers',
    ctaHref: '/launchpad',
    ctaStyle: 'ghost',
  },
  {
    title: 'Tygart Trails Trust',
    status: 'refunding',
    fdv: '$26K FDV',
    meta: 'Goal not met · Backers refunded',
    description: 'Trail access and stewardship for the Tygart valley, held in common.',
    committed: '$9k',
    goal: '$40k goal · 22%',
    progress: 22,
    cta: 'Refunding backers',
    ctaHref: '/launchpad',
    ctaStyle: 'ghost',
  },
]

export const LAUNCH_FILTERS = ['All', 'Live', 'Funded', 'Refunding'] as const
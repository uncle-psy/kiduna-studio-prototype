// ============================================
// Kinship Studio — Navigation Structure
// Platform-level and Game-level nav definitions 
// ============================================

export interface NavItem {
  key: string
  href: string
  label: string
  icon: string // Lucide icon name
  hint?: string // Subtitle hint text
  countKey?: string
  isNew?: boolean
  locked?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// ─── Platform-Level Navigation ──────────────────────────
// Shown when viewing a platform (not inside a game)

export const PLATFORM_NAV: NavGroup[] = [
  {
    label: 'AGENTS',
    items: [
      {
        key: 'avatar',
        href: '/agents/avatar',
        label: 'Allies',
        icon: 'Crown',
      },
      {
        key: 'performer',
        href: '/agents/performer',
        label: 'Performer',
        icon: 'Bot',
      },
      {
        key: 'inform',
        href: '/knowledge',
        label: 'Inform',
        icon: 'ScanSearch',
        hint: 'Knowledge',
      },
      {
        key: 'instruct',
        href: '/prompts',
        label: 'Instruct',
        icon: 'MessageSquare',
        hint: 'Stance',
      },
      {
        key: 'empower',
        href: '/empower',
        label: 'Empower',
        icon: 'Zap',
        hint: 'Abilities',
      },
      {
        key: 'enact',
        href: '/align',
        label: 'Enact',
        icon: 'Activity',
        hint: 'Flows',
      },
      {
        key: 'actions',
        href: '/approve',
        label: 'Actions',
        icon: 'ShieldCheck',
        hint: 'Review AI actions',
        locked: false,
        countKey: 'pendingApprovals',
      },
    ],
  },
  {
    label: 'ECONOMICS',
    items: [
      {
        key: 'offerings',
        href: '/offerings',
        label: 'Offerings',
        icon: 'Diamond',
      },
      {
        key: 'coins',
        href: '/coins',
        label: 'Coins',
        icon: 'Coins',
      },
      {
        key: 'codes',
        href: '/codes',
        label: 'Codes',
        icon: 'Link2',
      },
      {
        key: 'wallet',
        href: '/wallet',
        label: 'Wallet',
        icon: 'Wallet',
        isNew: false,
      },
    ],
  },
  {
    label: 'SQUAD',
    items: [
      {
        key: 'alliances',
        href: '/team',
        label: 'Alliances',
        icon: 'Users',
      },
      {
        key: 'send-funds',
        href: '/team/select/send-funds',
        label: 'Send Funds',
        icon: 'Wallet',
        locked: true,
      },
      {
        key: 'members',
        href: '/team/select/members',
        label: 'Members',
        icon: 'UsersRound',
        locked: true,
      },
      {
        key: 'proposals',
        href: '/team/select/proposals',
        label: 'Proposals',
        icon: 'Gavel',
        locked: true,
      },
      {
        key: 'approval-threshold',
        href: '/team/select/approval-threshold',
        label: 'Approval Threshold',
        icon: 'ShieldCheck',
        locked: true,
      },
    ],
  },
  {
    label: 'FLOWS',
    items: [
      {
        key: 'gatherings',
        href: '/games',
        label: 'Gatherings',
        icon: 'CalendarDays',
        locked: true,
      },
      {
        key: 'library',
        href: '/assets',
        label: 'Library',
        icon: 'BarChart2',
        locked: true,
      },
      {
        key: 'upload',
        href: '/assets/upload',
        label: 'Upload',
        icon: 'Upload',
        locked: true,
      },
    ],
  },
  {
    label: 'MARKET',
    items: [
       {
        key: 'kiduna',
        href: '/context',
        label: 'Kiduna',
        icon: 'Flag',
      },
      {
        key: 'objectives',
        href: '/objectives',
        label: 'Objectives',
        icon: 'Target',
        locked: true,
      },
      {
        key: 'markets',
        href: '/markets',
        label: 'Markets',
        icon: 'TrendingUp',
        locked: true,
      },
      {
        key: 'electors',
        href: '/electors',
        label: 'Electors',
        icon: 'UsersRound',
        locked: true,
      },
      {
        key: 'launchpad',
        href: '/launchpad',
        label: 'Launchpad',
        icon: 'Rocket',
        isNew: false,
      },
    ],
  },
  // {
  //   label: 'LAYERS',
  //   items: [
     
      // {
      //   key: 'missions',
      //   href: '/context?view=missions',
      //   label: 'Missions',
      //   icon: 'Target',
      // },
      // {
      //   key: 'policies',
      //   href: '/agents/avatar?view=policy',
      //   label: 'Policies',
      //   icon: 'FileText',
      // },
      // {
      //   key: 'personal',
      //   href: '/agents/avatar?view=personal',
      //   label: 'Personal',
      //   icon: 'UserRound',
      // },
    // ],
  
]

// ─── Game-Level Navigation ──────────────────────────────
// Shown when inside a specific game

export const GAME_NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        key: 'dashboard',
        href: '/dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
      },
      {
        key: 'analytics',
        href: '/analytics',
        label: 'Analytics',
        icon: 'BarChart3',
      },
      {
        key: 'realtime',
        href: '/realtime',
        label: 'Real-time',
        icon: 'Zap',
        isNew: true,
      },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        key: 'game-editor',
        href: '/game-editor',
        label: 'Game Editor',
        icon: 'Sparkles',
      },
      {
        key: 'scenes',
        href: '/scenes',
        label: 'Scenes',
        icon: 'Map',
        countKey: 'scenes',
      },
      {
        key: 'npcs',
        href: '/npcs',
        label: 'NPCs',
        icon: 'Users',
      },
      {
        key: 'challenges',
        href: '/challenges',
        label: 'Challenges',
        icon: 'Target',
      },
      {
        key: 'quests',
        href: '/quests',
        label: 'Quests',
        icon: 'Scroll',
      },
      {
        key: 'routes',
        href: '/routes',
        label: 'Routes',
        icon: 'Route',
      },
    ],
  },
  {
    label: 'Engagement',
    items: [
      {
        key: 'leaderboards',
        href: '/leaderboards',
        label: 'Leaderboards',
        icon: 'Trophy',
      },
      {
        key: 'achievements',
        href: '/achievements',
        label: 'Achievements',
        icon: 'Award',
      },
    ],
  },
  {
    label: 'Story',
    items: [
      {
        key: 'arcs',
        href: '/arcs',
        label: 'Story Arcs',
        icon: 'BookOpen',
      },
      {
        key: 'cycles',
        href: '/cycles',
        label: 'Cycles',
        icon: 'RefreshCw',
      },
      {
        key: 'worldmap',
        href: '/worldmap',
        label: 'World Map',
        icon: 'Globe',
      },
    ],
  },
  {
    label: '',
    items: [
      {
        key: 'game-settings',
        href: '/game-settings',
        label: 'Game Settings',
        icon: 'Settings',
      },
      {
        key: 'publish',
        href: '/publish',
        label: 'Publish',
        icon: 'Rocket',
      },
      {
        key: 'playtester',
        href: '/playtester',
        label: 'Playtester',
        icon: 'Play',
      },
    ],
  },
]
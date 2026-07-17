/**
 * Market sidebar navigation config.
 *
 * Icon values are Lucide component names imported by Sidebar.tsx.
 * Items without an `href` render as non-clickable placeholder labels.
 */
export type NavItem = {
  /** If omitted, renders as a non-clickable label. */
  href?: string;
  /** Lucide icon component name */
  icon: string;
  label: string;
  count?: number;
  /** highlight the icon in the accent color */
  iconAccent?: boolean;
  /** sub-item indentation */
  sub?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Decide",
    items: [
      { href: "/market", icon: "LayoutDashboard", label: "Dashboard" },
      { href: "/market/objectives", icon: "Crosshair", label: "Objectives" },
      { href: "/market/proposals", icon: "FileText", label: "Proposals" },
    ],
  },
  {
    label: "Participants",
    items: [
      { href: "/market/electors", icon: "Users", label: "Electors" },
      { href: "/market/redeem-history", icon: "Wallet", label: "Redeem History" },
    ],
  },
  {
    label: "Capital",
    items: [
      { href: "/market/treasury", icon: "Landmark", label: "Treasury" },
      { href: "/market/tokens", icon: "Coins", label: "Tokens & vesting" },
      { href: "/launchpad", icon: "Rocket", label: "Launchpad" },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/market/settings/identity", icon: "Settings", label: "Settings" },
    ],
  },
];
/**
 * Proposal type registry — drives the chooser (`create-start`) and downstream filters.
 *
 * Each entry corresponds to one "wrapped instruction" the futarchy proposal
 * can execute on Pass. All 6 types are available for all markets.
 */
export type ProposalKind =
  | "spend"
  | "param"
  | "mint"
  | "metadata"
  | "liquidity"
  | "perf";

export interface ProposalTypeMeta {
  /** Stable id used in URLs and config. */
  id: ProposalKind;
  /** Route to the create form for this type. */
  route: string;
  /** CSS class hook on the chooser tab (existing styles map to these). */
  cssTag: string;
  /** Single-character or short glyph shown in the tab. */
  icon: string;
  /** Display name. */
  name: string;
  /** One-line hint shown under the name. */
  hint: string;
  /** Part of the locked v1 scope. */
  inV1: boolean;
}

export const PROPOSAL_TYPES: ProposalTypeMeta[] = [
  {
    id: "spend",
    route: "/market/create-spend",
    cssTag: "spend",
    icon: "$",
    name: "Send funds",
    hint: "Pay a vendor, reimburse, or distribute",
    inV1: true,
  },
  {
    id: "param",
    route: "/market/create-param",
    cssTag: "param",
    icon: "⚙",
    name: "Change a setting",
    hint: "Update DAO parameters",
    inV1: true,
  },
  {
    id: "mint",
    route: "/market/create-mint",
    cssTag: "mint",
    icon: "◆",
    name: "Mint tokens",
    hint: "Issue new utility tokens",
    inV1: true,
  },
  {
    id: "metadata",
    route: "/market/create-metadata",
    cssTag: "param",
    icon: "✎",
    name: "Update token metadata",
    hint: "Change token name, symbol, image, or URI",
    inV1: true,
  },
  {
    id: "liquidity",
    route: "/market/create-liquidity",
    cssTag: "spend",
    icon: "≋",
    name: "Adjust treasury liquidity",
    hint: "Add or remove pool liquidity",
    inV1: true,
  },
  {
    id: "perf",
    route: "/market/create-perf",
    cssTag: "perf",
    icon: "◷",
    name: "Performance grant",
    hint: "Conditional reward (price- or time-based)",
    inV1: true,
  },
];

/** Return all v1 proposal types. */
export function proposalTypesFor(): ProposalTypeMeta[] {
  return PROPOSAL_TYPES.filter((t) => t.inV1);
}

/** Look up a proposal type meta by id. */
export function findProposalType(id: ProposalKind): ProposalTypeMeta | undefined {
  return PROPOSAL_TYPES.find((t) => t.id === id);
}

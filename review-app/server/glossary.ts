/**
 * Static glossary for the Kinship Market UI.
 *
 * Read-only. Edits ship via deploy. Surface: the `?` overlay in the
 * mobile app and Studio.
 *
 * Slug values match the keys used in UI `<HelpTip slug="..." />` calls.
 */

export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
}

export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  {
    slug: "elector",
    term: "Elector",
    definition:
      "A citizen's voting agent in a Market. Each Elector is bound to one Objective and holds a server-managed Solana keypair that signs its trades. Citizens configure weights across the Objective's dimensions; the Elector uses those weights to score proposals and trade accordingly.",
  },
  {
    slug: "operator",
    term: "Operator",
    definition:
      "An agent the sponsor binds to an Objective. Operators author proposals, run the futarchy market, and execute on-chain transactions when proposals pass. They sign with the same Squads multisig as the sponsor.",
  },
  {
    slug: "objective",
    term: "Objective",
    definition:
      "A scoped governance domain inside a Market — for example, Growth, Operations, or Tokenomics. Each Objective has its own set of Dimensions (weighted criteria), allowed proposal kinds, and trading window.",
  },
  {
    slug: "dimension",
    term: "Dimension",
    definition:
      "A measurable criterion within an Objective. Dimension weights sum to 100% and define what 'good' looks like — Revenue, Active Users, Cost per Conversion, and so on. Operators claim impact on each Dimension when they propose, and Electors trade based on whether they believe those claims.",
  },
  {
    slug: "futarchy",
    term: "Futarchy",
    definition:
      "A governance mechanism where 'votes' are buy/sell trades in two conditional markets — one for if the proposal passes, one for if it fails. The proposal passes if the pass-market price exceeds the fail-market price by the configured margin (TWAP'd over the trading window).",
  },
  {
    slug: "twap",
    term: "TWAP",
    definition:
      "Time-Weighted Average Price. The average market price over a window, used to decide proposal outcomes — short-term price spikes don't dominate.",
  },
  {
    slug: "skin-in-the-game",
    term: "Skin in the game",
    definition:
      "Electors stake real USDC on their trades. If their side wins, they keep the losing side's stakes; if they lose, their stake is forfeit. This aligns voting with belief plus accountability.",
  },
];

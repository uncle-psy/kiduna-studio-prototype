/**
 * Objective templates.
 *
 * These are the canonical preset Objectives that a sponsor picks from
 * when creating a Market. The sponsor selects one (or more), and the
 * backend clones it into the new Market — turning the template into a
 * real Objective row with its Dimensions.
 *
 * Templates are not stored in the database. They live here, in code,
 * so editing them is a deploy (not a runtime mutation). If editable
 * templates become a real need later, an `objective_templates` table
 * can wrap this data without changing the template shape.
 *
 * Each template's slug is stable — the create-market flow may store
 * `Objective.sourceTemplateSlug` if you want to remember which template
 * an Objective originated from. (Not in v1 schema; add later.)
 */

import type { ProposalKind } from "@prisma/client";

export interface DimensionTemplate {
  slug: string;
  name: string;
  description: string;
  weightPct: number;
}

export interface ObjectiveTemplate {
  slug: string;
  icon: string;
  name: string;
  description: string;
  /** Which proposal kinds Operators on this Objective may author. */
  allowedProposalKinds: ProposalKind[];
  /** Default trading window for proposals under this Objective. */
  /** Default pass margin. */
  /** Weights must sum to 100 across an Objective's Dimensions. */
  dimensions: DimensionTemplate[];
}

export const OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
  {
    slug: "growth",
    icon: "📣",
    name: "Growth",
    description: "Marketing, sales, user acquisition decisions.",
    allowedProposalKinds: ["spend", "param"],
    dimensions: [
      {
        slug: "revenue",
        name: "Revenue growth",
        description: "Top-line business impact",
        weightPct: 40,
      },
      {
        slug: "user-love",
        name: "User love",
        description: "Customer satisfaction & NPS",
        weightPct: 25,
      },
      {
        slug: "speed",
        name: "Speed",
        description: "Time-to-market",
        weightPct: 20,
      },
      {
        slug: "runway",
        name: "Runway impact",
        description: "Cash burn effect",
        weightPct: 15,
      },
    ],
  },

  {
    slug: "operations",
    icon: "⚙️",
    name: "Operations",
    description: "Hiring, vendor contracts, tooling, day-to-day.",
    allowedProposalKinds: ["spend", "param", "liquidity"],
    dimensions: [
      {
        slug: "cost",
        name: "Cost reduction",
        description: "Operating efficiency",
        weightPct: 35,
      },
      {
        slug: "reliability",
        name: "Reliability",
        description: "Uptime, predictability",
        weightPct: 30,
      },
      {
        slug: "morale",
        name: "Team morale",
        description: "Wellbeing & retention",
        weightPct: 20,
      },
      {
        slug: "speed",
        name: "Speed",
        description: "Throughput",
        weightPct: 15,
      },
    ],
  },

  {
    slug: "strategy",
    icon: "🧭",
    name: "Strategy",
    description: "Long-term direction and big bets.",
    allowedProposalKinds: ["spend", "param", "metadata", "mint", "perf"],
    dimensions: [
      {
        slug: "long-term",
        name: "Vision alignment",
        description: "Fit with long-term goals",
        weightPct: 35,
      },
      {
        slug: "optionality",
        name: "Optionality",
        description: "Future paths preserved",
        weightPct: 30,
      },
      {
        slug: "brand",
        name: "Brand equity",
        description: "Reputational impact",
        weightPct: 20,
      },
      {
        slug: "risk",
        name: "Risk",
        description: "Downside exposure",
        weightPct: 15,
      },
    ],
  },

  {
    slug: "tokenomics",
    icon: "💎",
    name: "Tokenomics",
    description: "Token supply, liquidity, and metadata changes.",
    allowedProposalKinds: ["mint", "metadata", "liquidity", "perf"],
    dimensions: [
      {
        slug: "holder-value",
        name: "Holder value",
        description: "Effect on token holders",
        weightPct: 40,
      },
      {
        slug: "supply-health",
        name: "Supply health",
        description: "Long-term supply dynamics",
        weightPct: 30,
      },
      {
        slug: "liquidity",
        name: "Liquidity",
        description: "Pool depth & resilience",
        weightPct: 30,
      },
    ],
  },
];

/** Look up a template by slug. Returns undefined if not found. */
export function findObjectiveTemplate(slug: string): ObjectiveTemplate | undefined {
  return OBJECTIVE_TEMPLATES.find((t) => t.slug === slug);
}

/**
 * Runtime assertion: each template's dimension weights must sum to 100.
 * Call this in CI or on startup to catch bad edits.
 */
export function validateObjectiveTemplates(): void {
  for (const t of OBJECTIVE_TEMPLATES) {
    const total = t.dimensions.reduce((s, d) => s + d.weightPct, 0);
    if (total !== 100) {
      throw new Error(
        `Objective template "${t.slug}" dimensions sum to ${total}, expected 100`,
      );
    }
  }
}
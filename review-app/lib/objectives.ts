/**
 * Objectives — types and API helpers.
 *
 * Objectives are reusable categories of decisions. Each Objective declares
 * which proposal types apply to it — Operators on this Objective can author
 * any of these types, but no others.
 *
 * In production, templates come from GET /api/v1/objective-templates.
 * The MOCK_OBJECTIVES constant is kept only as a static fallback.
 */
import type { ProposalKind } from "./proposal-types";

export interface Dimension {
  id: string;
  name: string;
  description: string;
  weightPct: number;
}

export interface Objective {
  id: string;
  /** Display icon (text symbol or emoji). */
  icon: string;
  name: string;
  description: string;
  dimensions: Dimension[];
  allowedProposalTypes: ProposalKind[];
}

/* ── API response shape ────────────────────────────────────────────── */

interface TemplateResponse {
  items: Array<{
    slug: string;
    icon: string;
    name: string;
    description: string;
    allowedProposalKinds: ProposalKind[];
    dimensions: Array<{
      slug: string;
      name: string;
      description: string;
      weightPct: number;
    }>;
  }>;
}

/**
 * Fetch Objective templates from the backend API.
 * Maps the server's template shape (slug-based) to the client Objective
 * type (id-based) so the rest of the UI stays unchanged.
 */
export async function fetchObjectiveTemplates(): Promise<Objective[]> {
  const res = await fetch("/api/v1/objective-templates");
  if (!res.ok) {
    throw new Error(`Failed to load objective templates (${res.status})`);
  }
  const data: TemplateResponse = await res.json();

  return data.items.map((t) => ({
    id: t.slug,
    icon: t.icon,
    name: t.name,
    description: t.description,
    dimensions: t.dimensions.map((d) => ({
      id: d.slug,
      name: d.name,
      description: d.description,
      weightPct: d.weightPct,
    })),
    allowedProposalTypes: t.allowedProposalKinds,
  }));
}

/**
 * Look up an Objective by id from a given list.
 * Use with the result of fetchObjectiveTemplates().
 */
export function findObjectiveIn(
  objectives: Objective[],
  id: string,
): Objective | undefined {
  return objectives.find((o) => o.id === id);
}

/* ── Legacy exports (deprecated — use fetchObjectiveTemplates) ──── */

/** @deprecated Use fetchObjectiveTemplates() instead. */
export const MOCK_OBJECTIVES: Objective[] = [
  {
    id: "growth",
    icon: "↗",
    name: "Growth",
    description: "Marketing, sales, user acquisition decisions.",
    dimensions: [
      { id: "revenue", name: "Revenue growth", description: "Top-line business impact", weightPct: 40 },
      { id: "user-love", name: "User love", description: "Customer satisfaction & NPS", weightPct: 25 },
      { id: "speed", name: "Speed", description: "Time-to-market", weightPct: 20 },
      { id: "runway", name: "Runway impact", description: "Cash burn effect", weightPct: 15 },
    ],
    allowedProposalTypes: ["spend", "param"],
  },
];

/** @deprecated Use findObjectiveIn() with fetched data instead. */
export function findObjective(id: string): Objective | undefined {
  return MOCK_OBJECTIVES.find((o) => o.id === id);
}
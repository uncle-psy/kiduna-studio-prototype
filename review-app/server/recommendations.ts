/**
 * Recommendation engine.
 *
 * When a proposal opens, the system computes a recommended trade for
 * each active Elector on the Objective. The recommendation is derived
 * locally from:
 *   - The Elector's per-Dimension weights
 *   - The Operator's claimed impact per Dimension (range [-1, 1])
 *
 * Score = sum(weight_pct * impact_claim) / 100, in [-1, 1].
 * Positive score → Pass; negative → Fail.
 *
 * Stake = 10% of the Elector's available balance, capped at $100.
 * (Configurable later. Hard-coded for v1.)
 *
 * Rationale is a human-readable string for the UI to show next to
 * each recommendation.
 */

export interface RecommendationInput {
  electorWeights: Array<{
    dimensionId: string;
    dimensionName: string;
    weightPct: number;
  }>;
  impactClaims: Array<{
    dimensionId: string;
    dimensionName: string;
    claim: number;
  }>;
  availableBalanceUsd: number;
}

export interface Recommendation {
  side: "pass" | "fail";
  stakeUsd: number;
  score: number;
  rationale: string;
}

const STAKE_PCT_OF_BALANCE = 0.10;
const STAKE_MAX_USD = 100;

export function recommendTrade(input: RecommendationInput): Recommendation {
  // Build dimension → weight map for quick lookup.
  const weightById = new Map<string, number>();
  for (const w of input.electorWeights) {
    weightById.set(w.dimensionId, w.weightPct);
  }

  // Dimension-weighted sum of claims.
  let score = 0;
  const contributions: Array<{ name: string; contribution: number }> = [];
  for (const c of input.impactClaims) {
    const weight = weightById.get(c.dimensionId) ?? 0;
    const contribution = (weight * c.claim) / 100;
    score += contribution;
    if (Math.abs(contribution) >= 0.05) {
      contributions.push({ name: c.dimensionName, contribution });
    }
  }

  const side: "pass" | "fail" = score >= 0 ? "pass" : "fail";

  // Stake size: 10% of balance, max $100. Confidence-scaled so a
  // near-zero score yields a smaller stake than a strong conviction.
  const conviction = Math.min(1, Math.abs(score));
  const stakeUsd = Math.min(
    STAKE_MAX_USD,
    Math.max(1, input.availableBalanceUsd * STAKE_PCT_OF_BALANCE * conviction),
  );

  // Top 2 contributions by absolute value, formatted for the UI.
  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const top = contributions.slice(0, 2);
  const rationaleParts = top.map(
    (c) => `${c.name} ${c.contribution >= 0 ? "+" : ""}${c.contribution.toFixed(2)}`,
  );
  const rationale =
    rationaleParts.length > 0
      ? `${side.toUpperCase()} favored: ${rationaleParts.join(", ")} (score ${score.toFixed(2)})`
      : `Score ${score.toFixed(2)} — no strong signal`;

  return {
    side,
    stakeUsd: Math.round(stakeUsd * 100) / 100,
    score: Math.round(score * 100) / 100,
    rationale,
  };
}

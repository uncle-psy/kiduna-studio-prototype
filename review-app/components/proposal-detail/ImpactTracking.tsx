import { Annote, Card, CardSub, CardTitle } from "@/components/ui/index";
import { findObjective } from "@/lib/objectives";
import type { Proposal } from "@/lib/proposal-detail-mocks";

/**
 * The most important post-resolution view: did the proposal deliver the
 * impact it claimed? Renders one row per dimension showing claimed value,
 * measured value (if available), and the gap.
 *
 * If no measurement has happened yet, the rows show a "pending" state so
 * the surface doesn't look broken before the data pipeline lands.
 */
export function ImpactTracking({ proposal }: { proposal: Proposal }) {
  if (proposal.status !== "resolved") return null;
  const objective = findObjective(proposal.objectiveId);
  if (!objective) return null;

  const anyMeasured = proposal.impactClaims.some(
    (c) => typeof c.measured === "number",
  );

  return (
    <Card className="mb-[14px]">
      <CardTitle>Impact tracking</CardTitle>
      <CardSub>
        Operator&apos;s claimed impact vs measured outcome on each dimension
        of the <b className="text-fg">{objective.name}</b> objective.
      </CardSub>

      <table className="lst w-full mt-[10px]">
        <thead>
          <tr>
            <th className="text-left">Dimension</th>
            <th className="text-right">Claimed</th>
            <th className="text-right">Measured</th>
            <th className="text-right">Δ</th>
          </tr>
        </thead>
        <tbody>
          {objective.dimensions.map((dim) => {
            const claim = proposal.impactClaims.find(
              (c) => c.dimensionId === dim.id,
            );
            const claimed = claim?.claim ?? 0;
            const measured = claim?.measured;
            const delta =
              typeof measured === "number" ? measured - claimed : null;

            return (
              <tr key={dim.id}>
                <td>{dim.name}</td>
                <td className="text-right font-mono text-[12px] text-subtle">
                  {claimed > 0 ? "+" : ""}
                  {claimed.toFixed(2)}
                </td>
                <td className="text-right font-mono text-[12px]">
                  {typeof measured === "number" ? (
                    <span className="text-fg">
                      {measured > 0 ? "+" : ""}
                      {measured.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted">pending</span>
                  )}
                </td>
                <td
                  className={`text-right font-mono text-[12px] ${
                    delta === null
                      ? "text-muted"
                      : delta >= 0
                      ? "text-pass"
                      : "text-fail"
                  }`}
                >
                  {delta === null
                    ? "—"
                    : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!anyMeasured && (
        <Annote className="mt-[12px]">
          <b>Measurement pending.</b> Outcome data has not been ingested yet
          for this proposal. The measurement window typically starts 30 days
          after execution.
        </Annote>
      )}

      {proposal.measuredAt && (
        <div className="mt-[10px] text-[11px] font-mono text-muted">
          Last measured {new Date(proposal.measuredAt).toLocaleString()}
        </div>
      )}
    </Card>
  );
}

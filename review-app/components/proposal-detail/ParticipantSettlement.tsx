import { Card, CardSub, CardTitle } from "@/components/ui/index";
import type { Proposal } from "@/lib/proposal-detail-mocks";

/**
 * Closes the loop on the futarchy mechanism: pass-backers paid from
 * fail-backers' losses, sponsor vault liquidity returned, etc. Only
 * shown on resolved proposals.
 */
export function ParticipantSettlement({ proposal }: { proposal: Proposal }) {
  if (proposal.status !== "resolved" || !proposal.settlement) return null;

  const fmt = (n: number) =>
    `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString()}`;

  return (
    <Card className="mb-[14px]">
      <CardTitle className="text-[14px]">Settlement</CardTitle>
      <CardSub>
        How stakes were redistributed. Backers of the winning side were paid
        out from losing-side stakes.
      </CardSub>

      <table className="lst w-full mt-[10px]">
        <thead>
          <tr>
            <th className="text-left">Side</th>
            <th className="text-right">Electors</th>
            <th className="text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          {proposal.settlement.map((row) => {
            const tone = row.amount >= 0 ? "text-pass" : "text-fail";
            return (
              <tr key={row.side}>
                <td>
                  <b
                    className={
                      row.side === "pass" ? "text-pass" : "text-fail"
                    }
                  >
                    {row.side === "pass" ? "PASS" : "FAIL"}
                  </b>
                </td>
                <td className="text-right">{row.electors}</td>
                <td className={`text-right font-mono ${tone}`}>
                  {fmt(row.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

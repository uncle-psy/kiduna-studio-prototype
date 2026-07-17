"use client";

import { useRouter } from "next/navigation";
import { Card, ActionTypeBadge, LinkButton } from "@/components/ui/index";
import { EmptyState } from "./EmptyState";
import type { OpenProposal } from "@/lib/dashboard-mocks";

export function OpenProposalsTable({
  proposals,
  newProposalHref = "/market/create-start",
}: {
  proposals: OpenProposal[];
  newProposalHref?: string;
}) {
  const router = useRouter();

  return (
    <Card title="Open proposals" sub="Markets currently trading.">
      {proposals.length === 0 ? (
        <EmptyState
          title="No open proposals"
          description="Start one to put a decision in front of the market."
          action={
            <LinkButton href={newProposalHref} variant="primary">
              ＋ New proposal
            </LinkButton>
          }
        />
      ) : (
        <table className="lst">
          <thead>
            <tr>
              <th>Proposal</th>
              <th>Type</th>
              <th>Pass / Fail</th>
              <th>Closes</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr
                key={p.title}
                className={p.href ? "cursor-pointer" : undefined}
                onClick={p.href ? () => router.push(p.href!) : undefined}
              >
                <td>
                  <b>{p.title}</b>
                  <div className="text-muted text-[11px]">under {p.objective}</div>
                </td>
                <td>
                  <ActionTypeBadge type={p.type.kind}>{p.type.label}</ActionTypeBadge>
                </td>
                <td>
                  <span className="text-pass">{p.pass}</span> /{" "}
                  <span className="text-fail">{p.fail}</span>
                </td>
                <td>{p.closesIn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
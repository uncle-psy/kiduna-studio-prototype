import Link from "next/link";
import { findOperator, toneLabel } from "@/lib/operators";
import type { Proposal } from "@/lib/proposal-detail-mocks";

export function AuthoringTrail({ proposal }: { proposal: Proposal }) {
  const op = findOperator(proposal.operatorId);

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-3">Authored by</h3>
      {!op ? (
        <p className="text-xs text-muted">Operator not found.</p>
      ) : (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 grid place-items-center font-mono text-xs text-accent shrink-0">
            {op.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white font-medium">{op.name}</div>
            <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{op.description}</p>
            <div className="text-[10px] font-mono text-muted mt-1.5 tracking-wider uppercase">
              {toneLabel(op.tone)} · {op.stats.proposalsPublished} published · {op.stats.passed}/{op.stats.passed + op.stats.failed || 1} passed
            </div>
          </div>
        </div>
      )}

      {proposal.rationale && (
        <div className="mt-3 pt-3 border-t border-card-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Rationale</div>
          <p className="text-xs text-muted leading-relaxed whitespace-pre-line">{proposal.rationale}</p>
        </div>
      )}

      {op && (
        <Link href="/market/settings/identity" className="block mt-3 text-[11px] text-accent hover:underline">
          View Operator →
        </Link>
      )}
    </div>
  );
}
import Link from "next/link";
import type { Proposal } from "@/lib/proposal-detail-mocks";

export function ActivityCard({ proposal }: { proposal: Proposal }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-3">Elector activity</h3>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted">Active electors</span>
          <span className="text-white font-semibold">{proposal.activeElectors} / {proposal.totalElectors}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Trades</span>
          <span className="text-white font-semibold">{proposal.trades}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Volume</span>
          <span className="text-white font-semibold">${proposal.volumeUsd.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-card-border">
        <Link href="/market/electors" className="text-[11px] text-accent hover:underline">
          See how Electors are deciding →
        </Link>
      </div>
    </div>
  );
}
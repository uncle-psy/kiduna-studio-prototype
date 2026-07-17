import Link from "next/link";
import { Card, Badge } from "@/components/ui/index";
import { EmptyState } from "./EmptyState";
import type { InFlightRun } from "@/lib/dashboard-mocks";

export function InFlightRuns({ runs }: { runs: InFlightRun[] }) {
  return (
    <Card title="In flight" sub="Passed proposals being carried out.">
      {runs.length === 0 ? (
        <EmptyState
          title="Nothing in flight"
          description="When a proposal passes, the assigned executor's run will appear here."
        />
      ) : (
        runs.map((r) => (
          <Link
            key={r.executor}
            className="border-[1px] border-border rounded-[10px] p-[14px] mb-[12px] cursor-pointer block"
            href={r.href}
          >
            <div className="flex justify-between">
              <b className="text-[13px]">{r.executor}</b>
              <Badge variant="live" dot>
                RUNNING
              </Badge>
            </div>
            <div className="text-[12px] text-muted mt-[4px]">{r.description}</div>
            <div className="mt-[10px] text-[11px] font-mono text-muted">
              {r.step} · {r.spend} · {r.timeLeft}
            </div>
            <div className="h-[4px] bg-bg rounded-[4px] mt-[8px] overflow-hidden">
              <div
                className="h-full bg-accent"
                // Data-driven width — not a theme value.
                style={{ width: `${r.progressPct}%` }}
              />
            </div>
          </Link>
        ))
      )}
    </Card>
  );
}
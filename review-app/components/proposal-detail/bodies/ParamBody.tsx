import type { Proposal } from "@/lib/proposal-detail-mocks";

// Map raw param keys to human-readable labels
const PARAM_LABELS: Record<string, string> = {
  passThresholdBps: "Pass threshold (bps)",
  secondsPerProposal: "Trading window (seconds)",
  minQuoteFutarchicLiquidity: "Min quote liquidity",
  minBaseFutarchicLiquidity: "Min base liquidity",
  twapStartDelaySeconds: "TWAP start delay (seconds)",
  twapInitialObservation: "TWAP initial observation",
  twapMaxObservationChangePerUpdate: "TWAP max observation change",
};

function formatParamValue(path: string, value: string): string {
  const num = parseInt(value, 10);
  if (isNaN(num)) return value;
  if (path === "secondsPerProposal") {
    const h = num / 3600;
    return `${value} (${h}h)`;
  }
  if (path === "passThresholdBps") {
    return `${value} (${(num / 100).toFixed(1)}%)`;
  }
  return value;
}

export function ParamBody({ proposal }: { proposal: Proposal }) {
  if (proposal.kind !== "param") return null;
  const p = proposal.param;
  const label = PARAM_LABELS[p.parameterPath] ?? p.parameterPath;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-1">
        {proposal.status === "resolved" ? "What changed" : "What Pass would change"}
      </h3>
      <p className="text-[11px] text-muted mb-4">
        A single DAO parameter, updated atomically. Future proposals run against the new value immediately.
      </p>

      <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Parameter</div>
      <div className="text-sm text-white bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 font-medium mb-4">
        {label}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-card-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Before</div>
          <div className="font-mono text-base text-muted">{formatParamValue(p.parameterPath, p.valueBefore)}</div>
        </div>
        <div className="p-3 rounded-xl bg-green-500/[0.06] border border-green-500/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-green-400 mb-1">After</div>
          <div className="font-mono text-base text-green-400">{formatParamValue(p.parameterPath, p.valueAfter)}</div>
        </div>
      </div>

      {proposal.status === "resolved" && (
        <div className="mt-3 pt-3 border-t border-card-border text-[11px] text-muted font-mono">
          {p.effectiveSlot
            ? `Effective at slot ${p.effectiveSlot.toLocaleString()}`
            : "Pending execution"}
          {typeof p.proposalsSinceChange === "number" && (
            <span> · {p.proposalsSinceChange} proposal(s) since under new value</span>
          )}
        </div>
      )}
    </div>
  );
}
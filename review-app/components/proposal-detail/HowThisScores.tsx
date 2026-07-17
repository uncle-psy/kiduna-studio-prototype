import { findObjective } from "@/lib/objectives";
import type { Proposal } from "@/lib/proposal-detail-mocks";

export function HowThisScores({ proposal }: { proposal: Proposal }) {
  const objective = findObjective(proposal.objectiveId);
  if (!objective) return null;

  const net = objective.dimensions.reduce((sum, dim) => {
    const claim = proposal.impactClaims.find((c) => c.dimensionId === dim.id);
    return sum + (claim?.claim ?? 0) * (dim.weightPct / 100);
  }, 0);

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-1">How this scores</h3>
      <p className="text-[11px] text-muted mb-3">
        Claimed impact on each dimension of the <span className="text-white font-medium">{objective.name}</span> objective.
      </p>

      <div className="space-y-3">
        {objective.dimensions.map((dim) => {
          const claim = proposal.impactClaims.find((c) => c.dimensionId === dim.id);
          const value = claim?.claim ?? 0;
          const weighted = value * (dim.weightPct / 100);

          return (
            <div key={dim.id} className="grid grid-cols-[1fr_140px_60px] gap-3 items-center">
              <div className="min-w-0">
                <div className="text-xs text-white">{dim.name}</div>
                <div className="text-[10px] text-muted">weight {(dim.weightPct / 100).toFixed(2)}</div>
              </div>
              <ImpactBar value={value} />
              <div className={`text-right font-mono text-xs ${
                weighted > 0 ? "text-green-400" : weighted < 0 ? "text-red-400" : "text-muted"
              }`}>
                {weighted > 0 ? "+" : ""}{weighted.toFixed(3)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-card-border flex items-center justify-between text-xs">
        <span className="text-muted">Net weighted impact</span>
        <span className={`font-mono ${
          net > 0 ? "text-green-400" : net < 0 ? "text-red-400" : "text-muted"
        }`}>
          {net > 0 ? "+" : ""}{net.toFixed(3)}
        </span>
      </div>
    </div>
  );
}

function ImpactBar({ value }: { value: number }) {
  const pct = Math.max(-1, Math.min(1, value));
  const width = `${Math.abs(pct) * 50}%`;
  const isPos = pct >= 0;
  return (
    <div className="relative h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
      <div
        className="absolute top-0 bottom-0 transition-all rounded-full"
        style={{
          width,
          left: isPos ? "50%" : `calc(50% - ${width})`,
          background: isPos ? "#22c55e" : "#ef4444",
        }}
      />
    </div>
  );
}
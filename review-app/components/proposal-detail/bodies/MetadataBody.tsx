import type { Proposal } from "@/lib/proposal-detail-mocks";

export function MetadataBody({ proposal }: { proposal: Proposal }) {
  if (proposal.kind !== "metadata") return null;
  const m = proposal.metadata;
  if (!m) return null;

  const keys = Array.from(
    new Set([...Object.keys(m.fieldsBefore ?? {}), ...Object.keys(m.fieldsAfter ?? {})]),
  );

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-1">
        {proposal.status === "resolved" ? "What changed" : "What Pass would change"}
      </h3>
      <p className="text-[11px] text-muted mb-4">
        Token metadata update. Wallets and explorers reflect the change immediately on pass.
      </p>

      <div className="space-y-2">
        {keys.map((k) => {
          const before = (m.fieldsBefore as Record<string, string>)?.[k] ?? "—";
          const after = (m.fieldsAfter as Record<string, string>)?.[k] ?? "—";
          const changed = before !== after;

          return (
            <div key={k}
              className={`grid grid-cols-[80px_1fr_20px_1fr] gap-3 items-start p-3 rounded-xl ${
                changed ? "bg-amber-500/[0.04] border border-amber-500/20" : "bg-white/[0.02] border border-card-border"
              }`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted pt-0.5">{k}</div>
              <div className="text-xs font-mono text-muted break-all">{before}</div>
              <div className="text-muted text-xs text-center">→</div>
              <div className={`text-xs font-mono break-all ${changed ? "text-amber-400" : "text-muted"}`}>{after}</div>
            </div>
          );
        })}
      </div>

      {m.newMetadataUri && (
        <div className="mt-3 pt-3 border-t border-card-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">New URI: </span>
          <span className="text-xs font-mono text-amber-400 break-all">{m.newMetadataUri}</span>
        </div>
      )}

      {proposal.status === "resolved" && (
        <div className="mt-3 pt-3 border-t border-card-border text-[11px] text-muted font-mono">
          Tx · {m.txSignature ?? "Pending execution"}
        </div>
      )}
    </div>
  );
}
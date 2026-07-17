import { Badge } from "@/components/ui/index";
import type { Proposal } from "@/lib/proposal-detail-mocks";

/**
 * Status pill rendered in the page header. Live → countdown comes from the
 * parent so the caller can use the same <Countdown> for the badge label and
 * elsewhere. Resolved → final state with pass/fail margin.
 */
export function ProposalStatusBadge({
  proposal,
  countdownChild,
}: {
  proposal: Proposal;
  /** When live, the countdown element provided by the parent. */
  countdownChild?: React.ReactNode;
}) {
  if (proposal.status === "live") {
    return (
      <Badge variant="live" dot>
        LIVE · {countdownChild}
      </Badge>
    );
  }

  const passed = proposal.passTwap > proposal.failTwap + proposal.passMarginPct / 100;
  return (
    <Badge variant={passed ? "pass" : "fail"} dot>
      {passed ? "PASSED" : "FAILED"}
    </Badge>
  );
}

/**
 * Strip rendered above the action-type header when a proposal is resolved.
 * Surfaces final TWAP, margin, elector counts, executed-at timestamp.
 */
export function OutcomeHeader({ proposal }: { proposal: Proposal }) {
  if (proposal.status !== "resolved") return null;

  const passed = proposal.passTwap > proposal.failTwap + proposal.passMarginPct / 100;
  const marginBps = Math.round(
    (proposal.passTwap - proposal.failTwap) * 100 * 100,
  );

  return (
    <div
      className={`rounded-[12px] p-[14px_18px] mb-[16px] border-[1px] flex flex-wrap items-center justify-between gap-[14px] ${
        passed
          ? "bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.3)]"
          : "bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.3)]"
      }`}
    >
      <div className="flex items-center gap-[14px]">
        <div
          className={`text-[20px] font-display font-semibold ${
            passed ? "text-pass" : "text-fail"
          }`}
        >
          {passed ? "✓ Passed" : "✗ Failed"}
        </div>
        <div className="text-[12px] text-muted font-mono">
          <span className="text-pass">PASS {proposal.passTwap.toFixed(2)}</span>
          {"  ·  "}
          <span className="text-fail">FAIL {proposal.failTwap.toFixed(2)}</span>
          {"  ·  "}
          <span>{marginBps > 0 ? "+" : ""}{(marginBps / 100).toFixed(0)} bps margin</span>
        </div>
      </div>

      <div className="text-[11px] text-muted font-mono tracking-[0.06em] uppercase">
        {proposal.activeElectors} electors voted ·{" "}
        {proposal.executedAt
          ? `executed ${formatRelative(proposal.executedAt)}`
          : "execution pending"}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "in the future";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

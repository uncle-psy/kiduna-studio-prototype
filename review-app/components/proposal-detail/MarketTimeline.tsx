"use client";

import { useEffect, useState } from "react";

interface MarketTimelineProps {
  openedAt: string;
  closesAt: string;
  /** TWAP averaging window in hours, measured back from closesAt. */
  twapWindowHours: number;
  /** Optional milestones that appear after the close marker. */
  postResolution?: Array<{
    label: string;
    at: string;
    tone?: "pass" | "fail" | "info";
  }>;
}

/**
 * Visual strip showing the market lifecycle.
 *
 *   [─── opened ════ TWAP window ════● ─── closes ─── (executed) ─── (measured) ───]
 *
 * The marker stays at the current time. Post-resolution milestones are rendered
 * after the close. The TWAP averaging window is highlighted because that's the
 * portion of trading that actually counts.
 */
export function MarketTimeline({
  openedAt,
  closesAt,
  twapWindowHours,
  postResolution = [],
}: MarketTimelineProps) {
  const open = new Date(openedAt).getTime();
  const close = new Date(closesAt).getTime();

  // Extend the strip past close to fit any post-resolution milestones.
  const lastMs = Math.max(
    close + 60 * 60 * 1000, // a little headroom past close
    ...postResolution.map((m) => new Date(m.at).getTime()),
  );

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const totalSpan = lastMs - open;
  const pct = (t: number) => `${Math.max(0, Math.min(100, ((t - open) / totalSpan) * 100))}%`;

  const twapStart = close - twapWindowHours * 60 * 60 * 1000;
  const nowClamped = Math.min(Math.max(nowMs, open), lastMs);

  return (
    <div className="w-full">
      {/* Track */}
      <div className="relative h-[28px]">
        {/* Base rail */}
        <div className="absolute inset-y-[12px] inset-x-0 rounded-[3px] bg-white/[0.05] border border-card-border" />

        {/* TWAP averaging window — highlighted segment */}
        <div
          className="absolute inset-y-[12px] rounded-[3px] bg-accent/[0.18] border border-accent/40"
          style={{
            left: pct(twapStart),
            width: `calc(${pct(close)} - ${pct(twapStart)})`,
          }}
          title={`TWAP averaging window · ${twapWindowHours}h`}
        />

        {/* Current-time marker */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-accent"
          style={{ left: pct(nowClamped) }}
        >
          <div className="absolute -top-[2px] -left-[4px] w-[10px] h-[10px] rounded-full bg-accent border-2 border-[#0c0e1a]" />
        </div>

        {/* Post-resolution markers */}
        {postResolution.map((m) => {
          const t = new Date(m.at).getTime();
          if (t < open || t > lastMs) return null;
          const color =
            m.tone === "pass" ? "var(--pass)" : m.tone === "fail" ? "var(--fail)" : "var(--info)";
          return (
            <div
              key={m.label}
              className="absolute top-[6px] bottom-[6px] w-[2px]"
              style={{ left: pct(t), background: color }}
              title={`${m.label} · ${new Date(m.at).toLocaleString()}`}
            >
              <div
                className="absolute -top-[3px] -left-[4px] w-[10px] h-[10px] rounded-[2px] border-2 border-[#0c0e1a]"
                style={{ background: color }}
              />
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-[6px] text-[10px] font-mono uppercase tracking-[0.08em] text-muted">
        <span>Opened</span>
        <span className="text-accent">TWAP window ({twapWindowHours}h)</span>
        <span>{nowMs > close ? "Closed" : "Closes"}</span>
      </div>

      {postResolution.length > 0 && (
        <div className="flex flex-wrap gap-x-[14px] gap-y-[4px] mt-[8px]">
          {postResolution.map((m) => {
            const color =
              m.tone === "pass" ? "var(--pass)" : m.tone === "fail" ? "var(--fail)" : "var(--info)";
            return (
              <div key={m.label} className="flex items-center gap-[6px] text-[11px] text-muted">
                <span
                  className="inline-block w-[8px] h-[8px] rounded-[2px]"
                  style={{ background: color }}
                />
                <span>{m.label}</span>
                <span className="text-muted font-mono">
                  {new Date(m.at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
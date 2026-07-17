"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to a target time. Adaptive granularity:
 *   - more than 24h → "Nd Nh"
 *   - 1h to 24h     → "Nh Nm"
 *   - 1m to 1h      → "MM:SS" (amber)
 *   - under 1m      → "00:SS" (red, pulse)
 *   - past target   → "Closed"
 *
 * Pure presentational — accepts target as ISO string and tone fn.
 */
export function Countdown({
  target,
  onPhaseChange,
  className,
}: {
  target: string;
  onPhaseChange?: (phase: CountdownPhase) => void;
  className?: string;
}) {
  const targetMs = new Date(target).getTime();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = targetMs - nowMs;
  const phase = phaseFor(remaining);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const label = formatRemaining(remaining);
  const tone = toneClass(phase);

  return (
    <span
      className={`font-mono tabular-nums ${tone} ${
        phase === "imminent" ? "animate-pulse" : ""
      } ${className ?? ""}`}
    >
      {label}
    </span>
  );
}

export type CountdownPhase = "comfortable" | "soon" | "near" | "imminent" | "closed";

function phaseFor(ms: number): CountdownPhase {
  if (ms <= 0) return "closed";
  if (ms < 60 * 1000) return "imminent";
  if (ms < 60 * 60 * 1000) return "near";
  if (ms < 24 * 60 * 60 * 1000) return "soon";
  return "comfortable";
}

function toneClass(phase: CountdownPhase): string {
  switch (phase) {
    case "comfortable":
      return "text-fg";
    case "soon":
      return "text-fg";
    case "near":
      return "text-at-param";
    case "imminent":
      return "text-fail";
    case "closed":
      return "text-muted";
  }
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Closed";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (d >= 1) return `${d}d ${h}h`;
  if (h >= 1) return `${h}h ${m}m`;
  // under 1h — show MM:SS with leading zeros
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { MarketTimeline } from "./MarketTimeline";
import type { OnchainProposalState, PricePoint } from "@/lib/onchain/read-proposal-state";

export function TwapCard({ onchainState }: { onchainState: OnchainProposalState }) {
  const {
    passPrice, failPrice, openedAt, closesAt, durationHours,
    priceHistory, status, secondsRemaining, loading,
  } = onchainState;

  const passing = passPrice > failPrice;
  const isClosed = status === "pending" && secondsRemaining <= 0 && !loading && onchainState.found;
  const hasMulti = priceHistory.length >= 2;
  const hasSingle = priceHistory.length === 1;
  const hasData = priceHistory.length >= 1;
  const spread = Math.abs(passPrice - failPrice);
  const hLeft = Math.max(0, Math.floor(secondsRemaining / 3600));
  const mLeft = Math.max(0, Math.floor((secondsRemaining % 3600) / 60));

  let startMs = openedAt ? new Date(openedAt).getTime() : Date.now();
  let endMs = closesAt ? new Date(closesAt).getTime() : startMs + durationHours * 3600_000;
  if (hasMulti) {
    const f = priceHistory[0].time, l = priceHistory[priceHistory.length - 1].time;
    const pad = Math.max((l - f) * 0.15, 5 * 60_000);
    startMs = f - pad; endMs = l + pad;
  }
  const timeSpan = endMs - startMs;

  const ML = 44, MR = 10, MT = 4, MB = 20;
  const VW = 700, VH = 160;
  const L = ML, R = VW - MR, T = MT, B = VH - MB;
  const W = R - L, H = B - T;

  const tX = useCallback((t: number) => L + ((t - startMs) / timeSpan) * W, [startMs, timeSpan]);
  const pY = useCallback((p: number) => B - p * H, []);
  const midY = pY(0.5);

  // ── Build BOTH lines ──
  const passPath = useMemo(() => hasMulti ? buildSmooth(priceHistory, tX, p => pY(p.passPrice)) : null, [hasMulti, priceHistory, tX, pY]);
  const failPath = useMemo(() => hasMulti ? buildSmooth(priceHistory, tX, p => pY(1 - p.passPrice)) : null, [hasMulti, priceHistory, tX, pY]);
  const passFill = useMemo(() => hasMulti ? buildFill(priceHistory, tX, pY, true) : null, [hasMulti, priceHistory, tX, pY]);
  const failFill = useMemo(() => hasMulti ? buildFill(priceHistory, tX, pY, false) : null, [hasMulti, priceHistory, tX, pY]);

  // ── Build TWAP lines (dashed — only from snapshots with TWAP data) ──
  const twapPoints = useMemo(() => priceHistory.filter(p => p.passTwap !== undefined && p.failTwap !== undefined), [priceHistory]);
  const hasTwapHistory = twapPoints.length >= 2;
  const passTwapPath = useMemo(() => hasTwapHistory ? buildSmooth(twapPoints, tX, p => pY(p.passTwap!)) : null, [hasTwapHistory, twapPoints, tX, pY]);
  const failTwapPath = useMemo(() => hasTwapHistory ? buildSmooth(twapPoints, tX, p => pY(p.failTwap!)) : null, [hasTwapHistory, twapPoints, tX, pY]);

  const lastP = hasData ? priceHistory[priceHistory.length - 1] : null;
  const passDotX = lastP ? Math.min(tX(lastP.time), R - 4) : L + W / 2;
  const passDotY = lastP ? pY(lastP.passPrice) : pY(passPrice);
  const failDotY = lastP ? pY(1 - lastP.passPrice) : pY(failPrice);

  const tLabels = useMemo(() => genLabels(startMs, endMs), [startMs, endMs]);
  const nowX = tX(Date.now());
  const showNow = !isClosed && nowX > L + 24 && nowX < R - 24;

  const G = "#10b981";
  const RD = "#f43f5e";
  const lc = passing ? G : RD;
  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  // ── crosshair ──
  const svgRef = useRef<SVGSVGElement>(null);
  const [cross, setCross] = useState<{ x: number; y: number; price: number; time: number; passP: number; failP: number } | null>(null);

  const handleMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !hasData) return;
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * VW;
    const sy = ((e.clientY - rect.top) / rect.height) * VH;
    if (sx < L || sx > R || sy < T || sy > B) { setCross(null); return; }
    const t = startMs + ((sx - L) / W) * timeSpan;
    const price = Math.max(0, Math.min(1, (B - sy) / H));
    let nearPass = passPrice, nearFail = failPrice;
    if (priceHistory.length > 0) {
      let best = priceHistory[0], bestD = Math.abs(priceHistory[0].time - t);
      for (const p of priceHistory) { const d = Math.abs(p.time - t); if (d < bestD) { best = p; bestD = d; } }
      nearPass = best.passPrice; nearFail = 1 - best.passPrice;
    }
    setCross({ x: sx, y: sy, price, time: t, passP: nearPass, failP: nearFail });
  }, [hasData, startMs, timeSpan, priceHistory, passPrice, failPrice]);

  const handleLeave = useCallback(() => setCross(null), []);

  const openMs = openedAt ? new Date(openedAt).getTime() : null;
  const closeMs = closesAt ? new Date(closesAt).getTime() : null;

  // ── Loading / skeleton state ──
  // Show a lightweight loading card instead of the full skeleton.
  // The card structure is visible immediately — only the data is pending.
  const hasInitialPrices = passPrice !== 0.5 || failPrice !== 0.5;
  if (loading && !onchainState.found && !hasInitialPrices) {
    return (
      <div className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col h-[320px] lg:h-[360px] xl:h-[380px]"
        style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.2)" }}>
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-wide text-white/30">Loading market…</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
            <span className="text-[10px] text-white/20">Reading on-chain prices</span>
          </div>
        </div>
        <div className="mx-2 mb-1.5 grid grid-cols-3 sm:grid-cols-6 gap-px rounded-md overflow-hidden border border-card-border"
          style={{ background: "var(--color-card-border)" }}>
          {["Pass", "Fail", "Spread", "Window", "Opened", "Closes"].map((l) => (
            <div key={l} className="bg-card px-2 py-1">
              <div className="text-[6px] font-bold uppercase tracking-[0.1em] text-white/18 mb-px">{l}</div>
              <div className="h-3 w-10 rounded bg-white/[0.06] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { passTwap, failTwap, twapPrediction } = onchainState;
  const hasTwap = passTwap !== null && failTwap !== null;
  // Use TWAP prediction when available, fall back to spot price comparison
  const twapPassing = hasTwap ? twapPrediction === "pass" : passing;

  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden relative flex flex-col h-[320px] lg:h-[360px] xl:h-[380px]"
      style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.2)" }}>

      {/* ═══ SINGLE HEADER ROW ═══ */}
      <div className="relative z-10 px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Status */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: twapPassing ? G : RD, boxShadow: `0 0 5px ${twapPassing ? G : RD}` }} />
            <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: twapPassing ? G : RD }}>
              {isClosed ? (twapPassing ? "Pass wins" : "Fail wins") : twapPassing ? "Pass leading" : "Fail leading"}
            </span>
            <span className="text-[8px] text-white/20 font-mono">
              {isClosed ? "Closed" : `${hLeft}h ${mLeft}m`}
            </span>
          </div>
          {/* Price inline */}
          <div className="flex items-baseline gap-2 text-xs font-mono">
            <span className="text-base font-bold" style={{ color: G }}>{passPrice.toFixed(2)}</span>
            <span style={{ color: `${RD}66` }}>{failPrice.toFixed(2)}</span>
            <span className="text-white/20 text-[10px]">±{spread.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* TWAP indicator */}
          {hasTwap && (
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
              <span className="text-[7px] font-mono text-white/30 uppercase">TWAP</span>
              <span className="text-[8px] font-mono font-bold" style={{ color: G }}>{passTwap!.toFixed(3)}</span>
              <span className="text-[7px] font-mono text-white/15">/</span>
              <span className="text-[8px] font-mono font-bold" style={{ color: RD }}>{failTwap!.toFixed(3)}</span>
            </div>
          )}
          {!hasTwap && (
            <span className="text-[7px] font-mono text-white/15 px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/[0.04]">TWAP pending</span>
          )}
          <span className="text-[8px] text-white/12 font-mono">·{durationHours}h</span>
        </div>
      </div>

      {/* ═══ CHART ═══ */}
      <div className="relative flex-1 min-h-0">
        <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", cursor: hasData ? "crosshair" : "default" }}
          onMouseMove={handleMove} onMouseLeave={handleLeave}>
          <defs>
            <filter id={`gl-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="b1" />
              <feGaussianBlur stdDeviation="2" in="SourceGraphic" result="b2" />
              <feMerge><feMergeNode in="b1" /><feMergeNode in="b2" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id={`fgu-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={G} stopOpacity="0.28" />
              <stop offset="60%" stopColor={G} stopOpacity="0.05" />
              <stop offset="100%" stopColor={G} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`fgd-${uid}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={RD} stopOpacity="0.22" />
              <stop offset="60%" stopColor={RD} stopOpacity="0.04" />
              <stop offset="100%" stopColor={RD} stopOpacity="0" />
            </linearGradient>
            <radialGradient id={`rpG-${uid}`}>
              <stop offset="0%" stopColor={G} stopOpacity="0.5" /><stop offset="100%" stopColor={G} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`rpR-${uid}`}>
              <stop offset="0%" stopColor={RD} stopOpacity="0.5" /><stop offset="100%" stopColor={RD} stopOpacity="0" />
            </radialGradient>
            <clipPath id={`ca-${uid}`}><rect x={L} y={T} width={W} height={midY - T} /></clipPath>
            <clipPath id={`cb-${uid}`}><rect x={L} y={midY} width={W} height={B - midY} /></clipPath>
          </defs>

          {/* ── Zone tints ── */}
          <rect x={L} y={T} width={W} height={midY - T} fill={`${G}04`} />
          <rect x={L} y={midY} width={W} height={B - midY} fill={`${RD}04`} />
          <text x={R - 4} y={T + 10} textAnchor="end" fill={`${G}10`} fontSize="8" fontFamily="var(--font-mono)" fontWeight="700">PASS</text>
          <text x={R - 4} y={B - 3} textAnchor="end" fill={`${RD}10`} fontSize="8" fontFamily="var(--font-mono)" fontWeight="700">FAIL</text>

          {/* ── HORIZONTAL grid — 5 major + 4 minor ── */}
          {[0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0].map(v => {
            const y = pY(v);
            const major = Math.abs(v % 0.25) < 0.001;
            const is50 = Math.abs(v - 0.5) < 0.001;
            return (
              <g key={`h${v}`}>
                <line x1={L} y1={y} x2={R} y2={y}
                  stroke={is50 ? "rgba(255,255,255,0.18)" : major ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)"}
                  strokeWidth={is50 ? "0.75" : "0.5"} />
                {major && (
                  <text x={L - 5} y={y + 3} textAnchor="end"
                    fill={is50 ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.20)"}
                    fontSize={is50 ? "8.5" : "7.5"} fontFamily="var(--font-mono)"
                    fontWeight={is50 ? "600" : "400"}>
                    {v.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── VERTICAL grid — 12 columns ── */}
          {Array.from({ length: 11 }, (_, i) => {
            const x = L + ((i + 1) / 12) * W;
            return <line key={`v${i}`} x1={x} y1={T} x2={x} y2={B} stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />;
          })}

          {/* Axes */}
          <line x1={L} y1={B} x2={R} y2={B} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <line x1={L} y1={T} x2={L} y2={B} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

          {/* ── X-axis time labels ── */}
          {tLabels.map((lbl, i) => {
            const x = tX(lbl.time);
            if (x < L + 16 || x > R - 16) return null;
            return (
              <g key={i}>
                <line x1={x} y1={B} x2={x} y2={B + 5} stroke="rgba(255,255,255,0.12)" strokeWidth="0.75" />
                <text x={x} y={B + 12} textAnchor="middle" fill="rgba(255,255,255,0.25)"
                  fontSize="9" fontFamily="var(--font-mono)">{lbl.text}</text>
              </g>
            );
          })}

          {/* Open / Close X markers */}
          {openMs && tX(openMs) >= L && tX(openMs) <= R && (
            <g>
              <line x1={tX(openMs)} y1={T} x2={tX(openMs)} y2={B} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="2 4" />
              <text x={tX(openMs)} y={B + 18} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="var(--font-mono)" fontWeight="600">OPEN</text>
            </g>
          )}
          {closeMs && tX(closeMs) >= L && tX(closeMs) <= R && (
            <g>
              <line x1={tX(closeMs)} y1={T} x2={tX(closeMs)} y2={B} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="2 4" />
              <text x={tX(closeMs)} y={B + 18} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="var(--font-mono)" fontWeight="600">CLOSE</text>
            </g>
          )}

          {/* NOW */}
          {showNow && (
            <g>
              <line x1={nowX} y1={T} x2={nowX} y2={B} stroke="rgba(251,191,36,0.15)" strokeWidth="0.75" strokeDasharray="3 4" />
              <rect x={nowX - 14} y={B + 2} width="28" height="14" rx="4" fill="rgba(251,191,36,0.10)" stroke="rgba(251,191,36,0.20)" strokeWidth="0.5" />
              <text x={nowX} y={B + 10} textAnchor="middle" fill="rgba(251,191,36,0.7)" fontSize="7" fontFamily="var(--font-mono)" fontWeight="700">NOW</text>
            </g>
          )}

          {/* ═══ DATA — SINGLE LEADING LINE ═══ */}
          {hasMulti ? (
            <>
              {/* Area fill */}
              {passFill && <path d={passFill} fill={passing ? `url(#fgu-${uid})` : `url(#fgd-${uid})`} clipPath={passing ? `url(#ca-${uid})` : `url(#cb-${uid})`} />}

              {/* Whiskers to edges */}
              <line x1={L} y1={pY(priceHistory[0].passPrice)} x2={tX(priceHistory[0].time)} y2={pY(priceHistory[0].passPrice)}
                stroke={lc} strokeWidth="1" opacity="0.06" strokeDasharray="3 6" />
              <line x1={tX(priceHistory[priceHistory.length - 1].time)} y1={pY(priceHistory[priceHistory.length - 1].passPrice)} x2={R} y2={pY(priceHistory[priceHistory.length - 1].passPrice)}
                stroke={lc} strokeWidth="1" opacity="0.06" strokeDasharray="3 6" />

              {/* Neon glow */}
              {passPath && <path d={passPath} fill="none" stroke={lc} strokeWidth="10" opacity="0.07" filter={`url(#gl-${uid})`} strokeLinejoin="round" strokeLinecap="round" />}
              {passPath && <path d={passPath} fill="none" stroke={lc} strokeWidth="4" opacity="0.15" filter={`url(#gl-${uid})`} strokeLinejoin="round" strokeLinecap="round" />}
              {/* Main line */}
              {passPath && <path d={passPath} fill="none" stroke={lc} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}

              {/* TWAP lines (dashed — the actual decision metric) */}
              {passTwapPath && (
                <path d={passTwapPath} fill="none" stroke={G} strokeWidth="1.5"
                  strokeDasharray="6 4" opacity="0.6" strokeLinejoin="round" strokeLinecap="round" />
              )}
              {failTwapPath && (
                <path d={failTwapPath} fill="none" stroke={RD} strokeWidth="1.5"
                  strokeDasharray="6 4" opacity="0.45" strokeLinejoin="round" strokeLinecap="round" />
              )}

              {/* Pulse dot */}
              <circle cx={passDotX} cy={passDotY} r="16" fill={`url(#rp${passing ? 'G' : 'R'}-${uid})`}>
                <animate attributeName="r" from="8" to="22" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={passDotX} cy={passDotY} r="5.5" fill="none" stroke={lc} strokeWidth="1.5" opacity="0.3" />
              <circle cx={passDotX} cy={passDotY} r="3" fill={lc} stroke="#100e59" strokeWidth="2" />

              {/* Price tag */}
              <rect x={Math.min(passDotX + 10, R - 54)} y={passDotY - 12} width="44" height="18" rx="6"
                fill="rgba(16,14,89,0.92)" stroke={`${lc}60`} strokeWidth="0.75" />
              <text x={Math.min(passDotX + 10, R - 54) + 25} y={passDotY + 2} textAnchor="middle"
                fill={lc} fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">{passPrice.toFixed(4)}</text>

              {/* Horizontal ruler to Y-axis */}
              <line x1={L} y1={passDotY} x2={passDotX - 8} y2={passDotY} stroke={lc} strokeWidth="0.5" opacity="0.12" strokeDasharray="2 4" />

              {/* Y-axis readout */}
              <rect x={0} y={passDotY - 8} width={L - 4} height="16" rx="3" fill={`${lc}12`} />
              <text x={L - 8} y={passDotY + 4} textAnchor="end" fill={lc} fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="600">{passPrice.toFixed(2)}</text>
            </>
          ) : hasSingle ? (
            <>
              <line x1={L} y1={passDotY} x2={R} y2={passDotY} stroke={lc} strokeWidth="1.5" opacity="0.15" />
              <circle cx={passDotX} cy={passDotY} r="16" fill={`url(#rp${passing ? 'G' : 'R'}-${uid})`}>
                <animate attributeName="r" from="8" to="22" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={passDotX} cy={passDotY} r="5.5" fill="none" stroke={lc} strokeWidth="1.5" opacity="0.3" />
              <circle cx={passDotX} cy={passDotY} r="3" fill={lc} stroke="#100e59" strokeWidth="2" />
            </>
          ) : (
            <>
              <line x1={L} y1={midY} x2={R} y2={midY} stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
              <text x={L + W / 2} y={midY - 14} textAnchor="middle" fill="rgba(255,255,255,0.08)" fontSize="11" fontFamily="var(--font-mono)">Awaiting first trade</text>
            </>
          )}

          {/* ═══ CROSSHAIR ═══ */}
          {cross && (
            <g>
              <line x1={cross.x} y1={T} x2={cross.x} y2={B} stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1={L} y1={cross.y} x2={R} y2={cross.y} stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" strokeDasharray="3 3" />
              <rect x={0} y={cross.y - 9} width={L - 2} height="18" rx="3" fill="rgba(255,255,255,0.10)" />
              <text x={L - 6} y={cross.y + 4} textAnchor="end" fill="rgba(255,255,255,0.8)" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600">{cross.price.toFixed(2)}</text>
              <rect x={cross.x - 30} y={B + 1} width="60" height="16" rx="3" fill="rgba(255,255,255,0.10)" />
              <text x={cross.x} y={B + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="8" fontFamily="var(--font-mono)" fontWeight="600">{fmtCrossTime(cross.time)}</text>
              <circle cx={cross.x} cy={cross.y} r="3" fill="rgba(255,255,255,0.5)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
            </g>
          )}
        </svg>

        {/* Hover tooltip */}
        {cross && (
          <div className="absolute z-20 pointer-events-none"
            style={{
              left: `${(cross.x / VW) * 100}%`,
              top: `${(cross.y / VH) * 100}%`,
              transform: cross.x > VW / 2 ? "translate(calc(-100% - 16px), -50%)" : "translate(16px, -50%)",
            }}>
            <div className="bg-card/95 border border-card-border rounded-md px-2.5 py-1.5 shadow-xl backdrop-blur-sm" style={{ minWidth: 130 }}>
              <div className="text-[8px] text-white/25 font-mono mb-1">{fmtTooltip(cross.time)}</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-[2px] rounded-full" style={{ background: G }} />
                <span className="text-[9px] text-white/35 font-mono">Pass</span>
                <span className="text-[10px] font-mono font-bold ml-auto" style={{ color: G }}>{cross.passP.toFixed(4)}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-[2px] rounded-full" style={{ background: RD }} />
                <span className="text-[9px] text-white/35 font-mono">Fail</span>
                <span className="text-[10px] font-mono font-bold ml-auto" style={{ color: RD }}>{cross.failP.toFixed(4)}</span>
              </div>
              <div className="h-px bg-white/[0.06] my-1" />
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-white/20 font-mono">Spread</span>
                <span className="text-[8px] font-mono font-bold ml-auto text-white/40">{Math.abs(cross.passP - cross.failP).toFixed(4)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-white/20 font-mono">Status</span>
                <span className="text-[8px] font-mono font-bold ml-auto" style={{ color: cross.passP > 0.5 ? G : RD }}>
                  {cross.passP > 0.5 ? "Pass leading" : "Fail leading"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--color-card) 0%, transparent 100%)" }} />
      </div>

      {/* ═══ STATS ═══ */}
      <div className="relative z-10 mx-2 mb-1 mt-0">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-px rounded-md overflow-hidden border border-card-border"
          style={{ background: "var(--color-card-border)" }}>
          <SC label="Pass" value={passPrice.toFixed(4)} accent={G} />
          <SC label="Fail" value={failPrice.toFixed(4)} accent={RD} />
          <SC label="Spread" value={spread.toFixed(4)} />
          <SC label="Window" value={`${durationHours}h`} />
          <SC label="Opened" value={fmtC(openedAt)} />
          <SC label={isClosed ? "Closed" : "Closes"} value={fmtC(closesAt)} />
        </div>
        {/* TWAP stats row — shown when TWAP data is available */}
        {hasTwap && (
          <div className="grid grid-cols-3 gap-px rounded-md overflow-hidden border border-card-border mt-px"
            style={{ background: "var(--color-card-border)" }}>
            <SC label="Pass TWAP" value={passTwap!.toFixed(4)} accent={G} />
            <SC label="Fail TWAP" value={failTwap!.toFixed(4)} accent={RD} />
            <SC label="Prediction" value={twapPrediction === "pass" ? "Pass ✓" : twapPrediction === "fail" ? "Fail ✗" : "Pending"} accent={twapPrediction === "pass" ? G : twapPrediction === "fail" ? RD : undefined} />
          </div>
        )}
      </div>

      {/* ═══ TIMELINE ═══ */}
      {openedAt && closesAt && (
        <div className="px-3 pb-1.5 pt-0">
          <MarketTimeline openedAt={openedAt} closesAt={closesAt} twapWindowHours={durationHours}
            postResolution={
              status === "passed" ? [{ label: "Passed", at: closesAt, tone: "pass" as const }]
                : status === "failed" ? [{ label: "Failed", at: closesAt, tone: "fail" as const }]
                  : []
            } />
        </div>
      )}
    </div>
  );
}

function SC({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-card px-2 py-1">
      <div className="text-[6px] font-bold uppercase tracking-[0.1em] text-white/18 mb-px">{label}</div>
      <div className="text-[9px] font-mono font-semibold truncate" style={{ color: accent || "rgba(255,255,255,0.40)" }}>{value}</div>
    </div>
  );
}

function fmtC(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function fmtCrossTime(ms: number): string {
  const d = new Date(ms), h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ap}`;
}
function fmtTooltip(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function buildSmooth(h: PricePoint[], tX: (t: number) => number, yFn: (p: PricePoint) => number): string | null {
  if (h.length < 2) return null;
  const pts = h.map(p => ({ x: tX(p.time), y: yFn(p) }));
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cx.toFixed(1)},${pts[i - 1].y.toFixed(1)} ${cx.toFixed(1)},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
  }
  return d;
}

function buildFill(h: PricePoint[], tX: (t: number) => number, pY: (p: number) => number, isPass: boolean): string | null {
  if (h.length < 2) return null;
  const mid = pY(0.5), f = tX(h[0].time), l = tX(h[h.length - 1].time);
  let d = `M ${f.toFixed(1)},${mid.toFixed(1)}`;
  for (const p of h) {
    const val = isPass ? p.passPrice : 1 - p.passPrice;
    d += ` L ${tX(p.time).toFixed(1)},${pY(val).toFixed(1)}`;
  }
  d += ` L ${l.toFixed(1)},${mid.toFixed(1)} Z`;
  return d;
}

function genLabels(s: number, e: number) {
  const spanH = (e - s) / 3600_000;
  let m: number;
  if (spanH <= 0.5) m = 5; else if (spanH <= 1) m = 10; else if (spanH <= 3) m = 30;
  else if (spanH <= 8) m = 60; else if (spanH <= 24) m = 360; else m = 720;
  const ms = m * 60_000, first = Math.ceil(s / ms) * ms;
  const out: { time: number; text: string }[] = [];
  for (let t = first; t < e; t += ms) {
    const pct = (t - s) / (e - s);
    if (pct < 0.06 || pct > 0.94) continue;
    const d = new Date(t), h = d.getHours(), mn = d.getMinutes();
    const ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12;
    out.push({ time: t, text: m < 60 && mn !== 0 ? `${h12}:${String(mn).padStart(2, "0")}` : `${h12}${ap}` });
  }
  return out;
}
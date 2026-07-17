'use client'

import { useState, useEffect } from 'react'

export default function CoinsPage() {
  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t) }, [])

  if (loading) return (
    <div className="pb-10">
      <style>{`@keyframes cn-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="mb-[22px]">
        <div className="h-3 w-40 rounded bg-white/[0.06] mb-3" />
        <div className="h-9 w-28 rounded bg-white/[0.07] mb-2" />
        <div className="h-4 w-80 rounded bg-white/[0.04]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-card-border rounded-[14px] p-5" style={{ position: 'relative', overflow: 'hidden', minHeight: 130 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'cn-shimmer 1.4s ease-in-out infinite' }} />
            <div className="w-7 h-7 rounded-full bg-white/[0.07] mb-3" />
            <div className="h-6 w-36 rounded bg-white/[0.07] mb-2" />
            <div className="h-4 w-52 rounded bg-white/[0.04] mb-4" />
            <div className="border-t border-card-border pt-3 flex justify-between">
              <div className="h-3 w-16 rounded bg-white/[0.04]" />
              <div className="h-3 w-12 rounded bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="mb-[22px]">
        <div className="text-[0.66rem] font-bold tracking-[0.16em] uppercase text-[#03CCD9] mb-2">
          Building mode · Economics
        </div>
        <h1
          className="text-[2.1rem] font-normal text-white leading-none m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Coins
        </h1>
        <p className="text-[0.9rem] text-white/60 mt-1.5">
          The WVDUNA coin sets your standing; each DUNA can issue its own coin too.
        </p>
      </div>

      {/* Coins grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* WVDUNA */}
        <div className="bg-card border border-card-border rounded-[14px] p-5">
          <span
            className="w-7 h-7 rounded-full grid place-items-center text-[0.72rem] text-[#09073A] bg-accent mb-2.5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            WV
          </span>
          <h3 className="text-white font-normal text-[1.3rem] leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
            WVDUNA
          </h3>
          <p className="text-[0.88rem] text-white/70 mt-1 mb-0">The genesis coin. Your balance sets your level.</p>
          <div className="flex items-center gap-3 mt-2 pt-3 border-t border-card-border text-[0.72rem] text-white/60">
            <span>You hold</span>
            <b className="ml-auto text-white">12,400</b>
          </div>
        </div>

        {/* Mountain Mesh */}
        <div className="bg-card border border-card-border rounded-[14px] p-5">
          <span
            className="w-7 h-7 rounded-full grid place-items-center text-[0.72rem] text-[#09073A] bg-[#03CCD9] mb-2.5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            MM
          </span>
          <h3 className="text-white font-normal text-[1.3rem] leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
            Mountain Mesh
          </h3>
          <p className="text-[0.88rem] text-white/70 mt-1 mb-0">FDV $27.3M · 1,420 holders</p>
          <div className="flex items-center gap-3 mt-2 pt-3 border-t border-card-border text-[0.72rem] text-white/60">
            <span>You hold</span>
            <b className="ml-auto text-white">3,000</b>
          </div>
        </div>

        {/* Issue a coin (dashed / locked) */}
        <div className="bg-card border border-dashed border-card-border rounded-[14px] p-5 flex flex-col items-start gap-2">
          <span className="w-11 h-11 rounded-[10px] grid place-items-center bg-[#100E59] border border-card-border text-accent mb-3">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <h3 className="text-white font-normal text-[1.3rem] leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
            Issue a coin
          </h3>
          <p className="text-[0.88rem] text-white/70 m-0">Launch a member-owned coin for your DUNA.</p>
          <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-bold tracking-[0.06em] uppercase text-white/60 bg-[#100E59] border border-card-border rounded-full px-2.5 py-1">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Founder+
          </span>
        </div>
      </div>
    </div>
  )
}
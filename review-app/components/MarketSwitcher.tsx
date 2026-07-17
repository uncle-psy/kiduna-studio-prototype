'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentMarket } from '@/lib/market-context'

export default function MarketSwitcher() {
  const { markets, current, setCurrentId, loading } = useCurrentMarket()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasMarkets = markets.length > 0
  const isActive = current && current.id !== "__loading__"

  return (
    <div ref={ref} className="relative">
      {/* Divider + Trigger */}
      <div className="flex items-center gap-2.5">
        <div className="w-px h-5 bg-white/[0.12]" />
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2.5 px-3 lg:px-4 py-1.5 rounded-full border transition-all min-w-0 lg:min-w-[170px] ${
            isActive
              ? 'border-card-border hover:border-accent/50 bg-input hover:bg-white/[0.08]'
              : 'border-dashed border-accent/40 hover:border-accent/60 bg-accent/5 hover:bg-accent/10'
          }`}
        >
          {isActive ? (
            <>
              <span className="text-base">
                {'🪙'}
              </span>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {current.name}
                </div>
                <div className="text-xs text-muted hidden lg:block">
                  {current.memberCount} member{current.memberCount !== 1 ? 's' : ''} · {current.openProposalsCount} open
                </div>
              </div>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-muted ml-1 transition-transform ${open ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </>
          ) : (
            <>
              <span className="w-5 h-5 rounded-md border border-dashed border-accent/40 flex items-center justify-center text-[10px] text-accent">
                +
              </span>
              <span className="text-xs font-semibold text-accent">
                {loading ? 'Loading…' : 'Select Market'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-[280px] z-[999] bg-card border border-card-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="px-3 pt-2.5 pb-1">
            <span className="text-[10px] font-semibold text-white/40 tracking-wider uppercase">
              Markets
            </span>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {!hasMarkets && !loading && (
              <div className="px-3 py-4 text-center text-xs text-muted">
                No markets yet
              </div>
            )}
            {markets.map((m) => {
              const isSelected = current?.id === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setCurrentId(m.id)
                    setOpen(false)
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-accent/10' : 'hover:bg-input'
                  }`}
                >
                  <span className="text-base">
                    {'🪙'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: isActive ? '#EAAA00' : '#e2e8f0' }}
                    >
                      {m.name}
                    </div>
                    <div className="text-xs text-muted">
                      {m.memberCount} member{m.memberCount !== 1 ? 's' : ''} · {m.launchStatus}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400"
                    >
                      TOKEN
                    </span>
                    {m.openProposalsCount > 0 && (
                      <span className="text-[10px] text-accent font-medium">
                        {m.openProposalsCount} open
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-accent" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Create New Market */}
          <div className="border-t border-card-border p-1.5">
            <button
              onClick={() => {
                setOpen(false)
                router.push('/market/market-create/connect')
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg hover:bg-accent/10 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-md border border-dashed border-accent/40 flex items-center justify-center text-[10px] text-accent">
                +
              </span>
              <span className="text-sm font-medium text-accent">
                Create New Market
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
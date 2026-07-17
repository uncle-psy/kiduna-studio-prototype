'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useAuth } from '@/lib/auth-context'
import type { LaunchpadCampaign, CampaignFilter } from '@/lib/launchpad-api-types'

export default function LaunchpadPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [campaigns, setCampaigns] = useState<LaunchpadCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CampaignFilter>('all')
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/launchpad?filter=${filter}&pageSize=20`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    } finally {
      setLoading(false)
    }
  }, [filter, token])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])
  useEffect(() => {
    if (filter !== 'active') return
    const id = setInterval(fetchCampaigns, 15000)
    return () => clearInterval(id)
  }, [filter, fetchCampaigns])

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.tokenTicker && c.tokenTicker.toLowerCase().includes(search.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  const tabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'active' as const, label: 'Active' },
    { key: 'completed' as const, label: 'Completed' },
    { key: 'failed' as const, label: 'Failed' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Launchpad</h1>
          <p className="text-muted mt-1">
            {total} campaign{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/markets/create?new=1')}
          className="bg-accent hover:bg-accent-dark text-white font-semibold px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 shrink-0"
        >
          <Icon icon="lucide:plus" width={18} height={18} />
          New Campaign
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
            <Icon icon="lucide:search" width={16} height={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="w-full bg-input border border-card-border rounded-xl pl-10 pr-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => {
          const active = filter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => { if (tab.key !== filter) { setFilter(tab.key); setLoading(true) } }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                active
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
              {active && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-accent/20' : 'bg-white/10'}`}>{total}</span>}
            </button>
          )
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <Icon icon="lucide:loader-2" width={40} height={40} className="mx-auto mb-3 text-muted animate-spin" />
          <p className="text-muted">Loading campaigns…</p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.slug}
              onClick={() => router.push(`/launchpad/${c.slug}`)}
              className="bg-card border border-card-border rounded-xl p-5 text-left hover:border-accent/50 transition-all hover:bg-white/[0.04] group relative cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  c.launchStatus === 'fundraising' ? 'bg-green-500/15' :
                  c.launchStatus === 'live' ? 'bg-accent/15' :
                  c.launchStatus === 'refunding' || c.launchStatus === 'failed' ? 'bg-red-500/15' :
                  'bg-accent/15'
                }`}>
                  <Icon icon="lucide:rocket" width={20} height={20} className={
                    c.launchStatus === 'fundraising' ? 'text-green-400' :
                    c.launchStatus === 'live' ? 'text-accent' :
                    c.launchStatus === 'refunding' || c.launchStatus === 'failed' ? 'text-red-400' :
                    'text-accent'
                  } />
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.launchStatus} />
                  <Icon icon="lucide:chevron-right" width={18} height={18} className="text-muted group-hover:text-accent transition-colors" />
                </div>
              </div>

              <h3 className="text-white font-semibold text-lg mb-1 truncate">{c.name}</h3>

              {c.tokenTicker && (
                <p className="text-xs text-muted/70 mb-1">${c.tokenTicker}</p>
              )}

              {c.description && (
                <p className="text-sm text-muted line-clamp-2 mb-3">{c.description}</p>
              )}

              {/* Progress */}
              <div className="mb-3">
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
                  <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.min(100, c.percentRaised)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted">
                  <span><span className="text-white font-semibold">{c.totalCommitted.toLocaleString()}</span> / {(c.minRaise || 0).toLocaleString()} USDC</span>
                  {c.percentRaised > 0 && <span className="text-accent font-semibold">{c.percentRaised}%</span>}
                </div>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-muted flex items-center gap-1">
                  <Icon icon="lucide:users" width={10} height={10} />
                  {c.contributorCount} backer{c.contributorCount !== 1 ? 's' : ''}
                </span>
                {c.fundraiseDeadline && (
                  <CountdownChip deadline={c.fundraiseDeadline} />
                )}
                {c.hasBidWall && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-muted flex items-center gap-1">
                    <Icon icon="lucide:shield" width={10} height={10} />
                    Bid wall
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-card-border flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:rocket" width={32} height={32} className="text-accent" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">No campaigns yet</h3>
          <p className="text-muted text-sm max-w-sm mx-auto mb-5">
            {search ? `No results for "${search}"` : 'Create a new Market with "Mint new token" to start an ICO campaign.'}
          </p>
          {!search && (
            <button
              onClick={() => router.push('/markets/create?new=1')}
              className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white font-semibold rounded-full transition-colors cursor-pointer"
            >
              + New Campaign
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-white/[0.08] text-white/60' },
    initialized: { label: 'Ready', cls: 'bg-blue-500/20 text-blue-400' },
    fundraising: { label: 'Live', cls: 'bg-green-500/20 text-green-400' },
    closed: { label: 'Closed', cls: 'bg-yellow-500/20 text-yellow-400' },
    settling: { label: 'Settling', cls: 'bg-yellow-500/20 text-yellow-400' },
    live: { label: 'Market Live', cls: 'bg-accent/20 text-accent' },
    refunding: { label: 'Refunding', cls: 'bg-red-500/20 text-red-400' },
    failed: { label: 'Failed', cls: 'bg-red-500/20 text-red-400' },
  }
  const b = map[status] || { label: status, cls: 'bg-white/[0.08] text-white/60' }
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span>
}

function CountdownChip({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const target = new Date(deadline).getTime()
    function tick() { setRemaining(Math.max(0, Math.floor((target - Date.now()) / 1000))) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (remaining == null || remaining <= 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-muted flex items-center gap-1">
        <Icon icon="lucide:clock" width={10} height={10} />
        Ended
      </span>
    )
  }

  const d = Math.floor(remaining / 86400)
  const h = Math.floor((remaining % 86400) / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60

  let display = ''
  if (d > 0) display = `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  else if (h > 0) display = `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  else display = `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`

  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-muted flex items-center gap-1 font-mono tabular-nums">
      <Icon icon="lucide:clock" width={10} height={10} />
      {display}
    </span>
  )
}
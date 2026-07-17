'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import LaunchToolbar from '@/components/landing/LaunchToolbar'
import LaunchCard from '@/components/landing/ui/LaunchCard'
import type { LaunchpadCampaign, CampaignFilter } from '@/lib/launchpad-api-types'
import { getToken, getSessionToken } from '@/lib/auth'

/** Map filter labels to API filter values (same as studio launchpad_) */
const FILTER_MAP: Record<string, CampaignFilter> = {
  All: 'all',
  Active: 'active',
  Completed: 'completed',
  Failed: 'failed',
}

export default function LaunchpadBoard() {
  const [campaigns, setCampaigns] = useState<LaunchpadCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const apiFilter = FILTER_MAP[filter] || 'all'
      const token = getToken() || getSessionToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`/api/v1/launchpad?filter=${apiFilter}&pageSize=50`, { headers })
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
  }, [filter])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Auto-refresh for live campaigns
  useEffect(() => {
    if (filter !== 'Active') return
    const id = setInterval(fetchCampaigns, 15000)
    return () => clearInterval(id)
  }, [filter, fetchCampaigns])

  // Client-side search filtering
  const filtered = useMemo(() => {
    let result = campaigns
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.tokenTicker && c.tokenTicker.toLowerCase().includes(q))
      )
    }

    // Sorting
    if (sort === 'Ending soon') {
      result = [...result].sort((a, b) => {
        const aTime = a.timeRemainingSeconds ?? Infinity
        const bTime = b.timeRemainingSeconds ?? Infinity
        return aTime - bTime
      })
    } else if (sort === 'Committed') {
      result = [...result].sort((a, b) => b.totalCommitted - a.totalCommitted)
    } else if (sort === '% funded') {
      result = [...result].sort((a, b) => b.percentRaised - a.percentRaised)
    } else if (sort === 'Raise goal') {
      result = [...result].sort((a, b) => (b.minRaise || 0) - (a.minRaise || 0))
    }

    return result
  }, [campaigns, search, sort])

  return (
    <>
      <LaunchToolbar
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onSortChange={setSort}
        resultCount={filtered.length}
        totalCount={total}
      />

      {loading && (
        <div className="text-center py-16">
          <p className="text-muted text-[0.92rem]">Loading launches…</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4">
          {filtered.map((c) => (
            <LaunchCard key={c.slug} campaign={c} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted text-[0.92rem]">
            {search ? `No launches match "${search}".` : 'No launches found.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="mt-5 text-[0.82rem] text-muted">
          Committing funds connects to your wallet and the DUNA&apos;s on-chain
          raise, with refunds enforced by contract if the goal isn&apos;t met.
        </p>
      )}
    </>
  )
}
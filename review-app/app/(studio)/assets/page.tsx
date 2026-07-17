'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, StatusBadge, FacetBadge } from '@/components/UI'
import { ASSET_TYPES, HEARTS_FACETS } from '@/lib/data'
import { useAssets } from '@/hooks/useApi'
import { useStudio } from '@/lib/studio-context'
import type { AssetType } from '@/lib/types'

export default function AssetsPage() {
  const { currentPlatform } = useStudio()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [typeFilter, setTypeFilter] = useState<AssetType | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, loading, error, refetch } = useAssets({
    type: typeFilter || undefined,
    search: search || undefined,
    // platform_id: currentPlatform?.id,
    page,
    limit: 20,
    sort_order: 'desc',
  })

  const assets = data?.data || []
  const pagination = data?.pagination

  return (
    <>
      {/* Header — matches the WV DUNA reference Library view */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="text-[0.66rem] font-bold tracking-[0.16em] uppercase text-[#03CCD9] mb-2">
            Building mode · Flows
          </div>
          <h1
            className="text-[2.1rem] font-normal text-white leading-none m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Library
          </h1>
          <p className="text-[0.9rem] text-white/60 mt-1.5">
            Reusable assets your allies can draw on — media, templates, snippets.
          </p>
        </div>
        <Link
          href="/assets/upload"
          className="shrink-0 bg-accent hover:bg-accent-hover text-[#09073A] font-bold text-[0.92rem] px-5 py-[0.7rem] rounded-md transition-colors flex items-center gap-2"
        >
          <span className="text-base leading-none">＋</span>
          Upload Asset
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as AssetType | '')
            setPage(1)
          }}
          className="bg-input border border-card-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent/50"
        >
          <option value="">All Types</option>
          {ASSET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex bg-input border border-card-border rounded-xl overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-3 text-sm ${view === 'grid' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-white'}`}
          >
            ▦
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-3 text-sm ${view === 'list' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-white'}`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-4 gap-4">
          <style>{`@keyframes as-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-2xl overflow-hidden" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'as-shimmer 1.4s ease-in-out infinite', zIndex: 1 }} />
              {/* thumbnail area */}
              <div className="h-32 bg-white/[0.04] border-b border-white/[0.08]" />
              <div className="p-4">
                {/* icon + name */}
                <div className="flex items-center gap-2 mb-2">
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                  <div style={{ height: 13, flex: 1, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
                </div>
                {/* mono name */}
                <div style={{ height: 11, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 10 }} />
                {/* footer */}
                <div className="flex items-center justify-between">
                  <div style={{ height: 10, width: '25%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                  <div style={{ height: 18, width: 44, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-6 border-red-500/20">
          <div className="flex items-center gap-3">
            <span className="text-red-400 text-xl">⚠️</span>
            <div>
              <p className="text-red-400 font-medium">Failed to load assets</p>
              <p className="text-muted text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={refetch}
              className="ml-auto btn btn-sm bg-input border-card-border text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* Empty state — matches the WV DUNA reference (centered, dashed box) */}
      {!loading && !error && assets.length === 0 && (
        <div className="border border-dashed border-card-border rounded-[14px] px-8 py-12 text-center text-white/60">
          <div className="w-14 h-14 rounded-full bg-card border border-card-border grid place-items-center mx-auto mb-3.5 text-accent">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 4v16M9 4v16" />
              <rect x="13" y="4" width="6" height="16" rx="1" />
            </svg>
          </div>
          <h3
            className="text-[1.3rem] font-normal text-white mb-1.5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {search ? 'No assets found' : 'Your library is empty'}
          </h3>
          <p className="text-white/60 text-[0.9rem] m-0">
            {search
              ? 'Try a different search'
              : 'Upload assets or save them from your allies to reuse across DUNAs.'}
          </p>
          {!search && (
            <div className="inline-block text-[0.62rem] font-bold tracking-[0.08em] uppercase text-accent bg-accent-light border border-[rgba(234,170,0,0.4)] rounded-full px-2.5 py-[3px] mt-2.5">
              Builder+ feature · preview
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {!loading && !error && assets.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-4 gap-4">
          {assets.map((asset) => {
            const typeInfo = ASSET_TYPES.find((t) => t.value === asset.type)
            return (
              <Link key={asset.id} href={`/assets/${asset.id}`}>
                <Card hover className="overflow-hidden">
                  <div className="h-32 bg-white/[0.04] flex items-center justify-center border-b border-white/[0.08] relative">
                    {asset.thumbnail_url || asset.file_url ? (
                      <img
                        src={asset.thumbnail_url || asset.file_url}
                        alt={asset.display_name}
                        className="w-full h-full object-contain p-4"
                      />
                    ) : (
                      <span className="text-4xl opacity-30">
                        {typeInfo?.icon || '📦'}
                      </span>
                    )}
                    {!asset.is_active && (
                      <span className="absolute top-2 right-2 bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{typeInfo?.icon}</span>
                      <h3 className="text-white text-sm font-medium truncate">
                        {asset.display_name}
                      </h3>
                    </div>
                    <p className="text-white/40 text-xs font-mono mb-2">
                      {asset.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 text-[10px]">
                        {(asset.file_size / 1024).toFixed(0)} KB
                      </span>
                      <div className="flex gap-1">
                        {asset.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-input text-muted px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* List View */}
      {!loading && !error && assets.length > 0 && view === 'list' && (
        <div className="space-y-2">
          {assets.map((asset) => {
            const typeInfo = ASSET_TYPES.find((t) => t.value === asset.type)
            return (
              <Link key={asset.id} href={`/assets/${asset.id}`}>
                <Card hover className="p-4 flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-input flex items-center justify-center shrink-0 overflow-hidden">
                    {asset.thumbnail_url || asset.file_url ? (
                      <img
                        src={asset.thumbnail_url || asset.file_url}
                        alt={asset.display_name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-lg">{typeInfo?.icon || '📦'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white text-sm font-medium">
                        {asset.display_name}
                      </h3>
                      <span className="text-white/40 text-xs font-mono">
                        {asset.name}
                      </span>
                    </div>
                    <p className="text-muted text-xs truncate mt-0.5">
                      {asset.meta_description || 'No description'}
                    </p>
                  </div>
                  <span className="text-white/40 text-xs">
                    {typeInfo?.label}
                  </span>
                  <span className="text-white/40 text-xs">
                    {(asset.file_size / 1024).toFixed(0)} KB
                  </span>
                  <div className="flex gap-1">
                    {asset.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-input text-muted px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <StatusBadge
                    status={asset.is_active ? 'active' : 'inactive'}
                  />
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <p className="text-white/40 text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-sm bg-input border-card-border text-white rounded-lg disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="px-3 py-1 text-muted text-sm">
              {pagination.page} / {pagination.total_pages}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(pagination.total_pages, p + 1))
              }
              disabled={page === pagination.total_pages}
              className="btn btn-sm bg-input border-card-border text-white rounded-lg disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
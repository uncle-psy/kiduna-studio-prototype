'use client'

import { useState } from 'react'

const FILTERS = ['All', 'Active', 'Completed', 'Failed'] as const

export default function LaunchToolbar({
  onFilterChange,
  onSearchChange,
  onSortChange,
  resultCount,
  totalCount,
}: {
  onFilterChange?: (filter: string) => void
  onSearchChange?: (search: string) => void
  onSortChange?: (sort: string) => void
  resultCount?: number
  totalCount?: number
}) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [activeSort, setActiveSort] = useState('')
  const [search, setSearch] = useState('')

  const handleFilterClick = (f: string) => {
    setActiveFilter(f)
    onFilterChange?.(f)
  }

  const handleSortClick = (s: string) => {
    const newSort = activeSort === s ? '' : s
    setActiveSort(newSort)
    onSortChange?.(newSort)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    onSearchChange?.(e.target.value)
  }

  const showCount = resultCount != null && totalCount != null

  return (
    <div className="mb-[18px]">
      {/* Row 1: Search + Show filters + SORT label */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {/* Search */}
        <div className="flex-[1_1_280px] relative">
          <span
            className="absolute left-[0.85rem] top-1/2 -translate-y-1/2 text-dim pointer-events-none"
            aria-hidden="true"
          >
            ⌕
          </span>
          <input
            type="search"
            placeholder="Search launches by name or mission…"
            value={search}
            onChange={handleSearchChange}
            className="w-full py-[0.72rem] pr-4 pl-[2.4rem] rounded-[8px] bg-surface border border-border text-white font-sans text-[0.98rem] focus:outline-none"
          />
        </div>

        {/* Show label + filter pills */}
        <span className="text-[0.7rem] tracking-[0.14em] uppercase text-dim font-bold">
          Show
        </span>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => handleFilterClick(f)}
              className={`font-sans font-bold text-[0.84rem] py-2 px-[0.9rem] rounded-full border cursor-pointer transition-all duration-150 ${
                activeFilter === f
                  ? 'bg-[rgba(234,170,0,0.08)] border-[rgba(234,170,0,0.5)] text-accent'
                  : 'bg-surface border-border text-muted hover:border-border-strong hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="text-[0.7rem] tracking-[0.14em] uppercase text-dim font-bold">
          Sort
        </span>
      </div>

      {/* Row 2: Sort buttons */}
      <div className="flex flex-wrap gap-2">
        {['Ending soon', 'Committed', '% funded', 'Raise goal'].map((s) => (
          <button
            key={s}
            onClick={() => handleSortClick(s)}
            className={`font-sans font-bold text-[0.84rem] py-2 px-[0.9rem] rounded-full border cursor-pointer transition-all duration-150 ${
              activeSort === s
                ? 'bg-[rgba(234,170,0,0.08)] border-[rgba(234,170,0,0.5)] text-accent'
                : 'bg-surface border-border text-muted hover:border-border-strong hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p className="text-[0.82rem] text-dim mt-3 mb-0">
        {showCount
          ? `Showing ${resultCount} of ${totalCount} launches`
          : 'Loading launches…'}
      </p>
    </div>
  )
}
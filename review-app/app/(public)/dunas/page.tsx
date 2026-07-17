'use client'

import { useState, useMemo } from 'react'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import SubNav from '@/components/landing/SubNav'
import '../dunathon-landing.css'
import LandingFooter from '@/components/landing/LandingFooter'
import Eyebrow from '@/components/landing/ui/Eyebrow'
import DisplayHeading from '@/components/landing/ui/DisplayHeading'
import GoldEmphasis from '@/components/landing/ui/GoldEmphasis'
import ButtonGold from '@/components/landing/ui/ButtonGold'
import SectionWrapper from '@/components/landing/ui/SectionWrapper'
import RidgeMotif from '@/components/landing/ui/RidgeMotif'
import DunaDirectoryCard from '@/components/landing/ui/DunaDirectoryCard'
import { ALLIES_PAGES } from '@/lib/allies-data'
import type { DunaDef } from '@/lib/allies-data'

/* ── Parse money strings to numbers for sorting ── */
function parseMoney(s: string): number {
  if (!s || s === '—') return 0
  const clean = s.replace(/[$,]/g, '')
  if (clean.endsWith('M')) return parseFloat(clean) * 1_000_000
  if (clean.endsWith('k')) return parseFloat(clean) * 1_000
  return parseFloat(clean) || 0
}

function parseMembers(s: string): number {
  return parseInt(s.replace(/,/g, ''), 10) || 0
}

/* ── Parse "Mon YYYY" to sortable date ── */
const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
}
function parseCreated(s: string): number {
  const parts = s.split(' ')
  if (parts.length !== 2) return 0
  const m = MONTHS[parts[0]] || 0
  const y = parseInt(parts[1], 10) || 0
  return y * 100 + m
}

type SortField = 'created' | 'treasury' | 'members' | 'mcap'

const SORT_BUTTONS: { field: SortField; label: string }[] = [
  { field: 'created', label: 'Creation date' },
  { field: 'treasury', label: 'Treasury' },
  { field: 'members', label: 'Members' },
  { field: 'mcap', label: 'Market cap' },
]

export default function DunasPage() {
  const c = ALLIES_PAGES.dunas
  const [query, setQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('created')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  // Static data removed. No published DUNAs until a live source is wired in.
  const [dunas] = useState<DunaDef[]>([])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    let list = [...dunas]

    // Search
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((d) =>
        `${d.name} ${d.by} ${d.tag} ${d.coin} ${d.blurb}`.toLowerCase().includes(q)
      )
    }

    // Sort
    list.sort((a, b) => {
      let va: number, vb: number
      switch (sortField) {
        case 'created':
          va = parseCreated(a.created); vb = parseCreated(b.created); break
        case 'treasury':
          va = parseMoney(a.treasury); vb = parseMoney(b.treasury); break
        case 'members':
          va = parseMembers(a.members); vb = parseMembers(b.members); break
        case 'mcap':
          va = parseMoney(a.mcap); vb = parseMoney(b.mcap); break
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [dunas, query, sortField, sortDir])

  return (
    <>
     <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="duna-landing">
          <DunaLandingNav />
        </div>
        <SubNav open />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden pt-[68px] pb-[56px]"
        style={{
          background: `
            radial-gradient(900px 360px at 90% -20%, rgba(234,170,0,0.20), transparent 55%),
            radial-gradient(600px 420px at -8% 70%, rgba(3,204,217,0.12), transparent 60%),
            linear-gradient(135deg, #100E59, #09073A 80%)
          `,
        }}
      >
        <div className="w-full max-w-[1180px] mx-auto px-6 relative z-[2]">
          <Eyebrow className="mb-5">{c.heroEyebrow}</Eyebrow>
          <DisplayHeading as="h1">
            {c.heroTitle} <GoldEmphasis>{c.heroEmphasis}</GoldEmphasis>
          </DisplayHeading>
          <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55] mb-8">
            {c.heroLede}
          </p>
          <ButtonGold size="lg" href="/start">Start a DUNA</ButtonGold>
        </div>
      </section>

      {/* Directory */}
      <SectionWrapper style={{ paddingTop: 28 }}>
        {/* Toolbar */}
        <div className="mb-[18px]">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {/* Search */}
            <div className="flex-[1_1_280px] relative">
              <span className="absolute left-[0.85rem] top-1/2 -translate-y-1/2 text-dim pointer-events-none" aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.dirSearch}
                className="w-full py-[0.72rem] pr-4 pl-[2.4rem] rounded-[8px] bg-surface border border-border text-white font-sans text-[0.98rem] focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            {/* Sort */}
            <span className="text-[0.7rem] tracking-[0.14em] uppercase text-dim font-bold">Sort</span>
            <div className="flex flex-wrap gap-2">
              {SORT_BUTTONS.map((s) => {
                const active = sortField === s.field
                return (
                  <button
                    key={s.field}
                    onClick={() => handleSort(s.field)}
                    className={`font-sans font-bold text-[0.84rem] py-2 px-[0.9rem] rounded-full border cursor-pointer transition-all duration-150 ${
                      active
                        ? 'bg-[rgba(234,170,0,0.08)] border-[rgba(234,170,0,0.5)] text-accent'
                        : 'bg-surface border-border text-muted hover:border-border-strong hover:text-white'
                    }`}
                  >
                    {s.label}
                    {active && (
                      <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Result count */}
        <p className="text-[0.85rem] text-muted mb-4">
          {filtered.length} {filtered.length === 1 ? 'DUNA' : 'DUNAs'}
        </p>

        {/* Card grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4">
            {filtered.map((d) => (
              <DunaDirectoryCard key={d.id} d={d} />
            ))}
          </div>
        ) : dunas.length === 0 ? (
          <div
            className="text-center py-16 rounded-[14px] border border-border"
            style={{ background: 'var(--surface, #0A0D33)' }}
          >
            <p className="text-muted text-[1rem]">
              No published DUNAs yet. Be the first!
            </p>
          </div>
        ) : (
          <div
            className="text-center py-16 rounded-[14px] border border-border"
            style={{ background: 'var(--surface, #0A0D33)' }}
          >
            <p className="text-muted text-[1rem]">
              No DUNAs match &ldquo;{query}&rdquo;. Try another search.
            </p>
          </div>
        )}

        <p className="mt-5 text-[0.82rem] text-muted">{c.footnote}</p>
      </SectionWrapper>

      {/* CTA Band */}
      {c.hasCta && (
        <section
          className="text-center py-[88px] relative overflow-hidden"
          style={{
            background: `
              radial-gradient(900px 380px at 50% -20%, rgba(234,170,0,0.20), transparent 60%),
              linear-gradient(135deg, #100E59, #09073A 80%)
            `,
          }}
        >
          <div className="w-full max-w-[1180px] mx-auto px-6 relative z-[2]">
            {c.ctaEyebrow && <Eyebrow className="text-center mb-4">{c.ctaEyebrow}</Eyebrow>}
            <DisplayHeading as="h2" className="max-w-[22ch] mx-auto">
              {c.ctaTitle} <GoldEmphasis>{c.ctaEmphasis}</GoldEmphasis>
            </DisplayHeading>
            <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-muted max-w-[62ch] leading-[1.55] mx-auto mb-8">
              {c.ctaLede}
            </p>
            <ButtonGold size="lg" href={c.ctaButtonHref}>{c.ctaButton}</ButtonGold>
          </div>
          <RidgeMotif />
        </section>
      )}

      <LandingFooter />
    </>
  )
}
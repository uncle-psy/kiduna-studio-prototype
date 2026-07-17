'use client'

import { useState, useEffect, useMemo } from 'react'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import SubNav from '@/components/landing/SubNav'
import '../dunathon-landing.css'
import LandingFooter from '@/components/landing/LandingFooter'
import PersonCard from '@/components/landing/ui/PersonCard'
import SectionWrapper from '@/components/landing/ui/SectionWrapper'
import SectionHead from '@/components/landing/ui/SectionHead'
import Eyebrow from '@/components/landing/ui/Eyebrow'
import DisplayHeading from '@/components/landing/ui/DisplayHeading'
import GoldEmphasis from '@/components/landing/ui/GoldEmphasis'
import ButtonGold from '@/components/landing/ui/ButtonGold'
import ButtonGhost from '@/components/landing/ui/ButtonGhost'
import RidgeMotif from '@/components/landing/ui/RidgeMotif'
import { ALLIES_PAGES } from '@/lib/allies-data'
import type { PersonDef } from '@/lib/allies-data'
import { listDirectory, userToPersonDef } from '@/lib/allies-api'

function countFounded(p: PersonDef): number {
  const founded = p.links.find((l) => l.label === 'Founded')
  if (!founded) return 0
  return founded.value.split(',').length
}

type SortField = 'name' | 'count' | 'role'

const SORT_BUTTONS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'count', label: 'DUNAs founded' },
  { field: 'role', label: 'Role' },
]

export default function FoundersPage() {
  const c = ALLIES_PAGES.founders
  const [query, setQuery] = useState('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [people, setPeople] = useState<PersonDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const rows = await listDirectory({ role: 'founder', limit: 200 })
        setPeople(rows.map(userToPersonDef))
      } catch (err) {
        console.error('Failed to fetch founders:', err)
        setError('Unable to load founders right now.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'count' ? 'desc' : 'asc')
    }
  }

  const filtered = useMemo(() => {
    let list = [...people]

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((p) =>
        `${p.name} ${p.role} ${p.bio} ${p.links.map((l) => l.value).join(' ')}`.toLowerCase().includes(q)
      )
    }

    if (sortField) {
      list.sort((a, b) => {
        let va: string | number, vb: string | number
        switch (sortField) {
          case 'name':
            va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break
          case 'count':
            va = countFounded(a); vb = countFounded(b); break
          case 'role':
            va = a.role.toLowerCase(); vb = b.role.toLowerCase(); break
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }

    return list
  }, [people, query, sortField, sortDir])

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
          <div className="flex flex-wrap gap-3">
            {c.heroCtas.map((cta) =>
              cta.style === 'gold' ? (
                <ButtonGold key={cta.label} size="lg" href={cta.href}>{cta.label}</ButtonGold>
              ) : (
                <ButtonGhost key={cta.label} size="lg" href={cta.href}>{cta.label}</ButtonGhost>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Directory */}
      <SectionWrapper style={{ paddingTop: 28 }}>
        {c.dirTitle && (
          <SectionHead
            eyebrow={c.dirEyebrow}
            title={<>{c.dirTitle} <GoldEmphasis>{c.dirEmphasis}</GoldEmphasis></>}
            lede={c.dirLede}
          />
        )}

        {/* Toolbar */}
        <div className="mb-[18px]">
          <div className="flex flex-wrap items-center gap-3 mb-3">
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
                    {active && <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-muted text-[0.95rem]">Loading founders…</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16 rounded-[14px] border border-border" style={{ background: 'var(--surface, #0A0D33)' }}>
            <p className="text-muted text-[1rem]">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="text-[0.85rem] text-muted mb-4">{filtered.length} {filtered.length === 1 ? 'founder' : 'founders'}</p>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4">{filtered.map((p) => <PersonCard key={p.name} p={p} />)}</div>
            ) : people.length === 0 ? (
              <div className="text-center py-16 rounded-[14px] border border-border" style={{ background: 'var(--surface, #0A0D33)' }}><p className="text-muted text-[1rem]">No published founders yet. Be the first!</p></div>
            ) : (
              <div className="text-center py-16 rounded-[14px] border border-border" style={{ background: 'var(--surface, #0A0D33)' }}><p className="text-muted text-[1rem]">No founders match &ldquo;{query}&rdquo;. Try another search.</p></div>
            )}
            <p className="mt-5 text-[0.82rem] text-muted">{c.footnote}</p>
          </>
        )}
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
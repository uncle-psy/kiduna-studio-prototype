'use client'

import { useState } from 'react'

type FilterType = 'ALL' | 'DUNAS' | 'MEMBERS' | 'ALLIANCES' | 'PROGRAMS'

const DIRECTORY = [
  // DUNAs
  { id: 'wv',   type: 'DUNA',     icon: 'WV', name: 'WV DUNA',           sub: 'Genesis · 312,000 members' },
  { id: 'mm',   type: 'DUNA',     icon: 'MM', name: 'Mountain Mesh',     sub: 'Community wireless · 1,420 members' },
  { id: 'cc',   type: 'DUNA',     icon: 'CC', name: 'WV Commerce Club',  sub: 'Business alliance · 4,180 members' },
  // Members
  { id: 'ada',  type: 'MEMBER',   icon: 'A',  name: 'Ada Whitfield',     sub: '@ada · Member · genesis' },
  { id: 'rue',  type: 'MEMBER',   icon: 'R',  name: 'Rue',               sub: '@rue · Founder · Coalfield Mutual' },
  { id: 'jules',type: 'MEMBER',   icon: 'J',  name: 'Jules',             sub: '@jules · Builder · 3 DUNAs' },
  // Alliances
  { id: 'cm',   type: 'ALLIANCE', icon: '⌘',  name: 'Coalfield ↔ Mesh', sub: 'Alliance · rooted in Mountain Mesh' },
  { id: 'ms',   type: 'ALLIANCE', icon: '⌘',  name: 'Main Street Co-op',sub: 'Alliance · rooted in WV Commerce Club' },
  // Programs
  { id: 'ic',   type: 'PROGRAM',  icon: '≡',  name: 'Inbox Concierge',  sub: 'Program · email triage & replies' },
]

const FILTERS: FilterType[] = ['ALL', 'DUNAS', 'MEMBERS', 'ALLIANCES', 'PROGRAMS']

export default function DirectoryView() {
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [search, setSearch] = useState('')

  const filtered = DIRECTORY.filter(d => {
    const matchFilter =
      filter === 'ALL' ||
      (filter === 'DUNAS'     && d.type === 'DUNA') ||
      (filter === 'MEMBERS'   && d.type === 'MEMBER') ||
      (filter === 'ALLIANCES' && d.type === 'ALLIANCE') ||
      (filter === 'PROGRAMS'  && d.type === 'PROGRAM')
    const matchSearch = !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.sub.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Eyebrow */}
      <div style={{
        fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
        fontSize: '0.66rem', fontWeight: 700,
        letterSpacing: '0.16em', textTransform: 'uppercase' as const,
        color: '#03CCD9', marginBottom: 8,
      }}>
        The Network
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
        fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em',
        lineHeight: 1.05, color: '#fff', margin: '0 0 8px',
      }}>
        Directory
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 24px' }}>
        DUNAs, Members, Alliances, and Programs across the DUNAVERSE. Open any card to meet its Ally.
      </p>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10, padding: '10px 16px', marginBottom: 20,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search the directory…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 14, fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' as const }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.10em',
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
            background: filter === f ? '#EAAA00' : 'transparent',
            color: filter === f ? '#09073A' : 'rgba(255,255,255,0.6)',
            border: filter === f ? '1px solid #EAAA00' : '1px solid rgba(255,255,255,0.18)',
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
      }}>
        {filtered.map(item => (
          <div key={item.id} style={{
            background: '#0A0D33',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 14,
            padding: '28px 24px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(234,170,0,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
          >
            {/* Circle icon */}
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: '#EAAA00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
              fontSize: item.icon.length > 1 ? 14 : 20,
              fontWeight: 700, color: '#09073A',
              marginBottom: 18,
            }}>
              {item.icon}
            </div>

            {/* Type label */}
            <div style={{
              fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: '#03CCD9', marginBottom: 6, alignSelf: 'flex-start',
            }}>
              {item.type}
            </div>

            {/* Name */}
            <div style={{
              fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
              fontSize: 20, fontWeight: 600, color: '#fff',
              marginBottom: 4, alignSelf: 'flex-start', lineHeight: 1.2,
            }}>
              {item.name}
            </div>

            {/* Sub */}
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.45)',
              marginBottom: 16, alignSelf: 'flex-start',
            }}>
              {item.sub}
            </div>

            {/* Divider */}
            <div style={{
              width: '100%', height: 1,
              background: 'rgba(255,255,255,0.08)', marginBottom: 16,
            }} />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
              <button style={{
                background: '#EAAA00', border: '1px solid #EAAA00',
                color: '#09073A', fontWeight: 700, fontSize: 12,
                padding: '7px 14px', borderRadius: 7, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                Meet the Ally
              </button>
              <button style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.75)', fontWeight: 500, fontSize: 12,
                padding: '7px 14px', borderRadius: 7, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

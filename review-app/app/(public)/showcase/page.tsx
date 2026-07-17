'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import '../dunathon-landing.css'
import DunaLandingFooter from '@/components/landing/DunaLandingFooter'
import type { LaunchpadCampaign, CampaignFilter } from '@/lib/launchpad-api-types'
import { getToken, getSessionToken } from '@/lib/auth'

// ── Filters / sorts ──────────────────────────────────────────────────────
const FILTERS: { value: CampaignFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Launched' },
  { value: 'failed', label: 'Closed' },
]

const SORTS = [
  { value: 'backers', label: 'Backers' },
  { value: 'raised', label: 'Committed' },
  { value: 'funded', label: '% funded' },
  { value: 'newest', label: 'Newest' },
]

// ── Display helpers ────────────────────────────────────────────────────────

/** Two-letter badge derived from the campaign name. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Human-readable USDC amount. */
function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

/** Ticker with a leading $ (API may or may not include one). */
function fmtTicker(t: string | null): string {
  if (!t) return '$TOKEN'
  return t.startsWith('$') ? t : `$${t}`
}

/** ICO price per token. */
function fmtPrice(p: number | null): string {
  if (p == null) return '—'
  return `$${p < 1 ? p.toFixed(4) : p.toLocaleString()}`
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  initialized: 'Initialized',
  fundraising: 'Fundraising',
  closed: 'Closed',
  settling: 'Settling',
  live: 'Live',
  refunding: 'Refunding',
  failed: 'Closed',
  cancelled: 'Cancelled',
}

const TARGET = new Date('2026-07-01T09:00:00-04:00').getTime()
const pad = (n: number) => String(n).padStart(2, '0')

export default function ShowcasePage() {
  const [campaigns, setCampaigns] = useState<LaunchpadCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<CampaignFilter>('all')
  const [sortKey, setSortKey] = useState('backers')
  const [desc, setDesc] = useState(true)
  const [now, setNow] = useState<number | null>(null)

  // ── Fetch dynamic launchpad data ──────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const token = getToken() || getSessionToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`/api/v1/launchpad?filter=${filter}&pageSize=50`, { headers })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.data || [])
      } else {
        setCampaigns([])
      }
    } catch (err) {
      console.error('Failed to fetch launchpad campaigns:', err)
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Auto-refresh while viewing active raises
  useEffect(() => {
    if (filter !== 'active') return
    const id = setInterval(fetchCampaigns, 15000)
    return () => clearInterval(id)
  }, [filter, fetchCampaigns])

  // countdown
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = now === null ? null : Math.max(0, TARGET - now)
  const cd = diff === null
    ? { d: '–', h: '–', m: '–', s: '–', live: false }
    : {
        d: String(Math.floor(diff / 86400000)),
        h: pad(Math.floor((diff % 86400000) / 3600000)),
        m: pad(Math.floor((diff % 3600000) / 60000)),
        s: pad(Math.floor((diff % 60000) / 1000)),
        live: diff === 0,
      }

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase()
    const dir = desc ? 1 : -1
    return campaigns
      .filter((c) => {
        if (!query) return true
        const hay = (
          c.name + ' ' + (c.description || '') + ' ' + (c.tokenTicker || '')
        ).toLowerCase()
        return hay.includes(query)
      })
      .sort((a, b) => {
        switch (sortKey) {
          case 'raised':
            return (b.totalCommitted - a.totalCommitted) * dir
          case 'funded':
            return (b.percentRaised - a.percentRaised) * dir
          case 'newest':
            return (a.createdAt < b.createdAt ? 1 : -1) * dir
          case 'backers':
          default:
            return (b.contributorCount - a.contributorCount) * dir
        }
      })
  }, [campaigns, q, sortKey, desc])

  return (
    <div className="duna-landing">
      {/* ===== NAV ===== */}
      <DunaLandingNav />

      {/* ===== PAGE HERO ===== */}
      <header className="page-hero">
        <img className="ridge" src="/review/screens/images/landing/ridge-motif.svg" alt="" aria-hidden="true" />
        <div className="wrap">
          <div className="eyebrow"><span className="dot" />Showcase · You Go First</div>
          <h1>Explore the movements taking <em className="wv-emph">shape.</em></h1>
          <p className="lead">Kiduna is a living laboratory of new organizations, communities, ventures, and causes. Watch founders transform ideas into institutions, follow their progress through transparent decision markets, and discover the tools, agents, templates, and governance models they are creating along the way. Everything learned is shared. Nothing is ever wasted.</p>
        </div>
      </header>

      {/* ===== COUNTDOWN ===== */}
      <section className="lp-cd-shell">
        <div className="wrap">
          <div className="lp-countdown">
            <div className="lp-cd-label">
              <span className="dot" />
              {cd.live ? <b>DUNAs are live.</b> : <>DUNAs go live <b>July 1, 2026 · 9:00 AM Eastern</b></>}
            </div>
            <div className="lp-cd-timer" role="timer" aria-label="Countdown to DUNA launch">
              <div className="cell"><span className="n">{cd.d}</span><span className="u">days</span></div>
              <div className="cell"><span className="n">{cd.h}</span><span className="u">hrs</span></div>
              <div className="cell"><span className="n">{cd.m}</span><span className="u">min</span></div>
              <div className="cell"><span className="n">{cd.s}</span><span className="u">sec</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LAUNCHPAD ===== */}
      <section className="section" id="dunas">
        <div className="wrap">
          <div className="lp-toolbar">
            <input
              id="lp-search"
              type="search"
              placeholder="Search DUNAs — name, mission, token…"
              aria-label="Search DUNAs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="lp-sort">
              <label htmlFor="lp-sort-sel">Sort by</label>
              <select id="lp-sort-sel" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button id="lp-dir" type="button" title="Toggle sort direction" aria-label="Toggle sort direction" onClick={() => setDesc((v) => !v)}>
                {desc ? '↓' : '↑'}
              </button>
            </div>
          </div>
          <div className="lp-cats-bar" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`lp-fchip ${filter === f.value ? 'active' : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="lp-empty">Loading launches…</p>
          ) : (
            <>
              <div className="lp-grid">
                {visible.map((c) => {
                  const status = STATUS_LABELS[c.launchStatus] ?? c.launchStatus
                  return (
                    <div className="lp-card" key={c.slug}>
                      <div className="lp-banner">
                        {c.logoUrl ? (
                          <img
                            src={c.logoUrl}
                            alt={`${c.name} banner`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <>
                            <span className="mk">{initials(c.name)}</span>
                            <span className="hint">Banner image · 800×200</span>
                          </>
                        )}
                      </div>
                      <div className="lp-body">
                        <div className="lp-head">
                          <h3>{c.name}</h3>
                          <span className={`lp-delta ${c.isActive ? 'up' : 'down'}`}>
                            {c.percentRaised}% raised
                          </span>
                        </div>
                        <div className="lp-cats">
                          <span className="cc">{status}</span>
                          {c.hasBidWall && <span className="cc">Bid Wall</span>}
                        </div>
                        <p className="lp-mission">{c.description || 'A new DUNA raising into its treasury.'}</p>
                        <div className="lp-stats">
                          <div className="st"><span className="k">Backers</span><span className="v">{c.contributorCount}</span></div>
                          <div className="st"><span className="k">Committed</span><span className="v">{fmtUsd(c.totalCommitted)}</span></div>
                          <div className="st"><span className="k">Goal</span><span className="v">{fmtUsd(c.minRaise)}</span></div>
                          <div className="st"><span className="k">{fmtTicker(c.tokenTicker)}</span><span className="v">{fmtPrice(c.icoPrice)}</span></div>
                        </div>
                        <div className="lp-btns">
                          <a
                            className="btn btn-primary"
                            href={`/launchpad/${c.slug}`}
                          >
                            {c.isActive ? 'Back this DUNA' : 'View'}
                          </a>
                          <a
                            className="btn btn-secondary"
                            href={`/launchpad/${c.slug}`}
                          >
                            Explore
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {visible.length === 0 && (
                <p className="lp-empty">
                  {q ? `No DUNAs match "${q}".` : 'No DUNAs on the launchpad yet.'}
                </p>
              )}
            </>
          )}

          <div className="inline-cta">
            <a href="/#contact" className="btn btn-primary">Register your DUNA →</a>
            <a href="/#events" className="btn btn-secondary">See what&apos;s happening this summer</a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <DunaLandingFooter />
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { useAlliance } from '@/lib/alliance-context'

/* ────────────────────────────────────────────────────────────────────────────
   Shared components for all Alliance / Squad sub-pages.
   All business logic unchanged — presentation layer only.
   ──────────────────────────────────────────────────────────────────────────── */

const ROLES = ['Member']

function short(s: string | null | undefined, n = 4) {
  if (!s) return '—'
  return s.length <= n * 2 + 1 ? s : `${s.slice(0, n)}…${s.slice(-n)}`
}

/* ── SVG Icon Components ──────────────────────────────────────────────────── */

function SvgIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const ICON_PATHS = {
  wallet: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  userPlus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM20 8v6M23 11h-6',
  userMinus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 11h-6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  fileText: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  building: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18zM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  check: 'M20 6 9 17l-5-5',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  alertTriangle: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
}

function IconWallet({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.wallet} size={size} /> }
function IconSend({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.send} size={size} /> }
function IconUsers({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.users} size={size} /> }
function IconUserPlus({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.userPlus} size={size} /> }
function IconUserMinus({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.userMinus} size={size} /> }
function IconShield({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.shield} size={size} /> }
function IconFileText({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.fileText} size={size} /> }
function IconBuilding({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.building} size={size} /> }
function IconLink({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.link} size={size} /> }
function IconCheck({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.check} size={size} /> }
function IconLock({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.lock} size={size} /> }
function IconAlert({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.alertTriangle} size={size} /> }
function IconPlus({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.plus} size={size} /> }
function IconX({ size = 16 }: { size?: number }) { return <SvgIcon d={ICON_PATHS.x} size={size} /> }

function CopyButton({ value }: { value?: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        } catch { /* clipboard unavailable */ }
      }}
      title="Copy full address"
      className="sq-copy-btn"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/* ── Alliance Selector ────────────────────────────────────────────────────── */

function AllianceSelector() {
  const { alliances, alliancesLoading, selectedAllianceId, selectAlliance } = useAlliance()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const routeId = params?.allianceId ? String(params.allianceId) : null
  const isSelector = routeId === 'select'

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = alliances.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.handle.toLowerCase().includes(search.toLowerCase())
  )
  const selected = alliances.find((a) => a.id === selectedAllianceId)

  function handleSelect(id: string) {
    selectAlliance(id)
    setOpen(false)
    setSearch('')
    if (!isSelector && routeId && routeId !== id) {
      const newPath = pathname.replace(`/team/${routeId}`, `/team/${id}`)
      router.push(newPath)
    }
  }

  return (
    <div className="sq-selector" ref={ref}>
      <button className="sq-selector-trigger" onClick={() => setOpen(!open)}>
        {alliancesLoading ? (
          <span className="sq-selector-placeholder">Loading alliances…</span>
        ) : selected ? (
          <span className="sq-selector-chosen">
            <span className="sq-selector-ini">{(selected.name.match(/[A-Za-z0-9]+/g) || ['A']).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            <span className="sq-selector-info">
              <span className="sq-selector-name">{selected.name}</span>
              <span className="sq-selector-handle">@{selected.handle}</span>
            </span>
          </span>
        ) : (
          <span className="sq-selector-placeholder">Select an Alliance</span>
        )}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: '150ms' }}>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="sq-selector-dropdown">
          <input className="sq-selector-search" placeholder="Search alliances…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <div className="sq-selector-list">
            {filtered.length === 0 ? (
              <div className="sq-selector-empty">No alliances found</div>
            ) : (
              filtered.map((a) => (
                <button key={a.id} className={`sq-selector-option${a.id === selectedAllianceId ? ' active' : ''}`} onClick={() => handleSelect(a.id)}>
                  <span className="sq-selector-ini">{(a.name.match(/[A-Za-z0-9]+/g) || ['A']).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                  <span className="sq-selector-info">
                    <span className="sq-selector-name">{a.name}</span>
                    <span className="sq-selector-handle">@{a.handle}</span>
                  </span>
                  <span className={`sq-status-dot ${a.status === 'active' ? 'active' : ''}`} />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Empty State ──────────────────────────────────────────────────────────── */

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="sq-empty">
      <div className="sq-empty-icon">{icon}</div>
      <div className="sq-empty-title">{title}</div>
      {description && <div className="sq-empty-desc">{description}</div>}
    </div>
  )
}

/* ── Loading State (premium, centered) ────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="sq-loading">
      <style>{`@keyframes sq-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* header card skeleton */}
        <div className="sq-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'sq-shimmer 1.4s ease-in-out infinite', zIndex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 20, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }} />
              <div style={{ height: 13, width: '25%', borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div style={{ width: 64, height: 24, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        </div>
        {/* content card skeleton */}
        <div className="sq-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'sq-shimmer 1.4s ease-in-out infinite', zIndex: 1 }} />
          <div style={{ height: 16, width: '30%', borderRadius: 5, background: 'rgba(255,255,255,0.07)', marginBottom: 18 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: `${50 + i * 8}%`, borderRadius: 4, background: 'rgba(255,255,255,0.07)', marginBottom: 6 }} />
                <div style={{ height: 11, width: '30%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
              </div>
              <div style={{ width: 56, height: 22, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Alliance Info Header Card ────────────────────────────────────────────── */

function AllianceInfoHeader() {
  const { alliance, memberCount, myWallet } = useAlliance()
  if (!alliance) return null

  const myRole = alliance.members.find(m => m.wallet === myWallet)?.role ||
    (alliance.creatorWallet === myWallet ? 'Wizard' : '—')

  return (
    <div className="sq-info-header">
      <div className="sq-info-top">
        <div className="sq-info-identity">
          <div className="sq-info-ini">{(alliance.name.match(/[A-Za-z0-9]+/g) || ['A']).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div>
            <h2 className="sq-info-name">{alliance.name}</h2>
            <span className="sq-info-handle">@{alliance.handle}</span>
          </div>
        </div>
        <span className={`sq-badge ${alliance.status === 'active' ? 'gold' : 'dim'}`}>{alliance.status}</span>
      </div>
      {alliance.description && <p className="sq-info-desc">{alliance.description}</p>}
      <div className="sq-info-stats">
        <div className="sq-info-stat">
          <span className="sq-info-stat-label">Visibility</span>
          <span className="sq-info-stat-value">{alliance.visibility}</span>
        </div>
        <div className="sq-info-stat">
          <span className="sq-info-stat-label">Threshold</span>
          <span className="sq-info-stat-value">{alliance.threshold} of {memberCount}</span>
        </div>
        <div className="sq-info-stat">
          <span className="sq-info-stat-label">Members</span>
          <span className="sq-info-stat-value">{memberCount}</span>
        </div>
        <div className="sq-info-stat">
          <span className="sq-info-stat-label">Your Role</span>
          <span className="sq-info-stat-value sq-role-tag">{myRole}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Notices ──────────────────────────────────────────────────────────────── */

function Notices() {
  const { error, notice } = useAlliance()
  return (
    <>
      {error && <div className="sq-alert sq-alert-error">{error}</div>}
      {notice && <div className="sq-alert sq-alert-success">{notice}</div>}
    </>
  )
}

/* ── Page Shell ───────────────────────────────────────────────────────────── */

function SquadPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { alliance, loading, alliancesLoading, alliances, selectedAllianceId } = useAlliance()
  const params = useParams()
  const routeId = params?.allianceId ? String(params.allianceId) : null
  const isSelector = routeId === 'select'
  // In selector mode with no choice yet, the context auto-picks the most recent
  // alliance once the list loads — keep showing the loader until then so the
  // "Select an Alliance" empty state doesn't flash.
  const resolvingRecent = isSelector && !selectedAllianceId && alliancesLoading

  return (
    <div className="sq">
      <style>{CSS}</style>
      <div className="sq-page">
        {/* Page title bar — selector ALWAYS visible */}
        <div className="sq-page-bar">
          <div className="sq-page-bar-left">
            <span className="sq-page-eyebrow">Squad</span>
            <h1 className="sq-page-title">{title}</h1>
          </div>
          <AllianceSelector />
        </div>

        {(loading || resolvingRecent || alliancesLoading) && <LoadingState />}
        {!loading && !alliancesLoading && !resolvingRecent && !alliance && isSelector && !selectedAllianceId && (
          <EmptyState
            icon={<IconBuilding size={32} />}
            title="Select an Alliance to continue"
            description="Use the dropdown above to choose an alliance. Your selection will persist as you navigate between Squad pages."
          />
        )}
        {!loading && !alliancesLoading && !alliance && isSelector && selectedAllianceId && (
          <>
            <Notices />
            <EmptyState icon={<IconAlert size={32} />} title="Failed to load alliance" description="Something went wrong loading this alliance. Try selecting a different one." />
          </>
        )}
        {!loading && !alliancesLoading && !alliance && !isSelector && (
          <>
            <Notices />
            <EmptyState icon={<IconAlert size={32} />} title="Alliance not found" description="This alliance may have been removed or is not accessible." />
          </>
        )}
        {!loading && !alliancesLoading && alliance && (
          <>
            <AllianceInfoHeader />
            <Notices />
            {children}
          </>
        )}
      </div>
    </div>
  )
}

/* ── CSS ──────────────────────────────────────────────────────────────────── */

const CSS = `
.sq {
  --sq-gold: #EAAA00;
  --sq-gold-hover: #FFC229;
  --sq-gold-soft: rgba(234,170,0,0.12);
  --sq-gold-border: rgba(234,170,0,0.3);
  --sq-bg: #09073A;
  --sq-surface: #0d0b3a;
  --sq-surface-raised: #12104a;
  --sq-surface-input: #0a0924;
  --sq-fg: #FFFFFF;
  --sq-fg-muted: #b8bcd0;
  --sq-fg-soft: rgba(255,255,255,0.50);
  --sq-fg-dim: rgba(255,255,255,0.30);
  --sq-border: rgba(255,255,255,0.08);
  --sq-border-strong: rgba(255,255,255,0.16);
  --sq-danger: #f87171;
  --sq-danger-soft: rgba(248,113,113,0.12);
  --sq-success: #34d399;
  --sq-success-soft: rgba(52,211,153,0.08);
  --sq-radius: 12px;
  --sq-radius-sm: 8px;
  --sq-radius-xs: 6px;
  --sq-font: "Avenir","Avenir Next",ui-sans-serif,system-ui,sans-serif;
  --sq-font-display: "Goudy Heavyface","Goudy Old Style",Georgia,serif;
  --sq-font-mono: ui-monospace,"SF Mono",Menlo,monospace;
  font-family: var(--sq-font);
  color: var(--sq-fg);
}
.sq *, .sq *::before, .sq *::after { box-sizing: border-box; }

/* ISSUE 3 FIX: Match Economics pages (1080px + 30px padding) */
.sq-page { max-width: 1240px; margin: 0 auto; padding: 0 30px 80px; }

.sq-page-bar {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 16px; flex-wrap: wrap; margin-bottom: 24px; padding-bottom: 20px;
  border-bottom: 1px solid var(--sq-border);
}
.sq-page-bar-left { display: flex; flex-direction: column; gap: 2px; }
.sq-page-eyebrow {
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--sq-gold); opacity: 0.9;
}
.sq-page-title {
  font-family: var(--sq-font-display); font-weight: 400; font-size: 1.65rem;
  line-height: 1.1; margin: 0; color: var(--sq-fg);
}

/* Selector */
.sq-selector { position: relative; min-width: 260px; }
.sq-selector-trigger {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 8px 14px; border-radius: var(--sq-radius-sm);
  border: 1px solid var(--sq-border-strong); background: var(--sq-surface-raised);
  color: var(--sq-fg); cursor: pointer; transition: 140ms; font: inherit; text-align: left;
}
.sq-selector-trigger:hover { border-color: var(--sq-gold-border); }
.sq-selector-placeholder { color: var(--sq-fg-soft); font-size: 0.88rem; flex: 1; }
.sq-selector-chosen { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.sq-selector-ini {
  width: 32px; height: 32px; border-radius: 8px; display: flex;
  align-items: center; justify-content: center; font-family: var(--sq-font-display);
  font-size: 0.78rem; background: var(--sq-gold-soft); color: var(--sq-gold); flex-shrink: 0;
}
.sq-selector-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sq-selector-name { font-weight: 600; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sq-selector-handle { font-family: var(--sq-font-mono); font-size: 0.7rem; color: var(--sq-fg-soft); }
.sq-selector-dropdown {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 50;
  background: var(--sq-surface-raised); border: 1px solid var(--sq-border-strong);
  border-radius: var(--sq-radius); box-shadow: 0 12px 40px rgba(0,0,0,0.5); overflow: hidden;
}
.sq-selector-search {
  width: 100%; padding: 10px 14px; border: none; border-bottom: 1px solid var(--sq-border);
  background: transparent; color: var(--sq-fg); font: inherit; font-size: 0.86rem; outline: none;
}
.sq-selector-search::placeholder { color: var(--sq-fg-dim); }
.sq-selector-list { max-height: 240px; overflow-y: auto; padding: 4px; }
.sq-selector-option {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 8px 10px; border-radius: var(--sq-radius-xs); border: none;
  background: transparent; color: var(--sq-fg); cursor: pointer; font: inherit; text-align: left; transition: 100ms;
}
.sq-selector-option:hover { background: rgba(255,255,255,0.04); }
.sq-selector-option.active { background: var(--sq-gold-soft); }
.sq-selector-empty { padding: 16px; text-align: center; color: var(--sq-fg-soft); font-size: 0.84rem; }
.sq-status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sq-fg-dim); margin-left: auto; flex-shrink: 0; }
.sq-status-dot.active { background: var(--sq-success); }

/* Info header */
.sq-info-header {
  background: var(--sq-surface-raised); border: 1px solid var(--sq-border);
  border-radius: var(--sq-radius); padding: 20px 22px; margin-bottom: 20px;
}
.sq-info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.sq-info-identity { display: flex; align-items: center; gap: 14px; }
.sq-info-ini {
  width: 44px; height: 44px; border-radius: 10px; display: flex;
  align-items: center; justify-content: center; font-family: var(--sq-font-display);
  font-size: 1rem; background: var(--sq-gold-soft); color: var(--sq-gold); flex-shrink: 0;
}
.sq-info-name { font-family: var(--sq-font-display); font-weight: 400; font-size: 1.25rem; line-height: 1.1; margin: 0; }
.sq-info-handle { font-family: var(--sq-font-mono); font-size: 0.74rem; color: var(--sq-fg-soft); }
.sq-info-desc { font-size: 0.86rem; color: var(--sq-fg-muted); margin: 12px 0 0; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sq-badge {
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 3px 10px; border-radius: 999px; border: 1px solid var(--sq-border); white-space: nowrap; flex-shrink: 0;
}
.sq-badge.gold { color: var(--sq-gold); border-color: var(--sq-gold-border); }
.sq-badge.dim { color: var(--sq-fg-dim); }
.sq-info-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
  margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--sq-border);
}
.sq-info-stat { display: flex; flex-direction: column; gap: 3px; }
.sq-info-stat-label { font-size: 0.66rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sq-fg-soft); }
.sq-info-stat-value { font-size: 0.9rem; font-weight: 600; }
.sq-role-tag { color: var(--sq-gold); }

/* Cards */
.sq-card {
  background: var(--sq-surface-raised); border: 1px solid var(--sq-border);
  border-radius: var(--sq-radius); padding: 22px 24px; margin-bottom: 16px;
}
.sq-card-title {
  font-size: 0.9rem; font-weight: 700; color: var(--sq-fg);
  margin: 0 0 16px; display: flex; align-items: center; gap: 8px;
}
.sq-card-title-icon {
  width: 22px; height: 22px; border-radius: 6px; display: flex;
  align-items: center; justify-content: center;
  background: var(--sq-gold-soft); color: var(--sq-gold); font-size: 11px;
}
.sq-card-subtitle { font-size: 0.78rem; color: var(--sq-fg-soft); margin: -10px 0 16px; line-height: 1.5; }

/* Alerts */
.sq-alert { padding: 10px 14px; border-radius: var(--sq-radius-sm); font-size: 0.82rem; margin-bottom: 16px; line-height: 1.5; }
.sq-alert-error { background: var(--sq-danger-soft); border: 1px solid rgba(248,113,113,0.25); color: var(--sq-danger); }
.sq-alert-success { background: var(--sq-success-soft); border: 1px solid rgba(52,211,153,0.25); color: var(--sq-success); }

/* KV grid */
.sq-kv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.sq-kv-item { display: flex; flex-direction: column; gap: 4px; }
.sq-kv-label { font-size: 0.64rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sq-fg-soft); display: flex; align-items: center; gap: 5px; }
.sq-kv-label .sq-tooltip-icon { cursor: help; opacity: 0.6; font-size: 10px; }
.sq-kv-value { font-family: var(--sq-font-mono); font-size: 0.86rem; display: flex; align-items: center; gap: 4px; }
.sq-kv-balance { font-family: var(--sq-font); font-weight: 700; font-size: 1.15rem; }
.sq-copy-btn {
  font-size: 0.68rem; color: var(--sq-fg-soft); background: rgba(255,255,255,0.04);
  border: 1px solid var(--sq-border); border-radius: 4px; padding: 2px 7px;
  cursor: pointer; transition: 120ms; font-family: var(--sq-font);
}
.sq-copy-btn:hover { color: var(--sq-gold); border-color: var(--sq-gold-border); }

/* Forms */
.sq-input {
  width: 100%; padding: 10px 14px; font: inherit; font-size: 0.86rem;
  color: var(--sq-fg); background: var(--sq-surface-input);
  border: 1px solid var(--sq-border-strong); border-radius: var(--sq-radius-sm); outline: none; transition: 140ms;
}
.sq-input:focus { border-color: var(--sq-gold-border); }
.sq-input::placeholder { color: var(--sq-fg-dim); }
.sq-select {
  padding: 8px 12px; font: inherit; font-size: 0.84rem;
  color: var(--sq-fg); background: var(--sq-surface-input);
  border: 1px solid var(--sq-border-strong); border-radius: var(--sq-radius-sm); outline: none; cursor: pointer;
}
.sq-form-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.sq-form-group { display: flex; flex-direction: column; gap: 6px; }
.sq-form-group.flex-1 { flex: 1; min-width: 180px; }
.sq-form-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sq-fg-soft); }

/* Buttons */
.sq-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 20px; font: inherit; font-size: 0.84rem; font-weight: 700;
  border-radius: var(--sq-radius-sm); border: none; cursor: pointer; transition: 140ms; white-space: nowrap;
}
.sq-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.sq-btn-gold { background: var(--sq-gold); color: #1a1205; }
.sq-btn-gold:hover:not(:disabled) { background: var(--sq-gold-hover); }
.sq-btn-soft { background: rgba(255,255,255,0.06); color: var(--sq-fg-muted); border: 1px solid var(--sq-border-strong); }
.sq-btn-soft:hover:not(:disabled) { border-color: var(--sq-fg-soft); color: var(--sq-fg); }
.sq-btn-danger { background: transparent; color: var(--sq-danger); border: 1px solid rgba(248,113,113,0.35); }
.sq-btn-danger:hover:not(:disabled) { background: var(--sq-danger-soft); }
.sq-btn-sm { padding: 7px 14px; font-size: 0.78rem; }

/* Member table */
.sq-member-table { width: 100%; }
.sq-member-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border-bottom: 1px solid var(--sq-border); transition: 80ms;
}
.sq-member-row:last-child { border-bottom: none; }
.sq-member-row:hover { background: rgba(255,255,255,0.015); }
.sq-member-wallet { font-family: var(--sq-font-mono); font-size: 0.84rem; }
.sq-member-tag {
  font-size: 0.64rem; font-weight: 600; color: var(--sq-fg-dim);
  background: rgba(255,255,255,0.06); border-radius: 4px; padding: 2px 7px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.sq-member-spacer { flex: 1; }
.sq-member-actions { display: flex; align-items: center; gap: 8px; }
.sq-member-role-badge {
  font-size: 0.72rem; font-weight: 600; color: var(--sq-fg-muted);
  background: rgba(255,255,255,0.04); border: 1px solid var(--sq-border);
  border-radius: var(--sq-radius-xs); padding: 4px 10px;
}
.sq-member-status-badge {
  font-size: 0.64rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 3px 8px; border-radius: 999px;
}
.sq-member-status-badge.creator { background: var(--sq-gold-soft); color: var(--sq-gold); }
.sq-member-status-badge.active { background: rgba(52,211,153,0.1); color: var(--sq-success); }

/* Proposal cards */
.sq-proposal {
  border: 1px solid var(--sq-border); border-radius: var(--sq-radius-sm);
  padding: 14px 16px; margin-bottom: 10px; transition: 80ms;
}
.sq-proposal:hover { border-color: var(--sq-border-strong); }
.sq-proposal-top { display: flex; align-items: flex-start; gap: 12px; }
.sq-proposal-body { flex: 1; min-width: 0; }
.sq-proposal-desc { font-weight: 600; font-size: 0.88rem; }
.sq-proposal-status { font-size: 0.76rem; color: var(--sq-fg-soft); margin-top: 3px; }
.sq-proposal-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; margin-top: 2px; }
.sq-proposal-badge { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; }
.sq-proposal-badge.waiting { background: rgba(234,170,0,0.1); color: var(--sq-gold); }
.sq-proposal-badge.ready { background: rgba(52,211,153,0.1); color: var(--sq-success); }
.sq-proposal-badge.cancelled { background: rgba(248,113,113,0.1); color: var(--sq-danger); }

/* Note */
.sq-note { font-size: 0.76rem; color: var(--sq-fg-soft); margin-top: 14px; line-height: 1.5; }

/* Empty state */
.sq-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 56px 20px; border: 1px dashed var(--sq-border-strong);
  border-radius: var(--sq-radius); background: rgba(255,255,255,0.01);
}
.sq-empty-icon { color: var(--sq-fg-dim); margin-bottom: 16px; }
.sq-empty-title { font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
.sq-empty-desc { font-size: 0.84rem; color: var(--sq-fg-soft); max-width: 360px; line-height: 1.5; }

/* ISSUE 1 FIX: Premium centered loading state */
.sq-loading {
  display: flex; align-items: center; justify-content: center;
  min-height: 340px; padding: 40px 20px;
}
.sq-loading-inner {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  animation: sq-fade-in 0.3s ease;
}
.sq-spinner-lg {
  width: 44px; height: 44px; border: 3px solid var(--sq-border-strong);
  border-top-color: var(--sq-gold); border-radius: 50%;
  animation: sq-spin 0.8s linear infinite; margin-bottom: 20px;
}
.sq-loading-title {
  font-size: 1.05rem; font-weight: 700; color: var(--sq-fg); margin-bottom: 8px;
}
.sq-loading-desc {
  font-size: 0.84rem; color: var(--sq-fg-soft); max-width: 300px; line-height: 1.5;
}
@keyframes sq-spin { to { transform: rotate(360deg); } }
@keyframes sq-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* Modal overlay */
.sq-modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  animation: sq-fade-in 0.15s ease;
}
.sq-modal {
  background: var(--sq-surface-raised); border: 1px solid var(--sq-border-strong);
  border-radius: var(--sq-radius); width: 100%; max-width: 480px; margin: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: sq-modal-in 0.2s ease;
}
.sq-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid var(--sq-border);
}
.sq-modal-title { font-size: 1rem; font-weight: 700; margin: 0; }
.sq-modal-close {
  background: none; border: none; color: var(--sq-fg-soft); cursor: pointer;
  padding: 4px; border-radius: 6px; transition: 100ms; display: flex;
}
.sq-modal-close:hover { color: var(--sq-fg); background: rgba(255,255,255,0.06); }
.sq-modal-body { padding: 22px; }
.sq-modal-footer {
  padding: 16px 22px; border-top: 1px solid var(--sq-border);
  display: flex; justify-content: flex-end; gap: 10px;
}
@keyframes sq-modal-in { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }

/* Action menu items */
.sq-action-item {
  display: flex; align-items: center; gap: 14px; width: 100%;
  padding: 14px 16px; border-radius: var(--sq-radius-sm);
  border: 1px solid var(--sq-border); background: transparent;
  color: var(--sq-fg); cursor: pointer; font: inherit; text-align: left;
  transition: 120ms; margin-bottom: 8px;
}
.sq-action-item:last-child { margin-bottom: 0; }
.sq-action-item:hover { border-color: var(--sq-gold-border); background: rgba(255,255,255,0.02); }
.sq-action-icon {
  width: 36px; height: 36px; border-radius: 8px; display: flex;
  align-items: center; justify-content: center;
  background: var(--sq-gold-soft); color: var(--sq-gold); flex-shrink: 0;
}
.sq-action-icon.danger { background: var(--sq-danger-soft); color: var(--sq-danger); }
.sq-action-label { font-weight: 600; font-size: 0.88rem; }
.sq-action-desc { font-size: 0.74rem; color: var(--sq-fg-soft); margin-top: 2px; }

/* Radio list */
.sq-radio-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border: 1px solid var(--sq-border); border-radius: var(--sq-radius-sm);
  cursor: pointer; transition: 100ms; margin-bottom: 8px;
}
.sq-radio-item:hover { border-color: var(--sq-border-strong); }
.sq-radio-item.selected { border-color: var(--sq-gold-border); background: var(--sq-gold-soft); }
.sq-radio-dot {
  width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--sq-border-strong);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.sq-radio-item.selected .sq-radio-dot { border-color: var(--sq-gold); }
.sq-radio-dot-inner { width: 8px; height: 8px; border-radius: 50%; background: var(--sq-gold); display: none; }
.sq-radio-item.selected .sq-radio-dot-inner { display: block; }

/* Threshold */
.sq-threshold-visual {
  display: flex; align-items: center; gap: 14px; padding: 16px 18px;
  background: var(--sq-surface); border-radius: var(--sq-radius-sm);
  border: 1px solid var(--sq-border); margin-bottom: 16px;
}
.sq-threshold-number { font-family: var(--sq-font-display); font-size: 2rem; color: var(--sq-gold); line-height: 1; }
.sq-threshold-of { font-size: 0.84rem; color: var(--sq-fg-soft); }
.sq-threshold-bar { flex: 1; height: 6px; background: var(--sq-border-strong); border-radius: 3px; overflow: hidden; }
.sq-threshold-fill { height: 100%; background: var(--sq-gold); border-radius: 3px; transition: 200ms; }

/* Responsive */
@media (max-width: 700px) {
  .sq-page { padding: 0 16px 64px; max-width: none; }
  .sq-page-bar { flex-direction: column; align-items: stretch; }
  .sq-selector { min-width: 0; }
  .sq-info-stats { grid-template-columns: repeat(2, 1fr); }
  .sq-form-row { flex-direction: column; }
  .sq-form-group.flex-1 { min-width: 0; }
  .sq-kv-grid { grid-template-columns: 1fr; }
  .sq-member-row { flex-wrap: wrap; }
  .sq-proposal-top { flex-direction: column; }
  .sq-proposal-actions { margin-top: 8px; }
  .sq-modal { margin: 12px; }
}
`

export {
  ROLES, short, CopyButton, AllianceSelector, EmptyState, LoadingState,
  AllianceInfoHeader, Notices, SquadPageShell, CSS,
  IconWallet, IconSend, IconUsers, IconUserPlus, IconUserMinus,
  IconShield, IconFileText, IconBuilding, IconLink, IconCheck, IconLock, IconAlert, IconPlus, IconX,
}
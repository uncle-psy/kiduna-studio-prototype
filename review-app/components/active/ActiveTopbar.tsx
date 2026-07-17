'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useStudio } from '@/lib/studio-context'
import PlatformSwitcher from '@/components/PlatformSwitcher'
import GameSwitcher from '@/components/GameSwitcher'
import ModeSwitcher from '@/components/ModeSwitcher'
import { Menu, X, Search, Users, Trophy, Bell } from 'lucide-react'
import { usePrototype, levelIndex, LEVELS } from '@/lib/prototype-context'
import { useWallet } from '@solana/wallet-adapter-react'

type Panel = 'search' | 'community' | 'achievements' | 'notifications' | null

/* ── Panel wrapper ─────────────────────────────────────────── */
function HeaderPanel({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      width: 320, background: '#09073A',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 14, boxShadow: '0 16px 48px rgba(3,1,27,0.7)',
      zIndex: 200, overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function PanelHead({ title }: { title: string }) {
  return (
    <div style={{
      padding: '14px 18px 10px',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      fontFamily: '"Goudy Heavyface","Goudy Old Style",Georgia,serif',
      fontSize: 18, fontWeight: 600, color: '#fff',
    }}>
      {title}
    </div>
  )
}

/* ── Search panel ──────────────────────────────────────────── */
function SearchPanel({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const results = [
    { type: 'DUNA',     icon: 'WV', label: 'Mountain Mesh',        sub: 'Community wireless across rural WV.' },
    { type: 'DUNA',     icon: 'CC', label: 'WV Commerce Club',      sub: 'Appalachian small businesses.' },
    { type: 'Member',   icon: '☿',  label: 'Jules · @jules',        sub: 'Founder of Block Garden Charleston.' },
    { type: 'Proposal', icon: '📋', label: 'Fund the next county',  sub: 'Mountain Mesh · open · 9 days' },
  ].filter(r => !q || r.label.toLowerCase().includes(q.toLowerCase()))

  return (
    <HeaderPanel onClose={onClose}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search the DUNAVERSE…"
          style={{
            width: '100%', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
            padding: '8px 12px', color: '#fff', fontSize: 13,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {results.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              display: 'grid', placeItems: 'center',
              fontSize: 12, fontWeight: 700, color: '#EAAA00', flexShrink: 0,
            }}>{r.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{r.sub}</div>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
            }}>{r.type}</span>
          </div>
        ))}
      </div>
    </HeaderPanel>
  )
}

/* ── Community panel ───────────────────────────────────────── */
function CommunityPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const items = [
    { icon: '👥', label: 'Find members & founders', href: '/seek' },
    { icon: '🎙', label: 'Live Vibe rooms',          href: '/vibe' },
    { icon: '✉', label: 'Invite with your Kinship Code', href: '/codes' },
  ]
  return (
    <HeaderPanel onClose={onClose}>
      <PanelHead title="Community" />
      <div style={{ padding: '8px 0 6px' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 18px', cursor: 'pointer',
          }}
            onClick={() => { router.push(item.href); onClose() }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' as const }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </HeaderPanel>
  )
}

/* ── Achievements panel ────────────────────────────────────── */
function AchievementsPanel({ onClose }: { onClose: () => void }) {
  const items = [
    { icon: '✦', label: 'First conversation',         done: true },
    { icon: '✦', label: 'Joined the genesis DUNA',    done: true },
    { icon: '◷', label: 'Create your first Ally',     done: false },
  ]
  return (
    <HeaderPanel onClose={onClose}>
      <PanelHead title="Achievements" />
      <div style={{ padding: '8px 0 6px' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{
              fontSize: 16, width: 24, textAlign: 'center',
              color: item.done ? '#EAAA00' : 'rgba(255,255,255,0.3)',
            }}>{item.icon}</span>
            <span style={{
              fontSize: 13,
              color: item.done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
            }}>{item.label}</span>
          </div>
        ))}
      </div>
    </HeaderPanel>
  )
}

/* ── Notifications panel ───────────────────────────────────── */
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const items = [
    { icon: '★', label: 'Your Host sent you 50 WVDUNA',                    time: 'now' },
    { icon: '📋', label: 'Mountain Mesh opened Proposal #14',               time: '2h' },
    { icon: '☿', label: 'The Alchemist finished a scheduled task',          time: '5h' },
  ]
  return (
    <HeaderPanel onClose={onClose}>
      <PanelHead title="Notifications" />
      <div style={{ padding: '4px 0 6px' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '11px 18px', cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 16, width: 24, textAlign: 'center', marginTop: 1, color: '#EAAA00' }}>
              {item.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{item.label}</div>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginTop: 2 }}>
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </HeaderPanel>
  )
}

/* ── Main header ───────────────────────────────────────────── */
export default function ActiveTopbar() {
  const { user, logout } = useAuth()
  const { sidebarOpen, toggleSidebar } = useStudio()
  const router = useRouter()
  const { state: proto, ready: protoReady } = usePrototype()
  // const banner = bannerCopy(proto)
  const lvlIdx = levelIndex(user?.subscription || proto.level)
  const levelName = LEVELS[lvlIdx]?.name || 'Member'

  const { publicKey } = useWallet()
  const [copied, setCopied] = useState(false)

  const handleCopyAddress = () => {
    if (user?.wallet) {
      navigator.clipboard.writeText(user.wallet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const [panel, setPanel] = useState<Panel>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const toggle = (p: Panel) => setPanel(prev => prev === p ? null : p)

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const iconBtn = 'w-8 h-8 rounded-lg bg-transparent border-none text-white/80 hover:text-white hover:bg-white/[0.07] flex items-center justify-center cursor-pointer transition-all'

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 40 }}>
    <header className="studio-header">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Logo */}
      <button onClick={() => { window.location.href = '/' }} className="studio-header-logo" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club"
          style={{ height: 32, width: 'auto', background: 'transparent', boxShadow: 'none', borderRadius: 0 }} />
      </button>

      {/* Platform + YOUR HOME */}
      <div className="hidden md:contents">
        <PlatformSwitcher />
        <GameSwitcher />
        <span style={{
         fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
         textTransform: 'uppercase', color: '#EAAA00',
         background: 'transparent', border: '1px solid rgba(234,170,0,0.45)',
         borderRadius: 999, padding: '5px 12px',
         flexShrink: 0, whiteSpace: 'nowrap',
         cursor: 'default', pointerEvents: 'none', userSelect: 'none',
         display: 'inline-flex', alignItems: 'center',
      }}>
       Your Home
      </span>
      </div>

      {/* Mode switcher */}
      <div className="studio-header-centre"><ModeSwitcher /></div>

      <div className="flex-1" />

      {/* Right icon buttons — each toggles a panel */}
      <div className="hidden md:flex items-center gap-1" style={{ position: 'relative' }}>

        {/* Search — navigates to Seek page */}
        <div style={{ position: 'relative' }}>
          <button className={iconBtn} onClick={() => router.push('/seek')}>
            <Search size={16} />
          </button>
        </div>

        {/* Community — navigates to Directory */}
        <div style={{ position: 'relative' }}>
          <button className={iconBtn} onClick={() => router.push('/directory')}>
            <Users size={16} />
          </button>
        </div>

        {/* Achievements */}
        <div style={{ position: 'relative' }}>
          <button className={iconBtn} onClick={() => toggle('achievements')}
            style={{ color: panel === 'achievements' ? 'rgba(255,255,255,0.9)' : undefined }}>
            <Trophy size={16} />
          </button>
          {panel === 'achievements' && <AchievementsPanel onClose={() => setPanel(null)} />}
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button className={`relative ${iconBtn}`} onClick={() => toggle('notifications')}
            style={{ color: panel === 'notifications' ? 'rgba(255,255,255,0.9)' : undefined }}>
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EAAA00] border border-[#09073A]" />
          </button>
          {panel === 'notifications' && <NotificationsPanel onClose={() => setPanel(null)} />}
        </div>
      </div>

      {/* Member badge — clicks to /role */}
      {protoReady && (
        <div
          className="hidden md:flex items-center gap-1.5 shrink-0 cursor-pointer"
          onClick={() => router.push('/role')}
          style={{ border: '1px solid rgba(234,170,0,0.45)', borderRadius: 999, padding: '4px 10px', background: 'transparent' }}
          title="Your standing"
        >
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {LEVELS.map((_, i) => (
              <span key={i} style={{
                width: 4, height: 4, borderRadius: '50%',
                background: i <= lvlIdx ? '#EAAA00' : 'rgba(234,170,0,0.25)',
              }} />
            ))}
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#EAAA00', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>{levelName}</span>
        </div>
      )}

      {/* Avatar + dropdown */}
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button"
          className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden text-sm font-medium"
            style={{
              background: '#100E59', border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: 15,
            }}>
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name || 'User'}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  const t = e.target as HTMLImageElement
                  t.style.display = 'none'
                  t.parentElement!.textContent = user?.name?.charAt(0).toUpperCase() || 'U'
                }} />
            ) : (
              <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
        </div>

        <ul tabIndex={0}
          className="dropdown-content z-[100] p-1 shadow-xl bg-card border border-card-border rounded-xl w-52 mt-2"
          style={{ background: '#0E0C3A' }}>

          {/* Name + role header */}
          <li className="px-3 py-2.5 border-b border-white/[0.08] mb-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {user?.name || 'User'} · <span className="text-white/50">{levelName}</span>
              </span>
            </div>
          </li>

          {/* Your profile */}
          <li>
            <button onClick={() => router.push('/profile')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M3 21a9 9 0 0 1 18 0"/></svg>
              Your profile
            </button>
          </li>

          {/* Wallet & standing */}
          <li>
            <button onClick={() => { window.location.href = '/wallet' }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 11a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/><path d="M2 11h2M20 11h2"/><path d="M6 3l4 4M18 3l-4 4"/></svg>
              Wallet & standing
            </button>
          </li>

          {user?.wallet && (
            <li style={{ padding: '4px 8px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '8px 10px',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 6 }}>
                  Wallet Address
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)', flex: 1, letterSpacing: '0.02em' }}>
                    {user.wallet.slice(0, 8)}…{user.wallet.slice(-6)}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 5, border: 'none',
                      background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(234,170,0,0.12)',
                      cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                    }}
                  >
                    {copied ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(234,170,0,0.9)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: copied ? '#22c55e' : 'rgba(234,170,0,0.9)', transition: 'color 0.2s' }}>
                      {copied ? 'COPIED' : 'COPY'}
                    </span>
                  </button>
                </div>
              </div>
            </li>
          )}

          {/* Set up your Ally — hidden */}

          {/* Settings */}
          <li>
            <button onClick={() => router.push('/account')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              Settings
            </button>
          </li>

          <div className="border-t border-white/[0.08] my-1" />

          {/* Sign out */}
          <li>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </header>

    {/* Install banner */}
    {/* {protoReady && banner.show && !bannerDismissed && (
      <div style={{
        background: '#100E59', borderBottom: '1px solid rgba(255,255,255,0.12)',
        padding: '10px 16px', display: 'flex', alignItems: 'center',
        gap: 12, fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)',
      }}>
        <span style={{
          width: 30, height: 30, borderRadius: 6, background: '#000510',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: '#EAAA00',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EAAA00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v13" />
            <path d="M7 11l5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {banner.text}
          <b style={{ color: '#FFFFFF', fontWeight: 700 }}>{banner.bold}</b>
          {banner.tail}
        </span>
        <button style={{
          padding: '0.48rem 0.9rem', borderRadius: 4,
          background: '#EAAA00', color: '#09073A',
          border: 'none', fontWeight: 700, fontSize: '0.8rem',
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}>{banner.cta}</button>
        <button
          onClick={() => setBannerDismissed(true)}
          style={{
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
            padding: '4px', flexShrink: 0, lineHeight: 1,
            fontSize: 18, display: 'flex', alignItems: 'center',
          }}
          aria-label="Dismiss"
        >×</button>
      </div>
    )} */}
    </div>
  )
}
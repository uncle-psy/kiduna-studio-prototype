  'use client'

  import { useEffect, useState } from 'react'
  import { useAuth } from '@/lib/auth-context'

  const WEB_URL = 'https://wvduna.com'

  /* ── Toggle ─────────────────────────────────────────────────────────────────── */

  // Single source of truth for the "Coming soon" pill so all four settings
  // rows render it identically.
  function ComingSoonPill() {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: '#fff',
          background: 'rgba(255,255,255,0.16)',
          padding: '2px 8px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
        }}
      >
        Coming soon
      </span>
    )
  }

  function Toggle({ on, onChange, comingSoon }: { on: boolean; onChange: (v: boolean) => void; comingSoon?: boolean }) {
    // Not ready yet: drop the switch entirely and show just the pill, so the
    // row matches the Account/Devices rows.
    if (comingSoon) return <ComingSoonPill />

    return (
      <button
        onClick={() => onChange(!on)}
        aria-pressed={on}
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          border: '1px solid #EAAA00',
          cursor: 'pointer',
          background: on ? '#3B3642' : 'rgba(255,255,255,0.18)',
          position: 'relative',
          transition: 'background 0.18s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: on ? 22 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#F5B300',
            transition: 'left 0.18s',
          }}
        />
      </button>
    )
  }

  /* ── Icon badge ──────────────────────────────────────────────────────────────── */

  const GOLD = '#EAAA00'

  function IconBadge({ children }: { children: React.ReactNode }) {
    return (
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'rgba(234,170,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    )
  }

  function GearIcon() {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    )
  }

  function BellIcon() {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={GOLD} stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9Z" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    )
  }

  function DeviceIcon() {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  }

  function AppearanceIcon() {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={GOLD} stroke={GOLD} strokeWidth="1.5">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18V4a8 8 0 0 1 0 16Z" />
      </svg>
    )
  }

  /* ── Section row ────────────────────────────────────────────────────────────── */

  function SectionRow({
    iconSlot,
    label,
    hint,
    children,
  }: {
    iconSlot: React.ReactNode
    label: string
    hint: string
    children?: React.ReactNode
  }) {
    return (
      <div
        style={{
          background: '#0E0C3A',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 14,
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <IconBadge>{iconSlot}</IconBadge>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.3,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.38)',
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {hint}
          </div>
        </div>
        {children && <div style={{ flexShrink: 0 }}>{children}</div>}
      </div>
    )
  }

  /* ── Outline button ─────────────────────────────────────────────────────────── */

  function OutlineButton({
    children,
    href,
    comingSoon,
  }: {
    children: React.ReactNode
    href?: string
    comingSoon?: boolean
  }) {
    const style: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 16px',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.16)',
      background: 'rgba(255,255,255,0.04)',
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      whiteSpace: 'nowrap',
      textDecoration: 'none',
    }

    // Not ready yet: keep the label fully readable, just dim the button a
    // little, disable it (no href/navigation, not-allowed cursor), and add a
    // "Coming soon" pill beside the text.
    if (comingSoon) {
      return (
        <span
          style={{
            ...style,
            cursor: 'not-allowed',
            opacity: 0.7,
            userSelect: 'none',
          }}
          aria-disabled
        >
          {children}
          <ComingSoonPill />
        </span>
      )
    }

    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
          {children}
        </a>
      )
    }
    return <button style={style}>{children}</button>
  }

  /* ── Page ─────────────────────────────────────────────────────────────────────  */

  export default function MemberSettings() {
    const { user, logout } = useAuth()

    const [notifyAll, setNotifyAll] = useState(true)
    const [darkMode, setDarkMode] = useState(true)

    useEffect(() => {
      try {
        const raw = localStorage.getItem('kinship_notify_prefs')
        if (raw) {
          const p = JSON.parse(raw)
          const allOn = p.proposals !== false && p.treasury !== false && p.ally !== false
          setNotifyAll(allOn)
        }
      } catch { /* ignore */ }
    }, [])

    useEffect(() => {
      try {
        localStorage.setItem(
          'kinship_notify_prefs',
          JSON.stringify({
            proposals: notifyAll,
            treasury: notifyAll,
            ally: notifyAll,
          })
        )
      } catch { /* ignore */ }
    }, [notifyAll])

    const handleSignOut = () => {
      logout()
      window.location.href = '/login'
    }

    return (
      <div style={{ maxWidth: '100%', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#00C9A7',
              margin: '0 0 6px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            You
          </p>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
            }}
          >
            Settings
          </h1>
        </div>

        {/* Stacked rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Account */}
          <SectionRow
            iconSlot={<GearIcon />}
            label="Account"
            hint="Email, password, recovery — managed on the web"
          >
            <OutlineButton href={WEB_URL} comingSoon>
              Manage at wvduna.com{' '}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </OutlineButton>
          </SectionRow>

          {/* Notifications */}
          <SectionRow
            iconSlot={<BellIcon />}
            label="Notifications"
            hint="Proposals, treasury, ally activity"
          >
            <Toggle on={notifyAll} onChange={setNotifyAll} comingSoon />
          </SectionRow>

          {/* Devices */}
          <SectionRow
            iconSlot={<DeviceIcon />}
            label="Devices"
            hint={`You're signed in on this device`}
          >
            <OutlineButton href={WEB_URL} comingSoon>Get the app</OutlineButton>
          </SectionRow>

          {/* Appearance */}
          <SectionRow
            iconSlot={<AppearanceIcon />}
            label="Appearance"
            hint="Dark (DUNAVERSE default)"
          >
            <Toggle on={darkMode} onChange={setDarkMode} comingSoon />
          </SectionRow>
        </div>

        {/* Sign out */}
        <div style={{ marginTop: 20 }}>
          <button
            onClick={handleSignOut}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }
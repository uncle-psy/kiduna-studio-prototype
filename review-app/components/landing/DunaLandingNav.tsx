'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

/**
 * DunaLandingNav — the single shared public-landing top navigation.
 *
 * Shake/flicker fixes applied:
 *
 *  1. nav-actions has a fixed min-width (matching the widest guest state).
 *     The layout never reflows when switching between guest buttons ↔ avatar.
 *
 *  2. During authLoading, we render the guest buttons with visibility:hidden
 *     instead of a tiny spinner. This keeps the nav-actions the same width
 *     as the settled guest state — zero layout shift.
 *
 *  3. The burger toggle uses a React ref instead of querySelector so it
 *     reliably tracks its own mobile menu even after hydration.
 *
 *  4. @keyframes spin is defined inline so the loading indicator works
 *     whether or not dunathon-landing.css has been loaded yet.
 */
export default function DunaLandingNav() {
  const { isAuthenticated, user, logout, isLoading: authLoading } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [walletCopied, setWalletCopied] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Close user menu when clicking outside
  useEffect(() => {
    if (!userMenuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Active states
  const isShowcase    = pathname === '/showcase'
  const isHowItWorks  = pathname === '/how-it-works'
  const isNightpapers = pathname === '/nightpapers'

  // ─── nav-actions content ──────────────────────────────────────────────────
  //
  // KEY ANTI-FLICKER RULE:
  //   We NEVER swap between elements of different widths.
  //   The guest buttons are the widest possible content, so:
  //   - When authLoading → render guest buttons but invisible (layout reserved)
  //   - When authenticated  → render avatar, right-aligned inside fixed-width container
  //   - When guest          → render guest buttons, fully visible
  //
  // This means nav-actions is ALWAYS the same width. Zero reflow. Zero shake.

  const guestButtons = (
    <>
      <a href="/login"    className="nav-login">Log in</a>
      <a href="/#contact" className="nav-cta">Join Early Access →</a>
    </>
  )

  let actionsContent: React.ReactNode

  if (authLoading) {
    // Hold the guest layout but make it invisible — no width change on resolve
    actionsContent = (
      <div style={{ visibility: 'hidden', display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'none' }} aria-hidden>
        {guestButtons}
      </div>
    )
  } else if (isAuthenticated) {
    // Authenticated: avatar + dropdown, right-aligned inside the fixed container
    actionsContent = (
      <div ref={menuRef} style={{ position: 'relative', marginLeft: 'auto' }}>
        <button
          onClick={() => setUserMenuOpen(p => !p)}
          aria-label="Open user menu"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', background: 'transparent', border: 'none', padding: 0,
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              background: '#100E59', border: '1.5px solid rgba(255,255,255,0.18)',
              color: '#fff', fontSize: 15, fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name || 'User'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                onError={(e) => {
                  const t = e.target as HTMLImageElement
                  t.style.display = 'none'
                  if (t.parentElement) {
                    t.parentElement.textContent = user?.name?.charAt(0).toUpperCase() || 'U'
                  }
                }}
              />
            ) : (
              <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
        </button>

        {userMenuOpen && (
          <div
            style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 240, borderRadius: 14, zIndex: 200, overflow: 'hidden',
              background: '#0E0C3A', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 16px 48px rgba(3,1,27,0.7)',
            }}
          >
            {/* Name + tier */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user?.name || 'User'}{' '}·{' '}
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {user?.subscription === 'cofounder' ? 'Guest' : (user?.subscription || 'Guest')}
                </span>
              </div>
            </div>

            {/* Wallet address */}
            {user?.wallet && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ borderRadius: 10, padding: '8px 12px', background: 'rgba(234,170,0,0.06)', border: '1px solid rgba(234,170,0,0.15)' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>Wallet</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
                      {user.wallet.slice(0, 6)}…{user.wallet.slice(-5)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(user!.wallet)
                        setWalletCopied(true)
                        setTimeout(() => setWalletCopied(false), 2000)
                      }}
                      style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 4,
                        cursor: 'pointer',
                        background: walletCopied ? 'rgba(74,222,128,0.15)' : 'rgba(234,170,0,0.12)',
                        color:      walletCopied ? '#4ade80' : '#EAAA00',
                        border: `1px solid ${walletCopied ? 'rgba(74,222,128,0.3)' : 'rgba(234,170,0,0.25)'}`,
                      }}
                    >
                      {walletCopied ? '✓ Copied' : '⎘ Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Menu items */}
            <div style={{ padding: '6px 0' }}>
<button
  onClick={() => { router.push('/chat'); setUserMenuOpen(false) }}
  onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.transform = 'scale(1.08)' }}
  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.transform = 'scale(1)' }}
  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s, transform 0.2s', transformOrigin: 'center left' }}
>
  Go to Studio
</button>
<button
  onClick={() => { router.push('/launchpad'); setUserMenuOpen(false) }}
  onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.transform = 'scale(1.08)' }}
  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.transform = 'scale(1)' }}
  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s, transform 0.2s', transformOrigin: 'center left' }}
>
  Launchpad
</button>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
<button
  onClick={() => { logout(); setUserMenuOpen(false) }}
  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'scale(1.08)' }}
  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.transform = 'scale(1)' }}
  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,0.45)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s, transform 0.2s', transformOrigin: 'center left' }}
>
  Sign out
</button>
            </div>
          </div>
        )}
      </div>
    )
  } else {
    // Guest: fully visible buttons
    actionsContent = guestButtons
  }

  return (
    <div className="nav-shell">
      <div className="wrap">
        <nav className="nav">
          {/* Logo */}
          <a href="/" className="logo-link">
            <img className="logo" src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club" />
          </a>

          {/* Desktop nav links */}
          <div className="nav-links">
            <a href="/showcase"      className={isShowcase    ? 'active' : ''}>Showcase</a>
            <a href="/#earn">How to Earn</a>
            <a href="/how-it-works"  className={isHowItWorks  ? 'active' : ''}>How it Works</a>
            <a href="/#events">Events</a>
            <a href="/#about">About</a>
            <a href="/nightpapers"   className={isNightpapers ? 'active' : ''}>Nightpapers</a>
          </div>

          {/*
           * Desktop auth actions — fixed min-width prevents layout shift.
           *
           * The guest state (2 buttons) is the widest content that can ever
           * appear here. By locking in that width we guarantee the nav-links
           * section never moves, regardless of auth state.
           *
           * min-width is calculated from the guest buttons at 13.5px font:
           *   "Log in" (~35px) + 14px gap
           *   + "Join Early Access →" pill (padding 11px×18px + ~132px text ≈ 160px)
           *   = ~209px  →  we set 215px for a small buffer.
           */}
          <div
            className="nav-actions"
            style={{ minWidth: 215, display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}
          >
            {actionsContent}
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-burger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen(p => !p)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </nav>

        {/* Mobile menu — ref-controlled, no querySelector */}
        <div
          ref={mobileRef}
          className={`nav-mobile${mobileOpen ? ' open' : ''}`}
        >
          <a href="/showcase"     className={isShowcase    ? 'active' : ''} onClick={() => setMobileOpen(false)}>Showcase</a>
          <a href="/#earn"        onClick={() => setMobileOpen(false)}>How to Earn</a>
          <a href="/how-it-works" className={isHowItWorks  ? 'active' : ''} onClick={() => setMobileOpen(false)}>How it Works</a>
          <a href="/#events"      onClick={() => setMobileOpen(false)}>Events</a>
          <a href="/#about"       onClick={() => setMobileOpen(false)}>About</a>
          <a href="/nightpapers"  className={isNightpapers ? 'active' : ''} onClick={() => setMobileOpen(false)}>Nightpapers</a>

          {/* Auth-dependent mobile items — only rendered once auth is resolved */}
          {!authLoading && (
            isAuthenticated ? (
              <>
                <a href="/chat" onClick={() => setMobileOpen(false)}>Go to Studio</a>
                <a href="#" onClick={(e) => { e.preventDefault(); logout(); setMobileOpen(false) }}>Sign out</a>
              </>
            ) : (
              <>
                <a href="/login"    onClick={() => setMobileOpen(false)}>Log in</a>
                <a href="/#contact" onClick={() => setMobileOpen(false)}>Join Early Access →</a>
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}
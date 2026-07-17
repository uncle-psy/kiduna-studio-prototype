'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import SubNav from './SubNav'
import { NAV_LINKS, ALLIES_LINKS } from '@/lib/landing-data'

import { useAuth } from '@/lib/auth-context'

const PAID_TIERS = ['member', 'founder', 'builder', 'sponsor', 'catalyst', 'luminary']

function isOnboardingComplete(user: ReturnType<typeof useAuth>['user']): boolean {
  if (!user) return false
  if (user.role === 'wizard') return true
  if (user.onboardingStatus === 'complete') return true
  if (user.subscription && PAID_TIERS.includes(user.subscription)) return true
  return false
}

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [alliesOpen, setAlliesOpen] = useState(false)
  const [alliesPinned, setAlliesPinned] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [walletCopied, setWalletCopied] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, user, logout, isLoading: authLoading } = useAuth()
  const isAlliesActive = ALLIES_LINKS.some((l) => pathname === l.href) || pathname.startsWith('/duna/')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close user menu on click outside
  useEffect(() => {
    if (!userMenuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  const showAllies = useCallback(() => setAlliesOpen(true), [])
  const hideAllies = useCallback(() => {
    if (!alliesPinned) setAlliesOpen(false)
  }, [alliesPinned])
  const toggleAlliesPin = useCallback(() => {
    setAlliesPinned((p) => {
      setAlliesOpen(!p)
      return !p
    })
  }, [])

  return (
    <header
      className="sticky top-0 z-[60] border-b border-border"
      style={{ background: 'rgba(9, 7, 58, 0.72)', backdropFilter: 'blur(10px)' }}
      onMouseLeave={hideAllies}
    >
      {/* Main bar */}
      <div className="w-full max-w-[1180px] mx-auto px-6 flex items-center gap-6 h-[72px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/review/screens/assets/kiduna-logo.svg"
            alt="Kiduna Club"
            width={160}
            height={38}
            className="h-[38px] w-auto"
          />
        </Link>

        {/* Mobile hamburger */}
        <button
          className="ml-auto text-white text-[1.6rem] bg-transparent border-0 cursor-pointer lg:hidden"
          aria-label="Menu"
          onClick={() => setMobileOpen((p) => !p)}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        {/* Nav links — hidden on mobile unless mobileOpen */}
        <nav
          className={`
            items-center gap-[1.4rem] ml-auto
            max-lg:fixed max-lg:inset-x-0 max-lg:top-[72px] max-lg:flex-col max-lg:items-start max-lg:gap-0
            max-lg:bg-[#09073A] max-lg:border-b max-lg:border-border max-lg:px-6 max-lg:pb-6 max-lg:pt-3 max-lg:z-50
            ${mobileOpen ? 'flex' : 'hidden lg:flex'}
          `}
        >
          {/* Home + Launchpad */}
          {NAV_LINKS.slice(0, 2).map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
            <Link
              key={link.label}
              href={link.href}
              className={`text-[0.95rem] font-semibold py-[0.35rem] border-b-2 transition-all duration-150 max-lg:w-full max-lg:py-3 max-lg:border-b max-lg:border-border ${
                isActive
                  ? 'text-white border-accent'
                  : 'text-subtle border-transparent hover:text-white hover:border-accent'
              }`}
            >
              {link.label}
            </Link>
          )})}

          {/* Allies toggle — between Launchpad and Metrics */}
          <button
            className={`text-[0.95rem] font-semibold py-[0.35rem] border-b-2 bg-transparent cursor-pointer transition-all duration-150 max-lg:w-full max-lg:py-3 max-lg:border-b max-lg:border-border max-lg:text-left ${
              isAlliesActive
                ? 'text-white border-accent'
                : 'text-subtle border-transparent hover:text-white hover:border-accent'
            }`}
            onMouseEnter={showAllies}
            onClick={toggleAlliesPin}
          >
            Allies ▾
          </button>

          {/* Metrics + Go Deeper */}
          {NAV_LINKS.slice(2).map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
            <Link
              key={link.label}
              href={link.href}
              className={`text-[0.95rem] font-semibold py-[0.35rem] border-b-2 transition-all duration-150 max-lg:w-full max-lg:py-3 max-lg:border-b max-lg:border-border ${
                isActive
                  ? 'text-white border-accent'
                  : 'text-subtle border-transparent hover:text-white hover:border-accent'
              }`}
            >
              {link.label}
            </Link>
          )})}

          {/* Separator — hidden on mobile */}
          {/* Auth — Login or User Widget */}
          {authLoading ? (
            <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin inline-block" />
          ) : isAuthenticated ? (
            <>
              <span className="w-[1px] h-6 bg-border max-lg:hidden" />

              {/* Avatar + dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(p => !p)}
                  className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden text-sm font-medium"
                    style={{
                      background: '#100E59',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: '#fff',
                      fontFamily: 'var(--font-display)',
                      fontSize: 15,
                    }}
                  >
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement
                          t.style.display = 'none'
                          t.parentElement!.textContent = user?.name?.charAt(0).toUpperCase() || 'U'
                        }}
                      />
                    ) : (
                      <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                  </div>
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 z-[100] p-1 shadow-xl border border-card-border rounded-xl w-56 mt-2"
                    style={{ background: '#0E0C3A' }}
                  >
                    {/* Name + tier */}
                    <div className="px-3 py-2.5 border-b border-white/[0.08] mb-1">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-white uppercase tracking-wide">
                          {user?.name || 'User'} · <span className="text-white/50">{user?.subscription || 'Guest'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Wallet address */}
                    {user?.wallet && (
                      <div className="px-3 py-2 mb-1">
                        <div
                          className="rounded-lg px-3 py-2"
                          style={{ background: 'rgba(234,170,0,0.06)', border: '1px solid rgba(234,170,0,0.15)' }}
                        >
                          <div className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Wallet address</div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-white/60">
                              {user.wallet.slice(0, 6)}…{user.wallet.slice(-5)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(user!.wallet)
                                setWalletCopied(true)
                                setTimeout(() => setWalletCopied(false), 2000)
                              }}
                              className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors bg-transparent border-0"
                              style={{
                                background: walletCopied ? 'rgba(74,222,128,0.15)' : 'rgba(234,170,0,0.12)',
                                color: walletCopied ? '#4ade80' : '#EAAA00',
                                border: `1px solid ${walletCopied ? 'rgba(74,222,128,0.3)' : 'rgba(234,170,0,0.25)'}`,
                              }}
                            >
                              {walletCopied ? '✓ Copied' : '⎘ Copy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Your profile + Settings — only after onboarding/payment complete */}
                    {isOnboardingComplete(user) && (
                      <>
                        <div>
                          <button
                            onClick={() => { router.push('/profile'); setUserMenuOpen(false) }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors bg-transparent border-0 cursor-pointer text-left"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M3 21a9 9 0 0 1 18 0" /></svg>
                            Your profile
                          </button>
                        </div>

                        <div>
                          <button
                            onClick={() => { router.push('/settings'); setUserMenuOpen(false) }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors bg-transparent border-0 cursor-pointer text-left"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                            Settings
                          </button>
                        </div>
                      </>
                    )}

                    <div className="border-t border-white/[0.08] my-1" />

                    {/* Sign out */}
                    <div>
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors bg-transparent border-0 cursor-pointer text-left"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="w-[1px] h-6 bg-border max-lg:hidden" />
              <Link
                href="/login"
                className="text-subtle font-semibold text-[0.95rem] hover:text-white transition-colors max-lg:w-full max-lg:py-3 max-lg:border-b max-lg:border-border"
              >
                Login / Sign up
              </Link>
            </>
          )}

        </nav>
      </div>

      {/* Allies submenu */}
      <SubNav open={alliesOpen || alliesPinned} />
    </header>
  )
}
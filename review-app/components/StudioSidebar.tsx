'use client'

import { useState, useEffect, useRef, JSX } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useStudio } from '@/lib/studio-context'
import { useAuth } from '@/lib/auth-context'
import { PLATFORM_NAV, GAME_NAV } from '@/lib/nav'
import { api } from '@/lib/api'
import { Spinner } from './UI'
import {
  Library,
  UploadCloud,
  Package,
  Brain,
  MessageSquareCode,
  Heart,
  Gamepad2,
  Settings,
  LayoutDashboard,
  BarChart3,
  BarChart2,
  Zap,
  Sparkles,
  Map,
  Users,
  Target,
  Scroll,
  Route,
  Trophy,
  Award,
  BookOpen,
  RefreshCw,
  Globe,
  Rocket,
  Play,
  ArrowLeft,
  Layers,
  UserRound,
  Plug2,
  Workflow,
  Activity,
  Store,
  Coins,
  Compass,
  Crosshair,
  MessageCircle,
  MessageSquare,
  FolderTree,
  KeyRound,
  FileText,
  Flag,
  Gavel,
  UsersRound,
  Wallet,
  ShieldCheck,
  Lock,
  Bot,
  Crown,
  ScanSearch,
  Diamond,
  Link2,
  CalendarDays,
  Upload,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Library,
  UploadCloud,
  Package,
  Brain,
  MessageSquareCode,
  MessageSquare,
  Heart,
  Gamepad2,
  Settings,
  LayoutDashboard,
  BarChart3,
  BarChart2,
  Zap,
  Sparkles,
  Map,
  Users,
  Target,
  Scroll,
  Route,
  Trophy,
  Award,
  BookOpen,
  RefreshCw,
  Globe,
  Rocket,
  Play,
  Layers,
  UserRound,
  Plug2,
  Workflow,
  Activity,
  Store,
  Coins,
  Compass,
  Crosshair,
  MessageCircle,
  FolderTree,
  KeyRound,
  FileText,
  Flag,
  Gavel,
  UsersRound,
  Wallet,
  ShieldCheck,
  Lock,
  Bot,
  Crown,
  ScanSearch,
  Diamond,
  Link2,
  CalendarDays,
  Upload,
  TrendingUp,
}

interface NavIconProps {
  name: string
  className?: string
  size?: number
}

function NavIcon({ name, className = '', size = 18 }: NavIconProps) {
  // Custom SVG icons matching the reference design
  const customIcons: Record<string, (s: number) => JSX.Element> = {
    Bot: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <rect x="4" y="8" width="16" height="12" rx="3" />
        <path d="M12 8V5M9 3h6" />
        <circle cx="9" cy="14" r="1" />
        <circle cx="15" cy="14" r="1" />
      </svg>
    ),
    ScanSearch: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M12 5a4 4 0 0 0-4 4c0 1.5.8 2.3 1.5 3 .5.5 1 1 1 2h3c0-1 .5-1.5 1-2 .7-.7 1.5-1.5 1.5-3a4 4 0 0 0-4-4z" />
        <path d="M10 18h4M10.5 21h3" />
      </svg>
    ),
    MessageSquare: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M4 5h16v11H8l-4 4z" />
        <path d="M8 9h8M8 12h5" />
      </svg>
    ),
    Zap: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M9 3v5M15 3v5" />
        <path d="M7 8h10v3a5 5 0 0 1-10 0z" />
        <path d="M12 16v5" />
      </svg>
    ),
    Activity: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
      </svg>
    ),
    ShieldCheck: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    Diamond: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M4 13l7-9 9 7-7 9z" />
        <circle cx="14" cy="9" r="1.4" />
      </svg>
    ),
    Coins: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
        <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </svg>
    ),
    Link2: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M9 15l6-6" />
        <path d="M10 6l1-1a4 4 0 0 1 6 6l-1 1" />
        <path d="M14 18l-1 1a4 4 0 0 1-6-6l1-1" />
      </svg>
    ),
    Users: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M3 20a6 6 0 0 1 12 0M14.5 20a4.5 4.5 0 0 1 7-3.7" />
      </svg>
    ),
    CalendarDays: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </svg>
    ),
    BarChart2: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M5 4v16M9 4v16" />
        <rect x="13" y="4" width="6" height="16" rx="1" transform="rotate(8 16 12)" />
      </svg>
    ),
    Upload: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M12 16V5m0 0L8 9m4-4l4 4" />
        <path d="M5 19h14" />
      </svg>
    ),
    Target: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" />
      </svg>
    ),
    TrendingUp: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M4 19V5M4 19h16" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
    UsersRound: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <circle cx="8" cy="9" r="2.6" />
        <circle cx="16" cy="9" r="2.6" />
        <path d="M3 19a5 5 0 0 1 10 0M13 19a5 5 0 0 1 8-4" />
      </svg>
    ),
    Crown: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={s} height={s} className={className}>
        <path d="M2 17l3-11 5 5 2-8 2 8 5-5 3 11z" />
        <path d="M2 17h20" />
      </svg>
    ),
  }

  if (customIcons[name]) {
    return customIcons[name](size)
  }

  const IconComponent = iconMap[name]
  if (!IconComponent) {
    return <span className={className}>•</span>
  }
  return <IconComponent size={size} className={className} />
}

export default function StudioSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFullPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname
  const {
    currentPlatform, currentGame, isInGame, platformsLoading, exitGame,
    sidebarOpen, setSidebarOpen,
  } = useStudio()
  const { user } = useAuth()
  const [counts, setCounts] = useState<Record<string, number | null>>({})
  const [railExpanded, setRailExpanded] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  // ── Reliable game-exit redirect ──────────────────────
  // Watches isInGame: when it goes true → false, redirect.
  // Uses ref to track previous value so we skip initial mount.
  const wasInGame = useRef(isInGame)
  useEffect(() => {
    if (wasInGame.current && !isInGame) {
      router.push('/assets')
    }
    wasInGame.current = isInGame
  }, [isInGame, router])

  // ── Reliable platform-switch redirect ────────────────
  const prevPlatformId = useRef(currentPlatform?.id)
  useEffect(() => {
    if (
      prevPlatformId.current &&
      currentPlatform?.id &&
      prevPlatformId.current !== currentPlatform.id
    ) {
      router.push('/assets')
    }
    prevPlatformId.current = currentPlatform?.id
  }, [currentPlatform?.id, router])

  // ── Fetch live counts — scoped to platform / game ────
  useEffect(() => {
    async function fetchCounts() {
      const newCounts: Record<string, number | null> = {}
      try {
        const assets = await api.listAssets({
          page: 1,
          limit: 1,
          platform_id: currentPlatform?.id,
        })
        newCounts.assets = assets.pagination.total
      } catch {
        newCounts.assets = null
      }
      try {
        const scenes = await api.listScenes(undefined, currentGame?.id)
        newCounts.scenes = Array.isArray(scenes) ? scenes.length : null
      } catch {
        newCounts.scenes = null
      }
      setCounts(newCounts)
    }
    fetchCounts()
  }, [pathname, currentPlatform?.id, currentGame?.id])

  // ── Close mobile drawer on route change ──────────────
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname, searchParams, setSidebarOpen])

  // ── Close mobile drawer on Escape key ────────────────
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    if (sidebarOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [sidebarOpen, setSidebarOpen])

  // ── Onboarding-aware nav filtering ──────────────────

  const rawNavGroups = isInGame ? GAME_NAV : PLATFORM_NAV

  // ── Dynamic SQUAD sub-page links ─────────────────────
  // When the user is viewing a specific alliance (/team/[allianceId]/…),
  // resolve the placeholder "select" in SQUAD hrefs to the real alliance ID,
  // and unlock the sub-page items so they become navigable.
  const teamMatch = pathname.match(/^\/team\/([^/]+)/)
  // The captured segment is only a real alliance ID on /team/[allianceId]/… pages.
  // '/team/create' (the new-alliance form) captures the literal "create", which is
  // NOT an alliance — resolving SQUAD links against it produces /team/create/send-funds
  // → getAlliance("create") 404 → a spurious "Alliance not found". Ignore it (and any
  // other non-ID route word) so the SQUAD sub-pages stay locked until an alliance exists.
  const teamSeg = teamMatch ? teamMatch[1] : null
  const activeAllianceId = teamSeg && teamSeg !== 'create' ? teamSeg : null

  const navGroups = rawNavGroups.map((group) => {
    if (group.label !== 'SQUAD') return group
    return {
      ...group,
      items: group.items.map((item) => {
        if (!item.href.includes('/team/select/')) return item
        if (!activeAllianceId) return item // keep locked + placeholder
        return {
          ...item,
          href: item.href.replace('/team/select/', `/team/${activeAllianceId}/`),
          locked: false,
        }
      }),
    }
  })

  // ── Determine if content labels are visible ──────────
  // Labels show on: desktop always, tablet when rail is hovered, mobile drawer always
  const showLabels = true // controlled via CSS classes per breakpoint

  // ── Sidebar content (shared between all modes) ──────────────

  function renderSidebarContent(collapsed: boolean) {
    return (
      <>
        {/* Back to Platform — shown inside game layout */}
        {isInGame && currentPlatform && (
          <div className={collapsed ? 'mb-2 px-1 pt-2' : 'mb-4 pt-2'}>
            <button
              onClick={() => exitGame()}
              className={`flex items-center w-full rounded-lg text-[11px] font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] transition-all group ${
                collapsed ? 'justify-center py-2' : 'gap-2 px-3 py-2'
              }`}
              title={collapsed ? `Back to ${currentPlatform.name}` : undefined}
            >
              <ArrowLeft
                size={14}
                className="transition-transform group-hover:-translate-x-0.5 shrink-0"
              />
              {!collapsed && <span>Back to {currentPlatform.name}</span>}
            </button>
          </div>
        )}

        {/* Separator before nav when collapsed */}
        {collapsed && <div className="border-t border-card-border mx-2 mb-2" />}

        {/* Navigation */}
        <nav className="flex-1 pt-2">
          {navGroups.map((group, gi) => {
            const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href))

            return (
              <div key={gi} className={collapsed ? 'mb-2' : 'mb-4'}>
                {group.label && !collapsed && (
                  <p className="text-white/35 text-[0.6rem] font-bold tracking-[0.16em] uppercase px-3 mb-2 mt-0">
                    {group.label}
                  </p>
                )}
                {/* Group separator for collapsed rail */}
                {group.label && collapsed && gi > 0 && (
                  <div className="border-t border-white/[0.08] mx-2 mb-2" />
                )}
                <ul className={collapsed ? 'space-y-1 px-1' : 'space-y-0.5 px-2'}>
                  {group.items.map((item) => {
                    // Active state logic (unchanged)
                    const itemHasQuery = item.href.includes('?')
                    const [itemPath] = item.href.split('?')
                    let isActive = false

                    if (itemHasQuery) {
                      isActive = pathname === itemPath && currentFullPath === item.href
                    } else {
                      const isExactMatch = pathname === item.href
                      const isStartsWithMatch =
                        pathname.startsWith(item.href + '/') ||
                        pathname.startsWith(item.href)
                      const hasMoreSpecificMatch = allHrefs.some(
                        (href) =>
                          href !== item.href &&
                          href.startsWith(item.href) &&
                          (pathname === href ||
                            pathname.startsWith(href + '/') ||
                            pathname.startsWith(href))
                      )
                      const queryParamSiblingActive = allHrefs.some((href) => {
                        if (href === item.href || !href.includes('?')) return false
                        const [hPath] = href.split('?')
                        return hPath === itemPath && currentFullPath === href
                      })
                      isActive = (isExactMatch || (isStartsWithMatch && !hasMoreSpecificMatch)) && !queryParamSiblingActive
                    }
                    const badge = item.countKey
                      ? counts[item.countKey]
                      : undefined

                    return (
                      <li key={item.key} style={{ width: '100%', display: 'flex', alignItems: 'stretch' }}>
                            {/* Gold left line */}
                            {isActive && (
                              <div style={{
                                width: '3px',
                                alignSelf: 'stretch',
                                background: '#EAAA00',
                                borderRadius: '2px',
                                flexShrink: 0,
                                marginRight: '4px',
                              }} />
                            )}
                            {!isActive && (
                              <div style={{ width: '7px', flexShrink: 0 }} />
                            )}
                        <Link
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={`flex items-center rounded-lg text-[0.92rem] font-semibold transition-colors flex-1 ${
                            collapsed
                              ? `justify-center py-2 ${
                                  isActive
                                    ? 'text-white'
                                    : 'text-[#CDCDCD] hover:bg-white/[0.05] hover:text-white'
                                }`
                              : `gap-3 px-3 py-2 ${
                                  isActive
                                    ? 'text-white'
                                    : 'text-[#CDCDCD] hover:bg-white/[0.05] hover:text-white'
                                }`
                          }`}
                          style={isActive ? {
                            color: '#ffffff',
                            background: 'rgba(180,100,0,0.28)',
                            borderRadius: '8px',
                            border: '1px solid rgba(180,100,0,0.55)',
                          } : {}}
                        >
                          <NavIcon
                            name={item.icon}
                            size={16}
                            className={`shrink-0 ${isActive ? 'text-white' : 'text-[#CDCDCD]'}`}
                          />
                          {!collapsed && (
                            <>
                              <span className="flex-1">{item.label}</span>
                              {item.isNew && (
                                <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  NEW
                                </span>
                              )}
                              {item.locked && (
                                <Lock size={12} className="text-white/25 shrink-0" />
                              )}
                              {badge !== undefined && badge !== null && (
                                <span className="bg-accent/20 text-accent text-xs px-2 py-0.5 rounded-full">
                                  {badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>
      </>
    )
  }

  return (
    <>
      {/* ── Mobile Backdrop ──────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Drawer (< md) ────────────────────────── */}
      <aside
        className="fixed left-0 top-[64px] bottom-0 w-[280px] bg-sidebar border-r border-white/[0.06] overflow-y-auto z-40 sidebar-transition md:hidden"
        style={{ translate: sidebarOpen ? '0 0' : '-100% 0' }}
        aria-label="Navigation drawer"
      >
        {renderSidebarContent(false)}
      </aside>

      {/* ── Tablet Rail (md–lg) ─────────────────────────── */}
      <aside
        ref={sidebarRef}
        onMouseEnter={() => setRailExpanded(true)}
        onMouseLeave={() => setRailExpanded(false)}
        className={`fixed left-0 top-[64px] bottom-0 bg-sidebar border-r border-white/[0.06] overflow-y-auto sidebar-transition hidden md:block lg:hidden ${railExpanded ? 'z-30 shadow-2xl shadow-black/50' : 'z-10'}`}
        style={{ width: railExpanded ? 220 : 64 }}
        aria-label="Navigation rail"
      >
        {renderSidebarContent(!railExpanded)}
      </aside>

      {/* ── Desktop Full Sidebar (lg+) ──────────────────── */}
      <aside
        className="fixed left-0 top-[64px] bottom-0 w-[220px] bg-sidebar border-r border-white/[0.06] overflow-y-auto z-10 hidden lg:block"
        aria-label="Navigation sidebar"
      >
        {renderSidebarContent(false)}
      </aside>
    </>
  )
}
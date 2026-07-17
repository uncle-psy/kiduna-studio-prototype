'use client'

import { usePathname, useRouter } from 'next/navigation'

/**
 * ModeSwitcher — shared tab toggle used by both StudioHeader (Building mode)
 * and ActiveTopbar (Active mode). Reads the current pathname to derive which
 * tab should appear highlighted, so the correct state is always shown
 * regardless of which header is rendered.
 */
export default function ModeSwitcher() {
  const pathname = usePathname()
  const router = useRouter()

  // Active mode lives under /(active)/  → /chat, /vibe, /seek, /vote, /earn
  // /account is the Active-layout settings page, so it stays in Active mode.
  const ACTIVE_PREFIXES = ['/chat', '/vibe', '/seek', '/vote', '/earn', '/role', '/directory', '/account']
  const isActive = ACTIVE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  const isBuilding = !isActive

  return (
    <div className="mode-switcher-wrap" aria-label="Mode switcher">
      {/* ── Active tab ── */}
      <button
        className={`mode-tab${isActive ? ' mode-tab--active' : ''}`}
        onClick={() => !isActive && router.push('/chat')}
        aria-pressed={isActive}
        title="Switch to Active mode"
      >
        {/* Message bubble icon */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="mode-tab-text">Active</span>
      </button>

      {/* ── Building tab ── */}
      <button
        className={`mode-tab${isBuilding ? ' mode-tab--building' : ''}`}
        onClick={() => !isBuilding && router.push('/agents')}
        aria-pressed={isBuilding}
        title="Switch to Building mode"
      >
        {/* Wrench icon */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span className="mode-tab-text">Building</span>
      </button>
    </div>
  )
}
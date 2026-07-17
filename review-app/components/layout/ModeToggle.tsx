'use client'

import { useRouter, usePathname } from 'next/navigation'

/**
 * Shared Active / Building mode toggle used in both StudioHeader (Building mode)
 * and ActiveTopbar (Active mode).
 *
 * Detects the current mode from the pathname:
 *   - Active  → /chat, /vibe, /seek, /vote, /earn
 *   - Building → everything else (studio, agents, etc.)
 */
export default function ModeToggle() {
  const router = useRouter()
  const pathname = usePathname()

  // Active-mode routes all live under these prefixes
  const ACTIVE_PREFIXES = ['/chat', '/vibe', '/seek', '/vote', '/earn']
  const isActive = ACTIVE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  const isBuilding = !isActive

  return (
    <div className="mode-toggle-group">
      {/* ── Active tab ── */}
      <button
        className={`mode-toggle-btn${isActive ? ' mode-toggle-btn--on' : ''}`}
        onClick={() => router.push('/chat')}
        aria-pressed={isActive}
      >
        <span className="mode-toggle-dot" />
        Active
      </button>

      {/* ── Building tab ── */}
      <button
        className={`mode-toggle-btn${isBuilding ? ' mode-toggle-btn--on' : ''}`}
        onClick={() => router.push('/agents')}
        aria-pressed={isBuilding}
      >
        🏗 Building
      </button>
    </div>
  )
}
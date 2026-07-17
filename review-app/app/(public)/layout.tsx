'use client'
/**
 * Public layout — unauthenticated marketing pages.
 *
 * No AuthGuard, no StudioProvider, no SolanaWalletProvider.
 *
 * globals.css sets `body { overflow: hidden; height: 100% }` for studio
 * pages. Landing page needs full scroll, so we wrap in an overflow-y-auto
 * container. Scrollbar is hidden for a cleaner look.
 */

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AskDunaTab from '@/components/AskDunaTab'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [dockOpen, setDockOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const pathname = usePathname()

  // Ally chat dock is shown on every public page, including landing, login
  // and signup — so users can reach the system ally before authenticating.
  const hideChat = false

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // ── On route change: scroll to top, then handle hash anchors ──────────────
  // Resetting scroll to top on navigation prevents the sticky nav from
  // appearing to "jump" when arriving from a page that had been scrolled.
  useEffect(() => {
    const scrollContainer = document.querySelector('.public-scroll') as HTMLElement
    if (!scrollContainer) return

    if (!window.location.hash) {
      // No hash — jump to top instantly (scrollTop, not smooth, to avoid shake)
      scrollContainer.scrollTop = 0
      return
    }

    // Hash present — give the new page one frame to render, then scroll to target
    const id = setTimeout(() => {
      const target = document.querySelector(window.location.hash) as HTMLElement
      if (target) target.scrollIntoView({ behavior: 'smooth' })
    }, 100)
    return () => clearTimeout(id)
  }, [pathname])

  const dockPush = dockOpen && isDesktop ? 'min(360px, 92vw)' : '0px'
  return (
    <>
      <style>{`
        .public-scroll {
          position: relative;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-behavior: smooth;
          scroll-padding-top: 96px;
          will-change: scroll-position;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .public-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="public-scroll"
      style={{ paddingRight: hideChat ? '0px' : dockPush, transition: 'padding-right 0.26s ease' }}
      >
        {!hideChat && <AskDunaTab open={dockOpen} onOpenChange={setDockOpen} />}
        {children}
      </div>
    </>
  )
}
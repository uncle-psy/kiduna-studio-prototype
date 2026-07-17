'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Search, Wallet } from 'lucide-react'

function VibeIcon({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  )
}

function VoteIcon({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M3 21h18" />
      <path d="M7 10l5-7 5 7" />
      <path d="M5 10h14l-2 7H7z" />
    </svg>
  )
}

const navItems = [
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/vibe', icon: VibeIcon, label: 'Vibe' },
  { href: '/seek', icon: Search, label: 'Seek' },
  { href: '/vote', icon: VoteIcon, label: 'Vote' },
  { href: '/earn', icon: Wallet, label: 'Earn' },
]

export default function ActiveSidebar() {
  const pathname = usePathname()

  return (
    <aside className="active-sidebar">
      <div className="active-sidebar-section-label">Active Mode</div>

      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <div key={href} style={{ width: '100%', display: 'flex', alignItems: 'stretch' }}>
            {active ? (
              <div style={{ width: 3, alignSelf: 'stretch', background: '#EAAA00', borderRadius: 2, flexShrink: 0, marginRight: 4 }} />
            ) : (
              <div style={{ width: 7, flexShrink: 0 }} />
            )}
            <Link href={href} className={`active-nav-item${active ? ' active' : ''}`} style={{ flex: 1 }}>
              <span className="active-nav-icon"><Icon size={17} /></span>
              <span>{label}</span>
            </Link>
          </div>
        )
      })}

      <div className="active-sidebar-bottom">
        <div className="active-founder-card">
          <div className="active-fc-title">Founder</div>
          <div className="active-fc-desc">Hold $100 in WVDUNA to unlock the next tier.</div>
          <button className="active-fc-btn">View wallet</button>
        </div>
      </div>
    </aside>
  )
}
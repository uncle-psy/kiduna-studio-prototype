'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ALLIES_LINKS } from '@/lib/landing-data'

export default function SubNav({ open }: { open: boolean }) {
  const pathname = usePathname()
  const isAlliesPage = ALLIES_LINKS.some((l) => pathname === l.href) || pathname.startsWith('/duna/')
  const show = open || isAlliesPage

  return (
    <div
      className="overflow-hidden border-t border-border transition-all duration-250"
      style={{
        maxHeight: show ? 140 : 0,
        opacity: show ? 1 : 0,
        background: 'rgba(3,1,27,0.55)',
      }}
    >
      <div className="w-full max-w-[1180px] mx-auto px-6">
        <div className="flex flex-wrap gap-x-[1.6rem] py-[0.6rem]">
          {ALLIES_LINKS.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`font-semibold text-[0.9rem] py-[0.25rem] border-b-2 transition-all duration-150 ${
                  isActive
                    ? 'text-white border-accent'
                    : 'text-muted border-transparent hover:text-white hover:border-accent'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

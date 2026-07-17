import Link from 'next/link'
import type { ReactNode } from 'react'

export default function ButtonGold({
  href,
  size = 'default',
  children,
  className = '',
}: {
  href: string
  size?: 'default' | 'lg'
  children: ReactNode
  className?: string
}) {
  const base =
    'inline-block font-sans font-bold rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 text-center'
  const sizing =
    size === 'lg'
      ? 'text-[1.02rem] px-7 py-4'
      : 'text-[0.95rem] px-6 py-3'

  return (
    <Link href={href} className={`${base} ${sizing} ${className}`} style={{ color: '#09073A' }}>
      {children}
    </Link>
  )
}

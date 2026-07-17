import type { ReactNode } from 'react'

const SIZE_CLASSES = {
  h1: 'text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.0] my-[0.15em_0_0.3em]',
  h2: 'text-[clamp(1.9rem,4vw,2.5rem)] leading-snug mb-[0.4em]',
  h3: 'text-[clamp(1.5rem,3vw,1.875rem)] leading-snug mb-[0.4em]',
} as const

export default function DisplayHeading({
  as: Tag = 'h2',
  children,
  className = '',
}: {
  as?: 'h1' | 'h2' | 'h3'
  children: ReactNode
  className?: string
}) {
  return (
    <Tag
      className={`font-display font-normal text-white tracking-[0] ${SIZE_CLASSES[Tag]} ${className}`}
      style={{ textWrap: Tag === 'h1' ? 'balance' : undefined }}
    >
      {children}
    </Tag>
  )
}

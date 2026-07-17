import type { ReactNode, CSSProperties } from 'react'

export default function SectionWrapper({
  tight = false,
  children,
  className = '',
  style,
}: {
  tight?: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <section
      className={`relative ${tight ? 'py-[52px]' : 'py-20'} ${className}`}
      style={style}
    >
      <div className="w-full max-w-[1180px] mx-auto px-6">{children}</div>
    </section>
  )
}

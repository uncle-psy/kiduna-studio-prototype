import type { ReactNode } from 'react'

export default function Eyebrow({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`font-sans text-[0.72rem] font-bold tracking-[0.16em] uppercase text-skyblue ${className}`}
    >
      {children}
    </div>
  )
}

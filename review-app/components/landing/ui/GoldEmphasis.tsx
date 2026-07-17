import type { ReactNode } from 'react'

export default function GoldEmphasis({ children }: { children: ReactNode }) {
  return (
    <em className="font-display text-accent" style={{ fontStyle: 'italic' }}>
      {children}
    </em>
  )
}

import type { ReactNode } from 'react'

export default function FormCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-surface border border-border rounded-[14px] px-[34px] py-[28px] max-w-[530px] ${className}`}
    >
      {children}
    </div>
  )
}

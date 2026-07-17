'use client'

import { AllianceProvider } from '@/lib/alliance-context'

export default function AllianceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AllianceProvider>
      {children}
    </AllianceProvider>
  )
}

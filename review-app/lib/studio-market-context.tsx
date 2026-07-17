'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────

export interface StudioMarket {
  id: string
  name: string
  icon: string
  role: string
  citizenCount: number
  objectiveCount: number
  openProposals: number
}

// ── Mock Data ─────────────────────────────────────────────────────────────

export const MOCK_STUDIO_MARKETS: StudioMarket[] = [
  {
    id: 'acme',
    name: 'Acme Strategy DAO',
    icon: '🏛️',
    role: 'Sponsor',
    citizenCount: 147,
    objectiveCount: 3,
    openProposals: 3,
  },
  {
    id: 'loom',
    name: 'Loom Co-op',
    icon: '🧶',
    role: 'Sponsor',
    citizenCount: 23,
    objectiveCount: 1,
    openProposals: 0,
  },
  {
    id: 'solar',
    name: 'SolarDAO',
    icon: '☀️',
    role: 'Member',
    citizenCount: 312,
    objectiveCount: 5,
    openProposals: 7,
  },
]

// ── Context ───────────────────────────────────────────────────────────────

interface StudioMarketContextValue {
  markets: StudioMarket[]
  currentMarket: StudioMarket | null
  setMarketId: (id: string) => void
}

const StudioMarketContext = createContext<StudioMarketContextValue | null>(null)

export function StudioMarketProvider({ children }: { children: ReactNode }) {
  const [currentId, setCurrentId] = useState<string>(MOCK_STUDIO_MARKETS[0].id)

  const currentMarket =
    MOCK_STUDIO_MARKETS.find((m) => m.id === currentId) ?? null

  return (
    <StudioMarketContext.Provider
      value={{
        markets: MOCK_STUDIO_MARKETS,
        currentMarket,
        setMarketId: setCurrentId,
      }}
    >
      {children}
    </StudioMarketContext.Provider>
  )
}

const FALLBACK: StudioMarketContextValue = {
  markets: MOCK_STUDIO_MARKETS,
  currentMarket: MOCK_STUDIO_MARKETS[0],
  setMarketId: () => {},
}

export function useStudioMarket() {
  const ctx = useContext(StudioMarketContext)
  return ctx ?? FALLBACK
}
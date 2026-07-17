import type { Metadata } from 'next'
import DunaDetailPage from '@/components/landing/ui/DunaDetailPage'
export const metadata: Metadata = { title: 'Holler Health ($HLTH) — WV DUNA', description: 'Holler Health on WV DUNA — Health · Raising.' }
export default function Page() {
  return <DunaDetailPage d={{
    name: 'Holler Health', coin: '$HLTH',
    subtitle: 'Kanawha Care Network · Health · Private',
    badges: ['Raising', 'Health', 'WV SoS · Dec 2025', '$HLTH'],
    lede: 'Healthcare-literacy agents and a member fund for rural clinic access, coordinating care navigation across the network.',
    stats: [
      { num: '3,210', label: 'Members' }, { num: '$410k', label: 'Treasury' },
      { num: 'Private', label: 'Access' }, { num: '$HLTH', label: 'Token', small: true },
    ],
    cards: [
      { kicker: 'How it works', title: 'Member-owned, agent-run', body: 'Holler Health is governed by its members and operated alongside intelligent agents that handle the routine work. Every action settles on-chain and is recorded on a public ledger.' },
      { kicker: 'Legal standing', title: 'Registered in West Virginia', body: 'Registered with the West Virginia Secretary of State, Holler Health has a public legal home, a liability shield for members, and standing to contract, hold a treasury, and operate worldwide.' },
    ],
    strip: { label: 'Founded via Kanawha Care Network', date: 'Registered Dec 2025 · West Virginia Secretary of State' },
    sidebar: { type: 'raising', coin: '$HLTH', committed: '$18k', goal: '$60k goal', pct: 30,
      rows: [{ label: 'Treasury', value: '$410k' }, { label: 'Members', value: '3,210' }, { label: 'Type', value: 'Private' }],
      joinCta: 'Join Holler Health' },
  }} />
}

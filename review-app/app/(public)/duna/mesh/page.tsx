import type { Metadata } from 'next'
import DunaDetailPage from '@/components/landing/ui/DunaDetailPage'
export const metadata: Metadata = { title: 'Mountain Mesh ($MESH) — WV DUNA', description: 'Mountain Mesh on WV DUNA — DePIN · Raising.' }
export default function Page() {
  return <DunaDetailPage d={{
    name: 'Mountain Mesh', coin: '$MESH',
    subtitle: 'Ridgeline Networks · DePIN · Public',
    badges: ['Raising', 'DePIN', 'WV SoS · Apr 2026', '$MESH'],
    lede: 'Community-deployed wireless coverage wiring rural West Virginia counties, with smart contracts measuring proof-of-coverage and the treasury funding the next build-out.',
    stats: [
      { num: '1,420', label: 'Members' }, { num: '$1.3M', label: 'Treasury' },
      { num: '$9.4M', label: 'Market cap' }, { num: '$MESH', label: 'Token', small: true },
    ],
    cards: [
      { kicker: 'How it works', title: 'Member-owned, agent-run', body: 'Mountain Mesh is governed by its members and operated alongside intelligent agents that handle the routine work. Every action settles on-chain and is recorded on a public ledger.' },
      { kicker: 'Legal standing', title: 'Registered in West Virginia', body: 'Registered with the West Virginia Secretary of State, Mountain Mesh has a public legal home, a liability shield for members, and standing to contract, hold a treasury, and operate worldwide.' },
    ],
    strip: { label: 'Founded via Ridgeline Networks', date: 'Registered Apr 2026 · West Virginia Secretary of State' },
    sidebar: { type: 'raising', coin: '$MESH', committed: '$61k', goal: '$80k goal', pct: 76,
      rows: [{ label: 'Market cap', value: '$9.4M' }, { label: 'Treasury', value: '$1.3M' }, { label: 'Members', value: '1,420' }],
      joinCta: 'Join Mountain Mesh' },
  }} />
}

import type { Metadata } from 'next'
import DunaDetailPage from '@/components/landing/ui/DunaDetailPage'
export const metadata: Metadata = { title: 'Rhododendron AI ($RHODO) — WV DUNA', description: 'Rhododendron AI on WV DUNA — Agents · Live.' }
export default function Page() {
  return <DunaDetailPage d={{
    name: 'Rhododendron AI', coin: '$RHODO',
    subtitle: 'Charleston Agent Works · Agents · Public',
    badges: ['Live', 'Agents', 'WV SoS · May 2026', '$RHODO'],
    lede: 'A fleet of AI agents that sign, settle, and answer for it at law — the first agentic company registered as a DUNA.',
    stats: [
      { num: '760', label: 'Members' }, { num: '$2.9M', label: 'Treasury' },
      { num: '$33M', label: 'Market cap' }, { num: '$RHODO', label: 'Token', small: true },
    ],
    cards: [
      { kicker: 'How it works', title: 'Member-owned, agent-run', body: 'Rhododendron AI is governed by its members and operated alongside intelligent agents that handle the routine work. Every action settles on-chain and is recorded on a public ledger.' },
      { kicker: 'Legal standing', title: 'Registered in West Virginia', body: 'Registered with the West Virginia Secretary of State, Rhododendron AI has a public legal home, a liability shield for members, and standing to contract, hold a treasury, and operate worldwide.' },
    ],
    strip: { label: 'Founded via Charleston Agent Works', date: 'Registered May 2026 · West Virginia Secretary of State' },
    sidebar: { type: 'live', price: '$0.43', delta: '+12.8%', deltaDir: 'up',
      rows: [{ label: 'Market cap', value: '$33M' }, { label: 'Treasury', value: '$2.9M' }, { label: 'Members', value: '760' }, { label: 'Holders', value: '2,100' }],
      tradeCta: 'Trade $RHODO', joinCta: 'Join Rhododendron AI' },
  }} />
}

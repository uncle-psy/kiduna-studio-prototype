import type { Metadata } from 'next'
import DunaDetailPage from '@/components/landing/ui/DunaDetailPage'
export const metadata: Metadata = { title: 'Appalachian Power Co-op ($APC) — WV DUNA', description: 'Appalachian Power Co-op on WV DUNA — Mutual Aid · Live.' }
export default function Page() {
  return <DunaDetailPage d={{
    name: 'Appalachian Power Co-op', coin: '$APC',
    subtitle: 'Coalfield Mutual · Mutual Aid · Public',
    badges: ['Live', 'Mutual Aid', 'WV SoS · Nov 2025', '$APC'],
    lede: 'A community energy co-op pooling rooftop solar and storage, with agents managing metering and settlement.',
    stats: [
      { num: '5,400', label: 'Members' }, { num: '$276k', label: 'Treasury' },
      { num: '$12.8M', label: 'Market cap' }, { num: '$APC', label: 'Token', small: true },
    ],
    cards: [
      { kicker: 'How it works', title: 'Member-owned, agent-run', body: 'Appalachian Power Co-op is governed by its members and operated alongside intelligent agents that handle the routine work. Every action settles on-chain and is recorded on a public ledger.' },
      { kicker: 'Legal standing', title: 'Registered in West Virginia', body: 'Registered with the West Virginia Secretary of State, Appalachian Power Co-op has a public legal home, a liability shield for members, and standing to contract, hold a treasury, and operate worldwide.' },
    ],
    strip: { label: 'Founded via Coalfield Mutual', date: 'Registered Nov 2025 · West Virginia Secretary of State' },
    sidebar: { type: 'live', price: '$0.118', delta: '+1.1%', deltaDir: 'up',
      rows: [{ label: 'Market cap', value: '$12.8M' }, { label: 'Treasury', value: '$276k' }, { label: 'Members', value: '5,400' }, { label: 'Holders', value: '4,100' }],
      tradeCta: 'Trade $APC', joinCta: 'Join Appalachian Power Co-op' },
  }} />
}

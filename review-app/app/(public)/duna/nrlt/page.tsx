import type { Metadata } from 'next'
import DunaDetailPage from '@/components/landing/ui/DunaDetailPage'
export const metadata: Metadata = { title: 'New River Land Trust ($NRLT) — WV DUNA', description: 'New River Land Trust on WV DUNA — Land & Water · Live.' }
export default function Page() {
  return <DunaDetailPage d={{
    name: 'New River Land Trust', coin: '$NRLT',
    subtitle: 'Fayette County Collective · Land & Water · Public',
    badges: ['Live', 'Land & Water', 'WV SoS · Feb 2026', '$NRLT'],
    lede: 'Member-owned conservation of New River gorge land and water, with agents monitoring conditions and coordinating stewardship.',
    stats: [
      { num: '1,240', label: 'Members' }, { num: '$81k', label: 'Treasury' },
      { num: '$3.2M', label: 'Market cap' }, { num: '$NRLT', label: 'Token', small: true },
    ],
    cards: [
      { kicker: 'How it works', title: 'Member-owned, agent-run', body: 'New River Land Trust is governed by its members and operated alongside intelligent agents that handle the routine work. Every action settles on-chain and is recorded on a public ledger.' },
      { kicker: 'Legal standing', title: 'Registered in West Virginia', body: 'Registered with the West Virginia Secretary of State, New River Land Trust has a public legal home, a liability shield for members, and standing to contract, hold a treasury, and operate worldwide.' },
    ],
    strip: { label: 'Founded via Fayette County Collective', date: 'Registered Feb 2026 · West Virginia Secretary of State' },
    sidebar: { type: 'live', price: '$0.041', delta: '+4.2%', deltaDir: 'up',
      rows: [{ label: 'Market cap', value: '$3.2M' }, { label: 'Treasury', value: '$81k' }, { label: 'Members', value: '1,240' }, { label: 'Holders', value: '980' }],
      tradeCta: 'Trade $NRLT', joinCta: 'Join New River Land Trust' },
  }} />
}

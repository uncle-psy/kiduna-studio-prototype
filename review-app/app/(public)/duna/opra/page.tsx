import type { Metadata } from 'next'
import DunaDetailPage from '@/components/landing/ui/DunaDetailPage'
export const metadata: Metadata = { title: 'The Wheeling Opera House ($OPRA) — WV DUNA', description: 'The Wheeling Opera House on WV DUNA — Arts · Raising.' }
export default function Page() {
  return <DunaDetailPage d={{
    name: 'The Wheeling Opera House', coin: '$OPRA',
    subtitle: 'Ohio Valley Arts · Arts · Public',
    badges: ['Raising', 'Arts', 'WV SoS · Oct 2025', '$OPRA'],
    lede: 'A member-owned revival of a historic venue, with agents handling ticketing, programming, and community coordination.',
    stats: [
      { num: '612', label: 'Members' }, { num: '$17.2k', label: 'Treasury' },
      { num: '$540k', label: 'Market cap' }, { num: '$OPRA', label: 'Token', small: true },
    ],
    cards: [
      { kicker: 'How it works', title: 'Member-owned, agent-run', body: 'The Wheeling Opera House is governed by its members and operated alongside intelligent agents that handle the routine work. Every action settles on-chain and is recorded on a public ledger.' },
      { kicker: 'Legal standing', title: 'Registered in West Virginia', body: 'Registered with the West Virginia Secretary of State, The Wheeling Opera House has a public legal home, a liability shield for members, and standing to contract, hold a treasury, and operate worldwide.' },
    ],
    strip: { label: 'Founded via Ohio Valley Arts', date: 'Registered Oct 2025 · West Virginia Secretary of State' },
    sidebar: { type: 'raising', coin: '$OPRA', committed: '$35k', goal: '$120k goal', pct: 29,
      rows: [{ label: 'Treasury', value: '$17.2k' }, { label: 'Members', value: '612' }, { label: 'Market cap', value: '$540k' }],
      joinCta: 'Join The Wheeling Opera House' },
  }} />
}

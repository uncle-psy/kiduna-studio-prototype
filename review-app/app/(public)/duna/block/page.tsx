import type { Metadata } from 'next'
import DunaDetailPage from '@/components/landing/ui/DunaDetailPage'
export const metadata: Metadata = { title: 'Block Garden Charleston ($BLOCK) — WV DUNA', description: 'Block Garden Charleston on WV DUNA — Civic · Forming.' }
export default function Page() {
  return <DunaDetailPage d={{
    name: 'Block Garden Charleston', coin: '$BLOCK',
    subtitle: 'The Block · Civic · Private',
    badges: ['Forming', 'Civic', 'WV SoS · Apr 2026', '$BLOCK'],
    lede: 'Turning vacant lots into neighborhood gardens, one block at a time, with agents coordinating volunteers and supplies.',
    stats: [
      { num: '842', label: 'Members' }, { num: '$96k', label: 'Treasury' },
      { num: 'Private', label: 'Access' }, { num: '$BLOCK', label: 'Token', small: true },
    ],
    cards: [
      { kicker: 'How it works', title: 'Member-owned, agent-run', body: 'Block Garden Charleston is governed by its members and operated alongside intelligent agents that handle the routine work. Every action settles on-chain and is recorded on a public ledger.' },
      { kicker: 'Legal standing', title: 'Registered in West Virginia', body: 'Registered with the West Virginia Secretary of State, Block Garden Charleston has a public legal home, a liability shield for members, and standing to contract, hold a treasury, and operate worldwide.' },
    ],
    strip: { label: 'Founded via The Block', date: 'Registered Apr 2026 · West Virginia Secretary of State' },
    sidebar: { type: 'forming', description: "Members-only for now. The token hasn\u2019t launched yet, so participation is by membership and mutual consent.",
      rows: [{ label: 'Treasury', value: '$96k' }, { label: 'Members', value: '842' }, { label: 'Type', value: 'Private' }],
      joinCta: 'Join Block Garden Charleston' },
  }} />
}

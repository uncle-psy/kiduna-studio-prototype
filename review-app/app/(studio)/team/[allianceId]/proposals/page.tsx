'use client'

import { useState } from 'react'
import { useAlliance } from '@/lib/alliance-context'
import {
  SquadPageShell, EmptyState,
  IconFileText, IconLink, IconCheck,
} from '@/components/alliance-detail-shared'

type ProposalFilter = 'active' | 'completed' | 'rejected'

const FILTERS: { id: ProposalFilter; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
]

// Map an on-chain proposal status to one of the three filter buckets.
function bucketOf(status: string): ProposalFilter {
  if (status === 'Executed') return 'completed'
  if (status === 'Rejected' || status === 'Cancelled') return 'rejected'
  // 'Active' | 'Approved' | anything still in play
  return 'active'
}

export default function ProposalsPage() {
  const {
    alliance,
    proposals, isSigner, isWizard, busy, myWallet, memberCount,
    handleApprove, handleReject, handleExecute,
  } = useAlliance()

  const [filter, setFilter] = useState<ProposalFilter>('active')

  // Count per bucket (for the tab badges)
  const counts = proposals.reduce(
    (acc, p) => { acc[bucketOf(p.status)]++; return acc },
    { active: 0, completed: 0, rejected: 0 } as Record<ProposalFilter, number>,
  )

  const visible = proposals.filter((p) => bucketOf(p.status) === filter)

  const emptyCopy: Record<ProposalFilter, { title: string; desc: string }> = {
    active: { title: 'No active proposals', desc: 'There are no proposals waiting for approval. Actions like adding members or sending funds will create proposals here.' },
    completed: { title: 'No completed proposals', desc: 'Proposals that have been executed on-chain will appear here.' },
    rejected: { title: 'No rejected proposals', desc: 'Proposals that were rejected or cancelled will appear here.' },
  }

  return (
    <SquadPageShell title="Proposals">
      <div className="sq-card">
        <div className="sq-card-title">
          <span className="sq-card-title-icon"><IconFileText size={13} /></span>
          On-Chain Proposals
          {counts.active > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: 'var(--sq-gold)', background: 'var(--sq-gold-soft)', borderRadius: 999, padding: '2px 10px' }}>
              {counts.active} active
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {FILTERS.map((f) => {
            const on = filter === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="sq-btn sq-btn-sm"
                style={
                  on
                    ? { background: 'var(--sq-gold)', color: '#1a1205' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'var(--sq-fg-muted)', border: '1px solid var(--sq-border-strong)' }
                }
              >
                {f.label}
                <span style={{ marginLeft: 6, opacity: 0.8 }}>{counts[f.id]}</span>
              </button>
            )
          })}
        </div>

        {!alliance?.multisigPda ? (
          <EmptyState icon={<IconLink size={32} />} title="No on-chain wallet" description="Proposals require an on-chain multisig wallet. Create one to get started." />
        ) : visible.length === 0 ? (
          <EmptyState icon={<IconCheck size={32} />} title={emptyCopy[filter].title} description={emptyCopy[filter].desc} />
        ) : (
          <div>
            {visible.map((p) => {
              const mineApproved = !!myWallet && p.approved.includes(myWallet)
              const mineRejected = !!myWallet && p.rejected.includes(myWallet)
              const ready = p.approvedCount >= p.threshold
              const isCancelled = p.status === 'Rejected' || p.status === 'Cancelled'
              const isExecuted = p.status === 'Executed'

              let badgeClass = 'waiting'
              let badgeText = 'Waiting'
              if (isExecuted) { badgeClass = 'ready'; badgeText = 'Executed' }
              else if (isCancelled) { badgeClass = 'cancelled'; badgeText = p.status === 'Cancelled' ? 'Cancelled' : 'Rejected' }
              else if (ready) { badgeClass = 'ready'; badgeText = 'Ready' }

              return (
                <div key={p.transactionIndex} className="sq-proposal">
                  <div className="sq-proposal-top">
                    <div className="sq-proposal-body">
                      <div className="sq-proposal-desc">{p.description}</div>
                      <div className="sq-proposal-status">
                        {isExecuted
                          ? `Executed · approved by ${p.approvedCount} of ${p.threshold}`
                          : isCancelled
                            ? `Rejected by ${p.rejectedCount} of ${memberCount} members`
                            : ready
                              ? `Approved by ${p.approvedCount} of ${p.threshold} — ready to execute`
                              : `${p.approvedCount} of ${p.threshold} approved${p.rejectedCount > 0 ? ` · ${p.rejectedCount} rejected` : ''}`}
                      </div>
                    </div>
                    <div className="sq-proposal-actions">
                      <span className={`sq-proposal-badge ${badgeClass}`}>{badgeText}</span>
                      {isSigner && !ready && !isCancelled && !isExecuted && (
                        <>
                          {!mineRejected && (
                            <button className="sq-btn sq-btn-gold sq-btn-sm" disabled={busy || mineApproved} onClick={() => handleApprove(p)}>
                              {mineApproved ? 'Approved' : 'Approve'}
                            </button>
                          )}
                          {!mineApproved && (
                            <button className="sq-btn sq-btn-danger sq-btn-sm" disabled={busy || mineRejected} onClick={() => handleReject(p)}>
                              {mineRejected ? 'Rejected' : 'Reject'}
                            </button>
                          )}
                        </>
                      )}
                      {isWizard && ready && !isCancelled && !isExecuted && (
                        <button className="sq-btn sq-btn-gold sq-btn-sm" disabled={busy} onClick={() => handleExecute(p)}>
                          Execute
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {alliance?.multisigPda && filter === 'active' && (
          <p className="sq-note">Each member approves; once enough have approved, anyone can execute it.</p>
        )}
      </div>
    </SquadPageShell>
  )
}
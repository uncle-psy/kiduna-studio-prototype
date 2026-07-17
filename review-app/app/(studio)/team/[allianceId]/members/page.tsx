'use client'

import { useState } from 'react'
import { useAlliance } from '@/lib/alliance-context'
import {
  ROLES, SquadPageShell, short, EmptyState,
  IconUsers, IconUserPlus, IconUserMinus, IconPlus, IconX,
} from '@/components/alliance-detail-shared'

type ModalView = null | 'menu' | 'add' | 'remove'

export default function MembersPage() {
  const {
    alliance,
    isWizard, busy, memberCount, pendingRemovals, pendingAdditions,
    handleAdd, handleRole, handleRemove,
  } = useAlliance()

  const [modal, setModal] = useState<ModalView>(null)
  const [newWallet, setNewWallet] = useState('')
  const [newRole, setNewRole] = useState('Member')
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  // "Wizard" is reserved for the alliance creator — there is exactly one Wizard
  // and it can't be assigned to another member.
  const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== 'Wizard')
  // New members can only be added as "Member".
  const ADD_ROLES = ['Member']

  // The Wizard / creator is the multisig authority and must never be removable
  // — removing them on-chain would leave the alliance without its owner and
  // lock everyone out (DB and chain would also drift). Exclude them from the
  // removal list so a Remove proposal can't even be created for them.
  const isWizardMember = (m: { role: string; wallet: string }) =>
    m.role === 'Wizard' || m.wallet === alliance?.creatorWallet
  const removableMembers = alliance?.members.filter((m) => !isWizardMember(m)) ?? []

  async function onAdd() {
    await handleAdd(newWallet, newRole)
    setNewWallet('')
    setNewRole('Member')
    setModal(null)
  }

  async function onRemove() {
    if (!removeTarget) return
    await handleRemove(removeTarget)
    setRemoveTarget(null)
    setModal(null)
  }

  function closeModal() {
    setModal(null)
    setNewWallet('')
    setNewRole('Member')
    setRemoveTarget(null)
  }

  return (
    <SquadPageShell title="Members">
      {/* Member List — governance table */}
      <div className="sq-card">
        <div className="sq-card-title">
          <span className="sq-card-title-icon"><IconUsers size={13} /></span>
          Team Members
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 600, color: 'var(--sq-fg-soft)' }}>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
          {isWizard && (
            <button className="sq-btn sq-btn-gold sq-btn-sm" style={{ marginLeft: 8 }} onClick={() => setModal('menu')}>
              <IconPlus size={14} />
              Create Proposal
            </button>
          )}
        </div>

        {alliance && alliance.members.length > 0 ? (
          <div className="sq-member-table">
            {/* Table header */}
            <div className="sq-member-row" style={{ borderBottom: '1px solid var(--sq-border-strong)', padding: '8px 14px' }}>
              <span className="sq-form-label" style={{ flex: 1, margin: 0 }}>Wallet Address</span>
              <span className="sq-form-label" style={{ width: 120, textAlign: 'center', margin: 0 }}>Role</span>
              <span className="sq-form-label" style={{ width: 80, textAlign: 'center', margin: 0 }}>Status</span>
            </div>
            {alliance.members.map((m) => (
              <div key={m.id} className="sq-member-row">
                <span className="sq-member-wallet" style={{ flex: 1 }}>{short(m.wallet, 5)}</span>
                <span style={{ width: 120, textAlign: 'center' }}>
                  {isWizard && m.wallet !== alliance.creatorWallet ? (
                    <select
                      className="sq-select"
                      value={m.role}
                      disabled={busy}
                      onChange={(e) => handleRole(m.id, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    >
                      {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className="sq-member-role-badge">{m.role}</span>
                  )}
                </span>
                <span style={{ width: 80, textAlign: 'center' }}>
                  <span className={`sq-member-status-badge ${m.wallet === alliance.creatorWallet ? 'creator' : 'active'}`}>
                    {m.wallet === alliance.creatorWallet ? 'Creator' : 'Active'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<IconUsers size={32} />} title="No members found" />
        )}

        {alliance?.multisigPda && (alliance?.threshold ?? 1) > 1 && (
          <p className="sq-note">
            All member changes create on-chain proposals. {alliance.threshold} of {memberCount} signers must approve before changes take effect.
          </p>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}

      {modal && (
        <div className="sq-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="sq-modal">

            {/* MENU: Choose proposal type */}
            {modal === 'menu' && (
              <>
                <div className="sq-modal-head">
                  <h3 className="sq-modal-title">Create Proposal</h3>
                  <button className="sq-modal-close" onClick={closeModal}><IconX size={18} /></button>
                </div>
                <div className="sq-modal-body">
                  <button className="sq-action-item" onClick={() => setModal('add')} disabled={memberCount >= 10}>
                    <span className="sq-action-icon"><IconUserPlus size={18} /></span>
                    <span>
                      <span className="sq-action-label">Add Member</span>
                      <div className="sq-action-desc">
                        {memberCount >= 10 ? 'Maximum of 10 members reached' : 'Propose adding a new wallet to the alliance'}
                      </div>
                    </span>
                  </button>
                  <button className="sq-action-item" onClick={() => setModal('remove')}>
                    <span className="sq-action-icon danger"><IconUserMinus size={18} /></span>
                    <span>
                      <span className="sq-action-label">Remove Member</span>
                      <div className="sq-action-desc">Propose removing an existing member</div>
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* ADD MEMBER form */}
            {modal === 'add' && (
              <>
                <div className="sq-modal-head">
                  <h3 className="sq-modal-title">Add Member Proposal</h3>
                  <button className="sq-modal-close" onClick={closeModal}><IconX size={18} /></button>
                </div>
                <div className="sq-modal-body">
                  <div className="sq-form-group" style={{ marginBottom: 14 }}>
                    <label className="sq-form-label">Wallet Address</label>
                    <input
                      className="sq-input"
                      placeholder="Public key of the new member"
                      value={newWallet}
                      onChange={(e) => setNewWallet(e.target.value)}
                    />
                    {pendingAdditions.has(newWallet.trim()) && (
                      <p style={{ color: '#fbbf24', fontSize: 12, marginTop: 6 }}>
                        A request to add this wallet is already waiting for approval.
                      </p>
                    )}
                  </div>
                  <div className="sq-form-group">
                    <label className="sq-form-label">Role</label>
                    <select className="sq-select" value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ width: '100%', padding: '10px 12px' }}>
                      {ADD_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="sq-modal-footer">
                  <button className="sq-btn sq-btn-soft" onClick={() => setModal('menu')}>Back</button>
                  <button
                    className="sq-btn sq-btn-gold"
                    disabled={busy || !newWallet.trim() || pendingAdditions.has(newWallet.trim())}
                    onClick={onAdd}
                  >
                    {busy ? 'Processing…' : 'Create Proposal'}
                  </button>
                </div>
              </>
            )}

            {/* REMOVE MEMBER selection */}
            {modal === 'remove' && (
              <>
                <div className="sq-modal-head">
                  <h3 className="sq-modal-title">Select Member to Remove</h3>
                  <button className="sq-modal-close" onClick={closeModal}><IconX size={18} /></button>
                </div>
                <div className="sq-modal-body" style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {removableMembers.length === 0 ? (
                    <p className="sq-action-desc" style={{ margin: 0 }}>
                      There are no members that can be removed. The Wizard (creator) can’t be removed.
                    </p>
                  ) : removableMembers.map((m) => {
                    const isPending = pendingRemovals.has(m.wallet)
                    return (
                      <div
                        key={m.id}
                        className={`sq-radio-item${removeTarget === m.id ? ' selected' : ''}${isPending ? ' disabled' : ''}`}
                        onClick={() => !isPending && setRemoveTarget(m.id)}
                        style={isPending ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        <span className="sq-radio-dot"><span className="sq-radio-dot-inner" /></span>
                        <span style={{ flex: 1 }}>
                          <span className="sq-member-wallet">{short(m.wallet, 6)}</span>
                          <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--sq-fg-soft)' }}>{m.role}</span>
                        </span>
                        {isPending && <span style={{ fontSize: '0.72rem', color: 'var(--sq-gold)' }}>Pending</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="sq-modal-footer">
                  <button className="sq-btn sq-btn-soft" onClick={() => setModal('menu')}>Back</button>
                  <button className="sq-btn sq-btn-danger" disabled={busy || !removeTarget} onClick={onRemove}>
                    {busy ? 'Processing…' : 'Create Removal Proposal'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </SquadPageShell>
  )
}
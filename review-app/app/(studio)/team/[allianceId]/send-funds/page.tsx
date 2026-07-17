'use client'

import { useState } from 'react'
import { useAlliance } from '@/lib/alliance-context'
import {
  SquadPageShell, CopyButton, short, EmptyState,
  IconWallet, IconSend, IconLock, IconPlus, IconX,
} from '@/components/alliance-detail-shared'

type ModalView = null | 'menu' | 'SOL' | 'USDC'

export default function SendFundsPage() {
  const {
    alliance, solBalance, usdcBalance, isWizard, busy, memberCount,
    handleSend, setError,
  } = useAlliance()

  const [modal, setModal] = useState<ModalView>(null)
  const [toAddr, setToAddr] = useState('')
  const [amount, setAmount] = useState('')

  // Token currently being sent (set when a menu option is picked)
  const sendToken: 'SOL' | 'USDC' = modal === 'USDC' ? 'USDC' : 'SOL'

  // Available balance for the token being sent
  const available = sendToken === 'USDC' ? usdcBalance : solBalance
  const amountNum = parseFloat(amount)
  const amountValid = !isNaN(amountNum) && amountNum > 0
  // Guard: amount must not exceed the available balance for that token
  const exceedsBalance = amountValid && amountNum > available

  function closeModal() {
    setModal(null)
    setToAddr('')
    setAmount('')
  }

  async function onSend() {
    if (!amountValid) {
      setError('Enter a valid amount greater than 0.')
      return
    }
    if (exceedsBalance) {
      setError(`Insufficient ${sendToken} balance. Available: ${available.toLocaleString()} ${sendToken}.`)
      return
    }
    await handleSend(toAddr, amount, sendToken)
    closeModal()
  }

  const requiresApproval = (alliance?.threshold ?? 1) > 1
  const actionLabel = requiresApproval ? 'Propose Transfer' : 'Send Funds'

  return (
    <SquadPageShell title="Send Funds">
      <div className="sq-card">
        <div className="sq-card-title">
          <span className="sq-card-title-icon"><IconWallet size={13} /></span>
          Alliance Wallet
        </div>
        {alliance?.multisigPda ? (
          <div className="sq-kv-grid">
            <div className="sq-kv-item">
              <span className="sq-kv-label">
                Controller (Multisig)
                <span className="sq-tooltip-icon" title="The control account: who the signers are and how many approvals a transaction needs. No funds are held here.">i</span>
              </span>
              <span className="sq-kv-value">
                {short(alliance.multisigPda, 6)}
                <CopyButton value={alliance.multisigPda} />
              </span>
            </div>
            <div className="sq-kv-item">
              <span className="sq-kv-label">
                Treasury (Vault)
                <span className="sq-tooltip-icon" title="The treasury account where the alliance's funds (SOL, USDC) are held.">i</span>
              </span>
              <span className="sq-kv-value">
                {short(alliance?.vaultPda, 6)}
                <CopyButton value={alliance?.vaultPda} />
              </span>
            </div>
            <div className="sq-kv-item">
              <span className="sq-kv-label">SOL Balance</span>
              <span className="sq-kv-balance">{solBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL</span>
            </div>
            <div className="sq-kv-item">
              <span className="sq-kv-label">USDC Balance</span>
              <span className="sq-kv-balance">{usdcBalance.toLocaleString()} USDC</span>
            </div>
          </div>
        ) : (
          <EmptyState icon={<IconWallet size={32} />} title="No on-chain wallet" description="This alliance does not have a Squads wallet yet." />
        )}
      </div>

      {alliance?.multisigPda && isWizard ? (
        <div className="sq-card">
          <div className="sq-card-title">
            <span className="sq-card-title-icon"><IconSend size={13} /></span>
            Transfer Funds
            <button className="sq-btn sq-btn-gold sq-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setModal('menu')}>
              <IconPlus size={14} />
              Create Proposal
            </button>
          </div>
          <p className="sq-card-subtitle">
            {requiresApproval
              ? `Transfers require on-chain approval. ${alliance.threshold} of ${memberCount} signers must approve before funds are sent.`
              : 'Sends tokens directly from the team vault on-chain.'}
          </p>
        </div>
      ) : alliance?.multisigPda ? (
        <div className="sq-card">
          <div className="sq-card-title">
            <span className="sq-card-title-icon"><IconSend size={13} /></span>
            Transfer Funds
          </div>
          <EmptyState icon={<IconLock size={32} />} title="Wizard only" description="Only the alliance creator (Wizard) can create a fund transfer proposal." />
        </div>
      ) : null}

      {/* ── Modals ──────────────────────────────────────────────────── */}

      {modal && (
        <div className="sq-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="sq-modal">

            {/* MENU: Choose token to send */}
            {modal === 'menu' && (
              <>
                <div className="sq-modal-head">
                  <h3 className="sq-modal-title">Send Funds</h3>
                  <button className="sq-modal-close" onClick={closeModal}><IconX size={18} /></button>
                </div>
                <div className="sq-modal-body">
                  <button className="sq-action-item" onClick={() => setModal('SOL')}>
                    <span className="sq-action-icon"><IconSend size={18} /></span>
                    <span>
                      <span className="sq-action-label">Send SOL</span>
                      <div className="sq-action-desc">Transfer SOL from the alliance treasury</div>
                    </span>
                  </button>
                  <button className="sq-action-item" onClick={() => setModal('USDC')}>
                    <span className="sq-action-icon"><IconWallet size={18} /></span>
                    <span>
                      <span className="sq-action-label">Send USDC</span>
                      <div className="sq-action-desc">Transfer USDC from the alliance treasury</div>
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* TRANSFER form (SOL or USDC) */}
            {(modal === 'SOL' || modal === 'USDC') && (
              <>
                <div className="sq-modal-head">
                  <h3 className="sq-modal-title">Send {sendToken}</h3>
                  <button className="sq-modal-close" onClick={closeModal}><IconX size={18} /></button>
                </div>
                <div className="sq-modal-body">
                  <p className="sq-action-desc" style={{ margin: '0 0 16px' }}>
                    {requiresApproval
                      ? `${alliance?.threshold} of ${memberCount} signers must approve before funds are sent.`
                      : 'Sends tokens directly from the team vault on-chain.'}
                  </p>
                  <div className="sq-form-group" style={{ marginBottom: 14 }}>
                    <label className="sq-form-label">Recipient Address</label>
                    <input
                      className="sq-input"
                      placeholder="Wallet address (public key)"
                      value={toAddr}
                      onChange={(e) => setToAddr(e.target.value)}
                    />
                  </div>
                  <div className="sq-form-group">
                    <label className="sq-form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Amount ({sendToken})</span>
                      <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: 'var(--sq-fg-soft)' }}>
                        Available: {available.toLocaleString(undefined, { maximumFractionDigits: sendToken === 'USDC' ? 2 : 4 })} {sendToken}
                      </span>
                    </label>
                    <input
                      className="sq-input"
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    {exceedsBalance && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--sq-danger)', marginTop: 4 }}>
                        Amount exceeds available {sendToken} balance.
                      </span>
                    )}
                  </div>
                </div>
                <div className="sq-modal-footer">
                  <button className="sq-btn sq-btn-soft" onClick={() => setModal('menu')}>Back</button>
                  <button className="sq-btn sq-btn-gold" disabled={busy || !toAddr.trim() || !amountValid || exceedsBalance} onClick={onSend}>
                    {busy ? 'Processing…' : actionLabel}
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
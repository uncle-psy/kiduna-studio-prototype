'use client'

import { useState, useEffect, useRef } from 'react'
import { useAlliance } from '@/lib/alliance-context'
import { SquadPageShell, IconShield, IconPlus, IconX } from '@/components/alliance-detail-shared'

export default function ApprovalThresholdPage() {
  const {
    alliance,
    isWizard, busy, memberCount, proposals,
    handleThreshold,
  } = useAlliance()

  const [thresholdInput, setThresholdInput] = useState<number>(1)
  const [modalOpen, setModalOpen] = useState(false)
  // The last value we submitted. A transient guard that keeps the button
  // disabled in the brief window between submitting and the proposal showing
  // up (or the change executing directly).
  const [submittedValue, setSubmittedValue] = useState<number | null>(null)
  // Synchronous lock against rapid double-clicks (state updates are async).
  const submittingRef = useRef(false)

  // Is there a still-open threshold-change proposal for this value? While one
  // is waiting the button stays disabled; once it executes OR is rejected/
  // cancelled it's no longer open, so the button frees up again.
  const openChangeFor = (v: number) =>
    proposals.some(
      (p) =>
        p.kind === 'ChangeThreshold' &&
        p.newThreshold === v &&
        p.status !== 'Executed' &&
        p.status !== 'Rejected' &&
        p.status !== 'Cancelled',
    )

  useEffect(() => {
    if (alliance) setThresholdInput(alliance.threshold)
  }, [alliance?.threshold])

  // Clear the transient submit-guard once the change is reflected: either the
  // proposal is now visible (the open-proposal check takes over) or it executed
  // directly. After this, a cancellation re-enables the button.
  useEffect(() => {
    if (submittedValue === null) return
    const stillOpen = proposals.some(
      (p) =>
        p.kind === 'ChangeThreshold' &&
        p.newThreshold === submittedValue &&
        p.status !== 'Executed' &&
        p.status !== 'Rejected' &&
        p.status !== 'Cancelled',
    )
    if (stillOpen || alliance?.threshold === submittedValue) {
      setSubmittedValue(null)
    }
  }, [proposals, alliance?.threshold, submittedValue])

  function openModal() {
    // Start the input from the current threshold each time the modal opens.
    setThresholdInput(alliance?.threshold ?? 1)
    setModalOpen(true)
  }
  function closeModal() {
    setModalOpen(false)
    setThresholdInput(alliance?.threshold ?? 1)
  }

  async function onUpdate() {
    if (submittingRef.current || busy) return
    // Guard: threshold must be a whole number within 1..memberCount.
    if (
      !Number.isInteger(thresholdInput) ||
      thresholdInput < 1 ||
      thresholdInput > memberCount
    ) {
      return
    }
    submittingRef.current = true
    setSubmittedValue(thresholdInput)
    try {
      await handleThreshold(thresholdInput)
      setModalOpen(false)
    } finally {
      submittingRef.current = false
    }
  }

  const pct = memberCount > 0 ? Math.round((alliance?.threshold ?? 1) / memberCount * 100) : 0

  return (
    <SquadPageShell title="Approval Threshold">
      <div className="sq-card">
        <div className="sq-card-title">
          <span className="sq-card-title-icon"><IconShield size={13} /></span>
          Threshold Configuration
          {isWizard && (
            <button className="sq-btn sq-btn-gold sq-btn-sm" style={{ marginLeft: 'auto' }} onClick={openModal}>
              <IconPlus size={14} />
              Create Proposal
            </button>
          )}
        </div>
        <p className="sq-card-subtitle">
          The approval threshold determines how many members must approve a transaction before it can be executed on-chain.
        </p>

        {/* Current threshold visual */}
        {alliance && (
          <div className="sq-threshold-visual">
            <div>
              <div className="sq-threshold-number">{alliance.threshold}</div>
              <div className="sq-threshold-of">of {memberCount}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--sq-fg-soft)', marginBottom: 6 }}>
                {pct}% approval required
              </div>
              <div className="sq-threshold-bar">
                <div className="sq-threshold-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Note / permissions */}
        {isWizard ? (
          <p className="sq-note">
            Must be between 1 and {memberCount}. Changing this may require existing signers to approve the change if the current threshold is greater than 1.
          </p>
        ) : (
          <p className="sq-note" style={{ margin: 0 }}>
            Only a Wizard can change the approval threshold.
          </p>
        )}
      </div>

      {/* ── Change Threshold modal ──────────────────────────────────── */}
      {modalOpen && isWizard && (
        <div className="sq-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="sq-modal">
            <div className="sq-modal-head">
              <h3 className="sq-modal-title">Change Approval Threshold</h3>
              <button className="sq-modal-close" onClick={closeModal}><IconX size={18} /></button>
            </div>
            <div className="sq-modal-body">
              <p className="sq-action-desc" style={{ margin: '0 0 16px' }}>
                Current threshold is {alliance?.threshold ?? 1} of {memberCount}. Set how many members must approve a transaction before it can be executed on-chain.
              </p>
              <div className="sq-form-group">
                <label className="sq-form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>New Threshold</span>
                  <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: 'var(--sq-fg-soft)' }}>
                    of {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </span>
                </label>
                <input
                  className="sq-input"
                  type="text"
                  inputMode="numeric"
                  value={thresholdInput === 0 ? '' : thresholdInput}
                  onChange={(e) => {
                    // Whole positive number only — strip non-digits, drop leading
                    // zeros, and cap the length to the member-count digits so
                    // "2.5", "-1" or "0000…2" can't be entered.
                    const maxLen = String(Math.max(1, memberCount)).length
                    const digits = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(0, maxLen)
                    if (digits === '') { setThresholdInput(0); return }   // allow empty while editing
                    setThresholdInput(parseInt(digits, 10))               // don't clamp mid-typing
                  }}
                  onBlur={() => setThresholdInput((v) => Math.min(Math.max(1, v || 1), Math.max(1, memberCount)))}
                  autoFocus
                />
                {thresholdInput > memberCount && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--sq-danger)', marginTop: 4 }}>
                    Threshold can’t exceed the number of members ({memberCount}).
                  </span>
                )}
              </div>
            </div>
            <div className="sq-modal-footer">
              <button className="sq-btn sq-btn-soft" onClick={closeModal}>Cancel</button>
              <button
                className="sq-btn sq-btn-gold"
                disabled={
                  busy ||
                  thresholdInput < 1 ||
                  thresholdInput > memberCount ||
                  thresholdInput === (alliance?.threshold ?? 1) ||
                  thresholdInput === submittedValue ||
                  openChangeFor(thresholdInput)
                }
                onClick={onUpdate}
              >
                {busy ? 'Processing…' : 'Update Threshold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SquadPageShell>
  )
}
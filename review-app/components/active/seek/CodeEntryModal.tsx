'use client'

/**
 * Invite-code entry modal.
 *
 * Mirrors the Flutter ReferralCodeScreen flow: the user types an invite code,
 * we call previewCode() to validate it, and on success we hand the validated
 * CodePreviewResult back to the caller (which then navigates to the movement
 * detail / join flow).
 */

import { useState } from 'react'
import { X, KeyRound, Loader2 } from 'lucide-react'
import { previewCode, type CodePreviewResult } from '@/lib/seek-api'

interface CodeEntryModalProps {
  /** Optional movement context (when launched from a specific movement). */
  movementName?: string
  onClose: () => void
  onValid: (result: CodePreviewResult) => void
}

export default function CodeEntryModal({
  movementName,
  onClose,
  onValid,
}: CodeEntryModalProps) {
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = async () => {
    if (!code.trim() || verifying) return
    setVerifying(true)
    setError(null)
    const result = await previewCode(code.trim())
    setVerifying(false)

    if (!result.valid) {
      setError(result.message || 'This code is not valid.')
      return
    }
    if (result.isExpired) {
      setError('This invitation code has expired.')
      return
    }
    onValid(result)
  }

  return (
    <div className="seek-modal-backdrop" onClick={onClose}>
      <div className="seek-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="seek-invite-icon">
            <KeyRound size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              Enter invitation code
            </div>
            {movementName && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Join {movementName}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <input
          className="seek-modal-input"
          placeholder="KIN-XXXXXX-XXX"
          value={code}
          autoFocus
          onChange={(e) => setCode(e.target.value.slice(0, 30))}
          maxLength={30}
          onKeyDown={(e) => {
            if (e.key === 'Enter') verify()
          }}
        />

        {error && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: '#ef4444' }}>
            {error}
          </div>
        )}

        <button
          className="seek-confirm-btn"
          disabled={!code.trim() || verifying}
          onClick={verify}
        >
          {verifying ? (
            <>
              <Loader2 size={16} className="spin" /> Verifying…
            </>
          ) : (
            'Verify Code'
          )}
        </button>
      </div>
    </div>
  )
}

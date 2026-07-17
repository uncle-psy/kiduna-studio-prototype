'use client'

import { Icon } from '@iconify/react'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-card-border bg-card p-6 shadow-2xl">
        {/* Icon */}
        <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
          danger ? 'bg-red-400/10' : 'bg-amber-400/10'
        }`}>
          <Icon
            icon={danger ? 'lucide:trash-2' : 'lucide:alert-triangle'}
            width={22}
            height={22}
            className={danger ? 'text-red-400' : 'text-amber-400'}
          />
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-white rounded-[4px] hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50 ${
              danger
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Icon } from '@iconify/react'
import type { ContextStatus } from '@/lib/context-api'

export interface ContextAction {
  label: string
  icon: string
  onClick: () => void | Promise<void>
  danger?: boolean
}

interface ContextActionMenuProps {
  status: ContextStatus
  canEdit: boolean
  canDelete: boolean
  onPublish?: () => void | Promise<void>
  onUnpublish?: () => void | Promise<void>
  onArchive?: () => void | Promise<void>
  onRestore?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

// Style presets for each action type
const ACTION_STYLES: Record<string, string> = {
  Publish: 'bg-green-500/15 text-green-400 hover:bg-green-500/25 border-green-500/20',
  Unpublish: 'bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 border-amber-400/20',
  Archive: 'bg-white/[0.04] text-muted hover:text-white hover:bg-white/[0.08] border-card-border',
  'Restore to Draft': 'bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 border-blue-400/20',
  Delete: 'bg-red-400/10 text-red-400 hover:bg-red-400/20 border-red-400/20',
}

export default function ContextActionMenu({
  status,
  canEdit,
  canDelete,
  onPublish,
  onUnpublish,
  onArchive,
  onRestore,
  onDelete,
}: ContextActionMenuProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Build actions based on current status and permissions
  const actions: ContextAction[] = []

  if (canEdit) {
    if (status === 'draft') {
      if (onPublish) actions.push({ label: 'Publish', icon: 'lucide:globe', onClick: onPublish })
      if (onArchive) actions.push({ label: 'Archive', icon: 'lucide:archive', onClick: onArchive })
    } else if (status === 'published') {
      if (onUnpublish) actions.push({ label: 'Unpublish', icon: 'lucide:eye-off', onClick: onUnpublish })
      if (onArchive) actions.push({ label: 'Archive', icon: 'lucide:archive', onClick: onArchive })
    } else if (status === 'archived') {
      if (onRestore) actions.push({ label: 'Restore to Draft', icon: 'lucide:rotate-ccw', onClick: onRestore })
    }
  }

  if (canDelete && status !== 'published') {
    if (onDelete) actions.push({ label: 'Delete', icon: 'lucide:trash-2', onClick: onDelete, danger: true })
  }

  if (actions.length === 0) return null

  const isBusy = loadingAction !== null

  async function handleClick(action: ContextAction) {
    if (isBusy) return
    setLoadingAction(action.label)
    try {
      await action.onClick()
    } catch (e) {
      console.error(`Action "${action.label}" failed:`, e)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {actions.map((action, i) => {
        const isThisLoading = loadingAction === action.label
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleClick(action)
            }}
            disabled={isBusy}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isBusy && !isThisLoading
                ? 'opacity-40 cursor-not-allowed'
                : ''
            } ${
              ACTION_STYLES[action.label] || (action.danger
                ? 'bg-red-400/10 text-red-400 hover:bg-red-400/20 border-red-400/20'
                : 'bg-white/[0.04] text-muted hover:text-white hover:bg-white/[0.08] border-card-border')
            }`}
            title={action.label}
          >
            {isThisLoading ? (
              <Icon icon="lucide:loader-2" width={13} height={13} className="animate-spin" />
            ) : (
              <Icon icon={action.icon} width={13} height={13} />
            )}
            <span>{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
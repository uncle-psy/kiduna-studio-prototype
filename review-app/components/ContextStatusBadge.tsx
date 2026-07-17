'use client'

import { Icon } from '@iconify/react'
import { STATUS_CONFIG } from '@/lib/context-constants'
import type { ContextStatus } from '@/lib/context-api'

interface ContextStatusBadgeProps {
  status: ContextStatus
  size?: 'sm' | 'md'
}

export default function ContextStatusBadge({ status, size = 'sm' }: ContextStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5'

  const iconSize = size === 'sm' ? 10 : 12

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.color} ${config.bgColor} ${config.borderColor} ${sizeClasses}`}
    >
      <Icon icon={config.icon} width={iconSize} height={iconSize} />
      {config.label}
    </span>
  )
}

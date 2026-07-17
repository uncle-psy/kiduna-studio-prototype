'use client'

import { useState } from 'react'
import { Icon } from '@iconify/react'
import type { SavedTool } from '@/lib/tools-api'

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOL_DEFS = [
  { id: 'bluesky',  name: 'Bluesky',  icon: 'simple-icons:bluesky',  color: '#38bdf8' },
  { id: 'google',   name: 'Google',   icon: 'simple-icons:google',   color: '#34d399' },
  { id: 'telegram', name: 'Telegram', icon: 'simple-icons:telegram', color: '#60a5fa' },
  { id: 'solana',   name: 'Solana',   icon: 'simple-icons:solana',   color: '#a78bfa' },
  { id: 'payload',  name: 'Website',  icon: 'lucide:globe',          color: '#6366f1' },
]

function toolDefFor(id: string) {
  return TOOL_DEFS.find((d) => d.id === id) ?? {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    icon: 'lucide:wrench',
    color: '#94a3b8',
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ToolAccountSelectorProps {
  accounts: SavedTool[]
  selectedIds: string[]
  onToggle: (accountId: string) => void
  loading?: boolean
  emptyMessage?: string
}

export default function ToolAccountSelector({
  accounts,
  selectedIds,
  onToggle,
  loading = false,
  emptyMessage,
}: ToolAccountSelectorProps) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon icon="lucide:loader-2" width={24} height={24} className="animate-spin text-accent" />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-card-border">
        <Icon icon="lucide:wrench" width={32} height={32} className="mx-auto text-muted mb-2" />
        <p className="text-muted">{emptyMessage || 'No tools connected yet'}</p>
        <p className="text-sm text-muted/70">
          Connect tools in <a href="/empower" className="text-accent hover:underline">Empower</a> first, then come back
        </p>
      </div>
    )
  }

  // Group accounts by tool name
  const grouped: Record<string, SavedTool[]> = {}
  for (const acct of accounts) {
    if (!grouped[acct.toolName]) grouped[acct.toolName] = []
    grouped[acct.toolName].push(acct)
  }

  return (
    <div className="space-y-2">
      {Object.keys(grouped).map((toolId) => {
        const def = toolDefFor(toolId)
        const toolAccounts = grouped[toolId] || []
        if (toolAccounts.length === 0) return null

        const selectedCount = toolAccounts.filter(a => selectedIds.includes(a.id)).length
        const isExpanded = expandedTool === toolId

        return (
          <div
            key={toolId}
            className="rounded-xl border overflow-hidden transition-all"
            style={{ borderColor: isExpanded ? `${def.color}30` : 'rgba(255,255,255,0.08)' }}
          >
            {/* Tool header — click to expand */}
            <button
              type="button"
              onClick={() => setExpandedTool(isExpanded ? null : toolId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer bg-transparent border-0 text-left"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${def.color}15` }}
              >
                <Icon icon={def.icon} width={18} height={18} style={{ color: def.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{def.name}</p>
                <p className="text-[11px] text-muted">
                  {toolAccounts.length} account{toolAccounts.length !== 1 ? 's' : ''}
                  {selectedCount > 0 && (
                    <span style={{ color: def.color }}> · {selectedCount} selected</span>
                  )}
                </p>
              </div>
              <Icon
                icon={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                width={16} height={16}
                className="text-muted shrink-0"
              />
            </button>

            {/* Expanded: show individual accounts */}
            {isExpanded && (
              <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {toolAccounts.map((acct) => {
                  const isSelected = selectedIds.includes(acct.id)
                  return (
                    <label
                      key={acct.id}
                      className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-white/[0.02]"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(acct.id)}
                        className="w-4 h-4 rounded shrink-0"
                        style={{ accentColor: def.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-mono truncate ${isSelected ? 'text-white' : 'text-white/60'}`}>
                          {acct.externalHandle || 'Connected'}
                        </p>
                      </div>
                      {isSelected && (
                        <Icon icon="lucide:check" width={14} height={14} style={{ color: def.color }} />
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
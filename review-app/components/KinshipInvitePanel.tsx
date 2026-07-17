'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Spinner } from '@/components/UI'
import { fetchMembers, sendPushInvite } from '@/lib/codes-api'
import type { MemberInfo, SendPushInviteResponse } from '@/lib/codes-api'
import {
  Search,
  Check,
  Send,
  Ban,
  User,
  Smartphone,
  X,
} from 'lucide-react'

interface KinshipInvitePanelProps {
  codeId: string
  codeName?: string
  contextName?: string
}

export default function KinshipInvitePanel({
  codeId,
  codeName,
  contextName,
}: KinshipInvitePanelProps) {
  // Members data
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set())

  // Invite form
  const [personalMessage, setPersonalMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch members
  const loadMembers = useCallback(async (search?: string) => {
    try {
      setLoading(true)
      const data = await fetchMembers(search)
      setMembers(data.members)
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        loadMembers(value || undefined)
      }, 300)
    },
    [loadMembers]
  )

  // Toggle selection
  const toggleSelect = useCallback((wallet: string) => {
    setSelectedWallets((prev) => {
      const next = new Set(prev)
      if (next.has(wallet)) {
        next.delete(wallet)
      } else {
        next.add(wallet)
      }
      return next
    })
  }, [])

  // Select all / deselect all
  const toggleSelectAll = useCallback(() => {
    if (selectedWallets.size === members.length) {
      setSelectedWallets(new Set())
    } else {
      setSelectedWallets(new Set(members.map((m) => m.wallet)))
    }
  }, [members, selectedWallets.size])

  // Get display name for a member
  const getDisplayName = (m: MemberInfo): string => {
    return m.displayName || m.name || m.username || `${m.wallet.slice(0, 6)}...${m.wallet.slice(-4)}`
  }

  // Send invites
  const handleSend = useCallback(async () => {
    if (selectedWallets.size === 0) return

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      const result: SendPushInviteResponse = await sendPushInvite(
        codeId,
        Array.from(selectedWallets),
        personalMessage.trim() || undefined
      )

      if (result.success) {
        const noApp = result.results.filter((r) => r.reason === 'no_player_id').length
        let msg = `Push sent to ${result.sentCount} member${result.sentCount !== 1 ? 's' : ''}.`
        if (noApp > 0) {
          msg += ` ${noApp} member${noApp !== 1 ? 's' : ''} skipped (app not installed).`
        }
        setSuccess(msg)
        setSelectedWallets(new Set())
        setPersonalMessage('')
      } else {
        setError(`Failed to send. ${result.failedCount} failed.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send push invites')
    } finally {
      setSending(false)
    }
  }, [codeId, selectedWallets, personalMessage])

  const membersWithApp = members.filter((m) => m.playerIds.length > 0)
  const membersWithoutApp = members.filter((m) => m.playerIds.length === 0)

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {success && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-4 py-3 flex items-center gap-2">
          <Check size={16} className="text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400 text-sm">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400/60 hover:text-emerald-400">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-2">
          <Ban size={16} className="text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search + Select All */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full bg-input border border-card-border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <button
          onClick={toggleSelectAll}
          className="text-xs text-accent hover:text-accent-dark transition-colors whitespace-nowrap px-3 py-2.5"
        >
          {selectedWallets.size === members.length && members.length > 0 ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Selected Count */}
      {selectedWallets.size > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-xs font-bold">{selectedWallets.size}</span>
          </div>
          <span className="text-white/70">
            member{selectedWallets.size !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}

      {/* Members List */}
      <div className="border border-card-border rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="sm" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-10">
            <User size={24} className="text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">No members found</p>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {/* Members WITH the app installed (sorted first) */}
            {membersWithApp.map((member) => (
              <MemberRow
                key={member.wallet}
                member={member}
                selected={selectedWallets.has(member.wallet)}
                onToggle={() => toggleSelect(member.wallet)}
                hasApp={true}
              />
            ))}
            {/* Members WITHOUT the app */}
            {membersWithoutApp.map((member) => (
              <MemberRow
                key={member.wallet}
                member={member}
                selected={selectedWallets.has(member.wallet)}
                onToggle={() => toggleSelect(member.wallet)}
                hasApp={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Personal Message */}
      <div>
        <label className="text-white/70 text-sm block mb-2">
          Personal Message <span className="text-muted">(optional)</span>
        </label>
        <textarea
          value={personalMessage}
          onChange={(e) => setPersonalMessage(e.target.value)}
          placeholder="Hey! I'd love for you to join us..."
          rows={3}
          maxLength={500}
          className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
        />
        <p className="text-muted text-xs mt-1 text-right">
          {personalMessage.length}/500 characters
        </p>
      </div>

      {/* Send Button */}
      <div className="pt-2">
        <button
          onClick={handleSend}
          disabled={sending || selectedWallets.size === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {sending ? (
            <>
              <Spinner size="sm" />
              Sending...
            </>
          ) : (
            <>
              <Send size={16} />
              Send Invite{selectedWallets.size > 1 ? ` (${selectedWallets.size})` : ''}
            </>
          )}
        </button>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Member Row Sub-Component
// ─────────────────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  selected,
  onToggle,
  hasApp,
}: {
  member: MemberInfo
  selected: boolean
  onToggle: () => void
  hasApp: boolean
}) {
  const displayName =
    member.displayName || member.name || member.username || `${member.wallet.slice(0, 6)}...${member.wallet.slice(-4)}`
  const subtitle = member.username ? `@${member.username}` : `${member.wallet.slice(0, 6)}...${member.wallet.slice(-4)}`

  return (
    <button
      onClick={hasApp ? onToggle : undefined}
      disabled={!hasApp}
      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
        !hasApp ? 'opacity-40 cursor-not-allowed' : selected ? 'bg-accent/10' : 'hover:bg-white/[0.03]'
      }`}
    >
      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
          !hasApp
            ? 'border-white/10 bg-transparent'
            : selected
            ? 'bg-accent border-accent'
            : 'border-white/20 bg-transparent'
        }`}
      >
        {selected && hasApp && <Check size={12} className="text-white" />}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {member.picture ? (
          <img src={member.picture} alt="" className="w-full h-full object-cover rounded-full" />
        ) : (
          <User size={14} className="text-accent" />
        )}
      </div>

      {/* Name + wallet */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted truncate">{subtitle}</p>
      </div>

      {/* App status indicator */}
      <div className="flex-shrink-0 flex items-center gap-1.5" title={hasApp ? 'App installed' : 'App not installed — cannot receive invites'}>
        {hasApp ? (
          <Smartphone size={14} className="text-emerald-400" />
        ) : (
          <>
            <Smartphone size={14} className="text-white/20" />
            <span className="text-[10px] text-white/20">No app</span>
          </>
        )}
      </div>
    </button>
  )
}
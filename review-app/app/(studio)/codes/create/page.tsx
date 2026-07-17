'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Spinner, EmptyState } from '@/components/UI'
import { useAuth } from '@/lib/auth-context'
import { useStudio } from '@/lib/studio-context'
import { createCode, fetchPermittedContexts } from '@/lib/codes-api'
import type { AccessType, CodeRole, PermittedContext } from '@/lib/types'
import {
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
  Mail,
  Smartphone,
  MessageCircle,
  AtSign,
  Lock,
  Check,
  Send,
  User,
  FileText,
  Shield,
  Clock,
  ClipboardList,
  DollarSign,
  Gamepad2,
  Percent,
  AlertCircle,
  Gavel,
} from 'lucide-react'

// Invitation method type
type InvitationMethod = 'email' | 'sms' | 'telegram' | 'bluesky'

// Invitation method options
const INVITATION_METHODS: {
  value: InvitationMethod
  label: string
  icon: typeof Mail
  enabled: boolean
  color: string
}[] = [
  {
    value: 'email',
    label: 'Email',
    icon: Mail,
    enabled: true,
    color: 'text-emerald-400',
  },
  {
    value: 'sms',
    label: 'SMS',
    icon: Smartphone,
    enabled: false,
    color: 'text-blue-400',
  },
  {
    value: 'telegram',
    label: 'Telegram',
    icon: MessageCircle,
    enabled: false,
    color: 'text-sky-400',
  },
  {
    value: 'bluesky',
    label: 'Bluesky',
    icon: AtSign,
    enabled: false,
    color: 'text-blue-500',
  },
]

// Access type options with descriptions - Display "Kiduna" for ecosystem, keep gathering
// Using 'ecosystem' internally but displaying as "Kiduna" in UI
const ACCESS_TYPE_OPTIONS: {
  value: 'ecosystem' | 'gathering' | 'market'
  label: string
  description: string
  icon: typeof Sparkles
  color: string
}[] = [
  {
    value: 'ecosystem',
    label: 'Kiduna',
    description: 'Full access to your entire kiduna',
    icon: Sparkles,
    color: 'text-violet-400',
  },
  {
    value: 'gathering',
    label: 'Gathering',
    description: 'Access to a specific gathering only',
    icon: Gamepad2,
    color: 'text-emerald-400',
  },
  {
    value: 'market',
    label: 'Market',
    description: 'Access to a specific market',
    icon: Gavel,
    color: 'text-amber-400',
  },
]

const ROLE_OPTIONS: { value: CodeRole; label: string; description: string }[] = [
  {
    value: 'member',
    label: 'Member',
    description: 'Full access, can invite others to their accessible areas',
  },
  {
    value: 'guest',
    label: 'Guest',
    description: 'View-only access, cannot invite others',
  },
]

// Expiry presets - default is 48 hours as per client requirement
const EXPIRY_PRESETS = [
  { label: 'Never', hours: -1 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '7 days', hours: 168 },
  { label: '30 days', hours: 720 },
  { label: 'Custom', hours: null },
]

// ─────────────────────────────────────────────────────────────────────────────
// Custom Dropdown Component (matching Presence Selector design)
// ─────────────────────────────────────────────────────────────────────────────

interface DropdownOption {
  id: string
  name: string
}

interface CustomDropdownProps {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder: string
  disabledPlaceholder?: string
  disabled?: boolean
  emptyMessage?: string
  error?: string
}

function CustomDropdown({
  label,
  required = false,
  value,
  onChange,
  options,
  placeholder,
  disabledPlaceholder,
  disabled = false,
  emptyMessage,
  error,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.id === value)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`w-full bg-input border rounded-xl px-4 py-3 text-left focus:outline-none flex items-center justify-between gap-2 transition-colors ${
            error
              ? 'border-red-500/50 focus:border-red-500'
              : 'border-card-border focus:border-accent/50'
          } ${
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:border-white/30'
          }`}
        >
          <span className={selected ? 'text-foreground' : 'text-muted'}>
            {disabled
              ? disabledPlaceholder || placeholder
              : selected
              ? selected.name
              : placeholder}
          </span>
          {open ? (
            <ChevronUp size={16} className="text-muted flex-shrink-0" />
          ) : (
            <ChevronDown size={16} className="text-muted flex-shrink-0" />
          )}
        </button>

        {open && !disabled && (
          <div className="absolute z-[100] w-full mt-1 bg-sidebar border border-card-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="max-h-48 overflow-y-auto bg-sidebar">
              {/* Default empty option */}
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  !value
                    ? 'bg-accent/15 text-accent'
                    : 'bg-sidebar text-muted hover:bg-white/10 hover:text-foreground'
                }`}
              >
                {placeholder}
              </button>

              {/* Options */}
              {options.map((option) => {
                const isSelected = value === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id)
                      setOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-accent/15 text-accent'
                        : 'bg-sidebar text-foreground hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{option.name}</span>
                    {isSelected && (
                      <Check size={14} className="text-accent flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
          <Info size={12} />
          {error}
        </p>
      )}
      {emptyMessage && options.length === 0 && !disabled && !error && (
        <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
          <Info size={12} />
          {emptyMessage}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateCodePage() {
  const router = useRouter()
  const { user, token } = useAuth()

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [invitationMethod, setInvitationMethod] = useState<InvitationMethod>('email')
  const [personalMessage, setPersonalMessage] = useState('')
  const [accessType, setAccessType] = useState<'ecosystem' | 'gathering' | 'market'>('ecosystem')
  const [presenceId, setPresenceId] = useState('')
  const [presenceRole, setPresenceRole] = useState('')
  const [gatheringId, setGatheringId] = useState('')
  const [marketId, setMarketId] = useState('')
  const [marketRole, setMarketRole] = useState<'member' | 'admin'>('member')
  const [role, setRole] = useState<CodeRole>('member')
  const [expiryPreset, setExpiryPreset] = useState<number | null>(-1) // Default: never expires
  const [customExpiry, setCustomExpiry] = useState('')
  const [price, setPrice] = useState('')
  const [discount, setDiscount] = useState('')

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingContexts, setLoadingContexts] = useState(false)
  const [loadingMarkets, setLoadingMarkets] = useState(false)
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    context?: string
    role?: string
    gathering?: string
    market?: string
    expiry?: string
  }>({})
  const [touched, setTouched] = useState(false)

  // Available options - contexts and roles fetched from API, gatherings come from games list
  const [contexts, setContexts] = useState<{ id: string; name: string }[]>([])
  const [permittedContextsData, setPermittedContextsData] = useState<PermittedContext[]>([])
  const [contextRoles, setContextRoles] = useState<{ id: string; name: string; permissions: string[] }[]>([])
  // Markets fetched from the Studio API
  const [markets, setMarkets] = useState<{ id: string; name: string; slug: string }[]>([])
  // Gatherings dropdown — sourced from the current platform's Games list,
  // already scoped to the current user's games by the backend API
  // (GET /games/user/:userId). No client-side filtering needed.
  const { games, gamesLoading } = useStudio()
  const gatherings = useMemo(
    () =>
      games.map((g) => ({ id: g.id, name: g.name })),
    [games]
  )

  // Track if user is owner of the selected context
  // If backend returns roles without invite permission, user must be the owner
  const [isContextOwner, setIsContextOwner] = useState(false)
  
  // Check if selected role has invite permission
  const selectedRoleData = contextRoles.find(r => r.id === presenceRole)
  const selectedRoleHasInvite = selectedRoleData?.permissions?.includes('invite') ?? false

  // Fetch permitted contexts from API when user wallet is available
  useEffect(() => {
    async function fetchContextsData() {
      if (!user?.wallet) return
      
      setLoadingContexts(true)
      try {
        const result = await fetchPermittedContexts(user.wallet)
        // Store full permitted contexts data (includes roles with invite permission)
        setPermittedContextsData(result.contexts)
        // Transform PermittedContext[] to { id, name }[] for the dropdown
        setContexts(result.contexts.map((ctx) => ({ id: ctx.id, name: ctx.name })))
      } catch (err) {
        console.error('Failed to fetch permitted contexts:', err)
        setContexts([])
        setPermittedContextsData([])
      } finally {
        setLoadingContexts(false)
      }
    }
    
    fetchContextsData()
  }, [user?.wallet])

  // Get roles from permitted contexts data when context is selected
  // For owned contexts, backend returns ALL roles
  // For non-owned contexts, backend returns only roles with invite permission
  useEffect(() => {
    if (!presenceId) {
      setContextRoles([])
      setIsContextOwner(false)
      return
    }
    
    // Find the selected context in permitted contexts data
    const selectedContext = permittedContextsData.find((ctx) => ctx.id === presenceId)
    if (selectedContext && selectedContext.roles) {
      // Store full role data including permissions
      const roles = selectedContext.roles.map((role) => ({
        id: role.id,
        name: role.name,
        permissions: role.permissions || [],
      }))
      setContextRoles(roles)
      
      // If any role lacks invite permission, user must be the owner
      // (because non-owners only see roles with invite permission)
      const hasNonInviteRoles = roles.some(r => !r.permissions.includes('invite'))
      setIsContextOwner(hasNonInviteRoles)
    } else {
      setContextRoles([])
      setIsContextOwner(false)
    }
  }, [presenceId, permittedContextsData])

  // Reset selections when access type changes
  useEffect(() => {
    if (accessType === 'ecosystem') {
      setGatheringId('')
      setMarketId('')
      setMarketRole('member')
    } else if (accessType === 'gathering') {
      setPresenceId('')
      setPresenceRole('')
      setMarketId('')
      setMarketRole('member')
    } else if (accessType === 'market') {
      setPresenceId('')
      setPresenceRole('')
      setGatheringId('')
    }
  }, [accessType])

  // Fetch user's markets when access type is 'market'
  useEffect(() => {
    if (accessType !== 'market') return
    
    let cancelled = false
    setLoadingMarkets(true)
    
    // Use the public markets endpoint (same one that powers the /market page).
    // No auth required for GET. Filter by sponsorWallet on the client so the
    // user only sees markets they created.
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    
    fetch('/api/v1/markets?pageSize=50', { headers })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch markets')))
      .then(data => {
        if (cancelled) return
        const items = (data.items || data.markets || [])
          .map((m: { id: string; name: string; slug: string }) => ({
            id: m.slug || m.id,
            name: m.name,
            slug: m.slug,
          }))
        setMarkets(items)
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to fetch markets:', err)
          setMarkets([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMarkets(false)
      })
    
    return () => { cancelled = true }
  }, [accessType, user?.wallet, token])

  // For gathering codes the backend still requires a parent Kiduna (`context_id`
  // is NOT NULL on the Code model), but the UI doesn't surface that choice —
  // so we silently assign the user's first permitted context once it loads.
  useEffect(() => {
    if (accessType === 'gathering' && !presenceId && contexts.length > 0) {
      setPresenceId(contexts[0].id)
    }
  }, [accessType, presenceId, contexts])

  // Reset presence role when presence changes
  useEffect(() => {
    setPresenceRole('')
  }, [presenceId])

  // Validation
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validateForm = (): { isValid: boolean; errors: typeof validationErrors } => {
    const errors: typeof validationErrors = {}

    // Context is required only for ecosystem (Kiduna) access.
    // Gathering codes are created with context_id = null.
    if (accessType === 'ecosystem' && !presenceId) {
      errors.context = 'Please select a context'
    }

    // Gathering is required when access type is gathering
    if (accessType === 'gathering' && !gatheringId) {
      errors.gathering = 'Please select a gathering'
    }

    // Market is required when access type is market
    if (accessType === 'market' && !marketId) {
      errors.market = 'Please select a market'
    }

    // Role and expiry are optional — defaults will be applied

    return {
      isValid: Object.keys(errors).length === 0 && !!user?.wallet,
      errors,
    }
  }

  const canSubmit = (): boolean => {
    const { isValid } = validateForm()
    return isValid
  }

  // Clear validation errors when fields change
  useEffect(() => {
    if (touched) {
      setValidationErrors((prev) => ({ ...prev, context: undefined }))
    }
  }, [presenceId, touched])

  useEffect(() => {
    if (touched) {
      setValidationErrors((prev) => ({ ...prev, role: undefined }))
    }
  }, [presenceRole, touched])

  useEffect(() => {
    if (touched) {
      setValidationErrors((prev) => ({ ...prev, gathering: undefined }))
    }
  }, [gatheringId, touched])

  useEffect(() => {
    if (touched) {
      setValidationErrors((prev) => ({ ...prev, market: undefined }))
    }
  }, [marketId, touched])

  useEffect(() => {
    if (touched) {
      setValidationErrors((prev) => ({ ...prev, expiry: undefined }))
    }
  }, [expiryPreset, customExpiry, touched])

  const getExpiryDate = (): string | null => {
    // Never expires
    if (expiryPreset === -1) {
      return null
    }
    const date = new Date()
    if (expiryPreset !== null && expiryPreset > 0) {
      date.setTime(date.getTime() + expiryPreset * 60 * 60 * 1000)
    } else if (customExpiry) {
      return new Date(customExpiry).toISOString()
    }
    return date.toISOString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setTouched(true)

    const { isValid, errors } = validateForm()
    setValidationErrors(errors)

    if (!isValid) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)

    try {
      const expiryDate = getExpiryDate()
      const code = await createCode({
        accessType,
        // Market codes don't need context. Gathering codes are not scoped to
        // a Kiduna — send null. Ecosystem codes keep their context.
        contextId: (accessType === 'ecosystem' ? presenceId : null) as unknown as string,
        gatheringId: accessType === 'gathering' ? gatheringId : undefined,
        marketId: accessType === 'market' ? marketId : undefined,
        scopeId: accessType === 'ecosystem' ? (presenceRole || undefined) : undefined,
        role: accessType === 'market' ? marketRole : role,
        expiresAt: expiryDate || undefined,
        price: price ? parseFloat(price) : undefined,
        discount: discount ? parseFloat(discount) : undefined,
        creatorWallet: user!.wallet,
      })

      console.log('Created code:', code)

      // Redirect to code detail page
      router.push(`/codes/${code.id}`)
    } catch (err) {
      console.error('Failed to create code:', err)
      setError(err instanceof Error ? err.message : 'Failed to create code')
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      {/* Header — matches the WV DUNA reference "Create a Code" view */}
      <div className="mb-[22px]">
        <Link
          href="/codes"
          className="inline-flex items-center gap-1.5 text-[0.85rem] text-white/60 hover:text-white transition-colors mb-3"
        >
          ← Back to Codes
        </Link>
        <div>
          <div className="text-[0.66rem] font-bold tracking-[0.16em] uppercase text-[#03CCD9] mb-2">
            Codes
          </div>
          <h1
            className="text-[2.1rem] font-normal text-white leading-none m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Create a Code
          </h1>
          <p className="text-[0.9rem] text-white/60 mt-1.5 max-w-[62ch]">
            A Code is an invitation and a credential in one. Set who it acts for and what it unlocks — the network
            verifies the rest.
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loadingContexts && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {!loadingContexts && (
        <>
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-card border border-card-border rounded-[14px] p-5 sm:p-[30px] space-y-6">
          {/* Access Type Selection */}
          <Card className="!bg-transparent !border-0 !p-0">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              Access Type
            </h3>
            <p className="text-muted text-sm mb-4">
              Select what level of access this invitation should grant
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACCESS_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = accessType === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccessType(option.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-accent bg-accent/10'
                        : 'border-card-border hover:border-white/20 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-accent/20' : 'bg-white/10'
                        }`}
                      >
                        <Icon
                          size={20}
                          className={isSelected ? 'text-accent' : option.color}
                        />
                      </div>
                      <span
                        className={`font-semibold ${
                          isSelected ? 'text-accent' : 'text-white'
                        }`}
                      >
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted sm:pl-[52px]">
                      {option.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Gathering Selection - Only shown when gathering access type is selected */}
          {accessType === 'gathering' && (
            <Card className="!bg-transparent !border-0 !p-0 overflow-visible">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Users size={18} className="text-accent" />
                Select Gathering
              </h3>

              {gamesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                  <span className="ml-2 text-muted text-sm">Loading gatherings...</span>
                </div>
              ) : (
                <CustomDropdown
                  label="Gathering"
                  required
                  value={gatheringId}
                  onChange={setGatheringId}
                  options={gatherings}
                  placeholder="Select a gathering..."
                  emptyMessage="No gatherings available"
                  error={validationErrors.gathering}
                />
              )}

              {/* Access Scope Preview */}
              {gatheringId && (
                <div className="mt-4 p-3 bg-sidebar rounded-xl border border-card-border">
                  <p className="text-xs text-muted mb-1">Access will be granted to:</p>
                  <p className="text-sm text-white font-medium">
                    {gatherings.find((g) => g.id === gatheringId)?.name}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Presence Selection - Only shown when presence (ecosystem) access type is selected */}
          {accessType === 'ecosystem' && (
            <Card className="!bg-transparent !border-0 !p-0 overflow-visible">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-accent" />
                Select Kiduna
              </h3>

              {loadingContexts ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                  <span className="ml-2 text-muted text-sm">Loading kidunas...</span>
                </div> 
              ) : (
                <CustomDropdown
                  label="Kiduna"
                  required
                  value={presenceId}
                  onChange={setPresenceId}
                  options={contexts}
                  placeholder="Select a kiduna..."
                  emptyMessage="No kidunas available"
                  error={validationErrors.context}
                />
              )}

              {/* Role Selection - Only shown when context is selected */}
              {presenceId && (
                <div className="mt-4">
                  <CustomDropdown
                    label="Role"
                    value={presenceRole}
                    onChange={setPresenceRole}
                    options={contextRoles.map(r => ({ id: r.id, name: r.name }))}
                    placeholder="Select a role..."
                    emptyMessage="No roles available for this context"
                    error={validationErrors.role}
                  />
                  
                  {/* Info message for roles without invite permission */}
                  {presenceRole && !selectedRoleHasInvite && (
                    <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
                      <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="text-blue-400 font-medium">Role without invite permission</p>
                        <p className="text-blue-300/70 text-xs mt-0.5">
                          Users who redeem this code will not be able to send invitations to others.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Access Scope Preview */}
              {presenceId && presenceRole && (
                <div className="mt-4 p-3 bg-sidebar rounded-xl border border-card-border">
                  <p className="text-xs text-muted mb-1">Access Scope</p>
                  <p className="text-sm text-white font-medium">
                    {contexts.find((c) => c.id === presenceId)?.name}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Full access to all gatherings and content within this context as {contextRoles.find((r) => r.id === presenceRole)?.name}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Market Selection - Only shown when market access type is selected */}
          {accessType === 'market' && (
            <Card className="p-4 sm:p-6 overflow-visible">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Gavel size={18} className="text-accent" />
                Select Market
              </h3>

              {loadingMarkets ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                  <span className="ml-2 text-muted text-sm">Loading markets...</span>
                </div>
              ) : (
                <CustomDropdown
                  label="Market"
                  required
                  value={marketId}
                  onChange={setMarketId}
                  options={markets}
                  placeholder="Select a market..."
                  emptyMessage="No markets available. You must be a market sponsor to create market codes."
                  error={validationErrors.market}
                />
              )}

              {/* Market Role Selection */}
              {marketId && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-white/70 mb-1.5">
                    Role <span className="text-red-400">*</span>
                  </label>
                  <div className="space-y-2">
                    {([
                      { value: 'member' as const, label: 'Member', description: 'Can vote on proposals (trade pass/fail)' },
                      { value: 'admin' as const, label: 'Admin', description: 'Full access — create proposals, manage electors, treasury' },
                    ]).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMarketRole(option.value)}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          marketRole === option.value
                            ? 'border-accent bg-accent/10'
                            : 'border-card-border hover:border-white/20 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`font-medium text-sm ${
                              marketRole === option.value ? 'text-white' : 'text-white/80'
                            }`}
                          >
                            {option.label}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              marketRole === option.value
                                ? 'border-accent bg-accent'
                                : 'border-white/30'
                            }`}
                          >
                            {marketRole === option.value && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Access Scope Preview */}
              {marketId && (
                <div className="mt-4 p-3 bg-sidebar rounded-xl border border-card-border">
                  <p className="text-xs text-muted mb-1">Access Scope</p>
                  <p className="text-sm text-white font-medium">
                    {markets.find((m) => m.id === marketId)?.name}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {marketRole === 'admin'
                      ? 'Full access — create proposals, manage electors, treasury, and vote'
                      : 'Can view market activity and vote on proposals'}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Role & Code Expiry Row */}
          {/* <div className="grid grid-cols-2 gap-6"> */}
           <div className="grid grid-cols-1 gap-6">
            {/* Role Selection */}
            {/* <Card className="p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Shield size={16} className="text-accent" />
                Role
              </h3>
              <p className="text-white/40 text-xs mb-3">
                Define the recipient&apos;s permissions
              </p>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      role === option.value
                        ? option.value === 'member'
                          ? 'border-accent bg-accent/10'
                          : 'border-white/30 bg-white/[0.08]'
                        : 'border-card-border hover:border-white/20 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-medium text-sm ${
                          role === option.value ? 'text-white' : 'text-white/80'
                        }`}
                      >
                        {option.label}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          role === option.value
                            ? 'border-accent bg-accent'
                            : 'border-white/30'
                        }`}
                      >
                        {role === option.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted">{option.description}</p>
                  </button>
                ))}
              </div>
            </Card> */}

            {/* Expiry Selection */}
            <Card className="!bg-transparent !border-0 !p-0">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Clock size={16} className="text-accent" />
                Code Expiry
              </h3>
              <p className="text-white/40 text-xs mb-3">
                When should this invitation code expire?
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {EXPIRY_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setExpiryPreset(preset.hours)
                      if (preset.hours !== null) setCustomExpiry('')
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      expiryPreset === preset.hours
                        ? 'bg-accent text-white'
                        : 'bg-input text-white/70 hover:text-white hover:bg-white/[0.1] border border-card-border'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {expiryPreset === null && (
                <input
                  type="datetime-local"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className={`w-full bg-input border rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors ${
                    validationErrors.expiry && !customExpiry
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-card-border focus:border-accent/50'
                  }`}
                />
              )}
              {validationErrors.expiry && expiryPreset === null && !customExpiry && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <Info size={12} />
                  {validationErrors.expiry}
                </p>
              )}
              {expiryPreset !== null && expiryPreset === -1 && (
                <p className="text-xs text-muted">
                  Code <span className="text-green-400">never expires</span>
                </p>
              )}
              {expiryPreset !== null && expiryPreset > 0 && (
                <p className="text-xs text-muted">
                  Code will expire on{' '}
                  <span className="text-white">
                    {new Date(
                      Date.now() + expiryPreset * 60 * 60 * 1000
                    ).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
              )}
            </Card>
          </div>

          {/* Price & Discount Row — commented out
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <DollarSign size={16} className="text-accent" />
                Price
              </h3>
              <p className="text-white/40 text-xs mb-3">
                Set the price for this invitation (optional)
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-input border border-card-border rounded-sm pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-muted"
                />
              </div>
              {price && parseFloat(price) > 0 && (
                <p className="text-xs text-muted mt-2">
                  Recipient will be charged <span className="text-white">${parseFloat(price).toFixed(2)}</span>
                </p>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Percent size={16} className="text-accent" />
                Discount
              </h3>
              <p className="text-white/40 text-xs mb-3">
                Apply a discount to this code (optional)
              </p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-input border border-card-border rounded-sm pl-4 pr-8 py-3 text-white text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-muted"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">%</span>
              </div>
              {discount && parseFloat(discount) > 0 && (
                <p className="text-xs text-muted mt-2">
                  Recipient will receive <span className="text-white">{parseFloat(discount).toFixed(0)}% off</span>
                </p>
              )}
            </Card>
          </div>
          */}

          {/* Footer — Cancel (left) / Create (right), like the reference wiz-foot */}
          <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-card-border">
            <Link
              href="/codes"
              className="bg-card border border-card-border hover:border-white/[0.22] text-white font-bold text-[0.92rem] px-5 py-[0.7rem] rounded-xs transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !canSubmit()}
              className="bg-accent hover:bg-accent-hover text-[#09073A] font-bold text-[0.92rem] px-5 py-[0.7rem] rounded-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Spinner size="sm" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Create Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      </>
      )}
    </div>
  )
}
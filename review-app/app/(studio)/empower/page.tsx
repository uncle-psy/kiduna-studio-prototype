'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { useAuth } from '@/lib/auth-context'
import { verifyToolCredentials, saveToolConfig, listSavedTools, removeSavedTool, type SavedTool } from '@/lib/tools-api'
import { listAgents } from '@/lib/agents-api'
import type { Presence } from '@/lib/agent-types'
import { SITE_TEMPLATES } from '@/lib/site-templates'

// ─── Tool Definitions ────────────────────────────────────────────────────────

type ToolDef = {
  id: string; name: string; icon: string; description: string
  authType: string; multiAccount: boolean; color: string
}

const TOOLS: ToolDef[] = [
  { id: 'bluesky',  name: 'Bluesky',  icon: 'simple-icons:bluesky',  description: 'Post, reply, and engage on Bluesky',                    authType: 'app_password',    multiAccount: true,  color: '#38bdf8' },
  { id: 'google',   name: 'Google',   icon: 'simple-icons:google',   description: 'Gmail, Calendar, Drive, and Meet',                      authType: 'oauth2',          multiAccount: true,  color: '#34d399' },
  { id: 'telegram', name: 'Telegram', icon: 'simple-icons:telegram', description: 'Send messages and manage Telegram bots',                 authType: 'bot_token',       multiAccount: true,  color: '#60a5fa' },
  { id: 'solana',   name: 'Solana',   icon: 'simple-icons:solana',   description: 'On-chain interactions and treasury',                     authType: 'wallet',          multiAccount: false, color: '#a78bfa' },
  { id: 'payload',  name: 'Payload',  icon: 'lucide:globe',          description: 'Build AI-powered websites on kiduna.studio',            authType: 'payload_provision', multiAccount: true, color: '#6366f1' },
]

const TOOL_INSTRUCTIONS: Record<string, string> = {
  bluesky:  '1. Go to Bluesky → Settings → App Passwords\n2. Click "Add App Password"\n3. Name it "Kinship Agent"\n4. Copy the generated password',
  google:   'Click "Sign in with Google" to authorize access via OAuth',
  telegram: '1. Open Telegram and search for @BotFather\n2. Send /newbot and follow instructions\n3. Copy the Bot Token provided',
  solana:   '1. Get an RPC URL from Helius, QuickNode, or Alchemy\n2. Paste the full URL below (including API key)',
  payload:  'Choose a name for your website. Your site will be available at kiduna.studio/sites/[name] and managed by your AI agent.',
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border"
      style={type === 'success'
        ? { background: 'rgba(0,235,117,0.15)', borderColor: 'rgba(0,235,117,0.3)', color: '#00EB75' }
        : { background: 'rgba(255,58,58,0.15)', borderColor: 'rgba(255,58,58,0.3)', color: '#FF3A3A' }}>
      <Icon icon={type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={20} height={20} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 cursor-pointer"><Icon icon="lucide:x" width={16} height={16} /></button>
    </div>
  )
}

// ─── Add Account Modal ──────────────────────────────────────────────────────

function AddAccountModal({
  tool, existingHandles, onClose, onConnect,
}: {
  tool: ToolDef
  existingHandles: string[]
  onClose: () => void
  onConnect: (toolId: string, connectedAs: string, credentials?: Record<string, string> | null) => Promise<void>
}) {
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blueskyHandle, setBlueskyHandle] = useState('')
  const [blueskyAppPassword, setBlueskyAppPassword] = useState('')
  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [solanaRpcUrl, setSolanaRpcUrl] = useState('')
  const [payloadSlug, setPayloadSlug] = useState('')
  const [payloadTemplate, setPayloadTemplate] = useState('website')
  const [oauthPopup, setOauthPopup] = useState<Window | null>(null)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'oauth_success' && event.data?.provider === tool.id) {
        const { credentials, displayName } = event.data
        const email = credentials?.email || displayName || 'Connected'
        if (existingHandles.includes(email)) { setError('This account has already been added.'); setVerifying(false); setOauthPopup(null); return }
        setVerifying(false); setOauthPopup(null)
        onConnect(tool.id, email, { ...credentials, external_handle: email })
        onClose()
      } else if (event.data?.type === 'oauth_error' && event.data?.provider === tool.id) {
        setError(event.data.error || 'OAuth failed'); setVerifying(false); setOauthPopup(null)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [tool.id, onConnect, onClose, existingHandles])

  useEffect(() => {
    if (!oauthPopup) return
    const check = setInterval(() => { if (oauthPopup.closed) { setVerifying(false); setOauthPopup(null); clearInterval(check) } }, 500)
    return () => clearInterval(check)
  }, [oauthPopup])

  function handleGoogleOAuth() {
    setVerifying(true); setError(null)
    const backendUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
    const w = 500, h = 600, left = window.screenX + (window.outerWidth - w) / 2, top = window.screenY + (window.outerHeight - h) / 2
    const popup = window.open(`${backendUrl}/api/oauth/google/init?popup=true`, 'google_oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`)
    if (popup) { setOauthPopup(popup); popup.focus() } else { setError('Popup blocked. Please allow popups.'); setVerifying(false) }
  }

  async function handleVerify() {
    setVerifying(true); setError(null)
    try {
      if (tool.id === 'bluesky') {
        if (!blueskyHandle.trim() || !blueskyAppPassword.trim()) { setError('Please enter both handle and app password'); setVerifying(false); return }
        const cleanHandle = blueskyHandle.trim().replace(/[\u200B-\u200D\u202A-\u202E\uFEFF\u00AD\u2060\u2069@]/g, '')
        const normalizedHandle = cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`
        if (existingHandles.includes(normalizedHandle) || existingHandles.includes(cleanHandle)) { setError('This account has already been added.'); setVerifying(false); return }
        const result = await verifyToolCredentials('bluesky', { handle: cleanHandle, app_password: blueskyAppPassword.trim() })
        if (!result.success) { setError(result.error || 'Invalid credentials'); setVerifying(false); return }
        await onConnect(tool.id, result.externalHandle || `@${cleanHandle}`, { ...(result.credentials || { handle: cleanHandle, app_password: blueskyAppPassword.trim() }), external_handle: result.externalHandle || cleanHandle, external_user_id: result.externalUserId || '' })
        onClose()
      } else if (tool.id === 'telegram') {
        if (!telegramBotToken.trim()) { setError('Please enter the bot token'); setVerifying(false); return }
        const result = await verifyToolCredentials('telegram', { bot_token: telegramBotToken.trim() })
        if (!result.success) { setError(result.error || 'Invalid bot token'); setVerifying(false); return }
        const handle = result.externalHandle || `Bot: ${telegramBotToken.slice(0, 8)}…`
        if (existingHandles.includes(handle)) { setError('This account has already been added.'); setVerifying(false); return }
        await onConnect(tool.id, handle, { ...(result.credentials || { bot_token: telegramBotToken.trim() }), external_handle: result.externalHandle || '', external_user_id: result.externalUserId || '' })
        onClose()
      } else if (tool.id === 'solana') {
        if (!solanaRpcUrl.trim()) { setError('Please enter an RPC URL'); setVerifying(false); return }
        try { new URL(solanaRpcUrl.trim()) } catch { setError('Please enter a valid URL'); setVerifying(false); return }
        const result = await verifyToolCredentials('solana', { rpc_url: solanaRpcUrl.trim() })
        if (!result.success) { setError(result.error || 'Could not connect'); setVerifying(false); return }
        await onConnect(tool.id, solanaRpcUrl.trim(), { ...(result.credentials || { rpc_url: solanaRpcUrl.trim() }), external_handle: solanaRpcUrl.trim() })
        onClose()
      } else if (tool.id === 'payload') {
        const slug = payloadSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
        if (!slug || slug.length < 3) { setError('Site name must be at least 3 characters (letters, numbers, hyphens)'); setVerifying(false); return }
        if (slug.length > 30) { setError('Site name must be 30 characters or less'); setVerifying(false); return }
        const authToken = localStorage.getItem('token')
        const res = await fetch('/api/payload/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ slug, template: payloadTemplate }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Failed to create site'); setVerifying(false); return }
        // The provisioning route saves the tool account (with the MCP API key) itself.
        // We only call onConnect here to refresh the UI — credentials are already stored.
        if (data.tool_account_id) {
          // Site was registered by the backend — just refresh the list
          await onConnect(tool.id, slug, null)
        }
        onClose()
      } else if (tool.id === 'google') { handleGoogleOAuth(); return }
    } catch (err) { setError(err instanceof Error ? err.message : 'Connection failed') }
    finally { if (tool.id !== 'google') setVerifying(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ background: '#0E0C3A', borderColor: `${tool.color}30`,maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${tool.color}15` }}>
              <Icon icon={tool.icon} width={20} height={20} style={{ color: tool.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add {tool.name} Account</h2>
              <p className="text-xs text-muted">{tool.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors cursor-pointer"><Icon icon="lucide:x" width={20} height={20} /></button>
        </div>
        <div className="p-5">
          {TOOL_INSTRUCTIONS[tool.id] && (
            <div className="rounded-xl p-3 mb-5" style={{ background: `${tool.color}08`, border: `1px solid ${tool.color}20` }}>
              <p className="text-[11px] font-medium flex items-center gap-1.5 mb-1.5" style={{ color: tool.color }}>
                <Icon icon="lucide:info" width={12} height={12} />How to get credentials
              </p>
              <p className="text-xs text-muted whitespace-pre-line">{TOOL_INSTRUCTIONS[tool.id]}</p>
            </div>
          )}
          {tool.id === 'bluesky' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Handle</label>
                <input type="text" value={blueskyHandle} onChange={e => setBlueskyHandle(e.target.value.slice(0, 253))} placeholder="username.bsky.social" className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">App Password</label>
                <input type="password" value={blueskyAppPassword} onChange={e => setBlueskyAppPassword(e.target.value.slice(0, 19))} placeholder="xxxx-xxxx-xxxx-xxxx" className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono text-sm" />
              </div>
            </div>
          )}
          {tool.id === 'telegram' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Bot Token</label>
              <input type="password" value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value.slice(0, 100))} placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ" className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono text-sm" />
            </div>
          )}
          {tool.id === 'solana' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">RPC URL</label>
              <input type="text" value={solanaRpcUrl} onChange={e => setSolanaRpcUrl(e.target.value.slice(0, 300))} placeholder="https://mainnet.helius-rpc.com/?api-key=..." className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono text-sm" />
            </div>
          )}
          {tool.id === 'payload' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Site Name</label>
                <div className="flex items-center bg-input border border-card-border rounded-xl overflow-hidden focus-within:border-indigo-500/50">
                  <input
                    type="text"
                    value={payloadSlug}
                    onChange={e => setPayloadSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))}
                    placeholder="marketing"
                    className="flex-1 bg-transparent px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none text-sm font-mono"
                  />
                  <span className="px-3 text-xs text-muted shrink-0">.kiduna.studio/sites/</span>
                </div>
                <p className="text-[11px] text-muted mt-1.5">Letters, numbers, and hyphens only · 3–30 characters</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Template</label>
                <div className="grid grid-cols-2 gap-2">
                  {SITE_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setPayloadTemplate(tpl.id)}
                      className="text-left p-3 rounded-xl border transition-all cursor-pointer"
                      style={{
                        background: payloadTemplate === tpl.id ? `${tpl.color}12` : 'rgba(255,255,255,0.03)',
                        borderColor: payloadTemplate === tpl.id ? `${tpl.color}60` : 'rgba(255,255,255,0.08)',
                        boxShadow: payloadTemplate === tpl.id ? `0 0 0 1px ${tpl.color}30` : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize: 16 }}>{tpl.emoji}</span>
                        <span className="text-xs font-bold text-white/90">{tpl.name}</span>
                        {payloadTemplate === tpl.id && (
                          <span className="ml-auto w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0" style={{ background: tpl.color }}>
                            <Icon icon="lucide:check" width={9} height={9} style={{ color: '#fff' }} />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed">{tpl.tagline}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <p className="text-xs text-indigo-300/80">Your site will be provisioned automatically with starter pages, a blog, and navigation. Your AI agent can update it anytime.</p>
              </div>
            </div>
          )}
          {tool.id === 'google' && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-2">
                <Icon icon="logos:google-icon" width={24} height={24} />
              </div>
              <p className="text-sm text-foreground mb-0.5">Sign in with your Google account</p>
              <p className="text-xs text-muted">Gmail, Calendar, and Drive</p>
              {verifying && <p className="text-xs text-muted mt-2 flex items-center justify-center gap-1.5"><Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />Waiting for authorization...</p>}
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400 flex items-center gap-2"><Icon icon="lucide:alert-circle" width={14} height={14} />{error}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button onClick={onClose} className="px-4 py-2 text-foreground hover:text-white transition-colors text-sm cursor-pointer">Cancel</button>
          <button onClick={handleVerify} disabled={verifying}
            className="disabled:opacity-50 disabled:cursor-not-allowed text-[#09073A] font-bold text-sm px-5 py-2.5 rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer"
            style={{ background: tool.color }}>
            {verifying
              ? <><Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" />{tool.id === 'google' ? 'Authorizing...' : tool.id === 'payload' ? 'Creating site...' : 'Verifying...'}</>
              : tool.id === 'google' ? <><Icon icon="logos:google-icon" width={16} height={16} />Sign in with Google</>
              : tool.id === 'payload' ? <><Icon icon="lucide:globe" width={16} height={16} />Create Website</>
              : <><Icon icon="lucide:plus" width={16} height={16} />Add Account</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function EmpowerPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('return')
  const [accounts, setAccounts] = useState<SavedTool[]>([])
  const [agents, setAgents] = useState<Presence[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTool, setExpandedTool] = useState<string | null>(null)
  const [addingTool, setAddingTool] = useState<ToolDef | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; toolName: string; handle: string } | null>(null)
  const [removing, setRemoving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadAccounts = useCallback(async () => {
    if (!user?.wallet) return
    setLoading(true)
    try {
      const API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
      const [savedTools, agentResult, bskyRes, execRes] = await Promise.all([
        listSavedTools(user.wallet),
        listAgents({ wallet: user.wallet, includeWorkers: true }),
        fetch(`${API}/api/agents/predefined/bluesky/accounts?wallet=${encodeURIComponent(user.wallet)}`).then(r => r.ok ? r.json() : { accounts: [] }).catch(() => ({ accounts: [] })),
        fetch(`${API}/api/agents/predefined/executive-avatar/accounts?wallet=${encodeURIComponent(user.wallet)}`).then(r => r.ok ? r.json() : { accounts: [] }).catch(() => ({ accounts: [] })),
      ])
      setAccounts(savedTools)
      // Merge template presence names into agents list for "Used by" resolution
      const templatePresences = [
        ...((bskyRes.accounts || []) as any[]).map((a: any) => ({ id: a.presence_id || a.presenceId, name: a.name, type: 'presence', bluesky_handle: a.bluesky_handle || a.blueskyHandle || '' } as unknown as Presence)),
        ...((execRes.accounts || []) as any[]).map((a: any) => ({ id: a.presence_id || a.presenceId, name: a.name, type: 'presence' } as unknown as Presence)),
      ]
      setAgents([...(agentResult.agents || []), ...templatePresences])
    } catch { }
    setLoading(false)
  }, [user?.wallet])

  useEffect(() => { loadAccounts() }, [loadAccounts])
  useEffect(() => { const h = () => loadAccounts(); window.addEventListener('focus', h); return () => window.removeEventListener('focus', h) }, [loadAccounts])

  // Group accounts by tool
  const grouped: Record<string, SavedTool[]> = {}
  for (const a of accounts) { if (!grouped[a.toolName]) grouped[a.toolName] = []; grouped[a.toolName].push(a) }

  // Build lookup: account ID → agents using it
  // For workers with a parent, show the parent avatar name instead
  const accountAgents: Record<string, { name: string; type: string }[]> = {}
  for (const agent of agents) {
    const agentTools = (agent as any).tools || []
    for (const toolId of agentTools) {
      if (!accountAgents[toolId]) accountAgents[toolId] = []
      if ((agent.type || '').toLowerCase() === 'worker') {
        const parentId = (agent as any).parentId || (agent as any).parent_id || ((agent as any).parentIds || (agent as any).parent_ids || [])[0]
        const parent = parentId ? agents.find(a => a.id === parentId && (a.type || '').toLowerCase() === 'presence') : null
        accountAgents[toolId].push({
          name: parent ? parent.name : (agent.name || agent.handle || 'Unnamed'),
          type: parent ? 'Avatar' : 'Performer',
        })
      } else {
        accountAgents[toolId].push({
          name: agent.name || agent.handle || 'Unnamed',
          type: 'Avatar',
        })
      }
    }
  }

  // Match template avatars by handle (template workers are filtered by backend,
  // so we match SavedTool.externalHandle → predefined account bluesky_handle)
  for (const acct of accounts) {
    if (accountAgents[acct.id]?.length > 0) continue  // already matched via agent.tools
    const handle = (acct.externalHandle || '').replace(/^@+/, '').toLowerCase()
    if (!handle) continue
    const matchedTemplate = agents.find((a: any) =>
      a.type === 'presence' && ((a as any).bluesky_handle || '').replace(/^@+/, '').toLowerCase() === handle
    )
    if (matchedTemplate) {
      accountAgents[acct.id] = [{ name: matchedTemplate.name, type: 'Avatar' }]
    }
  }

  async function handleConnect(toolId: string, connectedAs: string, credentials?: Record<string, string> | null) {
    if (!user?.wallet) throw new Error('Not authenticated')
    // null credentials = backend already saved the account (e.g. Payload provisioning)
    if (credentials !== null) {
      const result = await saveToolConfig(user.wallet, toolId, credentials || {})
      if (!result.success) throw new Error(result.error || 'Failed to save')
    }
    if (toolId === 'google' && credentials) {
      const email = credentials?.email || connectedAs
      if (email && email !== 'Connected') try { localStorage.setItem('kinship_google_drive', JSON.stringify({ email, name: credentials?.name || '', connectedAt: Date.now() })) } catch {}
    }
    await loadAccounts()
    setToast({ message: `${connectedAs} added`, type: 'success' })
    setAddingTool(null)
  }

  const [avatarWarning, setAvatarWarning] = useState<{ id: string; toolName: string; avatars: string[] } | null>(null)

  async function handleRemove(forceDelete = false) {
    if (!removeConfirm || !user?.wallet) return
    setRemoving(true)
    try {
      const result = await removeSavedTool(user.wallet, removeConfirm.id, forceDelete)
      if (!result.success && result.connectedAvatars && result.connectedAvatars.length > 0) {
        // Account is connected to avatars — show warning
        setAvatarWarning({ id: removeConfirm.id, toolName: removeConfirm.toolName, avatars: result.connectedAvatars })
        setRemoving(false)
        return
      }
      if (removeConfirm.toolName === 'google') try { localStorage.removeItem('kinship_google_drive') } catch {}
      await loadAccounts()
      setToast({ message: `Account removed`, type: 'success' })
    } catch { setToast({ message: 'Failed to remove account', type: 'error' }) }
    setRemoving(false); setRemoveConfirm(null); setAvatarWarning(null)
  }

  return (
    <div className="max-w-full overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {returnTo && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-accent/25 bg-accent/5">
          <p className="text-sm text-white/80">After connecting an account, return to finish your performer setup.</p>
          <Link
            href={returnTo}
            className="shrink-0 text-sm font-semibold text-accent hover:underline"
          >
            ← Back to performer
          </Link>
        </div>
      )}

      <div className="mb-6">
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#03CCD9', marginBottom: 6 }}>
          Building mode · Step 3
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Empower</h1>
        <p className="text-muted text-sm mt-1">Connect accounts once. Assign them to any avatar or performer.</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <style>{`@keyframes ep-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{ background: '#0D0F2E', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                animation: 'ep-shimmer 1.4s ease-in-out infinite',
                zIndex: 1,
              }} />
              <div className="flex items-center gap-4 px-5 py-4">
                {/* tool icon */}
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* tool name */}
                  <div style={{ height: 16, width: '22%', borderRadius: 6, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }} />
                  {/* description */}
                  <div style={{ height: 13, width: '55%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                </div>
                {/* chevron */}
                <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {TOOLS.map((tool) => {
            const toolAccounts = grouped[tool.id] || []
            const isExpanded = expandedTool === tool.id
            const canAdd = tool.multiAccount || toolAccounts.length === 0

            return (
              <div
                key={tool.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: '#0D0F2E',
                  border: isExpanded ? `1px solid ${tool.color}35` : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {/* Tool header */}
                <button
                  type="button"
                  onClick={() => setExpandedTool(isExpanded ? null : tool.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.015] transition-colors cursor-pointer bg-transparent border-0 text-left"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${tool.color}10`, border: `1px solid ${tool.color}18` }}
                  >
                    <Icon icon={tool.icon} width={22} height={22} style={{ color: tool.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-base font-bold">{tool.name}</p>
                      {toolAccounts.length > 0 && (
                        <span
                          className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: `${tool.color}20`, color: tool.color }}
                        >
                          {toolAccounts.length}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-0.5">{tool.description}</p>
                  </div>
                  <Icon
                    icon={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                    width={18} height={18}
                    className="text-muted/50 shrink-0"
                  />
                </button>

                {/* Expanded: accounts list */}
                {isExpanded && (
                  <div className="px-5 pb-4" style={{ borderTop: `1px solid ${tool.color}12` }}>
                    {toolAccounts.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-sm text-muted mb-3">No accounts connected</p>
                        <button
                          onClick={() => setAddingTool(tool)}
                          className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                          style={{ background: `${tool.color}12`, color: tool.color, border: `1px solid ${tool.color}22` }}
                        >
                          <Icon icon="lucide:plus" width={14} height={14} className="inline mr-1.5 -mt-0.5" />
                          Add Account
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mt-3 space-y-2">
                          {toolAccounts.map((acct) => {
                            const usedBy = accountAgents[acct.id] || []
                            return (
                              <div
                                key={acct.id}
                                className="rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                              >
                                <div className="flex items-center gap-3 px-4 py-2.5">
                                  <Icon icon={tool.id === 'payload' ? 'lucide:globe' : 'lucide:check-circle'} width={16} height={16} style={{ color: tool.color }} className="shrink-0" />
                                  <span className="text-sm text-white/80 flex-1 truncate font-mono">
                                    {tool.id === 'payload'
                                      ? `kiduna.studio/sites/${acct.externalHandle || ''}`
                                      : (acct.externalHandle || 'Connected')}
                                  </span>
                                  {tool.id === 'payload' && acct.externalHandle && (
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                      <a
                                        href={`/sites/${acct.externalHandle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-400/60 hover:text-indigo-400 transition-colors shrink-0 p-1"
                                        title="Open live site"
                                      >
                                        <Icon icon="lucide:external-link" width={14} height={14} />
                                      </a>
                                      <a
                                        href="/admin"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-400/60 hover:text-indigo-400 transition-colors shrink-0 p-1"
                                        title="Open CMS — upload images, change fonts, edit content"
                                      >
                                        <Icon icon="lucide:layout-dashboard" width={14} height={14} />
                                      </a>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => setRemoveConfirm({ id: acct.id, toolName: tool.name, handle: acct.externalHandle || 'this account' })}
                                    className="text-red-400/40 hover:text-red-400 transition-colors shrink-0 cursor-pointer p-1"
                                    title="Remove"
                                  >
                                    <Icon icon="lucide:trash-2" width={15} height={15} />
                                  </button>
                                </div>
                                {usedBy.length > 0 && (() => {
                                  const avatars = usedBy.filter(a => a.type === 'Avatar')
                                  const performers = usedBy.filter(a => a.type === 'Performer')
                                  return (
                                    <div className="px-4 pb-3 pt-0.5">
                                      <div className="ml-[28px] px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.015)' }}>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted/50 mb-1.5">Used by</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                          {avatars.map((a, i) => (
                                            <span key={`a${i}`} className="text-xs text-white/70">
                                              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: '#EAAA00', verticalAlign: 'middle' }} />
                                              {a.name}
                                            </span>
                                          ))}
                                          {performers.map((a, i) => (
                                            <span key={`p${i}`} className="text-xs text-white/70">
                                              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: '#60a5fa', verticalAlign: 'middle' }} />
                                              {a.name}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="flex gap-3 mt-1.5">
                                          {avatars.length > 0 && (
                                            <span className="text-[9px] text-muted/40 flex items-center gap-1">
                                              <span className="inline-block w-1 h-1 rounded-full" style={{ background: '#EAAA00' }} />
                                              Avatar
                                            </span>
                                          )}
                                          {performers.length > 0 && (
                                            <span className="text-[9px] text-muted/40 flex items-center gap-1">
                                              <span className="inline-block w-1 h-1 rounded-full" style={{ background: '#60a5fa' }} />
                                              Performer
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            )
                          })}
                        </div>
                        {canAdd && (
                          <button
                            onClick={() => setAddingTool(tool)}
                            className="mt-3 w-full text-sm font-semibold py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            style={{ background: `${tool.color}08`, color: `${tool.color}cc`, border: `1px solid ${tool.color}15` }}
                          >
                            <Icon icon="lucide:plus" width={14} height={14} />
                            Add Account
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Remove Confirmation */}
      {removeConfirm && !avatarWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !removing && setRemoveConfirm(null)} />
          <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-red-500/12 flex items-center justify-center">
                <Icon icon="lucide:unlink" width={22} height={22} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Account</h3>
                <p className="text-xs text-muted truncate max-w-[200px]">{removeConfirm.handle}</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-6">
              This will remove the account from your global tool pool. Any agent using this tool will lose access until you reconnect.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRemoveConfirm(null)} disabled={removing} className="flex-1 py-2.5 rounded-xl border border-card-border text-muted text-sm font-semibold hover:bg-white/[0.04] transition-colors disabled:opacity-50 cursor-pointer">Cancel</button>
              <button onClick={() => handleRemove(false)} disabled={removing} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {removing ? <><Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />Removing...</> : <><Icon icon="lucide:trash-2" width={14} height={14} />Remove</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Connected Warning Dialog */}
      {avatarWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !removing && (setAvatarWarning(null), setRemoveConfirm(null))} />
          <div className="relative bg-card border border-amber-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/12 flex items-center justify-center">
                <Icon icon="lucide:alert-triangle" width={22} height={22} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Account Connected to Avatars</h3>
              </div>
            </div>
            <p className="text-sm text-muted mb-3">
              This account is currently used by:
            </p>
            <div className="space-y-1.5 mb-4">
              {avatarWarning.avatars.map((name, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
                  <Icon icon="simple-icons:bluesky" width={14} height={14} style={{ color: '#0085FF' }} />
                  <span className="text-sm text-white font-medium">{name}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-400/70 mb-5">
              Removing this account will disconnect these avatars. Their automations will stop working until you reconnect an account.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setAvatarWarning(null); setRemoveConfirm(null) }} disabled={removing} className="flex-1 py-2.5 rounded-xl border border-card-border text-muted text-sm font-semibold hover:bg-white/[0.04] transition-colors disabled:opacity-50 cursor-pointer">Keep Account</button>
              <button onClick={() => handleRemove(true)} disabled={removing} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {removing ? <><Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />Removing...</> : <><Icon icon="lucide:trash-2" width={14} height={14} />Remove Anyway</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {addingTool && (
        <AddAccountModal
          tool={addingTool}
          existingHandles={(grouped[addingTool.id] || []).map(a => a.externalHandle || '').filter(Boolean)}
          onClose={() => setAddingTool(null)}
          onConnect={handleConnect}
        />
      )}
    </div>
  )
}
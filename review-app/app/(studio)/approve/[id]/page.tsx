'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

function relativeTime(iso: string): string {
  let ts = iso
  if (!ts.endsWith("Z") && !ts.includes("+")) ts += "Z"
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 0) return 'just now'
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ApproveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editedAction, setEditedAction] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [customResponse, setCustomResponse] = useState('')
  const [executing, setExecuting] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/approvals/${id}`)
        if (res.ok) {
          const data = await res.json()
          const apr = data.approval
          setRequest(apr)
          setEditedAction(apr?.proposedAction || '')
          // Pre-fill with AI-generated draft response
          if (apr?.proposedAction) {
            const pa = apr.proposedAction
            const status = (apr.status || '').toLowerCase()
            // If it looks like an actual draft (not a generic description), pre-fill it
            const isGenericDescription = pa.startsWith('Your agent will') || pa.startsWith('1. READ')
            if (!isGenericDescription && status === 'pending') {
              setCustomResponse(pa)
            }
          }
        }
      } catch (e) { console.error('Failed to load approval:', e) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  async function handleApprove() {
    setExecuting(true)
    try {
      const body: any = {}
      // For Bluesky: send custom response if user typed one
      if (customResponse.trim()) {
        body.editedAction = customResponse.trim()
      } else if (isEditing && editedAction !== request.proposedAction) {
        body.editedAction = editedAction
      }
      const res = await fetch(`${API}/api/approvals/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setRequest(data.approval)
        setIsEditing(false)
      }
    } catch (e) { console.error('Failed to approve:', e) }
    finally { setExecuting(false) }
  }

  async function handleReject() {
    setRejecting(true)
    try {
      const res = await fetch(`${API}/api/approvals/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        setRequest(data.approval)
      }
    } catch (e) { console.error('Failed to reject:', e) }
    finally { setRejecting(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px] text-muted text-sm">Loading...</div>
  }
  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="text-muted text-sm">Approval request not found</div>
        <button onClick={() => router.push('/approve')} className="text-accent text-sm hover:underline">Back to approvals</button>
      </div>
    )
  }

  const isPending = request.status === 'pending'
  const statusCfg = request.status === 'approved'
    ? { bg: 'bg-success/10', text: 'text-success', label: '✓ Approved' }
    : request.status === 'rejected'
    ? { bg: 'bg-error/10', text: 'text-error', label: '✗ Rejected' }
    : { bg: 'bg-warning/10', text: 'text-warning', label: '● Pending' }

  const triggerData = request.triggerData || {}
  const sender = triggerData.from || ''
  const subject = triggerData.subject || ''
  const snippet = triggerData.snippet || ''
  const matchReason = triggerData.match_reason || ''
  const bskyEvent = triggerData.bluesky_event || null
  const isBluesky = request.source === 'jetstream' || request.source === 'jetstream_dm' || !!bskyEvent

  // Tool-only skills don't need a text response editor — just a confirm/reject
  const TOOL_ONLY_SKILLS = new Set([
    'Like Mentions',
    'Like Replies',
    'Follow Back New Followers',
  ])
  const isToolOnly = TOOL_ONLY_SKILLS.has(request.skillName || '')

  // Friendly action descriptions for tool-only skills
  const TOOL_ACTION_LABELS: Record<string, { icon: string; verb: string; past: string }> = {
    'Like Mentions': { icon: '❤️', verb: 'Like this post', past: 'Post liked' },
    'Like Replies': { icon: '❤️', verb: 'Like this reply', past: 'Reply liked' },
    'Follow Back New Followers': { icon: '👤', verb: 'Follow back this user', past: 'User followed' },
  }
  const toolAction = TOOL_ACTION_LABELS[request.skillName || '']

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-start gap-3.5 mb-6">
        <button onClick={() => router.push('/approve')}
          className="w-9 h-9 rounded-[10px] bg-white/[0.04] border border-card-border flex items-center justify-center text-muted hover:bg-white/[0.08] hover:text-foreground transition-all shrink-0 mt-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight leading-snug break-words">{request.summary}</h1>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-[10px] font-extrabold tracking-wide px-2.5 py-0.5 rounded ${statusCfg.bg} ${statusCfg.text}`}>
              {statusCfg.label}
            </span>
            <span className="text-[10px] font-extrabold tracking-wide px-2.5 py-0.5 rounded bg-white/[0.05] text-muted">
              {request.source?.toUpperCase()}
            </span>
            <span className="text-[10px] font-extrabold tracking-wide px-2.5 py-0.5 rounded bg-white/[0.05] text-muted">
              {request.skillName}
            </span>
            <span className="text-[11px] text-muted ml-2">{relativeTime(request.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Payload preview banner */}
      {request.previewUrl && (
        <div className="mb-5 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Payload Website Draft</span>
            </div>
            <p className="text-sm text-white/70">
              Agent created a draft on <span className="text-white font-medium">{request.payloadSiteSlug}.kiduna.studio</span>
              {request.payloadCollection && <> · Collection: <span className="text-white font-medium">{request.payloadCollection}</span></>}.
              Review the preview before approving.
            </p>
          </div>
          <a
            href={request.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/25 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview Draft ↗
          </a>
        </div>
      )}

      {/* Two column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Left — Original Email / Trigger */}
        <div className="flex flex-col gap-4">
          {/* Incoming event card — adapts to source */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
              {isBluesky ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#0085FF]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" fill="currentColor"/></svg>
                  <span className="text-xs font-bold text-[#0085FF] uppercase tracking-wide">Bluesky {bskyEvent?.type || 'Event'}</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-info"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span className="text-xs font-bold text-info uppercase tracking-wide">Incoming Email</span>
                </>
              )}
            </div>
            <div className="p-5">
              {isBluesky && bskyEvent ? (
                <div className="space-y-3">
                  {/* Author */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#0085FF]/20 flex items-center justify-center text-[#0085FF] text-sm font-bold shrink-0">
                      {(bskyEvent.author || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">
                        {bskyEvent.author ? `@${bskyEvent.author}` : 'Bluesky user'}
                      </div>
                      <div className="text-[11px] text-muted capitalize">{bskyEvent.type}</div>
                    </div>
                  </div>
                  {/* Post content */}
                  {bskyEvent.text && (
                    <div className="bg-black/15 rounded-lg p-3.5 border border-white/[0.04]">
                      <div className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                        {bskyEvent.text}
                      </div>
                    </div>
                  )}
                  {/* What the agent will do */}
                  <div className="mt-2 pt-3 border-t border-white/[0.06]">
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wide mb-2.5">What happens on approval</div>
                    {bskyEvent.skill_action ? (() => {
                      // Split "1. ... 2. ... 3. ..." into individual steps
                      const raw = bskyEvent.skill_action as string
                      const steps = raw.split(/(?=\d+\.\s)/).map((s: string) => s.trim()).filter(Boolean)
                      if (steps.length > 1) {
                        return (
                          <div className="flex flex-col gap-2.5">
                            {steps.map((step: string, i: number) => {
                              // Remove leading "N. " prefix — we'll use our own numbering
                              const text = step.replace(/^\d+\.\s*/, '')
                              return (
                                <div key={i} className="flex gap-3 items-start">
                                  <span
                                    className="shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold mt-[1px]"
                                    style={{ background: 'rgba(234,170,0,0.12)', color: '#EAAA00', border: '1px solid rgba(234,170,0,0.25)' }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span className="text-[12.5px] text-muted/80 leading-relaxed flex-1">{text}</span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      }
                      // Fallback: not numbered — render with line breaks preserved
                      return (
                        <div className="text-[12.5px] text-muted/80 leading-relaxed whitespace-pre-wrap">
                          {raw}
                        </div>
                      )
                    })() : (
                      <div className="text-[12.5px] text-muted/60 italic">No action description available</div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {sender && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center text-info text-xs font-bold shrink-0">
                        {sender.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">{sender}</div>
                        {triggerData.to && <div className="text-[11px] text-muted">to {triggerData.to}</div>}
                      </div>
                    </div>
                  )}
                  {subject && (
                    <div className="text-[14px] font-bold text-foreground mb-2">{subject}</div>
                  )}
                  {snippet && (
                    <div className="text-[12.5px] text-muted/80 leading-relaxed whitespace-pre-wrap bg-black/15 rounded-lg p-3 border border-white/[0.04]">
                      {snippet}
                    </div>
                  )}
                  {!sender && !subject && !snippet && (
                    <div className="text-[12.5px] text-muted italic">No preview available</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Metadata card */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Details</h3>
            <div className="bg-black/15 border border-card-border rounded-[10px] overflow-hidden">
              {[
                { label: 'Source', value: isBluesky ? 'Bluesky (Jetstream)' : request.source },
                { label: 'Skill', value: request.skillName },
                !isBluesky && request.eventId ? { label: 'Event ID', value: request.eventId, mono: true } : null,
                matchReason ? { label: 'Why matched', value: matchReason, italic: true } : null,
                request.toolCall ? { label: 'Tool', value: request.toolCall, mono: true } : null,
              ].filter(Boolean).map((row: any) => (
                <div key={row.label} className="flex items-start gap-3 px-3.5 py-2.5 border-b border-white/[0.04] last:border-b-0">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-tight min-w-[80px] shrink-0">{row.label}</span>
                  <span className={`text-[12.5px] text-foreground break-all ${row.italic ? 'italic text-muted' : ''} ${row.mono ? 'font-mono text-xs' : ''}`}>
                    {row.value || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — What happens + Approve/Reject */}
        <div className="flex flex-col gap-4">

          {/* Tool-only skills: simple action card, no text editor */}
          {isToolOnly && toolAction ? (
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <span className="text-base">{toolAction.icon}</span>
                <span className="text-xs font-bold text-accent uppercase tracking-wide">Action</span>
              </div>
              <div className="p-5">
                {isPending ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-accent/[0.06] border border-accent/20 rounded-xl p-4">
                      <span className="text-2xl">{toolAction.icon}</span>
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">{toolAction.verb}</p>
                        {bskyEvent?.author && (
                          <p className="text-[12px] text-muted mt-0.5">from @{bskyEvent.author}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted/60">
                      This is a one-click action — no response text needed.
                    </p>
                  </div>
                ) : request.status === 'approved' ? (
                  <div className="bg-success/[0.08] border border-success/20 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="text-[13px] font-semibold text-success">{toolAction.past}</p>
                      {bskyEvent?.author && (
                        <p className="text-[11px] text-muted mt-0.5">@{bskyEvent.author}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/[0.08] border border-muted/20 rounded-xl p-4">
                    <p className="text-[13px] text-muted font-medium">Action declined</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
          /* Text-based skills: full draft response editor */
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBluesky ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="currentColor"/></svg>
                    <span className="text-xs font-bold text-accent uppercase tracking-wide">Agent's Draft Response</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    <span className="text-xs font-bold text-accent uppercase tracking-wide">AI Draft Reply</span>
                  </>
                )}
              </div>
              {isPending && !isEditing && !isBluesky && (
                <button onClick={() => setIsEditing(true)}
                  className="text-[11px] px-3 py-1 rounded-full bg-white/[0.04] border border-card-border text-muted hover:bg-white/[0.08] hover:text-foreground transition-all">
                  Edit before approving
                </button>
              )}
            </div>
            <div className="p-5">
              {isBluesky ? (
                <div className="space-y-4">
                  {/* AI Draft Response — show as text, editable on click */}
                  {isPending && (
                    <div>
                      {isEditing ? (
                        <>
                          <label className="text-[11px] font-bold text-muted uppercase tracking-wide block mb-2">
                            ✏️ Edit response before sending
                          </label>
                          <textarea
                            className="w-full min-h-[100px] p-3.5 bg-black/20 border-[1.5px] border-accent rounded-[10px] text-foreground text-sm leading-relaxed font-sans resize-y outline-none"
                            value={customResponse}
                            onChange={e => setCustomResponse(e.target.value)}
                            rows={4}
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => setIsEditing(false)}
                              className="text-[11px] px-3 py-1 rounded-full bg-white/[0.04] border border-card-border text-muted hover:bg-white/[0.08] transition-all"
                            >
                              Done editing
                            </button>
                          </div>
                        </>
                      ) : customResponse.trim() ? (
                        <>
                          <label className="text-[11px] font-bold text-accent uppercase tracking-wide block mb-2">
                            🤖 Agent will respond with:
                          </label>
                          <div
                            className="bg-accent/[0.08] border border-accent/20 rounded-[10px] p-4 text-[13px] text-foreground leading-relaxed cursor-pointer hover:border-accent/40 transition-all"
                            onClick={() => setIsEditing(true)}
                          >
                            {customResponse}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-[11px] text-success flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                              Click to edit before approving
                            </div>
                            <button
                              onClick={() => setCustomResponse('')}
                              className="text-[11px] px-3 py-1 rounded-full bg-white/[0.04] border border-card-border text-muted hover:bg-error/20 hover:text-error hover:border-error/30 transition-all"
                            >
                              Clear response
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <label className="text-[11px] font-bold text-muted uppercase tracking-wide block mb-2">
                            No draft response generated
                          </label>
                          <div className="bg-black/15 border border-card-border rounded-[10px] p-4 text-[13px] text-muted/60 italic">
                            Agent could not generate a response. You can write one manually or decline.
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => { setCustomResponse(''); setIsEditing(true) }}
                              className="text-[11px] px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-all"
                            >
                              ✏️ Write a response
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Show what was sent after approval */}
                  {!isPending && request.editedAction && (
                    <div className="bg-success/[0.08] border border-success/20 rounded-[10px] p-4">
                      <div className="text-[10px] font-bold text-success uppercase tracking-wide mb-1.5">Response sent</div>
                      <div className="text-[13px] text-foreground leading-relaxed">{request.editedAction}</div>
                    </div>
                  )}

                  {!isPending && !request.editedAction && (
                    <div className="bg-muted/[0.08] border border-muted/20 rounded-[10px] p-4">
                      <div className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1.5">Declined (no response sent)</div>
                    </div>
                  )}

                  {bskyEvent?.text && isPending && (
                    <div className="text-[11px] text-muted pt-2 border-t border-white/[0.06]">
                      In response to: <span className="text-foreground/70">"{bskyEvent.text.slice(0, 100)}"</span>
                    </div>
                  )}
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full min-h-[180px] p-3.5 bg-black/20 border-[1.5px] border-accent rounded-[10px] text-foreground text-sm leading-relaxed font-sans resize-y outline-none"
                  value={editedAction}
                  onChange={e => setEditedAction(e.target.value)}
                  rows={8}
                />
              ) : (
                <div className="bg-black/20 border-[1.5px] border-card-border rounded-[10px] p-4 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap min-h-[120px]">
                  {request.editedAction || request.proposedAction}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Action buttons */}
          {isPending && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <div className="flex flex-col gap-3">
                <div className="flex gap-3 justify-end">
                  <button onClick={handleReject} disabled={executing || rejecting}
                    className="px-6 py-2.5 rounded-full text-sm font-bold bg-error/[0.08] text-error border border-error/25 hover:bg-error/15 hover:border-error transition-all flex items-center gap-2 disabled:opacity-40">
                    {rejecting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-error/40 border-t-error rounded-full animate-spin"/>
                        Rejecting…
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        Reject
                      </>
                    )}
                  </button>
                  <button onClick={handleApprove} disabled={executing || rejecting}
                    className="px-6 py-2.5 rounded-full text-sm font-bold bg-success/10 text-success border border-success/30 hover:bg-success/20 hover:border-success transition-all flex items-center gap-2 disabled:opacity-40">
                    {executing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-success/40 border-t-success rounded-full animate-spin"/>
                        Executing…
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                        {isToolOnly && toolAction
                          ? `Approve — ${toolAction.verb}`
                          : customResponse.trim()
                          ? 'Approve & send'
                          : isEditing
                            ? 'Save & send'
                            : request.payloadSiteSlug
                              ? 'Approve & Publish'
                              : isBluesky
                                ? 'Approve & decline'
                                : 'Approve & send'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resolved state */}
          {!isPending && (
            <div className={`p-4 rounded-xl border flex flex-col gap-1.5
              ${request.status === 'approved' ? 'bg-success/10 border-success/30' : 'bg-error/10 border-error/30'}`}>
              <span className={`font-bold text-sm ${request.status === 'approved' ? 'text-success' : 'text-error'}`}>
                {statusCfg.label}
              </span>
              <span className="text-muted text-xs">
                {request.resolvedAt ? `Resolved ${relativeTime(request.resolvedAt)}` : `Action was ${request.status}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
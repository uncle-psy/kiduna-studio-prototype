'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

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

const SOURCE_COLORS: Record<string, string> = {
  watcher: 'text-success', scheduler: 'text-info', condition: 'text-warning', command: 'text-accent',
}
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-warning/10', text: 'text-warning', label: 'Pending' },
  approved: { bg: 'bg-success/10', text: 'text-success', label: 'Approved' },
  rejected: { bg: 'bg-error/10', text: 'text-error', label: 'Rejected' },
}

export default function ApprovePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [filter, setFilter] = useState<string>('all')
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string|null>(null)
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejectedToday: 0, total: 0 })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 10

  const fetchApprovals = useCallback(async () => {
    if (!user?.wallet) return
    try {
      let url = `${API}/api/approvals?page=${page}&pageSize=${PAGE_SIZE}&wallet=${encodeURIComponent(user.wallet)}`
      if (filter !== 'all') url += `&status=${filter}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setApprovals(data.approvals || [])
        setTotal(data.total || 0)
      }
    } catch (e) { console.error('Failed to fetch approvals:', e) }
    finally { setLoading(false) }
  }, [page, filter, user?.wallet])

  const fetchStats = useCallback(async () => {
    if (!user?.wallet) return
    try {
      const res = await fetch(`${API}/api/approvals/stats?wallet=${encodeURIComponent(user.wallet)}`)
      if (res.ok) setStats(await res.json())
    } catch (e) { console.error('Failed to fetch stats:', e) }
  }, [user?.wallet])

  useEffect(() => { fetchApprovals(); fetchStats() }, [fetchApprovals, fetchStats])

  async function handleQuickAction(id: string, action: 'approve' | 'reject') {
    setActionLoading(`${id}-${action}`)
    try {
      const res = await fetch(`${API}/api/approvals/${id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) { await fetchApprovals(); await fetchStats() }
    } catch (e) { console.error(`Failed to ${action}:`, e) }
    finally { setActionLoading(null) }
  }

  const pendingCount = stats.pending

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="mb-7">
        <div className="text-[0.66rem] font-bold tracking-[0.16em] uppercase text-[#03CCD9] mb-2">
          Building mode
        </div>
        <h1
          className="text-[2.1rem] font-normal text-white leading-none m-0"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Actions
        </h1>
        <p className="text-[0.9rem] text-white/60 mt-1.5 leading-relaxed">
          Your inbox from your allies — things to approve, review, read, or watch. Your three supervisor allies (DUNA, Personal, Program) bring you what matters; everything else they handle as&nbsp;workers.
        </p>
      </div>

      {/* Filters button — above the chip row */}
      <div className="mb-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-[1.05rem] py-[0.46rem] rounded-[4px] text-[0.8rem] font-bold bg-card text-white border border-card-border hover:border-white/[0.22] transition-colors"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1 mb-5">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f}
            className={`px-[0.95rem] py-[0.46rem] rounded-full text-[0.82rem] font-bold transition-all border inline-flex items-center gap-[7px]
              ${filter === f
                ? 'bg-accent-light border-[rgba(234,170,0,0.5)] text-accent'
                : 'bg-card text-[#CDCDCD] border-card-border hover:border-white/[0.22] hover:text-white'
              }`}
            onClick={() => { setFilter(f); setPage(1) }}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && pendingCount > 0 && (
              <span className="inline-block ml-1 min-w-[16px] h-4 leading-4 text-center text-[10px] font-extrabold bg-warning text-black rounded-full px-1">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Helper note */}
      <p className="text-[0.86rem] text-[#CDCDCD] -mt-1.5 mb-4">
        Tell the Actions ally what to prioritize, hide, or escalate in the chat on the right.
      </p>

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {loading ? (
          <div className="text-center py-12 text-muted text-sm">Loading...</div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm border border-dashed border-card-border rounded-xl">
            <div className="text-[32px] mb-2">✓</div>
            All clear! No {filter === 'all' ? '' : filter} requests.
          </div>
        ) : (
          approvals.map((req: any) => {
            const status = STATUS_STYLES[req.status] || STATUS_STYLES.pending
            const triggerData = req.triggerData || {}
            const sender = triggerData.from || ''
            const subject = triggerData.subject || ''
            const eventTime = triggerData?.bluesky_event?.event_time || req.createdAt
            const subParts = [req.skillName, relativeTime(eventTime)].filter(Boolean)
            if (sender) subParts.push(`From: ${sender}`)
            else if (subject) subParts.push(`Subject: ${subject}`)
            return (
              <div key={req.id} className="bg-card border border-card-border rounded-[10px] transition-colors hover:border-white/[0.22]">
                <div
                  className="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer"
                  onClick={() => router.push(`/approve/${req.id}`)}>
                {/* Tag */}
                <span className={`shrink-0 text-[0.58rem] font-bold tracking-[0.1em] uppercase px-2 py-[3px] rounded-full border border-card-border ${status.text}`}>
                  {status.label}
                </span>
                {/* Icon tile */}
                <span className="w-10 h-10 shrink-0 rounded-[10px] bg-[#100E59] border border-card-border grid place-items-center text-accent">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </span>
                {/* Main */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {req.payloadSiteSlug && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                        Website
                      </span>
                    )}
                    <div className="font-bold text-[0.94rem] text-white leading-snug line-clamp-2">{req.summary}</div>
                  </div>
                  <div className="text-[0.8rem] text-white/60 truncate mt-0.5">{subParts.join(' · ')}</div>
                  {req.previewUrl && (
                    <a
                      href={req.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 mt-1.5 text-[0.75rem] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Preview Draft ↗
                    </a>
                  )}
                </div>
                {/* Actions */}
                {req.status === 'pending' ? (
                  <div className="ml-auto flex gap-2 items-center shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      disabled={actionLoading !== null}
                      className="px-[1.05rem] py-[0.46rem] rounded-[4px] text-[0.8rem] font-bold bg-transparent text-white border border-white/[0.22] hover:border-white transition-all disabled:opacity-40"
                      onClick={() => handleQuickAction(req.id, 'reject')}>
                      {actionLoading === `${req.id}-reject` ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                          Rejecting…
                        </span>
                      ) : 'Reject'}
                    </button>
                    <button
                      disabled={actionLoading !== null}
                      className="px-[1.05rem] py-[0.46rem] rounded-[4px] text-[0.8rem] font-bold bg-accent text-[#09073A] hover:bg-accent-hover transition-all disabled:opacity-40"
                      onClick={() => router.push(`/approve/${req.id}`)}>
                      Approve
                    </button>
                  </div>
                ) : (
                  <button
                    className="ml-auto shrink-0 px-[1.05rem] py-[0.46rem] rounded-[4px] text-[0.8rem] font-bold bg-card text-white border border-card-border hover:border-white/[0.22] transition-colors"
                    onClick={(e) => { e.stopPropagation(); router.push(`/approve/${req.id}`) }}>
                    Open
                  </button>
                )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (() => {
        const totalPages = Math.ceil(total / PAGE_SIZE)
        if (totalPages <= 1) return null
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, paddingBottom: 16 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                height: 38, padding: '0 20px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: 'rgba(255,255,255,0.65)',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.25 : 1,
                transition: 'all 0.15s', fontSize: 13, fontWeight: 600,
              }}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                height: 38, padding: '0 20px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: 'rgba(255,255,255,0.65)',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.25 : 1,
                transition: 'all 0.15s', fontSize: 13, fontWeight: 600,
              }}
            >
              Next →
            </button>
          </div>
        )
      })()}
    </div>
  )
}
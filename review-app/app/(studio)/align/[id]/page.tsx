'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import PageHeader from '@/components/PageHeader'

/* Studio-aligned theme tokens — inlined so the page renders correctly
   regardless of which version of globals.css is loaded. */
const SK_THEME = {
  '--sk-bg': '#09073A', '--sk-surface': '#100e59', '--sk-surface-2': '#181572', '--sk-surface-3': '#1e1b80',
  '--sk-border': 'rgba(255,255,255,0.12)', '--sk-border-h': 'rgba(255,255,255,0.18)',
  '--sk-tx': '#e2e8f0', '--sk-tx-2': 'rgba(255,255,255,0.78)', '--sk-tx-mute': 'rgba(255,255,255,0.5)', '--sk-tx-faint': 'rgba(255,255,255,0.35)',
  '--sk-ac': '#EAAA00', '--sk-ac-d': '#C8920A', '--sk-ac-soft': 'rgba(234,170,0,0.15)', '--sk-ac-glow': 'rgba(234,170,0,0.4)',
  '--sk-ok': '#22c55e', '--sk-ok-soft': 'rgba(34,197,94,0.13)',
  '--sk-warn': '#f59e0b', '--sk-warn-soft': 'rgba(245,158,11,0.13)',
  '--sk-info': '#3b82f6', '--sk-info-soft': 'rgba(59,130,246,0.13)',
  '--sk-bad': '#ef4444', '--sk-bad-soft': 'rgba(239,68,68,0.13)',
  '--sk-r-sm': '8px', '--sk-r': '14px', '--sk-r-lg': '20px', '--sk-r-xl': '28px',
} as React.CSSProperties

const API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

function Toast({ text, ok }: { text: string; ok: boolean }) {
  if (typeof document === "undefined") return null
  return createPortal(
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.3)", background: ok ? "#166534" : "#991b1b", color: "#fff", animation: "fadeIn .2s ease" }}>{text}</div>,
    document.body
  )
}

/* ══════════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════════ */

const TRIGGER_TYPES = [
  { id: "event", nm: "When something happens", color: { bg: "var(--sk-ok-soft)", fg: "var(--sk-ok)" } },
  { id: "time", nm: "On a schedule", color: { bg: "var(--sk-info-soft)", fg: "var(--sk-info)" } },
  { id: "condition", nm: "When a number changes", color: { bg: "var(--sk-warn-soft)", fg: "var(--sk-warn)" } },
  { id: "command", nm: "On my command", color: { bg: "var(--sk-ac-soft)", fg: "var(--sk-ac)" } },
]

let TOOLS: { uid: string; id: string; nm: string; desc: string; color: string; type: string; category: string }[] = [
  { uid: "chat", id: "chat", nm: "Chat", desc: "Conversations & messaging", color: "#f472b6", type: "internal", category: "Internal" },
  { uid: "vibes", id: "vibes", nm: "Vibes", desc: "Mood & sentiment signals", color: "#c084fc", type: "internal", category: "Internal" },
  { uid: "voting", id: "voting", nm: "Voting", desc: "Polls & decisions", color: "#fb923c", type: "internal", category: "Internal" },
  { uid: "seek", id: "seek", nm: "Seek / Search", desc: "Discovery & lookup", color: "#22d3ee", type: "internal", category: "Internal" },
  { uid: "earning", id: "earning", nm: "Earning", desc: "Revenue & rewards", color: "#4ade80", type: "internal", category: "Internal" },
]

function uidsToServiceIds(uids: string[]): string[] {
  const ids = new Set<string>()
  uids.forEach(uid => {
    const t = TOOLS.find(t => t.uid === uid)
    if (t) ids.add(t.id)
    else ids.add(uid)
  })
  return Array.from(ids)
}

function serviceIdsToUids(ids: string[]): string[] {
  return ids.map(id => {
    const t = TOOLS.find(t => t.id === id)
    return t ? t.uid : id // preserve original id if no TOOLS match
  })
}

function toolByID(id: string) {
  const found = TOOLS.find(t => t.uid === id || t.id === id)
  if (found) return found
  const meta = EXTERNAL_TOOL_META[id]
  if (meta) return { uid: id, id, nm: meta.nm, desc: meta.desc, color: meta.color, type: "external", category: meta.category }
  return { uid: id, id, nm: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, " "), desc: "", color: "#94a3b8", type: "external", category: "External" }
}

// Known external tool metadata for display
const EXTERNAL_TOOL_META: Record<string, { nm: string; desc: string; color: string; category: string }> = {
  gmail: { nm: "Gmail", desc: "Read & send emails", color: "#ef4444", category: "Email" },
  google_gmail_tool: { nm: "Gmail", desc: "Read & send emails", color: "#ef4444", category: "Email" },
  calendar: { nm: "Calendar", desc: "Events & scheduling", color: "#34d399", category: "Calendar" },
  google_calendar_tool: { nm: "Calendar", desc: "Events & scheduling", color: "#34d399", category: "Calendar" },
  meet: { nm: "Meet", desc: "Video calls", color: "#fbbf24", category: "Meeting" },
  google_meet_tool: { nm: "Meet", desc: "Video calls", color: "#fbbf24", category: "Meeting" },
  google: { nm: "Google Suite", desc: "Gmail, Calendar & Meet", color: "#4285f4", category: "Email" },
  telegram: { nm: "Telegram", desc: "Messaging & bots", color: "#26a5e4", category: "Messaging" },
  bluesky: { nm: "Bluesky", desc: "Social posts & mentions", color: "#0085ff", category: "Social" },
  solana: { nm: "Solana", desc: "Wallet & transactions", color: "#9945ff", category: "Wallet" },
}

async function fetchAvailableTools(wallet?: string) {
  try {
    const res = await fetch(`${API}/api/tools/available`)
    if (!res.ok) throw new Error("not available")
    const data = await res.json()
    const fetched: typeof TOOLS = []
    for (const t of (data.internal || [])) {
      fetched.push({ uid: t.uid, id: t.uid, nm: t.name, desc: t.desc || "", color: t.color || "#94a3b8", type: "internal", category: t.category || "Internal" })
    }
    for (const t of (data.external || [])) {
      fetched.push({ uid: t.uid, id: t.service, nm: t.name, desc: t.desc || "", color: t.color || "#94a3b8", type: "external", category: t.category || "External" })
    }
    if (fetched.length > 0) TOOLS = fetched
  } catch (e) {
    // Fallback: fetch saved tools from Empower pool
    if (wallet) {
      try {
        const savedRes = await fetch(`${API}/api/tools/saved?wallet=${encodeURIComponent(wallet)}`)
        if (savedRes.ok) {
          const savedData = await savedRes.json()
          const savedTools = savedData.tools || []
          if (savedTools.length > 0) {
            const merged: typeof TOOLS = [...TOOLS]
            const existingIds = new Set(merged.map(t => t.uid))
            for (const st of savedTools) {
              const toolName = st.tool_name || st.toolName
              if (!toolName || existingIds.has(toolName)) continue
              if (toolName === "google") {
                for (const sub of ["google_gmail_tool", "google_calendar_tool", "google_meet_tool"]) {
                  if (existingIds.has(sub)) continue
                  const meta = EXTERNAL_TOOL_META[sub] || { nm: sub, desc: "", color: "#94a3b8", category: "External" }
                  merged.push({ uid: sub, id: sub, nm: meta.nm, desc: meta.desc, color: meta.color, type: "external", category: meta.category })
                  existingIds.add(sub)
                }
                continue
              }
              const meta = EXTERNAL_TOOL_META[toolName] || { nm: toolName.charAt(0).toUpperCase() + toolName.slice(1), desc: st.external_handle || "", color: "#94a3b8", category: "External" }
              merged.push({ uid: toolName, id: toolName, nm: meta.nm, desc: meta.desc, color: meta.color, type: "external", category: meta.category })
              existingIds.add(toolName)
            }
            TOOLS = merged
          }
        }
      } catch (e2) { }
    }
  }
}

function ToolIcon({ id }: { id: string }) {
  if (id === "chat") return <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></>
  if (id === "vibes") return <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" /></>
  if (id === "voting") return <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></>
  if (id === "seek") return <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>
  if (id === "earning") return <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>
  if (id === "gmail") return <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 7l10 7 10-7" /></>
  if (id === "calendar") return <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>
  if (id === "meet") return <><path d="M15 10l5-3v10l-5-3" /><rect x="2" y="6" width="13" height="12" rx="2" /></>
  if (id === "telegram") return <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
  if (id === "bluesky") return <path d="M12 4c-2 4-6 6-9 6 0 4 3 7 9 10 6-3 9-6 9-10-3 0-7-2-9-6z" />
  if (id === "solana") return <path d="M5 8l14-3-2 4H3zM5 14l14-3-2 4H3zM5 20l14-3-2 4H3z" />
  return <circle cx="12" cy="12" r="10" />
}

/* ══════════════════════════════════════════════════════════════
   MARKDOWN RENDERER
   ══════════════════════════════════════════════════════════════ */

function renderMarkdown(md: string): string {
  let html = md
    .replace(/^---\n([\s\S]*?)\n---/m, '<div style="background:rgba(0,0,0,.3);border:1px solid var(--sk-border);border-radius:8px;padding:12px 14px;margin-bottom:16px;font-family:monospace;font-size:11.5px;line-height:1.6;color:var(--sk-tx-mute);white-space:pre-wrap">$1</div>')
    .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;margin:16px 0 6px;color:var(--sk-tx)">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:18px 0 8px;color:var(--color-foreground, #e2e8f0)">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="font-size:16px;font-weight:800;margin:0 0 12px;color:var(--sk-tx)">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px;font-size:11.5px;font-family:monospace">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0;line-height:1.6">')
    .replace(/(?<!\>)\n(?!\<)/g, '<br/>')
  html = html.replace(/((<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="margin:8px 0;padding-left:20px;list-style:disc">$1</ul>')
  return `<p style="margin:8px 0;line-height:1.6">${html}</p>`
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

function relativeTime(iso: string): string {
  let ts = iso
  if (!ts.endsWith("Z") && !ts.includes("+")) ts += "Z"
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 0) return "just now"
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatTimestamp(iso: string): string {
  let ts = iso
  if (!ts.endsWith("Z") && !ts.includes("+")) ts += "Z"
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
    + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

function extractText(raw: string | null | undefined): string {
  if (!raw) return ""
  const s = raw.trim()
  if (s.startsWith("[") && s.includes("'text'")) {
    const matches = [...s.matchAll(/'text':\s*'((?:[^'\\]|\\.)*)'/g)]
    if (matches.length > 0) {
      const texts = matches.map(m => m[1].replace(/\\'/g, "'").replace(/\\n/g, "\n"))
      return texts.reduce((a, b) => a.length >= b.length ? a : b, "")
    }
  }
  if (s.startsWith("[") && s.includes('"text"')) {
    const dq = [...s.matchAll(/"text":\s*"((?:[^"\\]|\\.)*)"/g)]
    if (dq.length > 0) {
      const texts = dq.map(m => m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n"))
      return texts.reduce((a, b) => a.length >= b.length ? a : b, "")
    }
  }
  return s
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

type DetailTab = "config" | "history"

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const [skill, setSkill] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [contentMode, setContentMode] = useState<"edit" | "preview">("preview")
  const [activeTab, setActiveTab] = useState<DetailTab>("config")

  const [name, setName] = useState("")
  const [whenText, setWhenText] = useState("")
  const [thenText, setThenText] = useState("")
  const [tools, setTools] = useState<string[]>([])
  const [skillContent, setSkillContent] = useState("")
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [conditionField, setConditionField] = useState("")
  const [conditionOperator, setConditionOperator] = useState("gt")
  const [conditionThreshold, setConditionThreshold] = useState("")
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  function showMsg(text: string, ok: boolean) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000) }

  const [executions, setExecutions] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyFilter, setHistoryFilter] = useState<null | boolean>(null)

  useEffect(() => {
    async function load() {
      // Fetch available tools first so serviceIdsToUids works
      await fetchAvailableTools(user?.wallet || undefined)
      try {
        const res = await fetch(`${API}/api/skills`)
        if (res.ok) {
          const data = await res.json()
          const found = (data.skills || []).find((s: any) => s.id === id)
          if (found) {
            setSkill(found)
            setName(found.name || "")
            setWhenText(found.when_text || found.whenText || "")
            setThenText(found.then_text || found.thenText || "")
            setTools(serviceIdsToUids(found.tools || []))
            setSkillContent(found.skill_content || found.skillContent || "")
            setRequiresApproval(found.requires_approval || found.requiresApproval || false)
            const cp = found.condition_params || found.conditionParams || {}
            setConditionField(cp.field || "")
            setConditionOperator(cp.operator || "gt")
            setConditionThreshold(cp.threshold != null ? String(cp.threshold) : "")
          }
        }
      } catch (e) {
        console.error("Failed to load skill:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user?.wallet])

  const PAGE_SIZE = 10

  const fetchHistory = useCallback(async (page: number, filter: null | boolean) => {
    setHistoryLoading(true)
    try {
      let url = `${API}/api/skills/${id}/history?page=${page}&page_size=${PAGE_SIZE}`
      if (filter !== null) url += `&success=${filter}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setExecutions(data.executions || [])
        setHistoryTotal(data.total || 0)
        setHistoryPage(page)
      }
    } catch (e) {
      console.error("Failed to load history:", e)
    } finally {
      setHistoryLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!loading && skill) fetchHistory(1, historyFilter)
  }, [loading, skill, historyFilter, fetchHistory])

  function handleFilterChange(f: null | boolean) { setHistoryFilter(f) }

  async function handleSave() {
    if (!name.trim() || !thenText.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, when_text: whenText, then_text: thenText,
          tools, skill_content: skillContent || null,
          requires_approval: requiresApproval,
          wallet: user?.wallet || null,
          ...(triggerType === "condition" && conditionThreshold ? {
            condition_params: {
              field: "count",
              operator: conditionOperator,
              threshold: parseFloat(conditionThreshold),
            }
          } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showMsg(err.detail || "Failed to update skill", false)
        return
      }
      router.push("/align")
    } catch (e) { showMsg("Failed to update skill", false) }
    finally { setSaving(false) }
  }

  async function handleRegenerate() {
    if (!name.trim() || !thenText.trim()) return
    setGenerating(true)
    try {
      const triggerType = (skill?.trigger_type || skill?.triggerType || "event").toLowerCase()
      const res = await fetch(`${API}/api/skills/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, trigger_type: triggerType, when_text: whenText, then_text: thenText, tools }),
      })
      if (res.ok) {
        const data = await res.json()
        setSkillContent(data.skill_content || data.skillContent || "")
      }
    } catch (e) { }
    finally { setGenerating(false) }
  }

  async function handleDelete() {
    try {
      await fetch(`${API}/api/skills/${id}`, { method: "DELETE" })
      router.push("/align")
    } catch (e) { showMsg("Failed to delete skill", false) }
  }

  const DISABLED_INTERNAL = new Set(["vibes", "voting", "seek", "earning"])
  function toggleTool(tid: string) {
    if (DISABLED_INTERNAL.has(tid)) return
    setTools(prev => prev.includes(tid) ? prev.filter(t => t !== tid) : [...prev, tid])
  }

  if (loading) {
    return (
      <div className="sk-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ color: "var(--sk-tx-faint)", fontSize: 14 }}>Loading skill...</div>
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="sk-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
        <div style={{ color: "var(--sk-tx-faint)", fontSize: 14 }}>Skill not found</div>
        <button className="btn-ghost" onClick={() => router.push("/align")}>Back to Programs</button>
      </div>
    )
  }

  const triggerType = (skill.trigger_type || skill.triggerType || "event").toLowerCase()
  const triggerInfo = TRIGGER_TYPES.find(t => t.id === triggerType)
  const isActive = (skill.status || "").toLowerCase() === "active"

  const editorTabStyle = (active: boolean) => ({
    padding: "6px 14px", borderRadius: "8px 8px 0 0",
    fontSize: "11.5px", fontWeight: 700 as const,
    cursor: "pointer" as const, transition: "all .15s ease",
    border: "1px solid", borderBottom: "none",
    ...(active ? {
      background: "rgba(0,0,0,.2)", color: "var(--sk-ac)", borderColor: "var(--sk-border)",
    } : {
      background: "transparent", color: "var(--sk-tx-faint)", borderColor: "transparent",
    })
  })

  const totalPages = Math.ceil(historyTotal / PAGE_SIZE)

  return (
    <div className="sk-page" style={SK_THEME}>
      {msg && <Toast text={msg.text} ok={msg.ok} />}

      {/* Header — studio PageHeader + action buttons */}
      <PageHeader
        title={name || "Untitled Skill"}
        subtitle={triggerInfo?.nm || triggerType}
        breadcrumbs={[{ label: "Programs", href: "/align" }, { label: name || "Detail" }]}
        action={
          <div className="flex items-center gap-2">
            <button
              className="btn bg-accent hover:bg-accent-dark text-white border-0 rounded-xl font-bold disabled:opacity-50"
              onClick={handleSave}
              disabled={!name.trim() || !thenText.trim() || saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="w-9 h-9 rounded-xl bg-red-500 border border-red-600 flex items-center justify-center text-white hover:bg-red-600 transition-all cursor-pointer"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            </button>
          </div>
        }
      />

      {/* Status badges */}
      <div className="flex items-center gap-2 -mt-5 mb-6">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
          style={{ background: triggerInfo?.color.bg || "rgba(59,130,246,0.13)", color: triggerInfo?.color.fg || "#3b82f6", borderColor: 'transparent' }}>
          {triggerInfo?.nm || triggerType}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}>
          {isActive ? "Active" : "Paused"}
        </span>
        {historyTotal > 0 && (
          <span className="text-[11px] text-muted">{historyTotal} execution{historyTotal === 1 ? "" : "s"}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-card-border mb-6">
        <button
          className={`px-4 py-2.5 text-[12.5px] font-bold flex items-center gap-2 border-b-2 -mb-px transition-all ${activeTab === "config" ? "text-foreground border-accent" : "text-muted border-transparent hover:text-foreground/70"}`}
          onClick={() => setActiveTab("config")}
        >
          Configuration
        </button>
        <button
          className={`px-4 py-2.5 text-[12.5px] font-bold flex items-center gap-2 border-b-2 -mb-px transition-all ${activeTab === "history" ? "text-foreground border-accent" : "text-muted border-transparent hover:text-foreground/70"}`}
          onClick={() => setActiveTab("history")}
        >
          History
          {historyTotal > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">{historyTotal}</span>}
        </button>
      </div>

      {activeTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 items-start">
          <div className="bg-card border border-card-border rounded-xl p-5 flex flex-col gap-4">
            <div>
              <label className="block text-[11.5px] font-bold text-subtle mb-2">Skill name</label>
              <input type="text" value={name}
                onChange={e => setName(e.target.value)} placeholder="Skill name"
                className="w-full bg-input border border-card-border rounded-xl px-3.5 py-2.5 text-foreground text-[13.5px] placeholder:text-muted focus:outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-subtle mb-2">When</label>
              <input type="text" value={whenText}
                onChange={e => setWhenText(e.target.value)} placeholder="When should this skill run?"
                className="w-full bg-input border border-card-border rounded-xl px-3.5 py-2.5 text-foreground text-[13.5px] placeholder:text-muted focus:outline-none focus:border-accent/50" />
            </div>
            {triggerType === "condition" && (
              <div>
                <label className="block text-[11.5px] font-bold text-subtle mb-2">Trigger when the number of detected items</label>
                <div className="flex gap-2.5 items-center mt-1.5">
                  <select value={conditionOperator} onChange={e => setConditionOperator(e.target.value)}
                    className="bg-input border border-card-border rounded-xl px-3 py-2.5 text-foreground text-[13.5px] focus:outline-none focus:border-accent/50" style={{ width: 160 }}>
                    <option value="gt">is greater than</option>
                    <option value="lt">is less than</option>
                    <option value="gte">is at least</option>
                    <option value="lte">is at most</option>
                    <option value="eq">is exactly</option>
                  </select>
                  <input type="number" value={conditionThreshold}
                    onChange={e => setConditionThreshold(e.target.value)} placeholder="e.g. 3"
                    className="bg-input border border-card-border rounded-xl px-3 py-2.5 text-foreground text-[13.5px] focus:outline-none focus:border-accent/50" style={{ width: 80 }} />
                </div>
              </div>
            )}
            <div>
              <label className="block text-[11.5px] font-bold text-subtle mb-2">Then do</label>
              <textarea value={thenText}
                onChange={e => setThenText(e.target.value)}
                placeholder="What should your agent do?"
                className="w-full bg-input border border-card-border rounded-xl px-3.5 py-2.5 text-foreground text-[13.5px] placeholder:text-muted focus:outline-none focus:border-accent/50 resize-y"
                style={{ minHeight: 72 }} />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-subtle mb-2">Tools</label>
              {(() => {
                // Build categories from TOOLS array
                const categories: Record<string, typeof TOOLS> = {}
                const allKnownUids = new Set<string>()
                TOOLS.forEach(t => {
                  const cat = (t as any).category || "Other"
                  if (!categories[cat]) categories[cat] = []
                  categories[cat].push(t)
                  allKnownUids.add(t.uid)
                })
                // Find selected tools not in TOOLS and add them via toolByID fallback
                const orphanedTools = tools.filter(tid => !allKnownUids.has(tid))
                if (orphanedTools.length > 0) {
                  orphanedTools.forEach(tid => {
                    const resolved = toolByID(tid)
                    const cat = (resolved as any).category || "External"
                    if (!categories[cat]) categories[cat] = []
                    // Avoid duplicates
                    if (!categories[cat].find((t: any) => t.uid === resolved.uid)) {
                      categories[cat].push(resolved as any)
                    }
                  })
                }
                const catColors: Record<string, string> = {
                  "Internal": "#c084fc", "Email": "#ef4444", "Calendar": "#34d399", "Meeting": "#fbbf24",
                  "Social": "#38bdf8", "Messaging": "#60a5fa", "Wallet": "#a78bfa", "External": "#94a3b8"
                }
                return Object.entries(categories).map(([cat, catTools]) => {
                  const color = catColors[cat] || "#94a3b8"
                  return (
                    <div key={cat}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: cat === "Internal" ? 0 : 12, marginBottom: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                        <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color }}>{cat}</span>
                        <div style={{ flex: 1, height: 1, background: `${color}25` }} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {catTools.map((t, i) => {
                          const on = tools.includes(t.uid)
                          const isDisabled = DISABLED_INTERNAL.has(t.uid)
                          return (
                            <button key={t.uid}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${isDisabled ? "bg-white/[0.01] border-white/[0.06] text-white/25" : on ? "bg-accent/20 border-accent text-accent shadow-[0_0_8px_rgba(234,170,0,0.2)]" : "bg-white/[0.03] border-card-border text-muted hover:border-white/20 hover:bg-white/[0.05]"}`}
                              style={isDisabled ? { opacity: 0.4, cursor: "not-allowed", pointerEvents: "auto" } : {}}
                              disabled={isDisabled}
                              onClick={() => toggleTool(t.uid)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: isDisabled ? "rgba(255,255,255,.2)" : t.color }}><ToolIcon id={t.id} /></svg>
                              {t.nm}
                              {isDisabled && <span className="text-[8px] font-bold text-amber-400 tracking-wide">SOON</span>}
                              {!isDisabled && on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-subtle mb-2">Require approval before executing</label>
              <button
                onClick={() => setRequiresApproval(!requiresApproval)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10, width: "100%",
                  background: requiresApproval ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.06)",
                  border: `1.5px solid ${requiresApproval ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.2)"}`,
                  transition: "all .15s ease", textAlign: "left" as const,
                }}>
                <div style={{
                  width: 36, height: 20, borderRadius: 99, padding: 2,
                  background: requiresApproval ? "var(--sk-ok)" : "rgba(239,68,68,.5)",
                  transition: "all .2s ease", display: "flex",
                  justifyContent: requiresApproval ? "flex-end" : "flex-start",
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: 99, background: "#fff", transition: "all .2s ease" }} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: requiresApproval ? "var(--sk-ok)" : "var(--sk-bad)" }}>
                    {requiresApproval ? "ON — Approval required" : "OFF — No approval needed"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--sk-tx-faint)", marginTop: 1 }}>
                    {requiresApproval
                      ? "AI actions will wait for your review on the Approve page"
                      : "AI actions will execute immediately without review"}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 0 }}>
              <label className="flex-1 text-[11.5px] font-bold text-subtle mb-0">SKILL.md</label>
              {skillContent && (
                <div style={{ display: "flex", gap: 0 }}>
                  <button onClick={() => setContentMode("edit")} style={editorTabStyle(contentMode === "edit")} title="Edit">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button onClick={() => setContentMode("preview")} style={editorTabStyle(contentMode === "preview")} title="Preview">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  </button>
                </div>
              )}
            </div>
            {skillContent ? (
              contentMode === "edit" ? (
                <textarea value={skillContent}
                  onChange={e => setSkillContent(e.target.value)}
                  className="w-full bg-input border border-card-border rounded-b-xl px-3.5 py-3 text-foreground font-mono text-[11.5px] leading-relaxed focus:outline-none focus:border-accent/50 resize-y border-t border-t-card-border"
                  style={{ minHeight: 280 }} />
              ) : (
                <div className="min-h-[260px] max-h-[420px] px-4 py-3 bg-black/20 border border-card-border rounded-b-xl border-t-card-border text-[13px] text-foreground overflow-y-auto leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(skillContent) }} />
              )
            ) : (
              <div className="min-h-[260px] p-10 text-center text-muted text-[13px] border border-dashed border-card-border rounded-xl flex items-center justify-center">No skill content generated yet.</div>
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={handleRegenerate} disabled={generating}
                style={{
                  background: '#EAAA00', color: 'black', border: 'none',
                  borderRadius: 4, fontWeight: 700, fontSize: 13,
                  padding: '10px 20px', cursor: generating ? 'not-allowed' : 'pointer',
                  opacity: generating ? 0.6 : 1, transition: 'all .15s ease',
                }}>
                {generating ? "Generating…" : skillContent ? "Regenerate" : "Generate content"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="detail-history">
          <div className="exec-filters" style={{ marginBottom: 16 }}>
            <button className={`exec-filter ${historyFilter === null ? "on" : ""}`}
              onClick={() => handleFilterChange(null)}>All</button>
            <button className={`exec-filter ${historyFilter === true ? "on" : ""}`}
              onClick={() => handleFilterChange(true)}>Success</button>
            <button className={`exec-filter ${historyFilter === false ? "on" : ""}`}
              onClick={() => handleFilterChange(false)}>Failed</button>
            {historyTotal > 0 && (
              <span style={{ fontSize: 11, color: "var(--sk-tx-faint)", marginLeft: 8, alignSelf: "center" }}>
                {historyTotal} result{historyTotal === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {executions.length === 0 && !historyLoading ? (
            <div className="exec-empty">No executions yet. This program hasn't run yet.</div>
          ) : (
            <div className="exec-list">
              {executions.map((ex: any) => {
                const ok = ex.success ?? ex.ok
                const rawText = ok ? (ex.resultText || ex.result_text || "") : (ex.error || "")
                const text = extractText(rawText) || (ok ? "Completed successfully" : "Execution failed")
                const source = ex.triggerData?.source || ex.trigger_data?.source || null
                const durationMs = ex.durationMs ?? ex.duration_ms
                const triggeredAt = ex.triggeredAt || ex.triggered_at
                return (
                  <div key={ex.id} className={`exec-row ${ok ? "" : "exec-row-fail"}`}>
                    <div className={`exec-dot ${ok ? "ok" : "fail"}`} />
                    <div className="exec-body">
                      <div className="exec-text">{text}</div>
                      <div className="exec-meta">
                        {source && <span className="exec-source">{source}</span>}
                        {durationMs != null && <span>{formatDuration(durationMs)}</span>}
                      </div>
                    </div>
                    {triggeredAt && (
                      <div className="exec-time">
                        <div className="exec-time-rel">{relativeTime(triggeredAt)}</div>
                        <div className="exec-time-abs">{formatTimestamp(triggeredAt)}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {historyLoading && (
            <div style={{ textAlign: "center", padding: 20, color: "var(--sk-tx-faint)", fontSize: 13 }}>Loading…</div>
          )}
          {totalPages > 1 && !historyLoading && (
            <div className="exec-pagination">
              <button className="exec-page-btn" disabled={historyPage <= 1}
                onClick={() => fetchHistory(historyPage - 1, historyFilter)}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - historyPage) <= 1)
                .reduce<(number | string)[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push("…")
                  acc.push(p); return acc
                }, [])
                .map((p, i) =>
                  typeof p === "string"
                    ? <span key={`e${i}`} className="exec-page-ellipsis">…</span>
                    : <button key={p} className={`exec-page-btn ${p === historyPage ? "on" : ""}`}
                      onClick={() => fetchHistory(p as number, historyFilter)}>{p}</button>
                )
              }
              <button className="exec-page-btn" disabled={historyPage >= totalPages}
                onClick={() => fetchHistory(historyPage + 1, historyFilter)}>→</button>
            </div>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'fadeIn .2s ease' }}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)} />

          {/* Modal */}
          <div className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_24px_80px_-12px_rgba(0,0,0,.7)]"
            style={{ background: 'linear-gradient(180deg, #1a1660 0%, #100e59 100%)' }}>

            {/* Content */}
            <div className="px-6 pt-6 pb-7">
              {/* Icon + Title */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>
                <h3 className="text-[17px] font-bold text-white tracking-tight">Delete this skill?</h3>
                <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <span className="font-semibold text-white/90">{name}</span> will be permanently removed.<br />This action cannot be undone.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-row gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-5 py-3 rounded-xl text-[14px] font-medium transition-all duration-150 cursor-pointer text-center"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); handleDelete() }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold text-white tracking-wide transition-all duration-150 cursor-pointer"
                  style={{
                    background: 'rgb(239, 68, 68)',
                    boxShadow: '0 2px 12px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgb(239, 68, 68)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(235,128,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgb(239, 68, 68)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(235,128,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
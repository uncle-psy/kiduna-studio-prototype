'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import {
  SKILL_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type SkillTemplate,
} from '@/lib/skill-templates'

// ─────────────────────────────────────────────────────────────────────────────
// Maps template tool IDs → the service name returned by listSavedTools
// "google" covers all gmail/calendar/meet tools
// ─────────────────────────────────────────────────────────────────────────────
const TOOL_TO_SERVICE: Record<string, string> = {
  // ── MCP service names (used by updated templates) ──
  google_gmail_tool:                    'google',
  google_calendar_tool:                 'google',
  google_meet_tool:                     'google',
  solana:                               'solana',
  bluesky:                              'bluesky',

  // ── Individual tool names (legacy / backward compat) ──
  google_gmail_read_email:              'google',
  google_gmail_send_email:              'google',
  google_gmail_search_email:            'google',
  google_gmail_draft_emails:            'google',
  google_gmail_reply_forward_email:     'google',
  google_gmail_manage_labels:           'google',
  google_gmail_download_attachments:    'google',
  google_calendar_list_calendars:       'google',
  google_calendar_read_events:          'google',
  google_calendar_search_events:        'google',
  google_calendar_create_event:         'google',
  google_calendar_update_event:         'google',
  google_calendar_cancel_event:         'google',
  google_calendar_invite_attendees:     'google',
  google_meet_create_instant_meet:      'google',
  google_meet_create_meet_link:         'google',
  google_meet_get_meet_metadata:        'google',
  google_meet_add_meet_to_event:        'google',
  google_meet_link_drive_artifacts_to_meet: 'google',
  bluesky_create_post:                  'bluesky',
  solana_transfertoken:                 'solana',
  solana_getreceiverwallet:             'solana',
  telegram:                             'telegram',
}

// Human-readable service labels
const SERVICE_LABELS: Record<string, string> = {
  google:   'Google (Gmail, Calendar, Meet)',
  bluesky:  'Bluesky',
  solana:   'Solana Wallet',
  telegram: 'Telegram',
}

// ─────────────────────────────────────────────────────────────────────────────

interface SkillTemplateDrawerProps {
  open: boolean
  onClose: () => void
  onAttach: (templateId: string) => void
  attachedTemplateIds?: string[]
  /** Connected service names for this agent's workers e.g. ['google', 'bluesky'] */
  connectedServices?: string[]
  /** Whether this is inside a creation modal (softer warning) */
  isCreationFlow?: boolean
}

export default function SkillTemplateDrawer({
  open,
  onClose,
  onAttach,
  attachedTemplateIds = [],
  connectedServices = [],
  isCreationFlow = false,
}: SkillTemplateDrawerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [selectedTemplate, setSelectedTemplate] = useState<SkillTemplate | null>(null)
  const [missingServices, setMissingServices] = useState<string[]>([])
  const [showWarning, setShowWarning] = useState(false)

  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setActiveCategory('All')
      setSelectedTemplate(null)
      setMissingServices([])
      setShowWarning(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  function getMissingServices(tpl: SkillTemplate): string[] {
    const required = new Set(
      tpl.tools.map((t) => TOOL_TO_SERVICE[t]).filter(Boolean)
    )
    return Array.from(required).filter(
      (svc) => !connectedServices.includes(svc)
    )
  }

  function handleAdd() {
    if (!selectedTemplate) return

    // In creation flow — soft notice, don't block
    if (isCreationFlow) {
      onAttach(selectedTemplate.id)
      onClose()
      return
    }

    const missing = getMissingServices(selectedTemplate)
    if (missing.length > 0) {
      setMissingServices(missing)
      setShowWarning(true)
      return
    }

    onAttach(selectedTemplate.id)
    onClose()
  }

  if (!open) return null

  const visibleTemplates =
    activeCategory === 'All'
      ? SKILL_TEMPLATES
      : SKILL_TEMPLATES.filter((t) => t.category === activeCategory)

  const triggerBadge = (type: string) => {
    const t = type.toLowerCase()
    if (t === 'event')   return 'bg-green-500/15 text-green-400'
    if (t === 'time')    return 'bg-blue-400/15 text-blue-400'
    if (t === 'command') return 'bg-orange-400/15 text-orange-400'
    return 'bg-yellow-400/15 text-yellow-400'
  }

  const triggerLabel = (type: string) => {
    const t = type.toLowerCase()
    if (t === 'event')   return 'EVENT'
    if (t === 'time')    return 'SCHEDULE'
    if (t === 'command') return 'COMMAND'
    return 'CONDITION'
  }

  const categoryIcon: Record<string, string> = {
    Productivity: 'lucide:briefcase',
    Email:        'lucide:mail',
    Social:       'lucide:share-2',
    Finance:      'lucide:wallet',
    Meetings:     'lucide:video',
    Payments:     'lucide:credit-card',
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className="w-full sm:max-w-xl bg-background border border-card-border rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '88vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border shrink-0">
          {selectedTemplate ? (
            <button
              onClick={() => { setSelectedTemplate(null); setShowWarning(false); setMissingServices([]) }}
              className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
            >
              <Icon icon="lucide:arrow-left" width={16} height={16} />
              <span>Predefined Templates</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <Icon icon="lucide:layout-template" width={15} height={15} className="text-accent" />
              </div>
              <span className="font-semibold text-white text-sm">Predefined Templates</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <Icon icon="lucide:x" width={16} height={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* LIST VIEW */}
          {!selectedTemplate && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex gap-1.5 px-4 py-3 border-b border-card-border overflow-x-auto shrink-0 scrollbar-none">
                {['All', ...TEMPLATE_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? 'bg-accent text-white'
                        : 'bg-white/[0.05] text-muted hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="p-3 space-y-1.5">
                {visibleTemplates.map((tpl) => {
                  const alreadyAdded = attachedTemplateIds.includes(tpl.id)
                  const missing = !isCreationFlow ? getMissingServices(tpl) : []
                  const hasWarning = missing.length > 0
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => !alreadyAdded && setSelectedTemplate(tpl)}
                      disabled={alreadyAdded}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                        alreadyAdded
                          ? 'border-accent/20 bg-accent/5 cursor-default opacity-60'
                          : 'border-card-border hover:border-accent/40 hover:bg-white/[0.03] cursor-pointer'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
                        <Icon
                          icon={categoryIcon[tpl.category] || 'lucide:zap'}
                          width={16} height={16}
                          className="text-accent"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">{tpl.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${triggerBadge(tpl.trigger_type)}`}>
                            {triggerLabel(tpl.trigger_type)}
                          </span>
                          {alreadyAdded && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-accent/15 text-accent">
                              ADDED
                            </span>
                          )}
                          {hasWarning && !alreadyAdded && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-yellow-500/15 text-yellow-400 flex items-center gap-0.5">
                              <Icon icon="lucide:alert-triangle" width={9} height={9} />
                              SETUP NEEDED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate">{tpl.description}</p>
                      </div>
                      {!alreadyAdded && (
                        <Icon icon="lucide:chevron-right" width={15} height={15} className="text-muted/50 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* DETAIL VIEW */}
          {selectedTemplate && (
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-5 border-b border-card-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon
                      icon={categoryIcon[selectedTemplate.category] || 'lucide:zap'}
                      width={18} height={18}
                      className="text-accent"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold">{selectedTemplate.name}</h3>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${triggerBadge(selectedTemplate.trigger_type)}`}>
                        {triggerLabel(selectedTemplate.trigger_type)}
                      </span>
                      {selectedTemplate.requires_approval && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
                          APPROVAL
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1 leading-relaxed">{selectedTemplate.description}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <ReadOnlyField label="When" value={selectedTemplate.when_text} icon="lucide:clock" />
                <ReadOnlyField label="Then" value={selectedTemplate.then_text} icon="lucide:play" />
              </div>

              <div className="px-5 pb-4">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">Tools</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.tools.map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/70 font-mono border border-card-border"
                    >
                      <Icon icon="lucide:plug" width={10} height={10} className="text-accent" />
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Creation flow soft notice */}
              {isCreationFlow && (
                <div className="mx-5 mb-4 px-3.5 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2.5">
                  <Icon icon="lucide:info" width={14} height={14} className="text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300 leading-relaxed">
                    This template requires{' '}
                    {Array.from(new Set(selectedTemplate.tools.map(t => TOOL_TO_SERVICE[t]).filter(Boolean)))
                      .map(s => SERVICE_LABELS[s] || s)
                      .join(', ')}.{' '}
                    After creating the agent, connect these tools via the <strong>Empower</strong> page.
                  </p>
                </div>
              )}

              {/* Warning popup — missing tools */}
              {showWarning && missingServices.length > 0 && (
                <div className="mx-5 mb-4 px-4 py-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon icon="lucide:alert-triangle" width={16} height={16} className="text-yellow-400 shrink-0" />
                    <p className="text-sm font-semibold text-yellow-300">Tools not connected</p>
                  </div>
                  <p className="text-xs text-yellow-200/80 leading-relaxed mb-3">
                    This template requires the following tools to be connected before it can run:
                  </p>
                  <div className="space-y-1.5 mb-4">
                    {missingServices.map((svc) => (
                      <div key={svc} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <Icon icon="lucide:x-circle" width={13} height={13} className="text-yellow-400 shrink-0" />
                        <span className="text-xs font-medium text-white">{SERVICE_LABELS[svc] || svc}</span>
                        <span className="text-xs text-yellow-400 ml-auto">Not connected</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href="/empower"
                      className="w-full text-center py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold transition-colors"
                    >
                      Go to Empower page
                    </a>
                  </div>
                </div>
              )}

              {/* Read-only notice */}
              {!showWarning && (
                <div className="mx-5 mb-4 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-card-border flex items-center gap-2">
                  <Icon icon="lucide:lock" width={13} height={13} className="text-muted shrink-0" />
                  <p className="text-xs text-muted">
                    Predefined templates are read-only and are not listed on the Skills page.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer — only on detail view ── */}
        {selectedTemplate && !showWarning && (
          <div className="px-5 py-4 border-t border-card-border shrink-0 flex gap-3">
            <button
              type="button"
              onClick={() => { setSelectedTemplate(null); setMissingServices([]) }}
              className="px-4 py-2.5 rounded-xl border border-card-border text-sm text-muted hover:text-white hover:border-white/20 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 bg-accent hover:bg-accent-dark text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              Add to Agent
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ReadOnlyField({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-card-border bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon icon={icon} width={11} height={11} className="text-muted" />
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-sm text-white/80 leading-relaxed">{value}</p>
    </div>
  )
}
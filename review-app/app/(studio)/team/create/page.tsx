'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  createAlliance as apiCreateAlliance,
  attachAllianceWallet,
  addAllianceMember,
} from '@/lib/alliances-api'
import { isValidHandle, suggestHandle, HANDLE_MAX } from '@/lib/agent-types'
import { Icon } from '@iconify/react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createSquadsMultisig } from '@/lib/squads-create'
import { addMemberOnChain } from '@/lib/squads-proposals'
import { fetchMembers, type MemberInfo } from '@/lib/codes-api'

/* ──────────────────────────────────────────────────────────────────────────
   Create Alliance — a dedicated page (moved out of the Alliances list, where
   it used to live as an inline panel). Returns to /team on success or cancel.

   Scoped under `.kc-al` so the design tokens and kiduna class names can't
   clash with the project's global styles.
   ────────────────────────────────────────────────────────────────────────── */

const VIS_OPTIONS = ['Public', 'Private', 'Secret']

// ─── Draft storage ──────────────────────────────────────────────────────────
// Mirrors the agent (Avatar/Performer) draft pattern: an in-progress alliance
// is auto-saved to localStorage (keyed by wallet) so it survives leaving the
// page. It's listed back on /team and resuming returns here. Cleared on a
// successful create. Drafts older than 24h are discarded.

const ALLIANCE_DRAFT_KEY_PREFIX = 'kinship_alliance_draft_'
const ALLIANCE_DRAFT_TTL_MS = 24 * 60 * 60 * 1000
const AUTO_SAVE_DEBOUNCE_MS = 500

function getAllianceDraftKey(w: string): string {
  return w ? `${ALLIANCE_DRAFT_KEY_PREFIX}${w}` : ''
}

interface AllianceDraft {
  name: string
  handle: string
  description: string
  purpose: string
  vis: string
  initialMember: { wallet: string; name: string } | null
  savedAt: number
}

function saveAllianceDraft(draft: AllianceDraft, wallet: string): void {
  const key = getAllianceDraftKey(wallet)
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify(draft)) } catch { }
}
function loadAllianceDraft(wallet: string): AllianceDraft | null {
  const key = getAllianceDraftKey(wallet)
  if (!key) return null
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const draft = JSON.parse(stored) as AllianceDraft
      if (Date.now() - draft.savedAt < ALLIANCE_DRAFT_TTL_MS) return draft
      localStorage.removeItem(key)
    }
  } catch { }
  return null
}
function clearAllianceDraft(wallet: string): void {
  const key = getAllianceDraftKey(wallet)
  if (!key) return
  try { localStorage.removeItem(key) } catch { }
}

function useDebounce<T extends (...args: Parameters<T>) => void>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => { callback(...args) }, delay)
  }, [callback, delay]) as T
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])
  return debouncedFn
}

export default function CreateAlliancePage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const { connection } = useConnection()

  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleTouched, setHandleTouched] = useState(false)
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [handleSuggestion, setHandleSuggestion] = useState<string | null>(null)
  const [handleChecking, setHandleChecking] = useState(false)
  const handleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCheckVersion = useRef(0)
  const [description, setDescription] = useState('')
  const [purpose, setPurpose] = useState('')
  const [vis, setVis] = useState('Public')
  // These have no UI yet — a new alliance is created with defaults and tuned
  // later from its own pages (e.g. Approval Threshold).
  const startDate = ''
  const endDate = ''
  const threshold = 1
  const walletOn = true
  const spendingRule = ''
  const defaultTools = ''
  // Initial participant search (optional — add one member at creation).
  const [participantQuery, setParticipantQuery] = useState('')
  const [participantResults, setParticipantResults] = useState<MemberInfo[]>([])
  const [participantLimit, setParticipantLimit] = useState(10)
  const [participantLoading, setParticipantLoading] = useState(false)
  const participantBoxRef = useRef<HTMLDivElement>(null)
  const [participantOpen, setParticipantOpen] = useState(false)
  const [initialMember, setInitialMember] = useState<{ wallet: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const wallet = user?.wallet

  // Draft lifecycle. `hydratedRef` guards against auto-saving before we've had
  // a chance to load an existing draft; `createdSuccessRef` stops the unmount
  // handler from re-saving a draft for an alliance that was just created.
  const hydratedRef = useRef(false)
  const createdSuccessRef = useRef(false)

  // Hydrate the form from a saved draft once the wallet is known. Runs once.
  useEffect(() => {
    if (hydratedRef.current || !wallet) return
    const draft = loadAllianceDraft(wallet)
    if (draft) {
      setName(draft.name || '')
      setHandle(draft.handle || '')
      if (draft.handle) setHandleTouched(true)
      setDescription(draft.description || '')
      setPurpose(draft.purpose || '')
      setVis(draft.vis || 'Public')
      // Never restore the creator's own wallet as the initial participant.
      setInitialMember(draft.initialMember && draft.initialMember.wallet !== wallet ? draft.initialMember : null)
    }
    hydratedRef.current = true
  }, [wallet])

  // Persist the draft (debounced) whenever a meaningful field changes.
  const saveDraft = useCallback(() => {
    if (!wallet || !hydratedRef.current || createdSuccessRef.current) return
    saveAllianceDraft(
      { name, handle, description, purpose, vis, initialMember, savedAt: Date.now() },
      wallet,
    )
  }, [wallet, name, handle, description, purpose, vis, initialMember])
  const debouncedSaveDraft = useDebounce(saveDraft, AUTO_SAVE_DEBOUNCE_MS)

  useEffect(() => {
    if (name || handle || description || purpose || initialMember) debouncedSaveDraft()
  }, [name, handle, description, purpose, vis, initialMember, debouncedSaveDraft])

  useEffect(() => { scheduleHandleCheck(handle) }, [handle])

  // Save immediately if the user navigates away mid-edit (unless we just created).
  const saveDraftRef = useRef(saveDraft)
  saveDraftRef.current = saveDraft
  useEffect(() => {
    return () => { if (!createdSuccessRef.current) saveDraftRef.current() }
  }, [])

  // Load ALL registered members for the initial-participant picker (not just
  // the paid-tier directory). With no query it browses everyone (clicking the
  // field shows the list); typing filters server-side. We fetch the full set
  // once and paginate the *display* client-side via `participantLimit`.
  useEffect(() => {
    if (initialMember) return
    const q = participantQuery.trim()
    let cancelled = false
    const run = async () => {
      if (!cancelled) setParticipantLoading(true)
      try {
        const res = await fetchMembers(q || undefined, 200)
        if (!cancelled) {
          // The creator is already a member of their own alliance — exclude
          // their own wallet so they can't add themselves as an initial
          // participant (which breaks membership/threshold setup downstream).
          setParticipantResults((res.members ?? []).filter((u) => u.wallet && u.wallet !== wallet))
          setParticipantLimit(10)
        }
      } catch {
        if (!cancelled) setParticipantResults([])
      } finally {
        if (!cancelled) setParticipantLoading(false)
      }
    }
    // Debounce typing; load immediately when just browsing.
    const t = setTimeout(run, q ? 300 : 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [participantQuery, initialMember, wallet])

  // Close the participant dropdown when clicking outside of it.
  useEffect(() => {
    if (!participantOpen) return
    const onDown = (e: MouseEvent) => {
      if (
        participantBoxRef.current &&
        !participantBoxRef.current.contains(e.target as Node)
      ) {
        setParticipantOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [participantOpen])

  // Word-count limits for the description and purpose fields.
  const DESC_MIN = 50
  const DESC_MAX = 500
  const PURPOSE_MIN = 25
  const PURPOSE_MAX = 250
  const charCount = (t: string) => t.trim().length
  const descWords = charCount(description)
  const purposeWords = charCount(purpose)
  // Description and purpose are optional — an empty field is allowed. When the
  // user does type something, it must still fall within the min/max range.
  const descOk = descWords === 0 || (descWords >= DESC_MIN && descWords <= DESC_MAX)
  const purposeOk = purposeWords === 0 || (purposeWords >= PURPOSE_MIN && purposeWords <= PURPOSE_MAX)

  // Handle availability check
  function scheduleHandleCheck(h: string) {
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current)
    setHandleAvailable(null)
    setHandleSuggestion(null)
    if (!h || !isValidHandle(h)) { setHandleChecking(false); return }
    setHandleChecking(true)
    const version = ++handleCheckVersion.current
    handleCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/alliances/handle-availability?handle=${encodeURIComponent(h)}`,
        )
        const result = await res.json().catch(() => ({ available: null }))
        if (version !== handleCheckVersion.current) return
        setHandleAvailable(result.available)
        setHandleSuggestion(null)
      } catch {
        if (version !== handleCheckVersion.current) return
        setHandleAvailable(null); setHandleSuggestion(null)
      } finally {
        if (version === handleCheckVersion.current) setHandleChecking(false)
      }
    }, 250)
  }

  function acceptHandleSuggestion() {
    if (!handleSuggestion) return
    setHandle(handleSuggestion)
    setHandleTouched(true)
    scheduleHandleCheck(handleSuggestion)
  }

  const handleFormatError = handle && !isValidHandle(handle) ? 'Only letters, numbers, and underscores allowed' : null
  const handleAvailError = !handleFormatError && handleAvailable === false ? 'Handle already taken' : null
  const inlineHandleError = handleFormatError || handleAvailError

  async function createAlliance() {
    if (saving) return
    if (!descOk) {
      setError(
        `Description must be between ${DESC_MIN} and ${DESC_MAX} characters (currently ${descWords}).`,
      )
      return
    }
    if (!purposeOk) {
      setError(
        `Purpose / project must be between ${PURPOSE_MIN} and ${PURPOSE_MAX} characters (currently ${purposeWords}).`,
      )
      return
    }
    setSaving(true)
    setError('')
    setMsg('')
    try {
      // When a shared wallet is requested, the on-chain Squads multisig is
      // created FIRST. Only if that succeeds do we save the alliance — so we
      // never end up with an alliance in the database that has no wallet.
      let squads: { multisigPda: string; vaultPda: string } | null = null
      if (walletOn) {
        if (!wallet) {
          setError('Please sign in first — creating a team wallet needs your wallet.')
          setSaving(false)
          return
        }
        // Make sure the creator can pay the small on-chain fee.
        try {
          const lamports = await connection.getBalance(new PublicKey(wallet))
          if (lamports < 0.01 * LAMPORTS_PER_SOL) {
            setError(
              'Your wallet needs a little SOL to create the team wallet on-chain. Add some funds and try again.',
            )
            setSaving(false)
            return
          }
        } catch {
          /* balance check is best-effort; continue if it can't be read */
        }
        // Create the multisig on-chain. If this fails, nothing is saved.
        try {
          setMsg('Creating the team wallet on-chain…')
          squads = await createSquadsMultisig({
            connection,
            creator: new PublicKey(wallet),
            token,
            memo: name.trim() || 'New Alliance',
          })
        } catch (we: any) {
          setMsg('')
          setError(
            `Couldn’t create the team wallet on-chain: ${we?.message || 'wallet error'}. Nothing was saved — please try again.`,
          )
          setSaving(false)
          return
        }
      }

      // On-chain wallet is ready (or wasn't requested) — now save the alliance.
      const created = await apiCreateAlliance(
        {
          name: name.trim() || 'New Alliance',
          handle: handle.trim() || undefined,
          description: description.trim() || undefined,
          purpose: purpose.trim() || undefined,
          visibility: vis.toLowerCase() as 'public' | 'private' | 'secret',
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          threshold,
          walletEnabled: walletOn,
          spendingRule: spendingRule.trim() || undefined,
          defaultTools: defaultTools.trim() || undefined,
        },
        token,
      )

      // Attach the on-chain wallet addresses we created above.
      if (squads) {
        await attachAllianceWallet(
          created.id,
          { multisigPda: squads.multisigPda, vaultPda: squads.vaultPda },
          token,
        )
        setMsg(
          `Created “${created.name}” — Team Wallet ${squads.vaultPda.slice(0, 4)}…${squads.vaultPda.slice(-4)} ready.`,
        )

        // Optional: add the chosen initial member now. With the fresh 1/1
        // multisig the creator's approval executes it immediately on-chain,
        // then we mirror it in the database.
        if (initialMember && wallet) {
          try {
            await addMemberOnChain({
              connection,
              multisigPda: squads.multisigPda,
              creator: new PublicKey(wallet),
              newMember: initialMember.wallet,
              token,
            })
            await addAllianceMember(
              created.id,
              { wallet: initialMember.wallet, role: 'Member' },
              token,
            )
            setMsg(
              `Created “${created.name}” with ${initialMember.name} added as a member.`,
            )
          } catch (me: any) {
            setError(
              `Alliance created, but adding ${initialMember.name} failed: ${me?.message || 'error'}. You can add them from the alliance page.`,
            )
          }
        }
      } else {
        setMsg(`Created “${created.name}” — you are its Wizard.`)
      }

      // The alliance is saved — drop the draft so it doesn't reappear on /team.
      createdSuccessRef.current = true
      if (wallet) clearAllianceDraft(wallet)

      // Back to the list, which reloads and shows the new alliance.
      router.push('/team')
    } catch (e: any) {
      setMsg('')
      const message = e?.message || 'Failed to create alliance'
      setError(message)
      // The live check can be stale (e.g. it just got taken by someone else,
      // or — in the on-chain wallet flow — a partial earlier attempt already
      // claimed it). If the server says the handle is taken, reflect that on
      // the field itself rather than leaving the green "available" state up.
      if (/handle.*taken/i.test(message)) {
        setHandleAvailable(false)
        setHandleTouched(true)
      }
      setSaving(false)
    }
  }

  return (
    <div className="kc-al">
      <style>{CSS}</style>

      <div className="page page-wide">
        {/* HEADER */}
        <div className="pg-head">
          <div>
            <button className="al-back" onClick={() => router.push('/team')}>← Back to Alliances</button>
            <div className="pg-eyebrow">Building mode · Organization</div>
            <h1 className="pg-title">Create an Alliance</h1>
            <p className="pg-sub">
              Any member can start one. You become its first <b>Wizard</b>. It lives inside <b>Kidunaverse</b> and
              inherits its mission, legal standing, and rules — it can&apos;t override the DUNA&apos;s core policies.
            </p>
          </div>
        </div>

        {/* CREATE FORM */}
        <div className="al-create">
          <div className="fgrid">
            <div>
              <label>Alliance name <span style={{ color: '#f87171' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="e.g. Conference Planning" value={name} maxLength={25} onChange={(e) => { const v = e.target.value; setName(v); if (!v.trim()) { setHandle(''); setHandleTouched(false); } else if (!handleTouched) { setHandle(v.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, HANDLE_MAX)); } }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: name.length > 25 ? '#f87171' : name.length === 25 ? '#fff' : 'rgba(255,255,255,0.3)' }}>{name.length}/25</span>
              </div>
            </div>
            <div>
              <label>Handle <span style={{ color: '#f87171' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: 14, pointerEvents: 'none' }}>@</span>
                <input
                  type="text"
                  placeholder="conference_planning"
                  value={handle}
                  maxLength={HANDLE_MAX}
                  style={{ paddingLeft: 28, paddingRight: 80, borderColor: inlineHandleError ? 'rgba(239,68,68,0.5)' : handleAvailable === true && handle ? 'rgba(34,197,94,0.5)' : undefined }}
                  onChange={(e) => { setHandle(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')); setHandleTouched(true) }}
                  onBlur={() => setHandleTouched(true)}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {handleChecking && <Icon icon="lucide:loader-2" width={14} height={14} style={{ color: 'rgba(255,255,255,0.4)', animation: 'spin 1s linear infinite' }} />}
                  {!handleChecking && handleAvailable === true && handle && !handleFormatError && <Icon icon="lucide:check-circle-2" width={14} height={14} style={{ color: '#4ade80' }} />}
                  {!handleChecking && handleAvailError && <Icon icon="lucide:x-circle" width={14} height={14} style={{ color: '#f87171' }} />}
                  <span style={{ fontSize: 11, color: handle.length > HANDLE_MAX ? '#f87171' : handle.length === HANDLE_MAX ? '#fff' : 'rgba(255,255,255,0.3)' }}>{handle.length}/{HANDLE_MAX}</span>
                </span>
              </div>
              {handleFormatError && (
                <p style={{ fontSize: 12, color: '#f87171', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon icon="lucide:alert-circle" width={12} height={12} />{handleFormatError}
                </p>
              )}
              {handleAvailError && (
                <p style={{ fontSize: 12, color: '#f87171', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon icon="lucide:alert-circle" width={12} height={12} />{handleAvailError}
                  {handleSuggestion && <>{' · '}<button type="button" onClick={acceptHandleSuggestion} style={{ color: '#EAAA00', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}>Use @{handleSuggestion}?</button></>}
                </p>
              )}
              {!inlineHandleError && handleAvailable === true && handle && (
                <p style={{ fontSize: 12, color: '#4ade80', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon icon="lucide:check-circle-2" width={12} height={12} />Handle is available
                </p>
              )}
            </div>
            <div className="full">
              <label>Description</label>
              <textarea rows={2} placeholder="What this Alliance is for." value={description} onChange={(e) => setDescription(e.target.value)} />
              <div style={{ fontSize: 12, marginTop: 4, textAlign: 'right', color: descOk || descWords === 0 ? 'var(--muted, #8b93a7)' : '#e0457b' }}>
                {descWords}/{DESC_MAX} characters{descWords > 0 && descWords < DESC_MIN ? ` · min ${DESC_MIN}` : ''}{descWords > DESC_MAX ? ` · over by ${descWords - DESC_MAX}` : ''}
              </div>
            </div>
            <div>
              <label>Purpose / project</label>
              <input type="text" placeholder="Plan and run Kiduna Live" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
              <div style={{ fontSize: 12, marginTop: 4, textAlign: 'right', color: purposeOk || purposeWords === 0 ? 'var(--muted, #8b93a7)' : '#e0457b' }}>
                {purposeWords}/{PURPOSE_MAX} characters{purposeWords > 0 && purposeWords < PURPOSE_MIN ? ` · min ${PURPOSE_MIN}` : ''}{purposeWords > PURPOSE_MAX ? ` · over by ${purposeWords - PURPOSE_MAX}` : ''}
              </div>
            </div>
            <div>
              <label>Visibility</label>
              <div className="seg">
                {VIS_OPTIONS.map((v) => (
                  <button key={v} className={vis === v ? 'active' : ''} onClick={() => setVis(v)}>{v}</button>
                ))}
              </div>
            </div>
            <div className="full" style={{ position: 'relative' }} ref={participantBoxRef}>
              <label>Initial participant · optional</label>
              {initialMember ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <span style={{ flex: 1 }}>
                    {initialMember.name}{' '}
                    <span style={{ opacity: 0.6, fontSize: 12 }}>
                      {initialMember.wallet.slice(0, 4)}…{initialMember.wallet.slice(-4)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => { setInitialMember(null); setParticipantQuery(''); setParticipantLimit(10) }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search people by name to add one member (optional)"
                    value={participantQuery}
                    onChange={(e) => setParticipantQuery(e.target.value)}
                    onFocus={() => setParticipantOpen(true)}
                  />
                  {participantOpen && participantResults.length > 0 && (
                    <div
                      onScroll={(e) => {
                        const el = e.currentTarget
                        if (
                          participantLimit < participantResults.length &&
                          el.scrollTop + el.clientHeight >= el.scrollHeight - 24
                        ) {
                          setParticipantLimit((n) => n + 10)
                        }
                      }}
                      style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', marginTop: 4, background: 'var(--surface-elev, #100E59)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 220, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
                    >
                      {participantResults.slice(0, participantLimit).map((u) => {
                        const nm = (u.displayName || u.name || u.username || 'Member') as string
                        return (
                          <button
                            key={u.wallet}
                            type="button"
                            onClick={() => {
                              setInitialMember({ wallet: u.wallet as string, name: nm })
                              setParticipantOpen(false)
                              setParticipantResults([])
                            }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
                          >
                            {nm}{' '}
                            <span style={{ opacity: 0.55, fontSize: 12 }}>
                              {u.username ? '@' + u.username + ' · ' : ''}{(u.wallet || '').slice(0, 4)}…{(u.wallet || '').slice(-4)}
                            </span>
                          </button>
                        )
                      })}
                      {participantLoading && (
                        <div style={{ textAlign: 'center', padding: '8px 12px', opacity: 0.6, fontSize: 12 }}>
                          Loading…
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div><label>Approval threshold</label><input type="text" value={`1 of ${initialMember ? 2 : 1}`} disabled readOnly title="A new alliance starts at 1 of 1. Add members, then raise the threshold later under “Approval Threshold”." /><div style={{ fontSize: 12, marginTop: 4, color: 'var(--fg-soft, #8b93a7)' }}>Starts at 1 of {initialMember ? 2 : 1} — raise it later under “Approval Threshold”.</div></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-gold btn-sm" onClick={createAlliance} disabled={saving || !name.trim() || !handle.trim() || !!handleFormatError || handleAvailable !== true || !descOk || !purposeOk}>{saving ? 'Creating…' : 'Create Alliance'}</button>
            <button className="btn btn-soft btn-sm" onClick={() => router.push('/team')} disabled={saving}>Cancel</button>
            <span className="al-note" style={{ margin: 0, color: 'var(--success)' }}>{msg}</span>
            {error && <span className="al-note" style={{ margin: 0, color: '#f87171' }}>{error}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

const CSS = `
.kc-al{
  --kin-skyblue:#03CCD9;
  --wv-gold:#EAAA00; --wv-gold-hover:#FFC229; --wv-gold-soft:rgba(234,170,0,0.14);
  --on-accent:#09073A;
  --bg:#09073A; --bg-deep:#03011B;
  --surface:#0A0D33; --surface-elev:#100E59; --surface-muted:rgba(255,255,255,0.04);
  --fg:#FFFFFF; --fg-muted:#CDCDCD; --fg-soft:rgba(255,255,255,0.60); --fg-dim:rgba(255,255,255,0.35);
  --border:rgba(255,255,255,0.12); --border-strong:rgba(255,255,255,0.22);
  --accent:var(--wv-gold); --accent-hover:var(--wv-gold-hover);
  --success:#00EB75;
  --font-display:"Goudy Heavyface","Goudy Old Style",Georgia,serif;
  --font-sans:"Avenir","Avenir Next",ui-sans-serif,system-ui,sans-serif;
  --font-mono:ui-monospace,"SF Mono",Menlo,monospace;
  --radius-xs:4px; --radius-sm:6px; --radius-md:10px; --radius-lg:14px; --radius-xl:20px; --radius-pill:9999px;
  font-family:var(--font-sans); color:var(--fg);
}
.kc-al *{box-sizing:border-box;}
.kc-al .page{max-width:1080px;margin:0 auto;padding:0 30px 80px;}
.kc-al .page-wide{max-width:1240px;}

/* page head */
.kc-al .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px;flex-wrap:wrap;}
.kc-al .pg-title{font-family:var(--font-display);font-weight:400;font-size:2.1rem;line-height:1;margin:0;color:var(--fg);}
.kc-al .pg-sub{color:var(--fg-soft);font-size:0.9rem;margin:6px 0 0;line-height:1.5;max-width:760px;}
.kc-al .pg-eyebrow{font-size:0.66rem;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--kin-skyblue);margin-bottom:8px;}
.kc-al .al-back{background:none;border:none;color:var(--fg-soft);font:inherit;font-size:0.82rem;cursor:pointer;padding:0;margin-bottom:14px;transition:120ms;}
.kc-al .al-back:hover{color:var(--fg);}

/* buttons */
.kc-al .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-sans);font-weight:700;font-size:0.92rem;padding:0.7rem 1.25rem;border-radius:var(--radius-sm);border:1px solid transparent;cursor:pointer;transition:140ms;text-align:center;line-height:1;}
.kc-al .btn-gold{background:var(--accent);color:var(--on-accent);}
.kc-al .btn-gold:hover{background:var(--accent-hover);}
.kc-al .btn-gold:disabled{opacity:.5;cursor:not-allowed;}
.kc-al .btn-soft{background:var(--surface);color:var(--fg);border-color:var(--border);}
.kc-al .btn-soft:hover{border-color:var(--border-strong);}
.kc-al .btn-sm{font-size:0.8rem;padding:0.48rem 0.9rem;}

/* chips */
.kc-al .chip{font-family:var(--font-sans);font-weight:700;font-size:0.82rem;padding:0.46rem 0.95rem;border-radius:var(--radius-pill);background:var(--surface);border:1px solid var(--border);color:var(--fg-muted);cursor:pointer;transition:120ms;display:inline-flex;align-items:center;gap:7px;}
.kc-al .chip:hover{border-color:var(--border-strong);color:var(--fg);}

/* segmented control */
.kc-al .seg{display:flex;flex-wrap:wrap;gap:6px;}
.kc-al .seg button{font-size:0.74rem;font-weight:700;padding:5px 10px;border-radius:999px;border:1px solid var(--border);background:var(--bg-deep);color:var(--fg-muted);cursor:pointer;transition:120ms;}
.kc-al .seg button:hover{border-color:var(--border-strong);color:var(--fg);}
.kc-al .seg button.active{background:var(--wv-gold-soft);border-color:rgba(234,170,0,0.5);color:var(--accent);}

/* create form */
.kc-al .al-create{border:1px solid var(--border-strong);border-radius:var(--radius-xl);padding:24px;margin:4px 0 24px;background:linear-gradient(150deg,#100E59,#0A0D33);}
.kc-al .al-create .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.kc-al .al-create label{display:block;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-soft);margin-bottom:6px;}
.kc-al .al-create select,.kc-al .al-create input,.kc-al .al-create textarea{font:inherit;font-size:.88rem;color:var(--fg);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xs);padding:8px 10px;width:100%;}
.kc-al .al-create .full{grid-column:1 / -1;}
.kc-al .al-note{font-size:.78rem;color:var(--fg-soft);margin:14px 0 0;}

@media(max-width:820px){
  .kc-al .al-create .fgrid{grid-template-columns:1fr;}
  .kc-al .pg-title{font-size:1.7rem;}
  .kc-al .page{padding:0 16px 96px;}
}
`
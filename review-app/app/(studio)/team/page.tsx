'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { listAlliances, type Alliance } from '@/lib/alliances-api'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { listAllianceProposals } from '@/lib/squads-proposals'

/* ──────────────────────────────────────────────────────────────────────────
   Alliances — a faithful reproduction of the Kiduna Club "Alliances" view
   (https://www.kiduna.club/app.html#alliances).

   Everything is scoped under `.kc-al` so the design tokens and the kiduna
   class names (.card, .chip, .btn, .grid, …) cannot clash with the project's
   own global styles. Tokens, classes, copy, colors, fonts, and sizes are
   carried over verbatim from the source page.
   ────────────────────────────────────────────────────────────────────────── */

// ROLE_OPTIONS — used by the hidden Roles section
// const ROLE_OPTIONS = ['Wizard', 'Operator', 'Connector', 'Treasurer', 'Organizer', 'Guide', 'Scribe', 'Member', 'Guest']

type Card = {
  id: string
  ini: string
  name: string
  handle: string
  status: 'active' | 'draft' | ''
  statusLabel: string
  purpose: string
  visibility: string
  participants: string
  allies: string
  awaiting: boolean
  wallet: string
  role: string
  subLine: string
  archived?: boolean
}


// ASSIGN_ROWS / ROLE_REFERENCE — used by the hidden Roles section
// const ASSIGN_ROWS = [
//   { nm: 'Ada Whitfield', sb: '@ada · creator', selected: 'Wizard' },
//   { nm: 'Rue', sb: '@rue', selected: 'Operator' },
//   { nm: 'Jules', sb: '@jules', selected: 'Treasurer' },
//   { nm: 'Mara', sb: '@mara', selected: 'Guide' },
//   { nm: 'Theo', sb: '@theo', selected: 'Scribe' },
// ]
//
// const ROLE_REFERENCE = [
//   ['Wizard', 'Full control — settings, roles, Allies, wallet, visibility, archive, transfer authority. Always at least one.'],
//   ['Operator', 'Operational manager — edit resources, add participants, manage work and tools, approve within limits.'],
//   ['Connector', 'External relationships — invite Sponsors, DUNAs, and Alliances; manage partnerships; request Codes.'],
//   ['Treasurer', 'Treasury and resources — prepare and approve payments within limits, classify, distribute, report.'],
//   ['Organizer', 'Ally manager — add, configure, pause, and assign Allies to tasks without broader Member control.'],
//   ['Guide', 'Project or activity lead — create and assign tasks, manage work boards, schedule gatherings, post updates.'],
//   ['Scribe', 'Records and communications — notes, reports, shared documents, meeting summaries, public descriptions.'],
//   ['Member', 'Standard participant — do the work, join discussions, complete tasks, receive payments if allowed.'],
//   ['Guest', 'Limited participant — see and act only where invited; no wallet, no inviting, no shared-tool control.'],
// ]

export default function AlliancesPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const { connection } = useConnection()

  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const wallet = user?.wallet

  // In-progress alliance draft (saved by /team/create in localStorage, keyed by
  // wallet). Listed here so you can resume or discard it — same as agent drafts.
  const [draft, setDraft] = useState<{ name: string; savedAt: number } | null>(null)

  useEffect(() => {
    if (!wallet) return
    const key = `kinship_alliance_draft_${wallet}`
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const d = JSON.parse(stored)
        if (d?.savedAt && Date.now() - d.savedAt < 24 * 60 * 60 * 1000) {
          setDraft({ name: d.name || 'Untitled Alliance', savedAt: d.savedAt })
        } else {
          localStorage.removeItem(key)
          setDraft(null)
        }
      } else {
        setDraft(null)
      }
    } catch {
      setDraft(null)
    }
  }, [wallet])

  function deleteDraft() {
    if (wallet) {
      try { localStorage.removeItem(`kinship_alliance_draft_${wallet}`) } catch { }
    }
    setDraft(null)
  }

  const toCard = useCallback(
    (a: Alliance): Card => {
      const ini = (a.name.match(/[A-Za-z0-9]+/g) || ['A'])
        .map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
      const cap = (x: string) => (x ? x[0].toUpperCase() + x.slice(1) : x)
      const myRole =
        a.members.find((m: Alliance['members'][number]) => m.wallet === wallet)?.role ||
        (a.creatorWallet === wallet ? 'Wizard' : 'Member')
      const st = a.status === 'archived' ? '' : a.status === 'draft' ? 'draft' : 'active'
      return {
        id: a.id,
        ini,
        name: a.name,
        handle: a.handle?.[0] === '@' ? a.handle : '@' + a.handle,
        status: st as Card['status'],
        statusLabel: a.status === 'archived' ? 'Archived' : a.status === 'draft' ? 'Draft' : 'Active',
        purpose: a.purpose || a.description || 'New alliance — invite participants, assign roles, start the work.',
        visibility: cap(a.visibility),
        participants: String(a.members.length),
        allies: '0',
        wallet: a.vaultPda ? '0.0000 SOL' : '—',
        role: myRole,
        subLine: `Threshold ${a.threshold} of ${a.members.filter((m: Alliance['members'][number]) => m.isSigner).length || 1}`,
        archived: a.status === 'archived',
        // No invitation/pending-proposal data on the list endpoint yet, so this
        // is false for now (the counter shows a real 0 instead of a fake number).
        awaiting: false,
      }
    },
    [wallet],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listAlliances(token)
      setCards(list.map(toCard))

      // Fetch each alliance's on-chain SOL balance for the Wallet field.
      const balances = new Map<string, string>()
      await Promise.all(
        list.map(async (a) => {
          if (!a.vaultPda) return
          try {
            const lamports = await connection.getBalance(new PublicKey(a.vaultPda))
            balances.set(a.id, `${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
          } catch {
            /* leave the placeholder if the balance can't be read */
          }
        }),
      )
      if (balances.size > 0) {
        setCards((cs) =>
          cs.map((c) =>
            balances.has(c.id) ? { ...c, wallet: balances.get(c.id)! } : c,
          ),
        )
      }

      // "Awaiting you" = alliances where you're a signer and there's a
      // proposal you haven't approved yet. Computed on-chain (best-effort).
      if (wallet) {
        const awaitingIds = new Set<string>()
        await Promise.all(
          list.map(async (a) => {
            if (!a.multisigPda) return
            const isMember = a.members.some(
              (m: Alliance['members'][number]) => m.wallet === wallet,
            )
            if (!isMember) return
            try {
              const props = await listAllianceProposals({
                connection,
                multisigPda: a.multisigPda,
              })
              const pending = props.some(
                (p) => p.status !== 'Executed' && !p.approved.includes(wallet),
              )
              if (pending) awaitingIds.add(a.id)
            } catch {
              /* skip alliances whose proposals can't be read */
            }
          }),
        )
        if (awaitingIds.size > 0) {
          setCards((cs) =>
            cs.map((c) =>
              awaitingIds.has(c.id) ? { ...c, awaiting: true } : c,
            ),
          )
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load alliances')
    } finally {
      setLoading(false)
    }
  }, [token, toCard, wallet, connection])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="kc-al">
      <style>{CSS}</style>

      <div className="page page-wide">
        {/* HEADER */}
        <div className="pg-head">
          <div>
            <div className="pg-eyebrow">Building mode · Organization</div>
            <h1 className="pg-title">Alliances</h1>
            <p className="pg-sub">
              An <b>Alliance</b> is a flexible working group inside a DUNA — a project team, a store crew, a veterans
              circle, a guild, a campaign, or a DUNA-to-DUNA partnership. The DUNA is the legal and governance
              container; the Alliance is the operational one. It inherits the DUNA&apos;s mission, legal standing, and
              rules, and can hold its own Squads wallet.
            </p>
          </div>
          <button className="btn btn-gold" onClick={() => router.push('/team/create')}>＋ New Alliance</button>
        </div>

        {/* STATS */}
        <div className="grid g3" style={{ marginBottom: 20 }}>
          <div className="wb"><div className="k"><i />Your alliances</div><div className="v">{cards.length}</div></div>
          <div className="wb"><div className="k"><i />You&apos;re a Wizard of</div><div className="v">{cards.filter((c) => c.role === 'Wizard').length}</div></div>
          <div className="wb"><div className="k"><i />Awaiting you</div><div className="v">{cards.filter((c) => c.awaiting).length}</div></div>
        </div>

        {/* ALLIANCE CARDS */}
        {error && <p className="al-note" style={{ color: '#f87171' }}>{error}</p>}

        {/* DRAFT — an in-progress alliance you can resume or discard */}
        {draft && (
          <div className="mb-6">
            <h2
              className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3 flex items-center gap-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <Icon icon="lucide:file-edit" width={12} height={12} />
              Unsaved Drafts
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              <div
                className="flex-shrink-0 rounded-xl p-4 min-w-[220px] max-w-[280px]"
                style={{
                  background: '#0A0D33',
                  border: '1px dashed rgba(234,170,0,0.35)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    icon="lucide:users"
                    width={14}
                    height={14}
                    style={{ color: '#EAAA00' }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(234,170,0,0.15)',
                      color: '#EAAA00',
                    }}
                  >
                    Alliance
                  </span>
                </div>
                <p className="text-sm font-medium text-white truncate mb-1">
                  {draft.name}
                </p>
                <p
                  className="text-[10px] mb-3"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Saved {new Date(draft.savedAt).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/team/create')}
                    className="flex-1 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    style={{
                      background: 'rgba(234,170,0,0.12)',
                      color: '#EAAA00',
                      border: '1px solid rgba(234,170,0,0.3)',
                    }}
                  >
                    Resume
                  </button>
                  <button
                    onClick={deleteDraft}
                    className="text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    style={{
                      background: 'rgba(255,58,58,0.10)',
                      color: '#ff6b6b',
                      border: '1px solid rgba(255,58,58,0.2)',
                    }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && cards.length === 0 && (
          <div className="al-grid" style={{ marginTop: 4 }}>
            <style>{`@keyframes tm-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="al-card" style={{ position: 'relative', overflow: 'hidden', gap: 12 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'tm-shimmer 1.4s ease-in-out infinite', zIndex: 1 }} />
                {/* top row: coin + name + status */}
                <div className="al-top">
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 18, width: '55%', borderRadius: 5, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />
                    <div style={{ height: 12, width: '35%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                  <div style={{ width: 52, height: 20, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }} />
                </div>
                {/* purpose */}
                <div style={{ height: 13, width: '90%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ height: 13, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                {/* meta grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px' }}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} style={{ height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="al-grid">
          {cards.map((c, i) => (
            <div key={i} className={c.archived ? 'al-card archived' : 'al-card'} style={{ cursor: 'pointer' }} onClick={() => router.push(`/team/${c.id}/send-funds`)}>
              <div className="al-top">
                <span className="al-coin">{c.ini}</span>
                <div>
                  <div className="al-name">{c.name}</div>
                  <div className="al-handle">{c.handle}</div>
                </div>
                <span className={`al-status ${c.status}`.trim()}>{c.statusLabel}</span>
              </div>
              <p className="al-purpose">{c.purpose}</p>
              <div className="al-meta">
                <div>Visibility · <b>{c.visibility}</b></div>
                <div>Participants · <b>{c.participants}</b></div>
                <div>Wallet · <b>{c.wallet}</b></div>
                <div>Your role · <b>{c.role}</b></div>
              </div>
              {c.subLine && <div className="al-sub-line">{c.subLine}</div>}
            </div>
          ))}
        </div>

        {/* ROLE ASSIGNMENT + ROLE REFERENCE — hidden per request
        <div className="card" style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--fg)' }}>Roles · Conference Planning</div>
            <span className="lr-sub" style={{ marginLeft: 'auto' }}>Roles are assigned only to Members. There must always be at least one Wizard.</span>
          </div>
          {ASSIGN_ROWS.map((r) => (
            <div className="al-assign-row" key={r.nm}>
              <div className="who"><div className="nm">{r.nm}</div><div className="sb">{r.sb}</div></div>
              <select defaultValue={r.selected}>
                {ROLE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="al-assign-row">
            <div className="who"><div className="nm">The Concierge</div><div className="sb">Ally · participant — no human role</div></div>
            <select disabled><option>Participant</option></select>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <div className="pg-eyebrow" style={{ marginBottom: 10 }}>The roles</div>
          <div className="al-roles-grid">
            {ROLE_REFERENCE.map(([rn, rd]) => (
              <div className="al-role" key={rn}><div className="rn">{rn}</div><div className="rd">{rd}</div></div>
            ))}
          </div>
        </div>
        */}
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
.kc-al .pg-sub{color:var(--fg-soft);font-size:0.9rem;margin:6px 0 0;line-height:1.5;}
.kc-al .pg-eyebrow{font-size:0.66rem;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--kin-skyblue);margin-bottom:8px;}

/* buttons */
.kc-al .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-sans);font-weight:700;font-size:0.92rem;padding:0.7rem 1.25rem;border-radius:var(--radius-sm);border:1px solid transparent;cursor:pointer;transition:140ms;text-align:center;line-height:1;}
.kc-al .btn-gold{background:var(--accent);color:var(--on-accent);}
.kc-al .btn-gold:hover{background:var(--accent-hover);}
.kc-al .btn-soft{background:var(--surface);color:var(--fg);border-color:var(--border);}
.kc-al .btn-soft:hover{border-color:var(--border-strong);}
.kc-al .btn-sm{font-size:0.8rem;padding:0.48rem 0.9rem;}

/* chips */
.kc-al .chip{font-family:var(--font-sans);font-weight:700;font-size:0.82rem;padding:0.46rem 0.95rem;border-radius:var(--radius-pill);background:var(--surface);border:1px solid var(--border);color:var(--fg-muted);cursor:pointer;transition:120ms;display:inline-flex;align-items:center;gap:7px;}
.kc-al .chip:hover{border-color:var(--border-strong);color:var(--fg);}

/* grid + cards + wallet blocks */
.kc-al .grid{display:grid;gap:16px;}
.kc-al .g3{grid-template-columns:repeat(3,1fr);}
.kc-al .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;transition:140ms;}
.kc-al .wb{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px 16px;}
.kc-al .wb .k{font-size:0.66rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--fg-soft);font-weight:700;display:flex;align-items:center;gap:6px;}
.kc-al .wb .k i{width:7px;height:7px;border-radius:50%;background:var(--accent);}
.kc-al .wb .v{font-family:var(--font-display);font-size:1.4rem;margin-top:4px;color:var(--fg);}
.kc-al .lr-sub{font-size:0.8rem;color:var(--fg-soft);}

/* toggle */
.kc-al .toggle{width:42px;height:24px;border-radius:999px;background:var(--surface-elev);border:1px solid var(--border);position:relative;cursor:pointer;flex:0 0 auto;transition:140ms;}
.kc-al .toggle::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:var(--fg-soft);transition:140ms;}
.kc-al .toggle.on{background:var(--wv-gold-soft);border-color:rgba(234,170,0,0.5);}
.kc-al .toggle.on::after{left:20px;background:var(--accent);}

/* segmented control */
.kc-al .seg{display:flex;flex-wrap:wrap;gap:6px;}
.kc-al .seg button{font-size:0.74rem;font-weight:700;padding:5px 10px;border-radius:999px;border:1px solid var(--border);background:var(--bg-deep);color:var(--fg-muted);cursor:pointer;transition:120ms;}
.kc-al .seg button:hover{border-color:var(--border-strong);color:var(--fg);}
.kc-al .seg button.active{background:var(--wv-gold-soft);border-color:rgba(234,170,0,0.5);color:var(--accent);}

/* alliances-specific */
.kc-al .al-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:4px;}
.kc-al .al-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 20px 16px;display:flex;flex-direction:column;gap:12px;overflow:hidden;}
.kc-al .al-card.archived{opacity:.5;}
.kc-al .al-top{display:flex;align-items:flex-start;gap:12px;}
.kc-al .al-coin{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:.95rem;background:var(--surface-elev);color:var(--accent);flex:none;}
.kc-al .al-name{font-family:var(--font-display);font-size:1.15rem;line-height:1.08;color:var(--fg);}
.kc-al .al-handle{font-family:var(--font-mono);font-size:.72rem;color:var(--fg-soft);}
.kc-al .al-status{margin-left:auto;font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 9px;border-radius:999px;border:1px solid var(--border);color:var(--fg-soft);white-space:nowrap;}
.kc-al .al-status.active{color:var(--accent);border-color:rgba(234,170,0,.4);}
.kc-al .al-status.draft{color:var(--kin-skyblue);border-color:rgba(3,204,217,.4);}
.kc-al .al-purpose{font-size:.88rem;color:var(--fg-muted);line-height:1.5;margin:0;overflow:hidden;word-break:break-all;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.kc-al .al-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:5px 14px;font-size:.76rem;color:var(--fg-soft);}
.kc-al .al-meta b{color:var(--fg);font-weight:700;font-family:var(--font-sans);}
.kc-al .al-sub-line{font-size:.74rem;color:var(--fg-soft);}
.kc-al .al-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;}
.kc-al .al-acts .chip{cursor:pointer;}
.kc-al .al-roles-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:4px;}
.kc-al .al-role{border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 13px;background:var(--surface);}
.kc-al .al-role .rn{font-family:var(--font-sans);font-weight:700;font-size:.82rem;color:var(--fg);}
.kc-al .al-role .rd{font-size:.72rem;color:var(--fg-soft);margin-top:3px;line-height:1.4;}
.kc-al .al-assign-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px dashed var(--border);}
.kc-al .al-assign-row:last-child{border-bottom:0;}
.kc-al .al-assign-row .who{flex:1;min-width:0;}
.kc-al .al-assign-row .who .nm{color:var(--fg);font-weight:600;font-size:.9rem;}
.kc-al .al-assign-row .who .sb{font-size:.74rem;color:var(--fg-soft);}
.kc-al .al-assign-row select,.kc-al .al-create select,.kc-al .al-create input,.kc-al .al-create textarea{font:inherit;font-size:.88rem;color:var(--fg);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xs);padding:8px 10px;}
.kc-al .al-assign-row select{min-width:148px;}
.kc-al .al-create{border:1px solid var(--border-strong);border-radius:var(--radius-xl);padding:24px;margin:4px 0 24px;background:linear-gradient(150deg,#100E59,#0A0D33);}
.kc-al .al-create .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.kc-al .al-create label{display:block;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-soft);margin-bottom:6px;}
.kc-al .al-create input,.kc-al .al-create textarea,.kc-al .al-create select{width:100%;}
.kc-al .al-create .full{grid-column:1 / -1;}
.kc-al .al-note{font-size:.78rem;color:var(--fg-soft);margin:14px 0 0;}

@media(max-width:820px){
  .kc-al .al-grid,.kc-al .al-roles-grid,.kc-al .al-create .fgrid{grid-template-columns:1fr;}
  .kc-al .g3{grid-template-columns:1fr;}
  .kc-al .pg-title{font-size:1.7rem;}
  .kc-al .page{padding:0 16px 96px;}
}
`
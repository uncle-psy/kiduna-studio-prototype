'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  addMemberOnChain,
  removeMemberOnChain,
  changeThresholdOnChain,
  approveProposalOnChain,
  rejectProposalOnChain,
  executeConfigProposalOnChain,
  listAllianceProposals,
  transferSolOnChain,
  transferUsdcOnChain,
  executeVaultProposalOnChain,
  type AllianceProposal,
} from '@/lib/squads-proposals'
import {
  getAlliance,
  addAllianceMember,
  updateAllianceMember,
  removeAllianceMember,
  changeAllianceThreshold,
  type AllianceDetail,
} from '@/lib/alliances-api'

const ROLES = [
  'Wizard', 'Operator', 'Connector', 'Treasurer',
  'Organizer', 'Guide', 'Scribe', 'Member', 'Guest',
]

// New members can only be added as "Member".
const ADD_ROLES = ['Member']

function short(s: string | null | undefined, n = 4) {
  if (!s) return '—'
  return s.length <= n * 2 + 1 ? s : `${s.slice(0, n)}…${s.slice(-n)}`
}

function CopyButton({ value }: { value?: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        } catch {
          /* clipboard unavailable */
        }
      }}
      title="Copy address"
      style={{
        marginLeft: 6,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: copied ? 'var(--accent, #16a34a)' : 'inherit',
        opacity: 0.7,
        fontSize: 12,
        padding: 2,
        lineHeight: 1,
      }}
    >
      {copied ? 'Copied ✓' : '⧉'}
    </button>
  )
}

export default function AllianceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params?.id ?? '')
  const { user, token } = useAuth()
  const { connection } = useConnection()
  const myWallet = user?.wallet

  const [balance, setBalance] = useState<string>('—')

  const [alliance, setAlliance] = useState<AllianceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  // add-member form
  const [newWallet, setNewWallet] = useState('')
  const [newRole, setNewRole] = useState('Member')

  // threshold edit
  const [thresholdInput, setThresholdInput] = useState<number>(1)

  // on-chain proposals
  const [proposals, setProposals] = useState<AllianceProposal[]>([])

  // send funds form
  const [toAddr, setToAddr] = useState('')
  const [amount, setAmount] = useState('')
  const [sendToken, setSendToken] = useState<'SOL' | 'USDC'>('SOL')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const a = await getAlliance(id, token)
      setAlliance(a)
      setThresholdInput(a.threshold)
    } catch (e: any) {
      setError(e?.message || 'Failed to load alliance')
    } finally {
      setLoading(false)
    }
  }, [id, token])

  useEffect(() => {
    load()
  }, [load])

  const loadProposals = useCallback(async () => {
    const pda = alliance?.multisigPda
    if (!pda) { setProposals([]); return }
    try {
      const list = await listAllianceProposals({ connection, multisigPda: pda })
      setProposals(list)
    } catch {
      setProposals([])
    }
  }, [alliance?.multisigPda, connection])

  useEffect(() => {
    loadProposals()
  }, [loadProposals])

  // Read the vault's on-chain balance (SOL + any SPL tokens like USDC).
  useEffect(() => {
    const vault = alliance?.vaultPda
    if (!vault) {
      setBalance('—')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const owner = new PublicKey(vault)
        // Always show SOL; append USDC if the vault holds any.
        const lamports = await connection.getBalance(owner)
        const sol = (lamports / LAMPORTS_PER_SOL).toFixed(4)
        let extra = ''
        try {
          const toks = await connection.getParsedTokenAccountsByOwner(owner, {
            programId: TOKEN_PROGRAM_ID,
          })
          const usdcMint = process.env.NEXT_PUBLIC_USDC_MINT
          const usdc = toks.value
            .filter(
              (t) =>
                !usdcMint ||
                t.account.data.parsed?.info?.mint === usdcMint,
            )
            .map((t) => t.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0)
            .find((amt) => amt > 0)
          if (usdc) extra = ` · ${usdc.toLocaleString()} USDC`
        } catch {
          /* no token balance */
        }
        if (!cancelled) setBalance(`${sol} SOL${extra}`)
      } catch {
        if (!cancelled) setBalance('—')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [alliance?.vaultPda, connection])

  const memberCount = alliance?.members.length ?? 0
  const isWizard =
    alliance?.creatorWallet === myWallet ||
    alliance?.members.some((m) => m.wallet === myWallet && m.role === 'Wizard')
  // Members with an in-flight on-chain remove proposal — their Remove button is
  // disabled so we don't create a duplicate. Terminal proposals (executed,
  // rejected, or cancelled) must NOT keep the member disabled, or a rejected
  // proposal would block re-proposing forever.
  const TERMINAL_PROPOSAL_STATUSES = ['Executed', 'Rejected', 'Cancelled']
  const pendingRemovals = new Set(
    proposals
      .filter(
        (p) =>
          p.kind === 'RemoveMember' &&
          !TERMINAL_PROPOSAL_STATUSES.includes(p.status) &&
          p.removedMember,
      )
      .map((p) => p.removedMember as string),
  )
  const isSigner =
    !!myWallet && !!alliance?.members.some((m) => m.wallet === myWallet)

  async function handleAdd() {
    if (busy || !alliance) return
    if (memberCount >= 10) {
      setError('This alliance already has 10 members, which is the maximum.')
      return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      // If the alliance has an on-chain wallet, run the Squads add-member
      // proposal first (propose + approve; execute now if threshold is met).
      if (alliance.multisigPda && myWallet) {
        const res = await addMemberOnChain({
          connection,
          multisigPda: alliance.multisigPda,
          creator: new PublicKey(myWallet),
          newMember: newWallet.trim(),
          token,
        })
        if (!res.executed) {
          setNotice(
            `Request sent for approval ✓ — ${alliance.threshold} of ${memberCount} members need to approve before this member joins. You’ve approved; ask the others to approve under “Proposals” below.`,
          )
          setNewWallet(''); setNewRole('Member')
          await loadProposals()
          setBusy(false)
          return
        }
      }
      // On-chain done (or no wallet) → record in the DB.
      const updated = await addAllianceMember(
        alliance.id, { wallet: newWallet.trim(), role: newRole }, token,
      )
      setAlliance(updated); setThresholdInput(updated.threshold)
      setNewWallet(''); setNewRole('Member')
      setNotice('Member added ✓')
      await loadProposals()
    } catch (e: any) {
      setError(e?.message || 'Failed to add member')
    } finally { setBusy(false) }
  }

  async function handleRole(memberId: string, role: string) {
    if (busy || !alliance) return
    setBusy(true); setError(''); setNotice('')
    try {
      const updated = await updateAllianceMember(alliance.id, memberId, role, token)
      setAlliance(updated)
    } catch (e: any) {
      setError(e?.message || 'Failed to update role')
    } finally { setBusy(false) }
  }

  async function handleRemove(memberId: string) {
    if (busy || !alliance) return
    const member = alliance.members.find((m) => m.id === memberId)
    if (member && pendingRemovals.has(member.wallet)) {
      setError('A request to remove this member is already waiting for approval.')
      return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      // If the alliance has an on-chain wallet, removing a member is a Squads
      // proposal (propose + approve; execute now if the threshold is met).
      if (alliance.multisigPda && myWallet && member) {
        const res = await removeMemberOnChain({
          connection,
          multisigPda: alliance.multisigPda,
          creator: new PublicKey(myWallet),
          oldMember: member.wallet,
          token,
        })
        if (res.executed) {
          const updated = await removeAllianceMember(alliance.id, memberId, token)
          setAlliance(updated); setThresholdInput(updated.threshold)
          setNotice('Member removed ✓')
        } else {
          setNotice(
            `Request sent for approval ✓ — ${alliance.threshold} of ${memberCount} members need to approve before this member is removed. You’ve approved; ask the others to approve under “Proposals” below.`,
          )
          await loadProposals()
        }
      } else {
        const updated = await removeAllianceMember(alliance.id, memberId, token)
        setAlliance(updated); setThresholdInput(updated.threshold)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to remove member')
    } finally { setBusy(false) }
  }

  async function handleSend() {
    if (busy || !alliance?.multisigPda || !alliance?.vaultPda || !myWallet) return
    const amt = parseFloat(amount)
    if (!toAddr.trim() || !(amt > 0)) {
      setError('Enter a recipient address and an amount greater than 0.')
      return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      const res =
        sendToken === 'USDC'
          ? await transferUsdcOnChain({
              connection,
              multisigPda: alliance.multisigPda,
              vaultPda: alliance.vaultPda,
              creator: new PublicKey(myWallet),
              to: toAddr.trim(),
              amountUsdc: amt,
              token,
            })
          : await transferSolOnChain({
              connection,
              multisigPda: alliance.multisigPda,
              vaultPda: alliance.vaultPda,
              creator: new PublicKey(myWallet),
              to: toAddr.trim(),
              amountSol: amt,
              token,
            })
      if (res.executed) {
        setNotice(`Sent ${amt} ${sendToken} ✓`)
      } else {
        setNotice(
          `Request sent for approval ✓ — ${alliance.threshold} of ${memberCount} members need to approve before the funds are sent. You’ve approved; ask the others to approve under “Proposals” below.`,
        )
      }
      setToAddr(''); setAmount('')
      await Promise.all([load(), loadProposals()])
    } catch (e: any) {
      setError(e?.message || 'Failed to send funds')
    } finally { setBusy(false) }
  }

  async function handleApprove(prop: AllianceProposal) {
    if (busy || !alliance?.multisigPda || !myWallet) return
    setBusy(true); setError(''); setNotice('')
    try {
      await approveProposalOnChain({
        connection,
        multisigPda: alliance.multisigPda,
        member: new PublicKey(myWallet),
        transactionIndex: prop.transactionIndex,
        token,
      })
      await loadProposals()
    } catch (e: any) {
      setError(e?.message || 'Approve failed')
    } finally { setBusy(false) }
  }

  async function handleReject(prop: AllianceProposal) {
    if (busy || !alliance?.multisigPda || !myWallet) return
    setBusy(true); setError(''); setNotice('')
    try {
      await rejectProposalOnChain({
        connection,
        multisigPda: alliance.multisigPda,
        member: new PublicKey(myWallet),
        transactionIndex: prop.transactionIndex,
        token,
      })
      setNotice('Your rejection was recorded ✓')
      await loadProposals()
    } catch (e: any) {
      setError(e?.message || 'Reject failed')
    } finally { setBusy(false) }
  }

  async function handleExecute(prop: AllianceProposal) {
    if (busy || !alliance?.multisigPda || !myWallet) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (prop.isVault) {
        await executeVaultProposalOnChain({
          connection,
          multisigPda: alliance.multisigPda,
          member: new PublicKey(myWallet),
          transactionIndex: prop.transactionIndex,
          token,
        })
      } else {
        await executeConfigProposalOnChain({
          connection,
          multisigPda: alliance.multisigPda,
          member: new PublicKey(myWallet),
          transactionIndex: prop.transactionIndex,
          token,
        })
      }
      // Sync the DB to match what just executed on-chain.
      if (prop.kind === 'AddMember' && prop.newMember) {
        try {
          const updated = await addAllianceMember(
            alliance.id, { wallet: prop.newMember, role: 'Member' }, token,
          )
          setAlliance(updated); setThresholdInput(updated.threshold)
        } catch { /* may already exist */ }
      } else if (prop.kind === 'RemoveMember' && prop.removedMember) {
        try {
          const m = alliance.members.find((x) => x.wallet === prop.removedMember)
          if (m) {
            const updated = await removeAllianceMember(alliance.id, m.id, token)
            setAlliance(updated); setThresholdInput(updated.threshold)
          }
        } catch { /* ignore */ }
      } else if (prop.kind === 'ChangeThreshold' && prop.newThreshold) {
        try {
          const updated = await changeAllianceThreshold(alliance.id, prop.newThreshold, token)
          setAlliance(updated); setThresholdInput(updated.threshold)
        } catch { /* ignore */ }
      }
      await Promise.all([load(), loadProposals()])
    } catch (e: any) {
      setError(e?.message || 'Execute failed')
    } finally { setBusy(false) }
  }

  async function handleThreshold() {
    if (busy || !alliance) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (alliance.multisigPda && myWallet) {
        const res = await changeThresholdOnChain({
          connection,
          multisigPda: alliance.multisigPda,
          creator: new PublicKey(myWallet),
          newThreshold: thresholdInput,
          token,
        })
        if (!res.executed) {
          setNotice(
            `Request sent for approval ✓ — ${alliance.threshold} of ${memberCount} members need to approve this change. You’ve approved; ask the others to approve under “Proposals” below.`,
          )
          await loadProposals()
          setBusy(false)
          return
        }
      }
      const updated = await changeAllianceThreshold(alliance.id, thresholdInput, token)
      setAlliance(updated); setThresholdInput(updated.threshold)
    } catch (e: any) {
      setError(e?.message || 'Failed to change threshold')
    } finally { setBusy(false) }
  }

  if (loading) {
    return <div style={S.wrap}><p style={{ opacity: 0.7 }}>Loading…</p></div>
  }
  if (!alliance) {
    return (
      <div style={S.wrap}>
        <button style={S.back} onClick={() => router.push('/team')}>← Back</button>
        <p style={{ color: '#f87171' }}>{error || 'Alliance not found'}</p>
      </div>
    )
  }

  return (
    <div style={S.wrap}>
      <button style={S.back} onClick={() => router.push('/team')}>← Back to Alliances</button>

      {/* Header */}
      <div style={S.head}>
        <h1 style={S.title}>{alliance.name}</h1>
        <span style={S.handle}>@{alliance.handle}</span>
        <span style={S.badge}>{alliance.status}</span>
      </div>
      {alliance.description && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
          <p
            style={{
              ...S.desc,
              marginTop: 0,
              flex: 1,
              minWidth: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
            title={alliance.description}
          >
            {alliance.description}
          </p>
          <CopyButton value={alliance.description} />
        </div>
      )}
      <div style={S.meta}>
        <span>Visibility · <b>{alliance.visibility}</b></span>
        <span>Threshold · <b>{alliance.threshold} of {memberCount}</b></span>
        {alliance.purpose && (
          <span style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'bottom' }} title={alliance.purpose}>
            Purpose · <b>{alliance.purpose}</b>
          </span>
        )}
      </div>

      {error && <p style={S.err}>{error}</p>}
      {notice && <p style={S.notice}>{notice}</p>}

      {/* Wallet */}
      <section style={S.card}>
        <h2 style={S.h2}>Alliance wallet</h2>
        {alliance.multisigPda ? (
          <div style={S.kv}>
            <div>
              <span style={S.k} title="The control account: who the signers are and how many approvals a transaction needs. No funds are held here.">Controller (multisig) ⓘ</span>
              <code style={S.code}>{short(alliance.multisigPda, 6)}</code>
              <CopyButton value={alliance.multisigPda} />
            </div>
            <div>
              <span style={S.k} title="The treasury account where the alliance's funds (SOL, USDC) are held. Transfers come out of here.">Treasury (vault) ⓘ</span>
              <code style={S.code}>{short(alliance.vaultPda, 6)}</code>
              <CopyButton value={alliance.vaultPda} />
            </div>
            <div><span style={S.k}>Balance</span><b>{balance}</b></div>
          </div>
        ) : (
          <p style={{ opacity: 0.7, margin: 0 }}>No on-chain wallet yet.</p>
        )}
      </section>

      {/* Send funds */}
      {alliance.multisigPda && isSigner && (
        <section style={S.card}>
          <h2 style={S.h2}>Send funds</h2>
          <div style={S.addRow}>
            <input
              placeholder="Recipient wallet address"
              value={toAddr}
              onChange={(e) => setToAddr(e.target.value)}
              style={{ ...S.input, flex: 1 }}
            />
            <input
              type="number"
              min={0}
              step="any"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ ...S.input, maxWidth: 120 }}
            />
            <select
              value={sendToken}
              onChange={(e) => setSendToken(e.target.value as 'SOL' | 'USDC')}
              style={{ ...S.input, maxWidth: 90 }}
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>
            <button style={S.add} disabled={busy} onClick={handleSend}>
              {busy ? '…' : alliance.threshold > 1 ? 'Propose' : 'Send'}
            </button>
          </div>
          <p style={S.note}>
            {alliance.threshold > 1
              ? `Sending funds creates an on-chain proposal. ${alliance.threshold} of ${memberCount} signers must approve before it sends.`
              : 'Sends SOL from the team vault on-chain.'}
          </p>
        </section>
      )}

      {/* Members */}
      <section style={S.card}>
        <h2 style={S.h2}>Members ({memberCount})</h2>
        <div style={S.list}>
          {alliance.members.map((m) => (
            <div key={m.id} style={S.row}>
              <code style={S.code}>{short(m.wallet, 5)}</code>
              {m.wallet === alliance.creatorWallet && <span style={S.tag}>creator</span>}
              <span style={{ flex: 1 }} />
              <select
                value={m.role}
                disabled={!isWizard || busy}
                onChange={(e) => handleRole(m.id, e.target.value)}
                style={S.select}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {isWizard && (
                <button
                  style={S.remove}
                  disabled={busy || pendingRemovals.has(m.wallet)}
                  onClick={() => handleRemove(m.id)}
                >
                  {pendingRemovals.has(m.wallet) ? 'Pending…' : 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>

        {isWizard && memberCount >= 10 ? (
          <p style={{ ...S.note, opacity: 0.8 }}>
            This alliance has reached the maximum of 10 members.
          </p>
        ) : isWizard ? (
          <div style={S.addRow}>
            <input
              style={S.input}
              placeholder="Wallet address (public key)"
              value={newWallet}
              onChange={(e) => setNewWallet(e.target.value)}
            />
            <select style={S.select} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {ADD_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button style={S.add} disabled={busy || !newWallet.trim()} onClick={handleAdd}>
              {busy ? '…' : (alliance.multisigPda && memberCount >= alliance.threshold && alliance.threshold > 1) ? 'Propose Member' : 'Add Member'}
            </button>
          </div>
        ) : null}
        <p style={S.note}>
          {alliance.multisigPda && alliance.threshold > 1
            ? `Adding a member creates an on-chain proposal. ${alliance.threshold} of ${memberCount} signers must approve it before the member is added.`
            : 'Adding a member updates the team wallet on-chain. Roles are assigned only to Members; there must always be at least one Wizard.'}
        </p>
      </section>

      {/* Proposals */}
      {alliance.multisigPda && (
        <section style={S.card}>
          <h2 style={S.h2}>Proposals</h2>
          {proposals.filter((p) => p.status !== 'Executed').length === 0 ? (
            <p style={{ opacity: 0.7, margin: 0 }}>No pending proposals.</p>
          ) : (
            <div style={S.list}>
              {proposals
                .filter((p) => p.status !== 'Executed')
                .map((p) => {
                  const mineApproved = !!myWallet && p.approved.includes(myWallet)
                  const mineRejected = !!myWallet && p.rejected.includes(myWallet)
                  const ready = p.approvedCount >= p.threshold
                  const isCancelled =
                    p.status === 'Rejected' || p.status === 'Cancelled'
                  return (
                    <div key={p.transactionIndex} style={S.row}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>
                          {p.description}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {isCancelled
                            ? `Cancelled — rejected by ${p.rejectedCount} of ${memberCount}`
                            : ready
                              ? `Approved by ${p.approvedCount} of ${p.threshold} — ready to go`
                              : `Waiting · ${p.approvedCount} of ${p.threshold} approved${p.rejectedCount > 0 ? `, ${p.rejectedCount} rejected` : ''}`}
                        </div>
                      </div>
                      {isSigner && !ready && !isCancelled && (
                        <>
                          {!mineRejected && (
                            <button
                              style={S.add}
                              disabled={busy || mineApproved}
                              onClick={() => handleApprove(p)}
                            >
                              {mineApproved ? 'Approved' : 'Approve'}
                            </button>
                          )}
                          {!mineApproved && (
                            <button
                              style={S.remove}
                              disabled={busy || mineRejected}
                              onClick={() => handleReject(p)}
                            >
                              {mineRejected ? 'Rejected' : 'Reject'}
                            </button>
                          )}
                        </>
                      )}
                      {isWizard && ready && !isCancelled && (
                        <button
                          style={S.add}
                          disabled={busy}
                          onClick={() => handleExecute(p)}
                        >
                          Execute
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
          <p style={S.note}>
            Each member approves; once enough have approved, anyone can complete it.
          </p>
        </section>
      )}

      {/* Threshold */}
      {isWizard && (
        <section style={S.card}>
          <h2 style={S.h2}>Approval threshold</h2>
          <div style={S.addRow}>
            <input
              type="number"
              min={1}
              max={memberCount}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(Math.max(1, parseInt(e.target.value || '1', 10) || 1))}
              style={{ ...S.input, maxWidth: 90 }}
            />
            <span style={{ alignSelf: 'center', opacity: 0.7 }}>of {memberCount}</span>
            <button style={S.add} disabled={busy} onClick={handleThreshold}>Change</button>
          </div>
          <p style={S.note}>How many members must approve a transaction. Must be between 1 and {memberCount}.</p>
        </section>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 760, margin: '0 auto', padding: '24px 20px', color: 'var(--fg, #e7e7ef)' },
  back: { background: 'none', border: 'none', color: '#9aa0b5', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 },
  head: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  title: { fontSize: 28, fontWeight: 800, margin: 0 },
  handle: { color: '#9aa0b5', fontSize: 14 },
  badge: { fontSize: 11, fontWeight: 700, color: '#f5b301', border: '1px solid #f5b301', borderRadius: 999, padding: '2px 10px', textTransform: 'uppercase' },
  desc: { color: '#c7cbe0', marginTop: 8 },
  meta: { display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: '#b8bcd0', marginTop: 6 },
  err: { color: '#f87171', marginTop: 12 },
  notice: { color: '#34d399', marginTop: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, padding: '10px 12px', fontSize: 13 },
  card: { border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, marginTop: 18, background: 'rgba(255,255,255,0.02)' },
  h2: { fontSize: 15, fontWeight: 700, margin: '0 0 12px' },
  kv: { display: 'flex', gap: 28, flexWrap: 'wrap' },
  k: { display: 'block', fontSize: 11, color: '#9aa0b5', textTransform: 'uppercase', marginBottom: 3 },
  code: { fontFamily: 'monospace', fontSize: 13, color: '#e7e7ef' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 },
  tag: { fontSize: 10, color: '#9aa0b5', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '1px 6px' },
  select: { background: '#1a1c2b', color: '#e7e7ef', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', fontSize: 13 },
  remove: { background: 'none', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 },
  addRow: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 200, background: '#11131f', color: '#e7e7ef', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 10px', fontSize: 13 },
  add: { background: '#f5b301', color: '#1a1205', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  note: { fontSize: 12, color: '#9aa0b5', marginTop: 10, marginBottom: 0 },
}
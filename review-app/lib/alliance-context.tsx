'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  getAlliance,
  listAlliances,
  addAllianceMember,
  updateAllianceMember,
  removeAllianceMember,
  changeAllianceThreshold,
  type Alliance,
  type AllianceDetail,
} from '@/lib/alliances-api'
import {
  addMemberOnChain,
  removeMemberOnChain,
  changeThresholdOnChain,
  approveProposalOnChain,
  rejectProposalOnChain,
  executeConfigProposalOnChain,
  executeVaultProposalOnChain,
  listAllianceProposals,
  transferSolOnChain,
  transferUsdcOnChain,
  type AllianceProposal,
} from '@/lib/squads-proposals'

/* ────────────────────────────────────────────────────────────────────────────
   Alliance Context
   Shared state for all sub-pages of a single alliance detail view.
   Supports two modes:
     1) Route-based: /team/[allianceId]/… → loads from URL param
     2) Selector-based: /team/select/… → user picks from dropdown
   All business logic, API calls, wallet integrations are UNCHANGED.
   ──────────────────────────────────────────────────────────────────────────── */

interface AllianceContextValue {
  // Alliance list (for the selector)
  alliances: Alliance[]
  alliancesLoading: boolean
  selectedAllianceId: string | null
  selectAlliance: (id: string) => void

  // Core data
  alliance: AllianceDetail | null
  setAlliance: (a: AllianceDetail | null) => void
  loading: boolean
  error: string
  setError: (e: string) => void
  notice: string
  setNotice: (n: string) => void
  busy: boolean
  setBusy: (b: boolean) => void

  // Derived
  memberCount: number
  isWizard: boolean
  isSigner: boolean
  pendingRemovals: Set<string>
  pendingAdditions: Set<string>
  myWallet: string | undefined

  // On-chain balance
  balance: string
  solBalance: number
  usdcBalance: number

  // Proposals
  proposals: AllianceProposal[]
  loadProposals: () => Promise<void>

  // Reload alliance
  load: () => Promise<void>

  // Handlers (unchanged business logic from the original page)
  handleAdd: (newWallet: string, newRole: string) => Promise<void>
  handleRole: (memberId: string, role: string) => Promise<void>
  handleRemove: (memberId: string) => Promise<void>
  handleSend: (toAddr: string, amount: string, sendToken: 'SOL' | 'USDC') => Promise<void>
  handleApprove: (prop: AllianceProposal) => Promise<void>
  handleReject: (prop: AllianceProposal) => Promise<void>
  handleExecute: (prop: AllianceProposal) => Promise<void>
  handleThreshold: (thresholdInput: number) => Promise<void>

  // Connection + auth forwarded for sub-pages that might need them
  connection: ReturnType<typeof useConnection>['connection']
  token: string | null | undefined
}

const AllianceContext = createContext<AllianceContextValue | null>(null)

export function AllianceProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const routeId = params?.allianceId ? String(params.allianceId) : null
  const isSelector = routeId === 'select'

  const { user, token, isLoading: authLoading } = useAuth()
  const { connection } = useConnection()
  const myWallet = user?.wallet

  // Alliance list for selector mode
  const [alliances, setAlliances] = useState<Alliance[]>([])
  const [alliancesLoading, setAlliancesLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // The effective ID to load
  const effectiveId = isSelector ? selectedId : routeId

  const [alliance, setAlliance] = useState<AllianceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [balance, setBalance] = useState<string>('—')
  const [solBalance, setSolBalance] = useState<number>(0)
  const [usdcBalance, setUsdcBalance] = useState<number>(0)
  const [proposals, setProposals] = useState<AllianceProposal[]>([])

  /* ── Always load alliance list (powers the selector on every page) ── */
  // Wait for auth to finish hydrating before fetching. On a hard refresh the
  // token is restored asynchronously (via /is-auth); firing this with a null
  // token would 401 and leave the selector empty until something re-triggered
  // it — which is what made the page intermittently show no alliances.

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setAlliancesLoading(true)
    listAlliances(token)
      .then((list) => {
        if (!cancelled) setAlliances(list)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAlliancesLoading(false)
      })
    return () => { cancelled = true }
  }, [token, authLoading])

  /* ── Sync selectedId when navigating via route (e.g. from Alliances page) ── */
  // Visiting a specific alliance route also records it as the "recent" alliance
  // so the selector-based pages (/team/select/…) can reopen it.

  useEffect(() => {
    if (!isSelector && routeId) {
      setSelectedId(routeId)
      try { localStorage.setItem('kinship.recentAllianceId', routeId) } catch {}
    }
  }, [isSelector, routeId])

  /* ── Default the selector to the most recent alliance ──────────── */
  // When landing on /team/select/… with nothing chosen yet, fall back to the
  // last alliance the user opened (persisted). If that's gone (or there's no
  // history), default to the latest-created alliance so the Members /
  // Proposals / Threshold / Send-Funds screens always have one loaded.

  useEffect(() => {
    if (!isSelector || selectedId || alliances.length === 0) return
    let recent: string | null = null
    try { recent = localStorage.getItem('kinship.recentAllianceId') } catch {}
    const exists = recent && alliances.some((a) => a.id === recent)
    const latest = [...alliances].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0]
    setSelectedId(exists ? recent : latest.id)
  }, [isSelector, selectedId, alliances])

  /* ── Select alliance handler ───────────────────────────────────── */

  const selectAlliance = useCallback((id: string) => {
    setSelectedId(id)
    try { localStorage.setItem('kinship.recentAllianceId', id) } catch {}
    setAlliance(null)
    setProposals([])
    setBalance('—')
    setSolBalance(0)
    setUsdcBalance(0)
    setError('')
    setNotice('')
  }, [])

  /* ── Load alliance ─────────────────────────────────────────────── */

  const load = useCallback(async () => {
    // Hold off until auth has hydrated — fetching with a not-yet-restored token
    // would 401 and surface a spurious "Alliance not found". `loading` stays
    // true (its initial value) so the page shows the loader, not an error.
    if (authLoading) return
    if (!effectiveId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const a = await getAlliance(effectiveId, token)
      setAlliance(a)
    } catch (e: any) {
      setError(e?.message || 'Failed to load alliance')
    } finally {
      setLoading(false)
    }
  }, [effectiveId, token, authLoading])

  useEffect(() => {
    load()
  }, [load])

  /* ── Load proposals ────────────────────────────────────────────── */

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

  /* ── Read on-chain balance ─────────────────────────────────────── */
  // Exposed as a callback so it can be re-run after a transfer (otherwise the
  // displayed balance only updates on a full page refresh).

  const loadBalance = useCallback(async () => {
    const vault = alliance?.vaultPda
    if (!vault) {
      setBalance('—')
      setSolBalance(0)
      setUsdcBalance(0)
      return
    }
    try {
      const owner = new PublicKey(vault)
      const lamports = await connection.getBalance(owner)
      const solNum = lamports / LAMPORTS_PER_SOL
      const sol = solNum.toFixed(4)
      let usdc = 0
      try {
        const toks = await connection.getParsedTokenAccountsByOwner(owner, {
          programId: TOKEN_PROGRAM_ID,
        })
        const usdcMint = process.env.NEXT_PUBLIC_USDC_MINT
        usdc = toks.value
          .filter(
            (t) =>
              !usdcMint ||
              t.account.data.parsed?.info?.mint === usdcMint,
          )
          .reduce(
            (sum, t) =>
              sum + (t.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0),
            0,
          )
      } catch {
        /* no token balance */
      }
      setSolBalance(solNum)
      setUsdcBalance(usdc)
      setBalance(`${sol} SOL · ${usdc.toLocaleString()} USDC`)
    } catch {
      setBalance('—')
      setSolBalance(0)
      setUsdcBalance(0)
    }
  }, [alliance?.vaultPda, connection])

  useEffect(() => {
    loadBalance()
  }, [loadBalance])

  /* ── Auto-dismiss the notice banner after a few seconds ─────────── */
  // Without this, `notice` only ever gets cleared when another action runs
  // setNotice(''), so it stays visible indefinitely and follows the user
  // across every sub-page (Members, Proposals, Send Funds, etc.) since they
  // all share this same context/provider.

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  /* ── Auto-dismiss the error banner after a few seconds ───────────── */
  // Same issue as `notice` above: `error` was only ever cleared at the start
  // of the next handler call (setError('')), so a validation error like
  // "That wallet is already a member" would sit on screen indefinitely until
  // some other action ran or the page was refreshed.

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 4000)
    return () => clearTimeout(timer)
  }, [error])

  /* ── Derived state ─────────────────────────────────────────────── */

  const memberCount = alliance?.members.length ?? 0
  const isWizard =
    alliance?.creatorWallet === myWallet ||
    (alliance?.members.some((m) => m.wallet === myWallet && m.role === 'Wizard') ?? false)
  // A removal counts as "pending" only while its proposal is still in flight.
  // Terminal proposals (executed, rejected, or cancelled) must NOT keep the
  // member disabled — otherwise a rejected proposal blocks re-proposing forever.
  // Stale proposals (status still says 'Active' on-chain, but a later config
  // change like a threshold update has invalidated them) must also not count
  // — they can never be approved/executed, so treating them as "pending"
  // would permanently block re-proposing the same member/wallet.
  const TERMINAL_PROPOSAL_STATUSES = ['Executed', 'Rejected', 'Cancelled']
  const pendingRemovals = new Set(
    proposals
      .filter(
        (p) =>
          p.kind === 'RemoveMember' &&
          !p.isStale &&
          !TERMINAL_PROPOSAL_STATUSES.includes(p.status) &&
          p.removedMember,
      )
      .map((p) => p.removedMember as string),
  )
  // Same idea as pendingRemovals, but for AddMember proposals — without this,
  // nothing stops the same wallet from being proposed for addition multiple
  // times while an earlier proposal for it is still waiting on approvals.
  const pendingAdditions = new Set(
    proposals
      .filter(
        (p) =>
          p.kind === 'AddMember' &&
          !p.isStale &&
          !TERMINAL_PROPOSAL_STATUSES.includes(p.status) &&
          p.newMember,
      )
      .map((p) => p.newMember as string),
  )
  const isSigner =
    !!myWallet && !!alliance?.members.some((m) => m.wallet === myWallet)

  // A pending (non-stale, non-terminal) threshold change makes any NEW proposal
  // created now stale the instant it executes — Squads bumps the multisig's
  // staleTransactionIndex, invalidating everything created before it. So while a
  // threshold change is awaiting approval, block creating Add Member / Remove
  // Member / Transfer proposals. Re-reads on-chain so we never decide from stale
  // context state.
  const thresholdChangePending = useCallback(async (): Promise<boolean> => {
    if (!alliance?.multisigPda) return false
    let latest = proposals
    try {
      latest = await listAllianceProposals({ connection, multisigPda: alliance.multisigPda })
      setProposals(latest)
    } catch { /* fall back to whatever is already in context */ }
    const pending = latest.some(
      (p) => p.kind === 'ChangeThreshold' && !p.isStale && !TERMINAL_PROPOSAL_STATUSES.includes(p.status),
    )
    if (pending) {
      setError(
        'A threshold change is still waiting for approval. Creating a new proposal now would make it stale once the threshold updates. Approve, execute, or reject the threshold change first.',
      )
    }
    return pending
  }, [alliance, connection, proposals])

  /* ── Handlers (unchanged business logic) ───────────────────────── */

  const handleAdd = useCallback(async (newWallet: string, newRole: string) => {
    if (busy || !alliance) return
    if (memberCount >= 10) {
      setError('This alliance already has 10 members, which is the maximum.')
      return
    }
    const wallet = newWallet.trim()
    if (alliance.members.some((m) => m.wallet === wallet)) {
      setError('That wallet is already a member of this alliance.')
      return
    }
    if (pendingAdditions.has(wallet)) {
      setError('A request to add this wallet is already waiting for approval.')
      return
    }
    if (await thresholdChangePending()) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (alliance.multisigPda && myWallet) {
        const res = await addMemberOnChain({
          connection,
          multisigPda: alliance.multisigPda,
          creator: new PublicKey(myWallet),
          newMember: wallet,
          token,
        })
        if (!res.executed) {
          setNotice(
            `Request sent for approval ✓ — ${alliance.threshold} of ${memberCount} members need to approve before this member joins. You've approved; ask the others to approve under "Proposals".`,
          )
          await loadProposals()
          setBusy(false)
          return
        }
      }
      const updated = await addAllianceMember(
        alliance.id, { wallet, role: newRole }, token,
      )
      setAlliance(updated)
      setNotice('Member added ✓')
      await loadProposals()
    } catch (e: any) {
      setError(e?.message || 'Failed to add member')
    } finally { setBusy(false) }
  }, [busy, alliance, memberCount, myWallet, connection, token, loadProposals, pendingAdditions, thresholdChangePending])

  const handleRole = useCallback(async (memberId: string, role: string) => {
    if (busy || !alliance) return
    setBusy(true); setError(''); setNotice('')
    try {
      const updated = await updateAllianceMember(alliance.id, memberId, role, token)
      setAlliance(updated)
    } catch (e: any) {
      setError(e?.message || 'Failed to update role')
    } finally { setBusy(false) }
  }, [busy, alliance, token])

  const handleRemove = useCallback(async (memberId: string) => {
    if (busy || !alliance) return
    const member = alliance.members.find((m) => m.id === memberId)
    // The Wizard / creator is the multisig owner and must never be removed —
    // removing them on-chain would orphan the alliance and lock everyone out.
    if (member && (member.role === 'Wizard' || member.wallet === alliance.creatorWallet)) {
      setError('The Wizard can’t be removed — they’re the owner of this team wallet.')
      return
    }
    if (member && pendingRemovals.has(member.wallet)) {
      setError('A request to remove this member is already waiting for approval.')
      return
    }
    // Threshold is a manual setting now (no auto-decrement). Block a removal
    // that would leave the threshold higher than the remaining signers, and
    // tell the user to lower it first.
    if (memberCount - 1 < alliance.threshold) {
      setError(
        `The approval threshold is ${alliance.threshold} of ${memberCount}. ` +
          `Lower it to ${memberCount - 1} or less under “Approval Threshold” before removing a member.`,
      )
      return
    }
    if (await thresholdChangePending()) return
    setBusy(true); setError(''); setNotice('')
    try {
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
          setAlliance(updated)
          setNotice('Member removed ✓')
        } else {
          setNotice(
            `Request sent for approval ✓ — ${alliance.threshold} of ${memberCount} members need to approve before this member is removed. You've approved; ask the others to approve under "Proposals".`,
          )
          await loadProposals()
        }
      } else {
        const updated = await removeAllianceMember(alliance.id, memberId, token)
        setAlliance(updated)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to remove member')
    } finally { setBusy(false) }
  }, [busy, alliance, myWallet, connection, token, memberCount, pendingRemovals, loadProposals, thresholdChangePending])

  const handleSend = useCallback(async (toAddr: string, amount: string, sendToken: 'SOL' | 'USDC') => {
    if (busy || !alliance?.multisigPda || !alliance?.vaultPda || !myWallet) return
    const amt = parseFloat(amount)
    if (!toAddr.trim() || !(amt > 0)) {
      setError('Enter a recipient address and an amount greater than 0.')
      return
    }
    if (await thresholdChangePending()) return
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
          `Request sent for approval ✓ — ${alliance.threshold} of ${memberCount} members need to approve before the funds are sent. You've approved; ask the others to approve under "Proposals".`,
        )
      }
      await Promise.all([load(), loadProposals(), loadBalance()])
    } catch (e: any) {
      setError(e?.message || 'Failed to send funds')
    } finally { setBusy(false) }
  }, [busy, alliance, myWallet, connection, token, memberCount, load, loadProposals, loadBalance, thresholdChangePending])

  const handleApprove = useCallback(async (prop: AllianceProposal) => {
    if (busy || !alliance?.multisigPda || !myWallet) return
    if (prop.isStale) {
      setError(
        'This proposal is stale — the team wallet config changed (e.g. the approval threshold) after it was created, so it can no longer be approved. Please reject it and recreate it if it\'s still needed.',
      )
      return
    }
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
  }, [busy, alliance?.multisigPda, myWallet, connection, token, loadProposals])

  const handleReject = useCallback(async (prop: AllianceProposal) => {
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
  }, [busy, alliance?.multisigPda, myWallet, connection, token, loadProposals])

  const handleExecute = useCallback(async (prop: AllianceProposal) => {
    if (busy || !alliance?.multisigPda || !myWallet) return
    if (prop.isStale) {
      setError(
        'This proposal is stale — the team wallet config changed (e.g. the approval threshold) after it was created, so it can no longer be executed. Please reject it and recreate it if it\'s still needed.',
      )
      return
    }
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
      if (prop.kind === 'AddMember' && prop.newMember) {
        try {
          const updated = await addAllianceMember(
            alliance.id, { wallet: prop.newMember, role: 'Member' }, token,
          )
          setAlliance(updated)
        } catch { /* may already exist */ }
      } else if (prop.kind === 'RemoveMember' && prop.removedMember) {
        try {
          const m = alliance.members.find((x) => x.wallet === prop.removedMember)
          if (m) {
            const updated = await removeAllianceMember(alliance.id, m.id, token)
            setAlliance(updated)
          }
        } catch { /* ignore */ }
      } else if (prop.kind === 'ChangeThreshold' && prop.newThreshold) {
        try {
          const updated = await changeAllianceThreshold(alliance.id, prop.newThreshold, token)
          setAlliance(updated)
        } catch { /* ignore */ }
      }
      await Promise.all([load(), loadProposals(), loadBalance()])
    } catch (e: any) {
      setError(e?.message || 'Execute failed')
    } finally { setBusy(false) }
  }, [busy, alliance, myWallet, connection, token, load, loadProposals, loadBalance])

  const handleThreshold = useCallback(async (thresholdInput: number) => {
    if (busy || !alliance) return
    // Executing a threshold change bumps the multisig's staleTransactionIndex,
    // which permanently invalidates every proposal created before it — even
    // ones still waiting on approvals. Block creating a new threshold change
    // while anything else is in flight, so people don't lose pending Add
    // Member / Remove Member / Transfer proposals out from under them.
    //
    // The `proposals` already sitting in context can be momentarily stale —
    // e.g. you just created an Add Member proposal and clicked here before
    // the on-chain read had caught up — so re-fetch fresh right before the
    // check instead of trusting whatever's currently in state.
    let latestProposals = proposals
    if (alliance.multisigPda) {
      try {
        latestProposals = await listAllianceProposals({
          connection,
          multisigPda: alliance.multisigPda,
        })
        setProposals(latestProposals)
      } catch {
        /* fall back to whatever was already in context */
      }
    }
    const otherPending = latestProposals.some(
      (p) => !p.isStale && !TERMINAL_PROPOSAL_STATUSES.includes(p.status),
    )
    if (otherPending) {
      setError(
        'There are proposals still waiting for approval (Add Member, Remove Member, a fund transfer, or another threshold change). Changing the threshold would make those stale and unusable. Please wait for them to be executed or rejected first.',
      )
      return
    }
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
            `Request sent for approval ✓ — ${alliance.threshold} of ${memberCount} members need to approve this change. You've approved; ask the others to approve under "Proposals".`,
          )
          await loadProposals()
          setBusy(false)
          return
        }
      }
      const updated = await changeAllianceThreshold(alliance.id, thresholdInput, token)
      setAlliance(updated)
    } catch (e: any) {
      setError(e?.message || 'Failed to change threshold')
    } finally { setBusy(false) }
  }, [busy, alliance, myWallet, connection, token, memberCount, loadProposals, proposals])

  return (
    <AllianceContext.Provider
      value={{
        alliances,
        alliancesLoading,
        selectedAllianceId: effectiveId,
        selectAlliance,
        alliance,
        setAlliance,
        loading,
        error,
        setError,
        notice,
        setNotice,
        busy,
        setBusy,
        memberCount,
        isWizard,
        isSigner,
        pendingRemovals,
        pendingAdditions,
        myWallet,
        balance,
        solBalance,
        usdcBalance,
        proposals,
        loadProposals,
        load,
        handleAdd,
        handleRole,
        handleRemove,
        handleSend,
        handleApprove,
        handleReject,
        handleExecute,
        handleThreshold,
        connection,
        token,
      }}
    >
      {children}
    </AllianceContext.Provider>
  )
}

export function useAlliance(): AllianceContextValue {
  const ctx = useContext(AllianceContext)
  if (!ctx) throw new Error('useAlliance must be used within AllianceProvider')
  return ctx
}
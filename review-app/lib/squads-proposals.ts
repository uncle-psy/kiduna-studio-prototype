// Squads v4 proposal flows for an Alliance, signed by the user's custodial
// login wallet via the backend /sign endpoint (hex). No Phantom.
//
// Every action is a Squads "config transaction" (member/threshold) or a
// "vault transaction" (fund transfer), driven through the standard
// create → proposal → approve → execute flow:
//
//   • create()  — propose the change at the next transactionIndex
//   • approve() — a signer approves the proposal
//   • execute() — once approvals reach the threshold, run it on-chain
//
// For a 1/1 multisig the creator's single approval already meets the
// threshold, so add/threshold/fund complete immediately ("direct" feel).
// For N/N, the proposal waits for the other signers to approve.

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
} from '@solana/spl-token'
import { signWithLoginWallet } from './sign-with-login-wallet'

// USDC mint (override via NEXT_PUBLIC_USDC_MINT for localnet). 6 decimals.
const USDC_MINT =
  process.env.NEXT_PUBLIC_USDC_MINT ||
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDC_DECIMALS = 6

/** Sign one tx with the login wallet (FROST, hex) and submit it. */
export async function signSend(
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  token: string | null | undefined,
  extraSigners: Keypair[] = [],
): Promise<string> {
  const tx = new Transaction().add(...instructions)
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed')
  tx.feePayer = feePayer
  tx.recentBlockhash = blockhash
  for (const kp of extraSigners) tx.partialSign(kp)

  // The signer pays the network fee from their own wallet. Check the balance
  // up front so an empty/under-funded wallet gets a clear message with the
  // actual numbers instead of the generic "can't be completed" fallback.
  try {
    const message = tx.compileMessage()
    const [balance, feeResp] = await Promise.all([
      connection.getBalance(feePayer, 'confirmed'),
      connection.getFeeForMessage(message, 'confirmed'),
    ])
    const fee = feeResp.value ?? 5000 // default to one signature fee
    console.log('[signSend] feePayer balance=', balance, 'fee=', fee)
    if (balance < fee) {
      const balSol = (balance / LAMPORTS_PER_SOL).toFixed(5)
      const needSol = (fee / LAMPORTS_PER_SOL).toFixed(5)
      throw new Error(
        `Not enough SOL in your wallet to cover the network fee. ` +
          `You have ${balSol} SOL but this needs about ${needSol} SOL. ` +
          `Add a little SOL to your wallet and try again.`,
      )
    }
  } catch (balErr) {
    // Re-throw our own friendly error; swallow only RPC lookup hiccups so the
    // normal simulate path can still run.
    if (balErr instanceof Error && balErr.message.startsWith('Not enough SOL in your wallet')) {
      throw balErr
    }
    console.warn('[signSend] balance precheck skipped:', balErr)
  }

  const messageHex = Buffer.from(tx.serializeMessage()).toString('hex')
  console.log('[signSend] requesting signature, msg len=', messageHex.length)
  const { signature: sigHex } = await signWithLoginWallet(messageHex, token)
  console.log('[signSend] got signature len=', sigHex.length)
  tx.addSignature(feePayer, Buffer.from(sigHex, 'hex'))
  console.log('[signSend] signature attached, sending raw tx…')

  // Simulate first so any program error surfaces (instead of a silent drop).
  try {
    const sim = await connection.simulateTransaction(tx)
    console.log('[signSend] simulate err=', JSON.stringify(sim.value.err), 'logs=', sim.value.logs)
    if (sim.value.err) {
      const logs = (sim.value.logs || []).join(' ')
      const errStr = JSON.stringify(sim.value.err)
      let friendly = 'This transaction can’t be completed right now.'
      if (
        /AccountNotFound/i.test(errStr) ||
        /attempt to debit an account but found no record of a prior credit/i.test(logs)
      ) {
        friendly =
          'Not enough SOL in your wallet to cover the network fee. ' +
          'Add a little SOL to your wallet and try again.'
      } else if (/insufficient lamports|insufficient funds/i.test(logs)) {
        const need = logs.match(/need (\d+)/)
        const needSol = need ? (Number(need[1]) / 1e9).toFixed(4) : null
        friendly = needSol
          ? `Not enough SOL in the team vault. This transfer needs ${needSol} SOL — add funds to the vault first.`
          : 'Not enough SOL in the team vault. Add funds to the vault first.'
      } else if (/already in use|already been processed/i.test(logs)) {
        friendly = 'This proposal already exists — refresh and try again.'
      } else if (/DuplicateMember/i.test(logs)) {
        friendly = 'That wallet is already a member of this alliance.'
      } else if (/custom program error/i.test(logs) || /AnchorError/i.test(logs)) {
        // Surface the real Anchor error (code + message) instead of a vague
        // catch-all, so the actual reason isn't hidden.
        const msgMatch = logs.match(/Error Message: ([^.]+(?:\.[^.\s][^.]*)*)\.?/)
        const codeMatch = logs.match(/Error Code: (\w+)/)
        if (msgMatch) {
          friendly = `The team wallet rejected this action: ${msgMatch[1].trim()}`
        } else if (codeMatch) {
          friendly = `The team wallet rejected this action (${codeMatch[1]}). It may already be approved, executed, or no longer valid.`
        } else {
          friendly = 'The team wallet rejected this action. It may already be approved, executed, or no longer valid.'
        }
      }
      throw new Error(friendly)
    }
  } catch (simErr) {
    console.error('[signSend] simulate threw:', simErr)
    throw simErr
  }

  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true, // already simulated above
    preflightCommitment: 'confirmed',
    maxRetries: 5,
  })
  console.log('[signSend] sent, sig=', sig, '— confirming…')

  // Poll signature status (more reliable than blockhash-based confirm on a
  // local validator). Resolve on confirmed/finalized; throw on error/timeout.
  const start = Date.now()
  for (;;) {
    const st = await connection.getSignatureStatus(sig, {
      searchTransactionHistory: true,
    })
    const v = st.value
    console.log('[signSend] poll status=', v ? v.confirmationStatus : 'null', 'err=', v ? JSON.stringify(v.err) : '-')
    if (v) {
      if (v.err) {
        throw new Error('Transaction failed: ' + JSON.stringify(v.err))
      }
      if (
        v.confirmationStatus === 'confirmed' ||
        v.confirmationStatus === 'finalized'
      ) {
        console.log('[signSend] confirmed:', sig)
        return sig
      }
    }
    if (Date.now() - start > 30000) {
      throw new Error('Confirm timeout for ' + sig)
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}

async function readMultisig(connection: Connection, multisigPda: PublicKey) {
  const multisig = await import('@sqds/multisig')
  const account = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda,
  )
  const transactionIndex = BigInt(account.transactionIndex.toString())
  const threshold = Number(account.threshold)
  const memberCount = account.members.length
  return { multisig, account, transactionIndex, threshold, memberCount }
}

export interface ProposalResult {
  transactionIndex: string
  createSignature: string
  executed: boolean
  executeSignature?: string
}

/**
 * Propose adding a member, approve as creator, and execute if the current
 * threshold is already met (1/1). The approval threshold is NOT touched —
 * it stays whatever it is and is only changed manually (Squads behavior).
 */
export async function addMemberOnChain(params: {
  connection: Connection
  multisigPda: string
  creator: PublicKey
  newMember: string
  token?: string | null
}): Promise<ProposalResult> {
  const { connection, creator, newMember, token } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const info = await readMultisig(connection, multisigPda)
  const multisig = info.multisig
  const threshold = info.threshold
  const { Permissions } = multisig.types
  const newIndex = info.transactionIndex + BigInt(1)

  const createIx = multisig.instructions.configTransactionCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
    actions: [
      {
        __kind: 'AddMember',
        newMember: {
          key: new PublicKey(newMember),
          permissions: Permissions.all(),
        },
      },
    ],
  })
  const proposalIx = multisig.instructions.proposalCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
  })
  const approveIx = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex: newIndex,
    member: creator,
  })

  console.log('[proposal] threshold=', threshold, 'newIndex=', newIndex.toString())
  const createSignature = await signSend(
    connection,
    [createIx, proposalIx, approveIx],
    creator,
    token,
  )
  console.log('[addMember] create+propose+approve sig=', createSignature)

  let executed = false
  let executeSignature: string | undefined
  if (threshold <= 1) {
    console.log('[addMember] threshold<=1, building execute…')
    const execIx = multisig.instructions.configTransactionExecute({
      multisigPda,
      transactionIndex: newIndex,
      member: creator,
      rentPayer: creator,
    })
    console.log('[addMember] execIx built, sending…')
    executeSignature = await signSend(connection, [execIx], creator, token)
    console.log('[addMember] execute sig=', executeSignature)
    executed = true
  } else {
    console.log('[addMember] threshold>1, not executing now')
  }

  return {
    transactionIndex: newIndex.toString(),
    createSignature,
    executed,
    executeSignature,
  }
}

/**
 * Propose removing a member. The threshold is NOT changed — it is a manual
 * setting. Removal is blocked when it would leave the threshold higher than
 * the number of remaining signers (the Squads program would reject it with
 * InvalidThreshold); the caller must lower the threshold first. Approve as
 * creator; execute if the current threshold is already met (1/1).
 */
export async function removeMemberOnChain(params: {
  connection: Connection
  multisigPda: string
  creator: PublicKey
  oldMember: string
  token?: string | null
}): Promise<ProposalResult> {
  const { connection, creator, oldMember, token } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const info = await readMultisig(connection, multisigPda)
  const multisig = info.multisig
  const threshold = info.threshold
  const memberCount = info.memberCount
  const newIndex = info.transactionIndex + BigInt(1)

  // No auto-decrement: refuse if the threshold can't be satisfied afterwards.
  if (threshold > memberCount - 1) {
    throw new Error(
      `Can't remove this member: the approval threshold is ${threshold} of ${memberCount}. ` +
        `Lower the threshold to ${memberCount - 1} or less under “Approval Threshold” before removing a member.`,
    )
  }

  const createIx = multisig.instructions.configTransactionCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
    actions: [
      {
        __kind: 'RemoveMember',
        oldMember: new PublicKey(oldMember),
      },
    ],
  })
  const proposalIx = multisig.instructions.proposalCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
  })
  const approveIx = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex: newIndex,
    member: creator,
  })

  const createSignature = await signSend(
    connection,
    [createIx, proposalIx, approveIx],
    creator,
    token,
  )

  let executed = false
  let executeSignature: string | undefined
  if (threshold <= 1) {
    const execIx = multisig.instructions.configTransactionExecute({
      multisigPda,
      transactionIndex: newIndex,
      member: creator,
      rentPayer: creator,
    })
    executeSignature = await signSend(connection, [execIx], creator, token)
    executed = true
  }

  return {
    transactionIndex: newIndex.toString(),
    createSignature,
    executed,
    executeSignature,
  }
}

/** Propose changing the threshold; approve as creator; execute if 1/1. */
export async function changeThresholdOnChain(params: {
  connection: Connection
  multisigPda: string
  creator: PublicKey
  newThreshold: number
  token?: string | null
}): Promise<ProposalResult> {
  const { connection, creator, newThreshold, token } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const { multisig, threshold, transactionIndex } = await readMultisig(
    connection,
    multisigPda,
  )
  const newIndex = transactionIndex + BigInt(1)

  const createIx = multisig.instructions.configTransactionCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
    actions: [{ __kind: 'ChangeThreshold', newThreshold }],
  })
  const proposalIx = multisig.instructions.proposalCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
  })
  const approveIx = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex: newIndex,
    member: creator,
  })

  console.log('[proposal] threshold=', threshold, 'newIndex=', newIndex.toString())
  const createSignature = await signSend(
    connection,
    [createIx, proposalIx, approveIx],
    creator,
    token,
  )
  console.log('[addMember] create+propose+approve sig=', createSignature)

  let executed = false
  let executeSignature: string | undefined
  if (threshold <= 1) {
    console.log('[addMember] threshold<=1, building execute…')
    const execIx = multisig.instructions.configTransactionExecute({
      multisigPda,
      transactionIndex: newIndex,
      member: creator,
      rentPayer: creator,
    })
    console.log('[addMember] execIx built, sending…')
    executeSignature = await signSend(connection, [execIx], creator, token)
    console.log('[addMember] execute sig=', executeSignature)
    executed = true
  } else {
    console.log('[addMember] threshold>1, not executing now')
  }

  return {
    transactionIndex: newIndex.toString(),
    createSignature,
    executed,
    executeSignature,
  }
}

/** A signer approves a pending proposal. */
export async function approveProposalOnChain(params: {
  connection: Connection
  multisigPda: string
  member: PublicKey
  transactionIndex: string
  token?: string | null
}): Promise<string> {
  const { connection, member, token } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const { multisig } = await readMultisig(connection, multisigPda)
  const approveIx = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex: BigInt(params.transactionIndex),
    member,
  })
  return signSend(connection, [approveIx], member, token)
}

/**
 * Reject (vote no on) a proposal. When enough members reject that the proposal
 * can no longer reach its approval threshold, Squads marks it Cancelled on-chain
 * automatically. The rejection is recorded on-chain.
 */
export async function rejectProposalOnChain(params: {
  connection: Connection
  multisigPda: string
  member: PublicKey
  transactionIndex: string
  token?: string | null
}): Promise<string> {
  const { connection, member, token } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const { multisig } = await readMultisig(connection, multisigPda)
  const rejectIx = multisig.instructions.proposalReject({
    multisigPda,
    transactionIndex: BigInt(params.transactionIndex),
    member,
  })
  return signSend(connection, [rejectIx], member, token)
}

/** Execute a config proposal whose approvals have reached the threshold. */
export async function executeConfigProposalOnChain(params: {
  connection: Connection
  multisigPda: string
  member: PublicKey
  transactionIndex: string
  token?: string | null
}): Promise<string> {
  const { connection, member, token } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const { multisig } = await readMultisig(connection, multisigPda)
  const execIx = multisig.instructions.configTransactionExecute({
    multisigPda,
    transactionIndex: BigInt(params.transactionIndex),
    member,
    rentPayer: member,
  })
  return signSend(connection, [execIx], member, token)
}

// ── Reading proposals for the Proposals UI ──────────────────────────────────

export interface AllianceProposal {
  transactionIndex: string
  status: string // 'Active' | 'Approved' | 'Executed' | 'Rejected' | ...
  approvedCount: number
  approved: string[] // wallet addresses that approved
  rejectedCount: number
  rejected: string[] // wallet addresses that rejected
  threshold: number
  kind: 'AddMember' | 'RemoveMember' | 'ChangeThreshold' | 'Transfer' | 'Other'
  isVault: boolean
  newMember?: string
  removedMember?: string
  newThreshold?: number
  description: string
  // True once a later config change (e.g. a threshold change) has executed,
  // bumping the multisig's staleTransactionIndex past this proposal. Squads
  // will reject any approve/execute on a stale proposal on-chain — this lets
  // the UI show that up front instead of surfacing the on-chain error.
  isStale: boolean
}

/** Read all non-executed proposals for a multisig, newest first. */
export async function listAllianceProposals(params: {
  connection: Connection
  multisigPda: string
}): Promise<AllianceProposal[]> {
  const { connection } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const multisig = await import('@sqds/multisig')
  const account = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda,
  )
  const highest = Number(account.transactionIndex.toString())
  const threshold = Number(account.threshold)
  const staleIndex = Number(account.staleTransactionIndex.toString())

  // Fetch every proposal index CONCURRENTLY. The previous version awaited each
  // index one-by-one, so wall-clock time was (proposal count × 2–3 RPC
  // round-trips) — ~20s on a slow remote RPC. Running them in parallel makes the
  // total roughly the latency of a single proposal instead of their sum.
  const indices: number[] = []
  for (let i = highest; i >= 1; i--) indices.push(i)

  const fetchOne = async (i: number): Promise<AllianceProposal | null> => {
    try {
      const [proposalPda] = multisig.getProposalPda({
        multisigPda,
        transactionIndex: BigInt(i),
      })
      const proposal = await multisig.accounts.Proposal.fromAccountAddress(
        connection,
        proposalPda,
      )
      const status = (proposal.status as any).__kind ?? 'Unknown'
      const approved = (proposal.approved ?? []).map((k: PublicKey) =>
        k.toBase58(),
      )
      const rejected = ((proposal as any).rejected ?? []).map((k: PublicKey) =>
        k.toBase58(),
      )

      // Describe the action: try config transaction first, then vault transaction.
      let kind: AllianceProposal['kind'] = 'Other'
      let isVault = false
      let newMember: string | undefined
      let removedMember: string | undefined
      let newThreshold: number | undefined
      let description = `Proposal #${i}`
      const [txPda] = multisig.getTransactionPda({
        multisigPda,
        index: BigInt(i),
      })
      try {
        const cfgTx =
          await multisig.accounts.ConfigTransaction.fromAccountAddress(
            connection,
            txPda,
          )
        const actions = (cfgTx.actions ?? []) as any[]
        for (const a of actions) {
          if (a.__kind === 'AddMember') {
            kind = 'AddMember'
            newMember = a.newMember?.key?.toBase58?.() ?? String(a.newMember?.key)
            description = `Add member ${newMember?.slice(0, 4)}…${newMember?.slice(-4)}`
          } else if (a.__kind === 'RemoveMember') {
            kind = 'RemoveMember'
            removedMember = a.oldMember?.toBase58?.() ?? String(a.oldMember)
            description = `Remove member ${removedMember?.slice(0, 4)}…${removedMember?.slice(-4)}`
          } else if (a.__kind === 'ChangeThreshold') {
            if (kind !== 'AddMember' && kind !== 'RemoveMember') {
              kind = 'ChangeThreshold'
              newThreshold = Number(a.newThreshold)
              description = `Set threshold to ${newThreshold}`
            }
          }
        }
      } catch {
        // Not a config transaction — try a vault transaction (fund transfer).
        try {
          await multisig.accounts.VaultTransaction.fromAccountAddress(
            connection,
            txPda,
          )
          kind = 'Transfer'
          isVault = true
          description = 'Fund transfer'
        } catch {
          /* unknown transaction type */
        }
      }

      return {
        transactionIndex: String(i),
        status,
        approvedCount: approved.length,
        approved,
        rejectedCount: rejected.length,
        rejected,
        threshold,
        kind,
        isVault,
        newMember,
        removedMember,
        newThreshold,
        description,
        isStale: i <= staleIndex,
      }
    } catch {
      /* no proposal at this index */
      return null
    }
  }

  // Promise.all preserves array order, so the result stays sorted by descending
  // index. Drop the indices that had no proposal account.
  const results = await Promise.all(indices.map(fetchOne))
  return results.filter((p): p is AllianceProposal => p !== null)
}


// ── Fund transfer (vault transaction) ───────────────────────────────────────

/**
 * Propose sending SOL from the alliance vault to a recipient, approve as
 * creator, and execute if the threshold is already met (1/1). The vault PDA is
 * the transfer authority; Squads signs as the PDA when the proposal executes.
 */
export async function transferSolOnChain(params: {
  connection: Connection
  multisigPda: string
  vaultPda: string
  creator: PublicKey
  to: string
  amountSol: number
  token?: string | null
}): Promise<ProposalResult> {
  const { connection, creator, to, amountSol, token } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const vaultPda = new PublicKey(params.vaultPda)
  const info = await readMultisig(connection, multisigPda)
  const multisig = info.multisig
  const threshold = info.threshold
  const newIndex = info.transactionIndex + BigInt(1)

  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL)
  const transferIx = SystemProgram.transfer({
    fromPubkey: vaultPda, // the vault is the source + authority
    toPubkey: new PublicKey(to),
    lamports,
  })

  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  const transactionMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: blockhash,
    instructions: [transferIx],
  })

  const createIx = multisig.instructions.vaultTransactionCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
    vaultIndex: 0,
    ephemeralSigners: 0,
    transactionMessage,
    memo: `Transfer ${amountSol} SOL`,
  })
  const proposalIx = multisig.instructions.proposalCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
  })
  const approveIx = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex: newIndex,
    member: creator,
  })

  const createSignature = await signSend(
    connection,
    [createIx, proposalIx, approveIx],
    creator,
    token,
  )

  let executed = false
  let executeSignature: string | undefined
  if (threshold <= 1) {
    const { instruction: execIx } =
      await multisig.instructions.vaultTransactionExecute({
        connection,
        multisigPda,
        transactionIndex: newIndex,
        member: creator,
      })
    executeSignature = await signSend(connection, [execIx], creator, token)
    executed = true
  }

  return {
    transactionIndex: newIndex.toString(),
    createSignature,
    executed,
    executeSignature,
  }
}

/** Execute a vault-transaction proposal (fund transfer) past its threshold. */
export async function executeVaultProposalOnChain(params: {
  connection: Connection
  multisigPda: string
  member: PublicKey
  transactionIndex: string
  token?: string | null
}): Promise<string> {
  const { connection, member, token } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const multisig = await import('@sqds/multisig')
  const { instruction: execIx } =
    await multisig.instructions.vaultTransactionExecute({
      connection,
      multisigPda,
      transactionIndex: BigInt(params.transactionIndex),
      member,
    })
  return signSend(connection, [execIx], member, token)
}


/**
 * Propose sending USDC from the alliance vault to a recipient. The vault's
 * token account is the source and the vault PDA is the authority; the recipient
 * token account is created idempotently in the same transaction (vault pays the
 * tiny rent). Approve as creator; execute if the threshold is already met (1/1).
 */
export async function transferUsdcOnChain(params: {
  connection: Connection
  multisigPda: string
  vaultPda: string
  creator: PublicKey
  to: string
  amountUsdc: number
  token?: string | null
}): Promise<ProposalResult> {
  const { connection, creator, to, amountUsdc, token } = params
  const multisigPda = new PublicKey(params.multisigPda)
  const vaultPda = new PublicKey(params.vaultPda)
  const mint = new PublicKey(USDC_MINT)
  const recipient = new PublicKey(to)

  const info = await readMultisig(connection, multisigPda)
  const multisig = info.multisig
  const threshold = info.threshold
  const newIndex = info.transactionIndex + BigInt(1)

  // allowOwnerOffCurve = true: the vault is a PDA, not a normal wallet.
  const vaultAta = getAssociatedTokenAddressSync(mint, vaultPda, true)
  const recipientAta = getAssociatedTokenAddressSync(mint, recipient, true)
  const rawAmount = BigInt(Math.round(amountUsdc * 10 ** USDC_DECIMALS))

  // 1) make sure the recipient has a token account (no-op if it exists)
  const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    vaultPda, // payer (vault has SOL for rent)
    recipientAta,
    recipient,
    mint,
  )
  // 2) move the tokens, vault PDA signing as authority
  const transferIx = createTransferInstruction(
    vaultAta,
    recipientAta,
    vaultPda,
    rawAmount,
  )

  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  const transactionMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: blockhash,
    instructions: [createAtaIx, transferIx],
  })

  const createIx = multisig.instructions.vaultTransactionCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
    vaultIndex: 0,
    ephemeralSigners: 0,
    transactionMessage,
    memo: `Transfer ${amountUsdc} USDC`,
  })
  const proposalIx = multisig.instructions.proposalCreate({
    multisigPda,
    transactionIndex: newIndex,
    creator,
  })
  const approveIx = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex: newIndex,
    member: creator,
  })

  const createSignature = await signSend(
    connection,
    [createIx, proposalIx, approveIx],
    creator,
    token,
  )

  let executed = false
  let executeSignature: string | undefined
  if (threshold <= 1) {
    const { instruction: execIx } =
      await multisig.instructions.vaultTransactionExecute({
        connection,
        multisigPda,
        transactionIndex: newIndex,
        member: creator,
      })
    executeSignature = await signSend(connection, [execIx], creator, token)
    executed = true
  }

  return {
    transactionIndex: newIndex.toString(),
    createSignature,
    executed,
    executeSignature,
  }
}
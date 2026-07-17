// USDC transfer using the existing signWithLoginWallet flow.
// Builds a SPL token transfer instruction, signs via /sign, submits to Solana.

import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
} from '@solana/spl-token'
import { signWithLoginWallet } from './sign-with-login-wallet'

const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDC_DECIMALS = 6
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'http://127.0.0.1:8899'

const CONFIRM_POLL_INTERVAL_MS = 2_000
const CONFIRM_TIMEOUT_MS = 90_000

export interface LineageSplit {
  tier: string
  address: string
  pct: number
}

/** HTTP-polling based confirmation — avoids WebSocket dependency on remote RPCs */
async function confirmWithPolling(connection: Connection, sig: string): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < CONFIRM_TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, CONFIRM_POLL_INTERVAL_MS))
    const resp = await connection.getSignatureStatuses([sig])
    const status = resp?.value?.[0]
    if (status) {
      if (status.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
      if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') return
    }
  }
  throw new Error(
    `Transaction sent but not confirmed in ${CONFIRM_TIMEOUT_MS / 1000}s. Signature: ${sig} — check Solana Explorer to verify.`
  )
}

/**
 * Transfer USDC from the logged-in user's Frost wallet to a recipient.
 * Returns the transaction signature on success.
 */
export async function transferUsdc(
  fromWallet: string,
  toWallet: string,
  amountUsdc: number,
  token: string | null,
): Promise<string> {
  const connection = new Connection(RPC_URL, { commitment: 'confirmed', wsEndpoint: undefined })
  const from = new PublicKey(fromWallet)
  const to = new PublicKey(toWallet)
  const mint = new PublicKey(USDC_MINT)
  const lamports = Math.round(amountUsdc * 10 ** USDC_DECIMALS)

  // Check buyer has enough USDC before building the tx
  try {
    const fromAta = getAssociatedTokenAddressSync(mint, from)
    const balanceResp = await connection.getTokenAccountBalance(fromAta)
    const available = parseFloat(balanceResp.value.uiAmountString || '0')
    if (available < amountUsdc) {
      throw new Error(
        `Insufficient USDC balance. You have ${available.toFixed(2)} USDC but need ${amountUsdc.toFixed(2)} USDC.`
      )
    }
  } catch (e: any) {
    if (e.message.includes('Insufficient USDC')) throw e
    throw new Error(
      `No USDC found in your wallet. You need ${amountUsdc.toFixed(2)} USDC to complete this purchase.`
    )
  }

  // Check SOL for fees
  try {
    const solBalance = await connection.getBalance(from, 'confirmed')
    if (solBalance < 10000) {
      throw new Error('Not enough SOL in your wallet to cover network fees. Add a small amount of SOL and try again.')
    }
  } catch (e: any) {
    if (e.message.includes('SOL')) throw e
  }

  return _sendUsdc(connection, from, to, mint, lamports, token)
}

/**
 * Transfer USDC to creator + lineage splits in a single atomic transaction.
 * 
 * Split logic (example for 10 USDC purchase):
 *   GGP    → 2.0% = 0.20 USDC
 *   GP     → 1.5% = 0.15 USDC
 *   Parent → 1.0% = 0.10 USDC
 *   Child  → 0.5% = 0.05 USDC
 *   Creator receives the remaining amount after splits
 *
 * All transfers are batched in one transaction — one signature, one fee.
 */
export async function transferUsdcWithLineage(
  fromWallet: string,
  toWallet: string,       // creator wallet
  amountUsdc: number,     // final price after offer%
  token: string | null,
  lineageSplits: LineageSplit[],
): Promise<string> {
  const connection = new Connection(RPC_URL, { commitment: 'confirmed', wsEndpoint: undefined })
  const from = new PublicKey(fromWallet)
  const mint = new PublicKey(USDC_MINT)

  // Calculate split amounts
  const splits = lineageSplits
    .filter(s => s.address && s.address !== fromWallet) // skip if buyer is in lineage
    .map(s => ({
      ...s,
      amountUsdc: parseFloat((amountUsdc * s.pct / 100).toFixed(6)),
      lamports: Math.round(amountUsdc * s.pct / 100 * 10 ** USDC_DECIMALS),
    }))
    .filter(s => s.lamports > 0)

  const totalSplitUsdc = splits.reduce((acc, s) => acc + s.amountUsdc, 0)
  const creatorAmountUsdc = parseFloat((amountUsdc - totalSplitUsdc).toFixed(6))
  const creatorLamports = Math.round(creatorAmountUsdc * 10 ** USDC_DECIMALS)

  // Check buyer balance (full amount)
  try {
    const fromAta = getAssociatedTokenAddressSync(mint, from)
    const balanceResp = await connection.getTokenAccountBalance(fromAta)
    const available = parseFloat(balanceResp.value.uiAmountString || '0')
    if (available < amountUsdc) {
      throw new Error(
        `Insufficient USDC balance. You have ${available.toFixed(2)} USDC but need ${amountUsdc.toFixed(2)} USDC.`
      )
    }
  } catch (e: any) {
    if (e.message.includes('Insufficient USDC')) throw e
    throw new Error(
      `No USDC found in your wallet. You need ${amountUsdc.toFixed(2)} USDC to complete this purchase.`
    )
  }

  // Check SOL for fees
  try {
    const solBalance = await connection.getBalance(from, 'confirmed')
    if (solBalance < 10000) {
      throw new Error('Not enough SOL in your wallet to cover network fees. Add a small amount of SOL and try again.')
    }
  } catch (e: any) {
    if (e.message.includes('SOL')) throw e
  }

  const fromAta = getAssociatedTokenAddressSync(mint, from)
  const instructions = []

  // Creator transfer
  const creatorPubkey = new PublicKey(toWallet)
  const creatorAta = getAssociatedTokenAddressSync(mint, creatorPubkey)
  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(from, creatorAta, creatorPubkey, mint),
    createTransferInstruction(fromAta, creatorAta, from, creatorLamports),
  )

  // Lineage transfers (batched in same tx)
  for (const split of splits) {
    const toPubkey = new PublicKey(split.address)
    const toAta = getAssociatedTokenAddressSync(mint, toPubkey)
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(from, toAta, toPubkey, mint),
      createTransferInstruction(fromAta, toAta, from, split.lamports),
    )
  }

  const tx = new Transaction().add(...instructions)
  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  tx.feePayer = from
  tx.recentBlockhash = blockhash

  // Sign via the existing /sign endpoint (Frost wallet)
  const messageHex = Buffer.from(tx.serializeMessage()).toString('hex')
  let sigHex: string
  try {
    const result = await signWithLoginWallet(messageHex, token)
    sigHex = result.signature
  } catch (e: any) {
    throw new Error('Transaction signing failed. Please try again.')
  }

  tx.addSignature(from, Buffer.from(sigHex, 'hex'))

  try {
    const rawTx = tx.serialize()
    const sig = await connection.sendRawTransaction(rawTx, { skipPreflight: false })
    await confirmWithPolling(connection, sig)
    return sig
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('insufficient funds') || msg.includes('0x1'))
      throw new Error(`Insufficient USDC balance. You need ${amountUsdc.toFixed(2)} USDC to complete this purchase.`)
    if (msg.includes('blockhash'))
      throw new Error('Transaction expired. Please try again.')
    throw e
  }
}

/** Internal: sign + send + confirm a single transfer (no balance checks) */
async function _sendUsdc(
  connection: Connection,
  from: PublicKey,
  to: PublicKey,
  mint: PublicKey,
  lamports: number,
  token: string | null,
): Promise<string> {
  const fromAta = getAssociatedTokenAddressSync(mint, from)
  const toAta = getAssociatedTokenAddressSync(mint, to)

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(from, toAta, to, mint),
    createTransferInstruction(fromAta, toAta, from, lamports),
  )
  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  tx.feePayer = from
  tx.recentBlockhash = blockhash

  const messageHex = Buffer.from(tx.serializeMessage()).toString('hex')
  let sigHex: string
  try {
    const result = await signWithLoginWallet(messageHex, token)
    sigHex = result.signature
  } catch (e: any) {
    throw new Error('Transaction signing failed. Please try again.')
  }

  tx.addSignature(from, Buffer.from(sigHex, 'hex'))

  try {
    const rawTx = tx.serialize()
    const sig = await connection.sendRawTransaction(rawTx, { skipPreflight: false })
    await confirmWithPolling(connection, sig)
    return sig
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('insufficient funds') || msg.includes('0x1'))
      throw new Error('Insufficient USDC balance.')
    if (msg.includes('blockhash'))
      throw new Error('Transaction expired. Please try again.')
    throw e
  }
}
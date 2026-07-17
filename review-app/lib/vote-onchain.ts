/**
 * On-chain voting flow (client-only).
 *
 * Faithful port of Flutter MarketService.voteOnProposal() +
 * FrostWallet.signTransaction():
 *
 *   1. POST {STUDIO}/api/v1/proposals/{id}/vote/build  → { usdcMint, vaultAddress, decimals }
 *   2. Build a USDC transferChecked tx locally (fresh blockhash), creating the
 *      vault ATA if missing — same instruction shape as FrostWallet.sendAsset.
 *   3. Sign via FrostWallet: POST {BACKEND}/sign { message: hex(serializedMessage) }
 *      → { data: { signature: hex } }, attach to the tx.
 *   4. Submit via Solana RPC (HELIUS_RPC), preflightCommitment 'confirmed'.
 *   5. Record the vote in the DB (best-effort).
 *
 * The FrostWallet public key is the authenticated user's wallet
 * (Flutter: FrostWallet.init(user.wallet, ...)).
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token'
import { Buffer } from 'buffer'
import { buildVote, recordVote, HELIUS_RPC } from '@/lib/vote-api'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.kinshipbots.com'

export interface VoteResult {
  success: boolean
  side?: 'pass' | 'fail'
  txSignature?: string
  error?: string
}

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * FrostWallet.signTransaction — send the serialized legacy message to the
 * backend /sign endpoint and get back the ed25519 signature.
 */
async function frostSign(messageBytes: Uint8Array): Promise<Buffer> {
  const hex = Buffer.from(messageBytes).toString('hex')
  const res = await fetch(`${BACKEND_URL}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ message: hex }),
  })
  if (!res.ok) throw new Error(`sign failed (${res.status})`)
  const json = await res.json()
  const sigHex = json?.data?.signature
  if (!sigHex || typeof sigHex !== 'string') {
    throw new Error('sign: no signature returned')
  }
  return Buffer.from(sigHex, 'hex')
}

/** Convert raw Solana/RPC errors into user-friendly messages (mirrors _friendlyVoteError). */
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase()
  if (
    lower.includes('invalidaccountdata') ||
    lower.includes('invalid account data')
  )
    return "You don't have a USDC token account. Please add USDC to your wallet first."
  if (lower.includes('insufficient') || lower.includes('0x1'))
    return 'Insufficient USDC balance for this vote.'
  if (lower.includes('accountnotfound') || lower.includes('account not found'))
    return 'Wallet account not found. Please make sure your wallet is funded.'
  if (lower.includes('blockhash')) return 'Network timeout. Please try again.'
  if (lower.includes('transaction too large'))
    return 'Transaction failed. Please try again.'
  if (
    lower.includes('simulation failed') ||
    lower.includes('transaction failed')
  )
    return 'Transaction failed. Please check your wallet balance and try again.'
  if (lower.includes('sign') && lower.includes('failed'))
    return 'Transaction signing failed. Please try again.'
  if (raw.length > 100)
    return 'Vote failed. Please check your wallet balance and try again.'
  return raw
}

/**
 * Vote `side` on `proposalId` staking `amount` USDC, signed by the user's
 * FrostWallet (`wallet` = base58 pubkey).
 */
export async function voteOnProposal(
  proposalId: string,
  side: 'pass' | 'fail',
  amount: number,
  wallet: string
): Promise<VoteResult> {
  try {
    if (!wallet) {
      return { success: false, error: 'No wallet found for your account.' }
    }

    // 1. Server validates membership / no prior vote, returns on-chain targets.
    const build = await buildVote(proposalId, side, amount)
    if (!build.ok || !build.info) {
      return { success: false, error: build.error || 'Vote failed' }
    }
    const {
      usdcMint: usdcMintStr,
      vaultAddress: vaultStr,
      decimals,
    } = build.info

    const connection = new Connection(HELIUS_RPC, 'confirmed')
    const citizen = new PublicKey(wallet)
    const usdcMint = new PublicKey(usdcMintStr)
    const vault = new PublicKey(vaultStr)

    // ── Pre-flight balance checks (best-effort, mirror mobile) ──────────────
    try {
      const lamports = await connection.getBalance(citizen)
      if (lamports / 1e9 < 0.005) {
        return {
          success: false,
          error:
            'Insufficient SOL for transaction fees. You need at least 0.005 SOL.',
        }
      }
    } catch {
      /* ignore — chain will reject if truly insufficient */
    }

    const citizenAta = getAssociatedTokenAddressSync(usdcMint, citizen, false)
    // vault may be a PDA (off-curve) → allow off-curve owner.
    const vaultAta = getAssociatedTokenAddressSync(usdcMint, vault, true)

    try {
      const bal = await connection.getTokenAccountBalance(citizenAta)
      const ui = bal.value.uiAmount ?? 0
      if (ui < amount) {
        return {
          success: false,
          error: `Insufficient USDC balance. You have ${ui.toFixed(2)} USDC but need ${amount.toFixed(2)} USDC.`,
        }
      }
    } catch {
      /* token account may not exist yet — let the chain decide */
    }

    // 2. Build the transfer tx (create vault ATA if missing).
    const tx = new Transaction()

    const vaultAtaInfo = await connection.getAccountInfo(vaultAta)
    if (vaultAtaInfo === null) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          citizen,
          vaultAta,
          vault,
          usdcMint
        )
      )
    }

    const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)))
    tx.add(
      createTransferCheckedInstruction(
        citizenAta,
        usdcMint,
        vaultAta,
        citizen,
        rawAmount,
        decimals
      )
    )

    const { blockhash } = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockhash
    tx.feePayer = citizen

    // 3. Sign the compiled message via FrostWallet and attach the signature.
    const messageBytes = tx.serializeMessage()
    const signature = await frostSign(messageBytes)
    tx.addSignature(citizen, signature)

    // 4. Submit to Solana.
    const txSignature = await connection.sendRawTransaction(tx.serialize(), {
      preflightCommitment: 'confirmed',
    })

    // 5. Record vote in DB (best-effort, mirror mobile try/catch).
    try {
      await recordVote(proposalId, { side, txSignature, stakeUsd: amount })
    } catch (dbErr) {
      console.error('[VoteOnchain] DB record failed:', dbErr)
    }

    return { success: true, side, txSignature }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[VoteOnchain] vote error:', msg)
    return { success: false, error: friendlyError(msg) }
  }
}

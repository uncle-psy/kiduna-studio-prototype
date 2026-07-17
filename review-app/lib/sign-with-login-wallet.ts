// Sign a transaction message with the user's custodial (FROST) login wallet,
// via the auth backend. No Phantom / browser wallet involved.
//
//   POST {AUTH_API_URL}/sign   (Bearer token)
//     body:     { message: "<base64 of tx.serializeMessage()>" }
//     response: { data: { address, signature } }
//
// The returned signature is the login wallet's signature over that message.

import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { Buffer } from 'buffer'

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

export interface LoginSignResult {
  address: string
  signature: string
}

/**
 * Ask the backend to sign `message` (a base64 string of the serialized tx
 * message) with the logged-in user's custodial wallet. Returns the wallet
 * address and the signature string (as the backend returns it).
 */
export async function signWithLoginWallet(
  message: string,
  token?: string | null,
): Promise<LoginSignResult> {
  const res = await fetch(`${AUTH_API_URL}/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || 'Login-wallet signing failed')
  }
  const signature: string | undefined = data?.data?.signature
  const address: string | undefined = data?.data?.address
  if (!signature) throw new Error('No signature returned from wallet service')
  return { address: address ?? '', signature }
}

/**
 * Sign a Solana transaction with the logged-in user's FROST (custodial) wallet
 * and attach the signature in place — the FROST replacement for a Phantom
 * `signTransaction(tx)` call. Works for both legacy `Transaction` and
 * `VersionedTransaction`.
 *
 * Mutates and returns the same `tx`. Any other required signatures (e.g. a
 * generated mint keypair) must already be applied via `partialSign` before
 * calling this.
 *
 *   const tx = Transaction.from(Buffer.from(serialized, 'base64'))
 *   await frostSignTransaction(tx, sponsorWallet, token)
 *   submit(Buffer.from(tx.serialize()).toString('base64'))
 */
export async function frostSignTransaction<
  T extends Transaction | VersionedTransaction,
>(tx: T, signerWallet: string, token?: string | null): Promise<T> {
  const message =
    tx instanceof VersionedTransaction
      ? tx.message.serialize()
      : tx.serializeMessage()
  const messageHex = Buffer.from(message).toString('hex')
  const { signature } = await signWithLoginWallet(messageHex, token)
  const sigBytes = Buffer.from(signature, 'hex')
  const pubkey = new PublicKey(signerWallet)
  if (tx instanceof VersionedTransaction) {
    tx.addSignature(pubkey, Uint8Array.from(sigBytes))
  } else {
    tx.addSignature(pubkey, sigBytes)
  }
  return tx
}
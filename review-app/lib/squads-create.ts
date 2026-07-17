// Create a Squads v4 multisig (the Alliance's Team Wallet), signed by the
// user's custodial **login wallet** via the backend /sign endpoint (FROST).
// No Phantom / browser wallet.
//
// Model (per product decision):
//   • The creator (login wallet) is the first signer.
//   • Threshold starts at 1/1 (grows to N/N as members are added).
//   • configAuthority = null → members govern config (approval-based).

import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js'
import { signSend } from './squads-proposals'

export interface CreatedSquads {
  multisigPda: string
  vaultPda: string
  signature: string
}

/**
 * Create a fresh Squads multisig with the login wallet as the only member
 * (Wizard), threshold 1. The login wallet pays fees and signs via the backend.
 */
export async function createSquadsMultisig(params: {
  connection: Connection
  creator: PublicKey // the login wallet's public key
  token?: string | null // auth token for the /sign call
  memo?: string
}): Promise<CreatedSquads> {
  const { connection, creator, token, memo } = params

  const multisig = await import('@sqds/multisig')
  const { Permissions } = multisig.types

  // Ephemeral create key — co-signs creation, then never needed again.
  const createKey = Keypair.generate()

  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  })

  const [programConfigPda] = multisig.getProgramConfigPda({})
  const programConfig =
    await multisig.accounts.ProgramConfig.fromAccountAddress(
      connection,
      programConfigPda,
    )
  const treasury = programConfig.treasury

  const createIx = multisig.instructions.multisigCreateV2({
    createKey: createKey.publicKey,
    creator,
    multisigPda,
    configAuthority: null,
    threshold: 1,
    members: [{ key: creator, permissions: Permissions.all() }],
    timeLock: 0,
    rentCollector: null,
    treasury,
    memo: memo ?? 'Alliance Team Wallet',
  })

  // Sign (login FROST wallet + ephemeral create key), send, and confirm via the
  // shared `signSend` helper. It confirms by polling getSignatureStatus over
  // HTTP instead of relying on WebSocket subscriptions / blockhash-expiry
  // confirmation — which is what fails on remote RPCs like solana.kiduna.dev
  // ("block height exceeded"). The create key is passed as an extra local signer.
  const signature = await signSend(connection, [createIx], creator, token, [
    createKey,
  ])

  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 })

  return {
    multisigPda: multisigPda.toBase58(),
    vaultPda: vaultPda.toBase58(),
    signature,
  }
}